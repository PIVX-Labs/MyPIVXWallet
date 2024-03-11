import { parseWIF } from '../../scripts/encoding.js';
import { LegacyMasterKey } from '../../scripts/masterkey.js';

export function getLegacyMainnet() {
    return new LegacyMasterKey({
        pkBytes: new Uint8Array([
            181, 66, 141, 90, 213, 58, 137, 158, 160, 57, 109, 252, 51, 227,
            221, 192, 8, 4, 223, 42, 42, 8, 191, 7, 251, 231, 167, 119, 54, 161,
            194, 229,
        ]),
    });
}

export function getLegacyTestnet() {
    return new LegacyMasterKey({
        pkBytes: new Uint8Array([
            254, 60, 197, 153, 164, 198, 53, 142, 244, 155, 71, 44, 96, 5, 195,
            133, 140, 205, 48, 232, 157, 152, 118, 173, 49, 41, 118, 47, 175,
            196, 232, 82,
        ]),
    });
}
