import { LegacyMasterKey, HdMasterKey } from '../../scripts/masterkey.js';
import { mnemonicToSeed } from 'bip39';
import { parseWIF, verifyPubkey } from '../../scripts/encoding.js';
import { cChainParams } from '../../scripts/chain_params.js';

function getLegacyMainnet() {
    return new LegacyMasterKey({
        pkBytes: parseWIF(
            'YU12G8Y9LwC3wb2cwUXvvg1iMvBey1ibCF23WBAapCuaKhd6a4R6'
        ),
    });
}

function getLegacyTestnet() {
    return new LegacyMasterKey({
        pkBytes: parseWIF(
            'cW6uViWJU7fUUsB44CDaVN3mKe7dAM3Jun8NHUajT3kgavFx91me'
        ),
    });
}

async function getHdKeyBySeed() {
    return new HdMasterKey({
        seed: await mnemonicToSeed(
            'high fruit sick panther hospital place robust seminar maze benefit shoe bleak'
        ),
    });
}
function getHdKeyByXpriv() {
    return new HdMasterKey({
        xpriv: 'xprv9s21ZrQH143K3T6FKuAJ8fZ4CrnPjPGUMDA38wmpyazxn8aNrCyebV4wh9LiD5oZyQmC5zaTDSjacWgpJ4PGzkQgFK9n1AAebt4shda53wK',
    });
}
function getHdKeyByXpub(testnet = false) {
    return new HdMasterKey({
        xpub: testnet
            ? 'xpub6BsLmaiXvY1vKDpkVv39aqWHVJYiL7ft9LS1SKwJRzv7UW5gGRCMMqBSJsqJPVQuV6k6aa8Zt8vidVTdTJotHGzaaEqFag9bMwbNWHfW86q'
            : 'xpub6D5vhgPg8E8gykS6mHhquBey5bVRmu96xedXKqcm2wNY2orePTj2oBtkgAGvm75jCNTNvRPXtXM7Kbi5trEQ4YGyqf4STGVm4pD62w1zgzM',
    });
}

describe('mainnet tests', () => {
    beforeAll(() => {
        cChainParams.current = cChainParams.main;
    });
    test('Legacy master key', async () => {
        const l = getLegacyMainnet();
        expect(await l.getAddress()).toBe('DTSTGkncpC86sbEUZ2rCBLEe2aXSeZPLnC');
        expect(await l.getKeyToExport()).toBe(
            'DTSTGkncpC86sbEUZ2rCBLEe2aXSeZPLnC'
        );
        expect(l.keyToBackup).toBe(
            'YU12G8Y9LwC3wb2cwUXvvg1iMvBey1ibCF23WBAapCuaKhd6a4R6'
        );
        expect(async () => {
            l.getxpub();
        }).rejects.toThrow(/extended public key/i);

        expect(() => getLegacyTestnet()).toThrow(/testnet/i);
    });

    test('Hd keys basic properties', async () => {
        const s = await getHdKeyBySeed();
        const pr = getHdKeyByXpriv();
        const pu = getHdKeyByXpub();
        const allKeys = [s, pr, pu];
        expect(allKeys.every((k) => !k.isHardwareWallet)).toBe(true);
        expect(allKeys.every((k) => k.isHD)).toBe(true);
        expect(s.isViewOnly).toBe(false);
        expect(pr.isViewOnly).toBe(false);
        expect(pu.isViewOnly).toBe(true);
    });

    test('Hd master key are all the same', async () => {
        const s = await getHdKeyBySeed();
        const pr = getHdKeyByXpriv();
        const pu = getHdKeyByXpub();

        expect(s.getKeyToExport(0)).toBe(
            'xpub6D5vhgPg8E8gykS6mHhquBey5bVRmu96xedXKqcm2wNY2orePTj2oBtkgAGvm75jCNTNvRPXtXM7Kbi5trEQ4YGyqf4STGVm4pD62w1zgzM'
        );
        expect(s.getKeyToExport(0)).toBe(pr.getKeyToExport(0));
        expect(s.getKeyToExport(0)).toBe(pu.getKeyToExport(0));

        expect(s.keyToBackup).toBe(
            'xprv9s21ZrQH143K3T6FKuAJ8fZ4CrnPjPGUMDA38wmpyazxn8aNrCyebV4wh9LiD5oZyQmC5zaTDSjacWgpJ4PGzkQgFK9n1AAebt4shda53wK'
        );
        expect(s.keyToBackup).toBe(pr.keyToBackup);
        expect(() => pu.keyToBackup).toThrow(/view only/i);
    });
    test('Correct derivation of HdKey', async () => {
        const keys = [
            await getHdKeyBySeed(),
            getHdKeyByXpriv(),
            getHdKeyByXpub(),
        ];
        // Taken from https://iancoleman.io/bip39/
        // Map nth account -> first 5 addresses
        const addresses = {
            0: [
                'DR658aDrQviYy3rDUGM1Mzzi12WHwqQDpE',
                'DDdiX27tHmaaZqFHXkz1SnnmK81DzFJVca',
                'DEMqSgPEvqGAhWvq11oVymyLT6aJK5NQNx',
                'DFzV4XA2KdQJx4oYJw97VoSxN21xNvqwBc',
                'DCrtxnTx7UFtx1HfKLVNFXmKvcdcoepQh1',
            ],
            1: [
                'DF9Q8himXERhrqwUq4pGQkSkunkRXJiMLk',
                'DAhRJMT3u3dF5Y1QDBoBQq9fDLRNonW68z',
                'DM7hXW79nCf9FjcF8aH5oAFYfRTSQD5sck',
                'DMQRXhooJcFwE8tgnMsQBfrc4BQD2UBKd8',
                'D6nhBBnAzBhHpaqAxmiJDMph8HByM92ovX',
            ],
            2: [
                'DFEDsA5WfRSrv5FEcHtUs9u1xdksxiLYkC',
                'DN2Nj8KHyo4fP4bshXemoYfMhX7cJpE8xq',
                'DRtGvuVRFhdHtNs2skFWT52cWNN6BuPJM2',
                'D5dfPtyZp1Bh9pyEutSL43kcw2YEBhjwLf',
                'DT6Wn5rRq2fsKfMS4cdvq9EiUPwT2SGpmV',
            ],
        };
        for (const key of keys) {
            for (const account of Object.keys(addresses)) {
                /**
                 * @type{0|1|2}
                 */
                const a = Number.parseInt(account);
                for (const [i, address] of addresses[a].entries()) {
                    // view only key has been derived using the 0th account, can't derive others
                    if (a !== 0 && key.isViewOnly) {
                        continue;
                    }
                    expect(key.getAddress(key.getDerivationPath(a, 0, i))).toBe(
                        address
                    );
                }
            }
        }
    });
    test('Correct Base58Check validation of addresses', () => {
        const arrTestAddresses = [
            'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb', // VALID
            'tLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb', // BAD
            'TLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb', // BAD
            'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4BB', // BAD
            'DLabs  zGMnsK5K9uRTMCF6NoYNY6ET4Bb', // BAD
            'i55j', // BAD
            '', // BAD
            'yJ9zhqrwEj7VAjxJZEWqEEtoWQaHK2NKye', // BAD (Testnet Address)
        ];

        // Test verifying each address and expect that each of them follow the above validity table
        for (let i = 0; i < arrTestAddresses.length; i++) {
            const address = arrTestAddresses[i];
            const isValid = verifyPubkey(address);
            // Only the first address should be valid
            expect(isValid).toBe(i === 0);
        }
    });
});

describe('testnet tests', () => {
    beforeAll(() => {
        cChainParams.current = cChainParams.testnet;
    });
    test('Legacy master key', async () => {
        const l = getLegacyTestnet();
        expect(await l.getAddress()).toBe('yKHdgqedD1xosww724TnEvohVqnNp4S3pP');
        expect(await l.getKeyToExport()).toBe(
            'yKHdgqedD1xosww724TnEvohVqnNp4S3pP'
        );
        expect(l.keyToBackup).toBe(
            'cW6uViWJU7fUUsB44CDaVN3mKe7dAM3Jun8NHUajT3kgavFx91me'
        );
        expect(async () => {
            await l.getxpub();
        }).rejects.toThrow(/extended public key/i);
        expect(() => getLegacyMainnet()).toThrow(/mainnet/i);
    });
    test('Hd master key are all the same', async () => {
        const s = await getHdKeyBySeed();
        const pr = getHdKeyByXpriv();
        const pu = getHdKeyByXpub(true);

        expect(s.getKeyToExport(0)).toBe(
            'xpub6BsLmaiXvY1vKDpkVv39aqWHVJYiL7ft9LS1SKwJRzv7UW5gGRCMMqBSJsqJPVQuV6k6aa8Zt8vidVTdTJotHGzaaEqFag9bMwbNWHfW86q'
        );
        expect(s.getKeyToExport(0)).toBe(pr.getKeyToExport(0));
        expect(s.getKeyToExport(0)).toBe(pu.getKeyToExport(0));

        expect(s.keyToBackup).toBe(
            'xprv9s21ZrQH143K3T6FKuAJ8fZ4CrnPjPGUMDA38wmpyazxn8aNrCyebV4wh9LiD5oZyQmC5zaTDSjacWgpJ4PGzkQgFK9n1AAebt4shda53wK'
        );
        expect(s.keyToBackup).toBe(pr.keyToBackup);
        expect(() => pu.keyToBackup).toThrow(/view only/i);
    });

    test('Correct derivation of HdKey', async () => {
        const keys = [
            await getHdKeyBySeed(),
            getHdKeyByXpriv(),
            getHdKeyByXpub(true),
        ];
        // Taken from https://iancoleman.io/bip39/
        // Map nth account -> first 5 addresses
        const addresses = {
            0: [
                'y5eBXdy8fhXAHFuYu3JgirBunz1SsvyQ7g',
                'yFDsWerVPm2TzekdpmuACNz2tRsCudnYmU',
                'y4Swao25gHXSELKTzn5F5is9GytZm4kkJt',
                'yBrsVZg3a3bJEoVCGTcppX2SFkGPJy7Duv',
                'y9upM38TYo79boE48NdvkdQ2Hyi2JJekRo',
            ],
            1: [
                'yAFRMPnsnCQbxRKFx6u1GhKQLafX1EHLTx',
                'yHQrYayVZxYQhBbhPxNu6C4HBSjt8AScTT',
                'xzFHoPegqHquLE8W2DMMobeRnWq11bVvMB',
                'y1bWJZST917SvrSH6ynT3keD4D3ob3VyXD',
                'xwpxLcrDywZboafRNTVvWjDXqNrw6iFDtm',
            ],
            2: [
                'y9mY3ku8SxEYEWYCK8Q1B2Sskg3pzBhBzP',
                'yDY276awC1Hg43Nxr3EuoMvHakMsX31Bgy',
                'yEKycCqkDqQs2D6DgAJWpZsN3WqmAzS5dA',
                'y5ZVwmyrBmmd4WaQjM7enqZGWT8gYYFA8P',
                'xw3MUT7M69VTdGb2WTEwMEVnFxxyrZU5GR',
            ],
        };
        for (const key of keys) {
            for (const account of Object.keys(addresses)) {
                /**
                 * @type{0|1|2}
                 */
                const a = Number.parseInt(account);
                for (const [i, address] of addresses[a].entries()) {
                    // view only key has been derived using the 0th account, can't derive others
                    if (a !== 0 && key.isViewOnly) {
                        continue;
                    }
                    expect(key.getAddress(key.getDerivationPath(a, 0, i))).toBe(
                        address
                    );
                }
            }
        }
    });
    test('Correct Base58Check validation of addresses', () => {
        const arrTestAddresses = [
            'yJ9zhqrwEj7VAjxJZEWqEEtoWQaHK2NKye', // VALID
            'tJ9zhqrwEj7VAjxJZEWqEEtoWQaHK2NKye', // BAD
            'DJ9zhqrwEj7VAjxJZEWqEEtoWQaHK2NKye', // BAD
            'yJ9zhqrwEj7VAjxJZEWqEEtoWQaHK2NKyE', // BAD
            'yJ9zh  wEj7VAjxJZEWqEEtoWQaHK2NKye', // BAD
            'i55j', // BAD
            '', // BAD
            'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb', // BAD (Mainnet Address)
        ];

        // Test verifying each address and expect that each of them follow the above validity table
        for (let i = 0; i < arrTestAddresses.length; i++) {
            const address = arrTestAddresses[i];
            const isValid = verifyPubkey(address);
            // Only the first address should be valid
            expect(isValid).toBe(i === 0);
        }
    });
});
