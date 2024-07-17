// Lightweight polyfill for the NodeJS crypto module
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
import { sha1 } from '@noble/hashes/sha1';
import { hmac } from '@noble/hashes/hmac';
import { randomBytes as nobleRandomBytes } from '@noble/hashes/utils';
import { Buffer } from 'buffer';

class WrappedCreate {
    #hash;

    constructor(hash, ...args) {
        this.#hash = hash.create(...args);
    }

    update(buff) {
        this.#hash.update(buff);
        return this;
    }

    digest() {
        return Buffer.from(this.#hash.digest());
    }
}

export const createHash = (hash, options) => {
    if (options) throw new Error('Unfilled polyfill');
    let fun;
    switch (hash) {
        case 'sha256':
            fun = sha256;
            break;
        case 'sha1':
            fun = sha1;
            break;
        default:
            throw new Error('Unfilled polyfill');
    }
    return new WrappedCreate(fun);
};

export const createHmac = (hash, key) => {
    if (hash !== 'sha512') throw new Error('unfilled polyfill');
    return new WrappedCreate(hmac, sha512, key);
};

export const randomBytes = (length) => {
    return Buffer.from(nobleRandomBytes(length));
};
