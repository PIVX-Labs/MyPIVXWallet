import { describe, it, vi, beforeEach, afterAll } from 'vitest';
import { ParsedSecret } from '../../scripts/parsed_secret.js';
import secretTestCases from './parsed_secret.json';
import * as pivxShield from 'pivx-shield';
import { bytesToHex } from '../../scripts/utils.js';

vi.mock('pivx-shield', () => {
    return {
        PIVXShield: {
            create: vi.fn(),
        },
    };
});

describe('Parsed secret tests', () => {
    beforeEach(() => {
        pivxShield.PIVXShield.create = vi.fn();
    });
    it.each(secretTestCases)(
        'parses secret $secret',
        async ({ secret, password, expected }) => {
            const parsedSecret = await ParsedSecret.parse(secret, password);
            if (expected.xpriv)
                expect(parsedSecret.masterKey?.keyToBackup ?? null).toBe(
                    expected.xpriv
                );
            if (expected.xpub)
                expect(parsedSecret.masterKey?.getKeyToExport(0) ?? null).toBe(
                    expected.xpub
                );
            const { seed, extendedSpendingKey: extsk } =
                pivxShield.PIVXShield.create.mock.calls.at(-1)?.at(0) ?? {};

            if (seed) expect(bytesToHex(seed)).toBe(expected.seed);
            else {
                expect(expected.seed).toBeUndefined();
            }
            if (extsk) expect(extsk).toBe(expected.extsk);
            else {
                expect(expected.extsk).toBeUndefined();
            }
        }
    );
    afterAll(() => {
        vi.clearAllMocks();
        vi.resetAllMocks();
    });
});
