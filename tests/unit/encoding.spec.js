import { parseWIF } from '../../scripts/encoding.js';

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
