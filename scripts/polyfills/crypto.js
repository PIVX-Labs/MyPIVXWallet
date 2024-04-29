// Lightweight polyfill for the NodeJS crypto module
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
import { hmac } from '@noble/hashes/hmac';
import { randomBytes as nobleRandomBytes } from '@noble/hashes/utils';
import { Buffer } from 'buffer';

export const createHash = (hash, options) => {
    if (!!options) throw new Error('Unfilled polyfill');
    let fun;
    switch (hash) {
        case 'sha256':
            fun = sha256;
            break;
        case 'sha1':
            fun = sha1;
            break;
        default:
            throw new Error('Unfilleld polyfill');
    }
    return {
        update: (buff) => {
            return {
                digest: () => {
                    return Buffer.from(fun(buff));
                },
            };
        },
    };
};

export const createHmac = (hash, key) => {
    if (hash !== 'sha512') throw new Error('unfilled polyfill');
    return hmac.create(sha512, key);
};

export const randomBytes = (length) => {
    return new Buffer.from(nobleRandomBytes(length));
};
