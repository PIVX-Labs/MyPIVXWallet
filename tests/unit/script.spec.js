import { describe, it, expect } from 'vitest';
import { getAddressFromHash } from '../../scripts/script.js';
import { hexToBytes } from '../../scripts/utils.js';

describe('getAddressFromHash tests', () => {
    it.each([
        [
            '85ef00b1d1cc9dd26d7b72c65dadb9f39b99cae5',
            'DHMGiyJVH4RzZzr1r4wTYxUVyrxz5iyYF4',
        ],
        [
            'af05ca21d06b09c8387d236cdc247864a530b618',
            'DM6Xj6WH67iQXPwooj577nNeHqK77sKQVg',
        ],
    ])('gets addresses from hash (pubkeyhash)', (hash, address) => {
        expect(
            getAddressFromHash(hexToBytes(hash, 'pubkeyhash'))
        ).toStrictEqual(address);
        // Type should default to pubkeyhash
        expect(getAddressFromHash(hexToBytes(hash))).toStrictEqual(address);
    });
    it.each([
        [
            'b3be8567d0190c67ca4675a0019089c55fe695f9',
            'SdgQDpS8jDRJDX8yK8m9KnTMarsE84zdsy',
        ],
        [
            '5adc52d17be1fbcd5fe1c195e6aa9ae1520deb51',
            'SVaRnTBvR52iEDq6j9WjGVPVjWKgXdZNzj',
        ],
    ])('gets addresses from hash (coldaddress)', (hash, address) => {
        expect(
            getAddressFromHash(hexToBytes(hash), 'coldaddress')
        ).toStrictEqual(address);
    });
    it.each([
        [
            '0c25f1c431a0af6aa31e6d2c54fc582bc4be3e41',
            'EXMC7vxQLd5jESjTvwwgzDjf3fvSpyZ7f6TK',
        ],
    ])('gets addresses from hash (exchangeaddress)', (hash, address) => {
        expect(
            getAddressFromHash(hexToBytes(hash), 'exchangeaddress')
        ).toStrictEqual(address);
    });

    it('throws when type is invalid', () => {
        expect(() => getAddressFromHash([], 'invalidType')).toThrow(
            /invalid prefix/
        );
    });
});
