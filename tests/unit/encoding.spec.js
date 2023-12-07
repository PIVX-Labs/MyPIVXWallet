import {
    parseWIF,
    numToBytes,
    numToByteArray,
    numToVarInt,
    bytesToNum,
    varIntToNum,
} from '../../scripts/encoding.js';
import { describe, it, test, expect } from 'vitest';

describe('parse WIF tests', () => {
    it('Parses WIF correctly', () => {
        expect(
            parseWIF('YU12G8Y9LwC3wb2cwUXvvg1iMvBey1ibCF23WBAapCuaKhd6a4R6')
        ).toStrictEqual(
            new Uint8Array([
                181, 66, 141, 90, 213, 58, 137, 158, 160, 57, 109, 252, 51, 227,
                221, 192, 8, 4, 223, 42, 42, 8, 191, 7, 251, 231, 167, 119, 54,
                161, 194, 229,
            ])
        );
    });
    it('Throws when network is wrong', () => {
        expect(() =>
            parseWIF('cW6uViWJU7fUUsB44CDaVN3mKe7dAM3Jun8NHUajT3kgavFx91me')
        ).toThrow(/testnet/i);
    });
});

describe('num to bytes tests', () => {
    test('numToBytes', () => {
        expect(numToBytes(0n, 8)).toStrictEqual([0, 0, 0, 0, 0, 0, 0, 0]);
        expect(numToBytes(1n, 8)).toStrictEqual([1, 0, 0, 0, 0, 0, 0, 0]);
        expect(numToBytes(0n, 4)).toStrictEqual([0, 0, 0, 0]);
        expect(numToBytes(1n, 4)).toStrictEqual([1, 0, 0, 0]);
        // Little endian order
        expect(numToBytes(0xdeadbeefn, 4)).toStrictEqual([
            0xef, 0xbe, 0xad, 0xde,
        ]);
        expect(numToBytes(0xdeadbeefn, 8)).toStrictEqual([
            0xef, 0xbe, 0xad, 0xde, 0, 0, 0, 0,
        ]);
    });

    test('numToByteArray', () => {
        expect(numToByteArray(0n)).toStrictEqual([0]);
        expect(numToByteArray(1n)).toStrictEqual([1]);
        expect(numToByteArray(0xdeadbeefn)).toStrictEqual([
            0xef, 0xbe, 0xad, 0xde,
        ]);
        expect(numToByteArray(0xdeadbeefdeadbeefn)).toStrictEqual([
            0xef, 0xbe, 0xad, 0xde, 0xef, 0xbe, 0xad, 0xde,
        ]);
    });

    test('numToVarInt', () => {
        // Tests taken from https://wiki.bitcoinsv.io/index.php/VarInt
        expect(numToVarInt(0n)).toStrictEqual([0]);
        expect(numToVarInt(187n)).toStrictEqual([187]);
        expect(numToVarInt(255n)).toStrictEqual([0xfd, 0xff, 0x00]);
        expect(numToVarInt(0x3419n)).toStrictEqual([0xfd, 0x19, 0x34]);
        expect(numToVarInt(0x80081e5n)).toStrictEqual([
            0xfe, 0xe5, 0x81, 0x00, 0x08,
        ]);
        expect(numToVarInt(0x4bf583a17d59c158n)).toStrictEqual([
            0xff, 0x58, 0xc1, 0x59, 0x7d, 0xa1, 0x83, 0xf5, 0x4b,
        ]);
    });

    test('bytesToNum', () => {
        expect(bytesToNum([0, 0, 0, 0, 0, 0, 0, 0])).toStrictEqual(0n);
        expect(bytesToNum([1, 0, 0, 0, 0, 0, 0, 0])).toStrictEqual(1n);
        expect(bytesToNum([0, 0, 0, 0])).toStrictEqual(0n);
        expect(bytesToNum([1, 0, 0, 0])).toStrictEqual(1n);
        expect(bytesToNum([0xef, 0xbe, 0xad, 0xde])).toStrictEqual(0xdeadbeefn);
        expect(bytesToNum([0xef, 0xbe, 0xad, 0xde, 0, 0, 0, 0])).toStrictEqual(
            0xdeadbeefn
        );
    });

    test('varIntToNum', () => {
        // Tests taken from https://wiki.bitcoinsv.io/index.php/VarInt
        expect(varIntToNum([0])).toStrictEqual({
            readBytes: 1,
            num: 0n,
        });

        expect(varIntToNum([187])).toStrictEqual({
            readBytes: 1,
            num: 187n,
        });
        expect(varIntToNum([0xfd, 0xff, 0x00])).toStrictEqual({
            readBytes: 3,
            num: 255n,
        });
        expect(varIntToNum([0xfd, 0x19, 0x34])).toStrictEqual({
            readBytes: 3,
            num: 0x3419n,
        });
        expect(varIntToNum([0xfe, 0xe5, 0x81, 0x00, 0x08])).toStrictEqual({
            readBytes: 5,
            num: 0x80081e5n,
        });
        expect(
            varIntToNum([0xff, 0x58, 0xc1, 0x59, 0x7d, 0xa1, 0x83, 0xf5, 0x4b])
        ).toStrictEqual({
            readBytes: 9,
            num: 0x4bf583a17d59c158n,
        });
    });
});
