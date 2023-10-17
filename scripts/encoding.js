import { sha256 } from '@noble/hashes/sha256';
import { hexToBytes, bytesToHex, dSHA256 } from './utils.js';
import * as nobleSecp256k1 from '@noble/secp256k1';
import { ripemd160 } from '@noble/hashes/ripemd160';
import { cChainParams, PRIVKEY_BYTE_LENGTH } from './chain_params.js';
import {
    pubKeyHashNetworkLen,
    writeToUint8,
    getSafeRand,
    pubPrebaseLen,
} from './utils.js';

import bs58 from 'bs58';

/**
 * Compress an uncompressed Public Key in byte form
 * @param {Array<Number> | Uint8Array} pubKeyBytes - The uncompressed public key bytes
 * @returns {Array<Number>} The compressed public key bytes
 */
export function compressPublicKey(pubKeyBytes) {
    if (pubKeyBytes.length != 65)
        throw new Error('Attempting to compress an invalid uncompressed key');
    const x = pubKeyBytes.slice(1, 33);
    const y = pubKeyBytes.slice(33);

    // Compressed key is [key_parity + 2, x]
    return [y[31] % 2 === 0 ? 2 : 3, ...x];
}

/**
 * Network encode 32 bytes for a private key
 * @param {Uint8Array} pkBytes - 32 Bytes
 * @returns {Uint8Array} - The network-encoded Private Key bytes
 */
export function encodePrivkeyBytes(pkBytes) {
    const pkNetBytes = new Uint8Array(pkBytes.length + 2);
    pkNetBytes[0] = cChainParams.current.SECRET_KEY; // Private key prefix (1 byte)
    writeToUint8(pkNetBytes, pkBytes, 1); // Private key bytes             (32 bytes)
    pkNetBytes[pkNetBytes.length - 1] = 1; // Leading digit                (1 byte)
    return pkNetBytes;
}

/**
 * Generate a new private key OR encode an existing private key from raw bytes
 * @param {Uint8Array} pkBytesToEncode - Bytes to encode as a coin private key
 * @returns {PrivateKey} - The private key
 */
export function generateOrEncodePrivkey(pkBytesToEncode) {
    // Private Key Generation
    const pkBytes = pkBytesToEncode || getSafeRand();

    // Network Encoding
    const pkNetBytes = encodePrivkeyBytes(pkBytes);

    // Double SHA-256 hash
    const shaObj = dSHA256(pkNetBytes);

    // WIF Checksum
    const checksum = shaObj.slice(0, 4);
    const keyWithChecksum = new Uint8Array(34 + checksum.length);
    writeToUint8(keyWithChecksum, pkNetBytes, 0);
    writeToUint8(keyWithChecksum, checksum, 34);

    // Return both the raw bytes and the WIF format
    return { pkBytes, strWIF: bs58.encode(keyWithChecksum) };
}

/**
 * Derive a Secp256k1 network-encoded public key (coin address) from raw private or public key bytes
 * @param {Object} options - The object to deconstruct
 * @param {String} [options.publicKey] - The hex encoded public key. Can be both compressed or uncompressed
 * @param {Array<Number> | Uint8Array} [options.pkBytes] - An array of bytes containing the private key
 * @param {"ENCODED" | "UNCOMPRESSED_HEX" | "COMPRESSED_HEX"} options.output - Output
 * @return {String} the public key with the specified encoding
 */
export function deriveAddress({ pkBytes, publicKey, output = 'ENCODED' }) {
    if (!pkBytes && !publicKey) return null;
    const compress = output !== 'UNCOMPRESSED_HEX';
    // Public Key Derivation
    let pubKeyBytes = publicKey
        ? hexToBytes(publicKey)
        : nobleSecp256k1.getPublicKey(pkBytes, compress);

    if (output === 'UNCOMPRESSED_HEX') {
        if (pubKeyBytes.length !== 65) {
            // It's actually possible, but it's probably not something that we'll need
            throw new Error("Can't uncompress an already compressed key");
        }
        return bytesToHex(pubKeyBytes);
    }

    if (pubKeyBytes.length === 65) {
        pubKeyBytes = compressPublicKey(pubKeyBytes);
    }

    if (pubKeyBytes.length != 33) {
        throw new Error('Invalid public key');
    }

    if (output === 'COMPRESSED_HEX') {
        return bytesToHex(pubKeyBytes);
    }

    // First pubkey SHA-256 hash
    const pubKeyHashing = sha256(new Uint8Array(pubKeyBytes));

    // RIPEMD160 hash
    const pubKeyHashRipemd160 = ripemd160(pubKeyHashing);

    // Network Encoding
    const pubKeyHashNetwork = new Uint8Array(pubKeyHashNetworkLen);
    pubKeyHashNetwork[0] = cChainParams.current.PUBKEY_ADDRESS;
    writeToUint8(pubKeyHashNetwork, pubKeyHashRipemd160, 1);

    // Double SHA-256 hash
    const pubKeyHashingSF = dSHA256(pubKeyHashNetwork);

    // Checksum
    const checksumPubKey = pubKeyHashingSF.slice(0, 4);

    // Public key pre-base58
    const pubKeyPreBase = new Uint8Array(pubPrebaseLen);
    writeToUint8(pubKeyPreBase, pubKeyHashNetwork, 0);
    writeToUint8(pubKeyPreBase, checksumPubKey, pubKeyHashNetworkLen);

    // Encode as Base58 human-readable network address
    return bs58.encode(pubKeyPreBase);
}

/**
 * Verify the integrity of an address
 * @param {string} strPubkey - A base58 encoded public key
 * @param {Object} [expectedKey] - The key type to check, defaults to current chain's `PUBKEY_ADDRESS`
 * @return {boolean|Error} `true` if valid, `false` if invalid
 */
export function verifyPubkey(
    strPubkey,
    expectedKey = cChainParams.current.PUBKEY_ADDRESS
) {
    // Decode base58 and verify basic integrity
    try {
        const bDecoded = bs58.decode(strPubkey);
        if (bDecoded.length !== 25) return false;
        if (bDecoded[0] !== expectedKey) return false;

        // Sha256d hash the pubkey payload
        const bDoubleSHA = dSHA256(bDecoded.slice(0, 21));

        // Verify payload integrity via checksum
        const bChecksum = bDoubleSHA.slice(0, 4);
        const bChecksumPayload = bDecoded.slice(21);
        if (!bChecksum.every((byte, i) => byte === bChecksumPayload[i]))
            return false;

        // All is valid! (base58 format, payload and checksum integrity)
        return true;
    } catch (e) {
        // Definitely not valid (likely a bad base58 string)
        return false;
    }
}

// Verify the integrity of a WIF private key, optionally parsing and returning the key payload
export function verifyWIF(
    strWIF = '',
    fParseBytes = false,
    skipVerification = false
) {
    // Convert from Base58
    const bWIF = bs58.decode(strWIF);

    if (!skipVerification) {
        // Verify the byte length
        if (bWIF.byteLength !== PRIVKEY_BYTE_LENGTH) {
            throw Error(
                'Private key length (' +
                    bWIF.byteLength +
                    ') is invalid, should be ' +
                    PRIVKEY_BYTE_LENGTH +
                    '!'
            );
        }

        // Verify the network byte
        if (bWIF[0] !== cChainParams.current.SECRET_KEY) {
            // Find the network it's trying to use, if any
            const cNetwork = Object.keys(cChainParams)
                .filter((strNet) => strNet !== 'current')
                .map((strNet) => cChainParams[strNet])
                .find((cNet) => cNet.SECRET_KEY === bWIF[0]);
            // Give a specific alert based on the byte properties
            throw Error(
                cNetwork
                    ? 'This private key is for ' +
                          (cNetwork.isTestnet ? 'Testnet' : 'Mainnet') +
                          ', wrong network!'
                    : 'This private key belongs to another coin, or is corrupted.'
            );
        }

        // Perform SHA256d hash of the WIF bytes
        const shaHash = dSHA256(bWIF.slice(0, 34));

        // Verify checksum (comparison by String since JS hates comparing object-like primitives)
        const bChecksumWIF = bWIF.slice(bWIF.byteLength - 4);
        const bChecksum = shaHash.slice(0, 4);
        if (bChecksumWIF.join('') !== bChecksum.join('')) {
            throw Error(
                'Private key checksum is invalid, key may be modified, mis-typed, or corrupt.'
            );
        }
    }

    return fParseBytes ? Uint8Array.from(bWIF.slice(1, 33)) : true;
}

// A convenient alias to verifyWIF that returns the raw byte payload
export function parseWIF(strWIF, skipVerification = false) {
    return verifyWIF(strWIF, true, skipVerification);
}
