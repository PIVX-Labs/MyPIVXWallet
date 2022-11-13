'use strict';

importScripts('misc.js', 'libs/noble-secp256k1.js', 'libs/bn.js', 'libs/crypto-min.js', 'libs/crypto-sha256-hmac.js', 'libs/crypto-sha256.js', 'libs/jsbn.js', 'libs/ripemd160.js', 'libs/sha256.js');

const cKeypair = {
  'pub':  '',
  'priv': new Uint8Array()
}

onmessage = function(evt) {
    const PUBKEY_ADDRESS = evt.data;

    // Precompute buffers
    const pubKeyHashNetwork = new Uint8Array(pubKeyHashNetworkLen);
    pubKeyHashNetwork[0] = PUBKEY_ADDRESS;
    const pubKeyPreBase = new Uint8Array(pubPrebaseLen);
    while (true) {
        cKeypair.priv = getSafeRand();

        // Public Key Derivation
        const nPubkey = Crypto.util.bytesToHex(nobleSecp256k1.getPublicKey(cKeypair.priv)).substr(2);
        const pubY = uint256(nPubkey.substr(64), 16);
        const publicKeyBytesCompressed = Crypto.util.hexToBytes(nPubkey.substr(0, 64));
        publicKeyBytesCompressed.unshift(pubY.isEven() ? 0x02 : 0x03);
        // First pubkey SHA-256 Hash
        const pubKeyHashing = new jsSHA(0, 0, { "numRounds": 1 });
        pubKeyHashing.update(publicKeyBytesCompressed);
        // RIPEMD160 Hash + Network Encoding
        writeToUint8(pubKeyHashNetwork, ripemd160(pubKeyHashing.getHash(0)), 1);
        // Double SHA-256 Hash
        const pubKeyHashingS = new jsSHA(0, 0, { "numRounds": 2 });
        pubKeyHashingS.update(pubKeyHashNetwork);
        // Digest Hash, Slice Checksum & finish the prebase key
        writeToUint8(pubKeyPreBase, pubKeyHashNetwork, 0);
        writeToUint8(pubKeyPreBase, (pubKeyHashingS.getHash(0)).slice(0, 4), pubKeyHashNetworkLen);
        cKeypair.pub = to_b58(pubKeyPreBase);

        postMessage(cKeypair);
    }
}
