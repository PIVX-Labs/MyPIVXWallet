import { parseWIF, numToBytes, numToByteArray, numToVarInt, bytesToNum } from '../../scripts/encoding.js';
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
	expect(numToBytes(0xdeadbeefn, 4)).toStrictEqual([0xef, 0xbe, 0xad, 0xde]);
	expect(numToBytes(0xdeadbeefn, 8)).toStrictEqual([0xef, 0xbe, 0xad, 0xde, 0, 0, 0, 0]);
    });

    test('numToByteArray', () => {
	expect(numToByteArray(0n)).toStrictEqual([0]);
	expect(numToByteArray(1n)).toStrictEqual([1]);
	expect(numToByteArray(0xdeadbeefn)).toStrictEqual([0xef, 0xbe, 0xad, 0xde]);
	expect(numToByteArray(0xdeadbeefdeadbeefn)).toStrictEqual([0xef, 0xbe, 0xad, 0xde, 0xef, 0xbe, 0xad, 0xde]);
    });
    
    test('numToVarInt', () => {
	// Tests taken from https://wiki.bitcoinsv.io/index.php/VarInt
	expect(numToVarInt(187n)).toStrictEqual([187]);
	expect(numToVarInt(255n)).toStrictEqual([0xfd, 0xff, 0x00]);
	expect(numToVarInt(0x3419n)).toStrictEqual([0xFd, 0x19, 0x34])
	expect(numToVarInt(0x80081E5n)).toStrictEqual([0xFE,0xE5,0x81,0x00,0x08]);
	expect(numToVarInt(0x4BF583A17D59C158n)).toStrictEqual([0xFF, 0x58, 0xC1, 0x59, 0x7D, 0xA1, 0x83, 0xF5, 0x4B]);
    });
    
    test('bytesToNum', () => {
	expect(bytesToNum([0, 0, 0, 0, 0, 0, 0, 0])).toStrictEqual(0n);
	expect(bytesToNum([1, 0, 0, 0, 0, 0, 0, 0])).toStrictEqual(1n);
	expect(bytesToNum([0, 0, 0, 0])).toStrictEqual(0n);
	expect(bytesToNum([1, 0, 0, 0])).toStrictEqual(1n);
	expect(bytesToNum([0xef, 0xbe, 0xad, 0xde])).toStrictEqual(0xdeadbeefn);
	expect(bytesToNum([0xef, 0xbe, 0xad, 0xde, 0, 0, 0, 0])).toStrictEqual(0xdeadbeefn);
    });
});
