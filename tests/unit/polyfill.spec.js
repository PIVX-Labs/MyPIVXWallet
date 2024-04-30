import {
    createHash,
    createHmac,
    randomBytes,
} from '../../scripts/polyfills/crypto.js';
import { describe, it, vi } from 'vitest';
import { randomBytes as nobleRandomBytes } from '@noble/hashes/utils';
import { Buffer } from 'buffer';

vi.mock('@noble/hashes/utils', () => {
    const randomBytes = vi.fn(
        (length) => new Uint8Array(Array(length).fill(0xde))
    );
    return { randomBytes };
});

describe('polyfill tests', () => {
    it('creates sha256 hash', () => {
        const hash = createHash('sha256');
        const res = hash.update(Buffer.from([1, 2, 3])).digest();
        expect([...res]).toStrictEqual([
            3, 144, 88, 198, 242, 192, 203, 73, 44, 83, 59, 10, 77, 20, 239,
            119, 204, 15, 120, 171, 204, 206, 213, 40, 125, 132, 161, 162, 1,
            28, 251, 129,
        ]);

        expect(res).toBeInstanceOf(Buffer);
    });

    it('creates sha1 hash', () => {
        const hash = createHash('sha1');
        const res = hash.update(Buffer.from([1, 2, 3])).digest();
        expect([...res]).toStrictEqual([
            112, 55, 128, 113, 152, 194, 42, 125, 43, 8, 7, 55, 29, 118, 55,
            121, 168, 79, 223, 207,
        ]);

        expect(res).toBeInstanceOf(Buffer);
    });
    it('creates hmac of sha512', () => {
        const hash = createHmac('sha512', new Uint8Array([1]));
        const res = hash.update(Buffer.from([1, 2, 3])).digest();
        expect([...res]).toStrictEqual([
            42, 165, 188, 179, 149, 47, 231, 243, 195, 184, 211, 105, 0, 174,
            117, 166, 83, 153, 157, 205, 30, 101, 126, 120, 164, 115, 20, 51,
            27, 100, 96, 233, 201, 65, 213, 234, 78, 156, 209, 19, 237, 238,
            246, 102, 167, 244, 0, 8, 167, 49, 235, 41, 58, 41, 200, 142, 25,
            206, 236, 48, 209, 152, 148, 11,
        ]);

        expect(res).toBeInstanceOf(Buffer);
    });
    it('generates random bytes', async () => {
        const res = randomBytes(10);
        expect([...res]).toStrictEqual([
            0xde, 0xde, 0xde, 0xde, 0xde, 0xde, 0xde, 0xde, 0xde, 0xde,
        ]);
        expect(res).toBeInstanceOf(Buffer);
        expect(nobleRandomBytes).toBeCalled(1);
    });
});
