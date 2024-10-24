import bs58 from 'bs58';
import { cChainParams } from './chain_params.js';
import { bytesToHex, dSHA256 } from './utils.js';

export const P2PK_START_INDEX = 3;
export const OWNER_START_INDEX = 6;
export const COLD_START_INDEX = 28;

export const OP = {
    // push value
    0: 0x00,
    FALSE: 0x00, // ALIAS FOR: 0
    PUSHDATA1: 0x4c,
    PUSHDATA2: 0x4d,
    PUSHDATA4: 0x4e,
    '1NEGATE': 0x4f,
    RESERVED: 0x50,
    1: 0x51,
    TRUE: 0x51, // ALIAS FOR: 1
    2: 0x52,
    3: 0x53,
    4: 0x54,
    5: 0x55,
    6: 0x56,
    7: 0x57,
    8: 0x58,
    9: 0x59,
    10: 0x5a,
    11: 0x5b,
    12: 0x5c,
    13: 0x5d,
    14: 0x5e,
    15: 0x5f,
    16: 0x60,

    // control
    NOP: 0x61,
    VER: 0x62,
    IF: 0x63,
    NOTIF: 0x64,
    VERIF: 0x65,
    VERNOTIF: 0x66,
    ELSE: 0x67,
    ENDIF: 0x68,
    VERIFY: 0x69,
    RETURN: 0x6a,

    // stack ops
    TOALTSTACK: 0x6b,
    FROMALTSTACK: 0x6c,
    '2DROP': 0x6d,
    '2DUP': 0x6e,
    '3DUP': 0x6f,
    '2OVER': 0x70,
    '2ROT': 0x71,
    '2SWAP': 0x72,
    IFDUP: 0x73,
    DEPTH: 0x74,
    DROP: 0x75,
    DUP: 0x76,
    NIP: 0x77,
    OVER: 0x78,
    PICK: 0x79,
    ROLL: 0x7a,
    ROT: 0x7b,
    SWAP: 0x7c,
    TUCK: 0x7d,

    // splice ops
    CAT: 0x7e,
    SUBSTR: 0x7f,
    LEFT: 0x80,
    RIGHT: 0x81,
    SIZE: 0x82,

    // bit logic
    INVERT: 0x83,
    AND: 0x84,
    OR: 0x85,
    XOR: 0x86,
    EQUAL: 0x87,
    EQUALVERIFY: 0x88,
    RESERVED1: 0x89,
    RESERVED2: 0x8a,

    // numeric
    '1ADD': 0x8b,
    '1SUB': 0x8c,
    '2MUL': 0x8d,
    '2DIV': 0x8e,
    NEGATE: 0x8f,
    ABS: 0x90,
    NOT: 0x91,
    '0NOTEQUAL': 0x92,

    ADD: 0x93,
    SUB: 0x94,
    MUL: 0x95,
    DIV: 0x96,
    MOD: 0x97,
    LSHIFT: 0x98,
    RSHIFT: 0x99,

    BOOLAND: 0x9a,
    BOOLOR: 0x9b,
    NUMEQUAL: 0x9c,
    NUMEQUALVERIFY: 0x9d,
    NUMNOTEQUAL: 0x9e,
    LESSTHAN: 0x9f,
    GREATERTHAN: 0xa0,
    LESSTHANOREQUAL: 0xa1,
    GREATERTHANOREQUAL: 0xa2,
    MIN: 0xa3,
    MAX: 0xa4,

    WITHIN: 0xa5,

    // crypto
    RIPEMD160: 0xa6,
    SHA1: 0xa7,
    SHA256: 0xa8,
    HASH160: 0xa9,
    HASH256: 0xaa,
    CODESEPARATOR: 0xab,
    CHECKSIG: 0xac,
    CHECKSIGVERIFY: 0xad,
    CHECKMULTISIG: 0xae,
    CHECKMULTISIGVERIFY: 0xaf,

    // expansion
    NOP1: 0xb0,
    NOP2: 0xb1,
    CHECKLOCKTIMEVERIFY: 0xb1, // ALIAS FOR: NOP2
    NOP3: 0xb2,
    NOP4: 0xb3,
    NOP5: 0xb4,
    NOP6: 0xb5,
    NOP7: 0xb6,
    NOP8: 0xb7,
    NOP9: 0xb8,
    NOP10: 0xb9,

    // zerocoin
    ZEROCOINMINT: 0xc1,
    ZEROCOINSPEND: 0xc2,
    ZEROCOINPUBLICSPEND: 0xc3,

    // cold staking
    CHECKCOLDSTAKEVERIFY_LOF: 0xd1, // last output free for masternode/budget payments
    CHECKCOLDSTAKEVERIFY: 0xd2,
    EXCHANGEADDR: 0xe0,

    INVALIDOPCODE: 0xff,
};
Object.freeze(OP);

export function getScriptForBurn(data) {
    let cScript = [];
    // Check if we're fitting any data into the TX
    if (typeof data === 'string' && data.length > 0) {
        let bData = new TextEncoder().encode(data);
        cScript.push(OP['RETURN']);
        cScript.push(OP['PUSHDATA1']);
        // Append the byte array length
        cScript.push(bData.length);
        // Convert from uint8 to array and append the byte array
        cScript = cScript.concat(Array.prototype.slice.call(bData));
    } else {
        // Empty data, create a simple RETURN script
        cScript.push(OP['RETURN']);
    }
    // Return the burn script
    return cScript;
}

/**
 * Is a given script pay to public key hash?
 * @param {Uint8Array} dataBytes - script as byte aray
 * @returns {Boolean} True if the given script is P2PKH
 */
export function isP2PKH(dataBytes) {
    return (
        dataBytes.length >= 25 &&
        dataBytes[0] == OP['DUP'] &&
        dataBytes[1] == OP['HASH160'] &&
        dataBytes[2] == 0x14 &&
        dataBytes[23] == OP['EQUALVERIFY'] &&
        dataBytes[24] == OP['CHECKSIG']
    );
}

/**
 * Is a given script pay to cold stake?
 * @param {Uint8Array} dataBytes - script as byte array
 * @returns {Boolean} True if the given script is P2CS
 */
export function isP2CS(dataBytes) {
    return (
        dataBytes.length >= 51 &&
        dataBytes[0] == OP['DUP'] &&
        dataBytes[1] == OP['HASH160'] &&
        dataBytes[2] == OP['ROT'] &&
        dataBytes[3] == OP['IF'] &&
        (dataBytes[4] == OP['CHECKCOLDSTAKEVERIFY'] ||
            dataBytes[4] == OP['CHECKCOLDSTAKEVERIFY_LOF']) &&
        dataBytes[5] == 0x14 &&
        dataBytes[26] == OP['ELSE'] &&
        dataBytes[27] == 0x14 &&
        dataBytes[48] == OP['ENDIF'] &&
        dataBytes[49] == OP['EQUALVERIFY'] &&
        dataBytes[50] == OP['CHECKSIG']
    );
}

/**
 * @param {Uint8Array} dataBytes - script as byte array
 * @returns {boolean} true if the script is p2exc, false otherwise
 */
export function isP2EXC(dataBytes) {
    return (
        dataBytes.length >= 26 &&
        dataBytes[0] == OP['EXCHANGEADDR'] &&
        dataBytes[1] == OP['DUP'] &&
        dataBytes[2] == OP['HASH160'] &&
        dataBytes[3] == 0x14 &&
        dataBytes[24] == OP['EQUALVERIFY'] &&
        dataBytes[25] == OP['CHECKSIG']
    );
}

/**
 * @param {Uint8Array} dataBytes - script as byte array
 * @returns {boolean} true if the script is a proposal feee, false otherwise
 */
export function isProposalFee(dataBytes) {
    return (
        dataBytes.length == 34 &&
        dataBytes[0] == OP['RETURN'] &&
        dataBytes[1] == 32
    );
}
/**
 * Get address from the corresponding public key hash
 * @param {Uint8Array} pkhBytes - public key hash
 * @param {'pubkeyhash'|'coldaddress'|'exchangeaddress'} type - Type of hash
 * @return {String} Base58 encoded address
 */
export function getAddressFromHash(pkhBytes, type = 'pubkeyhash') {
    const prefixes = {
        pubkeyhash: cChainParams.current.PUBKEY_ADDRESS,
        coldaddress: cChainParams.current.STAKING_ADDRESS,
        exchangeaddress: cChainParams.current.EXCHANGE_ADDRESS_PREFIX,
    };
    const prefix = prefixes[type];
    if (!prefix) throw new Error('invalid prefix');
    const buffer = new Uint8Array([...prefix, ...pkhBytes]);
    const checksum = dSHA256(buffer);
    return bs58.encode([
        ...Array.from(buffer),
        ...Array.from(checksum.slice(0, 4)),
    ]);
}
/**
 * Generate the P2KH Script from the corresponding public key
 * @param {string} pubKey - public key encoded with base58
 * @return {string} Script in HEX
 */
export function getP2PKHScript(pubKey) {
    const pkh = Uint8Array.from(bs58.decode(pubKey).slice(1, 21));
    let dataBytes = [];
    dataBytes.push(OP['DUP']);
    dataBytes.push(OP['HASH160']);
    dataBytes.push(0x14);
    dataBytes = dataBytes.concat(Array.prototype.slice.call(pkh));
    dataBytes.push(OP['EQUALVERIFY']);
    dataBytes.push(OP['CHECKSIG']);
    return bytesToHex(dataBytes);
}
