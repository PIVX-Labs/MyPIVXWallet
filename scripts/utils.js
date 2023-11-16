import { Buffer } from 'buffer';
import { sha256 } from '@noble/hashes/sha256';
import { sleep } from './misc.js';

export const pubKeyHashNetworkLen = 21;
export const pubChksum = 4;
export const pubPrebaseLen = pubKeyHashNetworkLen + pubChksum;

export function hexToBytes(str) {
    return Buffer.from(str, 'hex');
}

export function bytesToHex(bytes) {
    return Buffer.from(bytes).toString('hex');
}

/**
 * Double SHA256 hash a byte array
 * @param {Array<number>} buff - Bytes to hash
 * @returns {Uint8Array} Hash buffer
 */
export function dSHA256(buff) {
    return sha256(sha256(new Uint8Array(buff)));
}

/* --- UTILS --- */
// Cryptographic Random-Gen
export function getSafeRand(nSize = 32) {
    return crypto.getRandomValues(new Uint8Array(nSize));
}

export const MAP_ALPHANUMERIC =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generate a random Alpha-Numeric sequence
 * @param {number} nSize - The amount of characters to generate
 * @returns {string} - A random alphanumeric string of nSize length
 */
export function getAlphaNumericRand(nSize = 32) {
    let result = '';
    const randValues = getSafeRand(nSize);
    for (const byte of randValues) {
        const index = byte % MAP_ALPHANUMERIC.length;
        result += MAP_ALPHANUMERIC.charAt(index);
    }
    return result;
}

// Writes a sequence of Array-like bytes into a location within a Uint8Array
export function writeToUint8(arr, bytes, pos) {
    const arrLen = arr.length;
    // Sanity: ensure an overflow cannot occur, if one is detected, somewhere in MPW's state could be corrupted.
    if (arrLen - pos - bytes.length < 0) {
        const strERR =
            'CRITICAL: Overflow detected (' +
            (arrLen - pos - bytes.length) +
            '), possible state corruption, backup and refresh advised.';
        throw new Error(strERR);
    }
    let i = 0;
    while (pos < arrLen) arr[pos++] = bytes[i++];
}

/** Convert a 2D array into a CSV string */
export function arrayToCSV(data) {
    return data
        .map(
            (row) =>
                row
                    .map(String) // convert every value to String
                    .map((v) => v.replaceAll('"', '""')) // escape double colons
                    .map((v) => `"${v}"`) // quote it
                    .join(',') // comma-separated
        )
        .join('\r\n'); // rows starting on new lines
}

/**
 * Start a batch of promises, processing them concurrently up to `batchSize`.
 * This does *not* run them in parallel. Only 1 CPU core is used
 * @template T
 * @param {(number)=>Promise<T>} promiseFactory - Function that spawns promises based
 * on a number. 0 is the first, length-1 is the last one.
 * @param {number} length - How many promises to spawn
 * @param {number} batchSize - How many promises to spawn at a time
 * @returns {Promise<T[]>} array of the return value of the promise.
 * It's guaranteed to be in the sorted, i.e. it will contain
 * [ await promsieFactory(0), await promisefactory(1), ... ]
 * If the promises depend on each other, then behavior is undefined
 */
export async function startBatch(
    promiseFactory,
    length,
    batchSize,
    retryTime = 10000
) {
    return new Promise((res) => {
        const running = [];
        let i = 0;
        const startNext = async (p) => {
            let result;
            let current = i;
            try {
                result = await p;
            } catch (e) {
                // Try again later
                await sleep(retryTime);
                running[current] = startNext(current);
                return;
            }
            i++;
            if (i < length) {
                running.push(startNext(promiseFactory(i)));
            } else {
                (async () => res(await Promise.all(running)))();
            }
            return result;
        };
        // Start fisrt batchsize promises
        for (i = 0; i < batchSize; i++) {
            running.push(startNext(promiseFactory(i)));
        }
        --i;
    });
}
