import { cleanAndVerifySeedPhrase } from './wallet.js';
import { parseWIF, verifyWIF } from './encoding.js';
import { cChainParams } from './chain_params.js';
import { LegacyMasterKey, HdMasterKey } from './masterkey.js';
import { PIVXShield } from 'pivx-shield';
import { mnemonicToSeed } from 'bip39';
import { decrypt } from './aes-gcm.js';
import { isBase64 } from './misc.js';

export class ParsedSecret {
    /**
     * @type {import('../masterkey.js').MasterKey} masterkey - Masterkey object derived from the secret
     */
    masterKey;
    /**
     * @type {PIVXShield} shield - Shield object associated with the secret. Only provided if the secret contains a seed
     */
    shield;
    constructor(masterKey, shield = null) {
        this.masterKey = masterKey;
        this.shield = shield;
    }

    /**
     * Parses whatever the secret is to a MasterKey
     * @param {string|number[]|Uint8Array} secret
     * @returns {Promise<ParsedSecret?>}
     */
    static async parse(secret, password = '', advancedMode) {
        const rules = [
            {
                test: (s) => Array.isArray(s) || s instanceof Uint8Array,
                f: (s) => new ParsedSecret(new LegacyMasterKey({ pkBytes: s })),
            },
            {
                test: (s) => isBase64(s) && s.length >= 128,
                f: async (s, p) => ParsedSecret.parse(await decrypt(s, p)),
            },
            {
                test: (s) => s.startsWith('xprv'),
                f: (s) => new ParsedSecret(new HdMasterKey({ xpriv: s })),
            },
            {
                test: (s) => s.startsWith('xpub'),
                f: (s) => new ParsedSecret(new HdMasterKey({ xpub: s })),
            },
            {
                test: (s) =>
                    cChainParams.current.PUBKEY_PREFIX.includes(s[0]) &&
                    s.length === 34,
                f: (s) => new ParsedSecret(new LegacyMasterKey({ address: s })),
            },
            {
                test: (s) => verifyWIF(s),
                f: (s) => ParsedSecret.parse(parseWIF(s)),
            },
            {
                test: (s) => s.includes(' '),
                f: async (s) => {
                    const { ok, msg, phrase } = await cleanAndVerifySeedPhrase(
                        s,
                        advancedMode
                    );
                    if (!ok) throw new Error(msg);
                    const seed = await mnemonicToSeed(phrase, password);
                    const pivxShield = await PIVXShield.create({
                        seed,
                        // hardcoded value considering the last checkpoint, this is good both for mainnet and testnet
                        // TODO: take the wallet creation height in input from users
                        blockHeight: 4200000,
                        coinType: cChainParams.current.BIP44_TYPE,
                        // TODO: Change account index once account system is made
                        accountIndex: 0,
                        loadSaplingData: false,
                    });
                    return new ParsedSecret(
                        new HdMasterKey({
                            seed,
                        }),
                        pivxShield
                    );
                },
            },
            {
                test: (s) => {
                    try {
                        const obj = JSON.parse(s);
                        return !!obj.mk;
                    } catch (_) {
                        return false;
                    }
                },
                f: async (s) => {
                    const obj = JSON.parse(s);
                    const mk = (await ParsedSecret.parse(obj.mk)).masterKey;
                    let shield;
                    try {
                        if (obj.shield)
                            shield = await PIVXShield.create({
                                extendedSpendingKey: obj.shield,
                                blockHeight: 4200000,
                                coinType: cChainParams.current.BIP44_TYPE,
                                accountIndex: 0,
                                loadSaplingData: false,
                            });
                    } catch (_) {}
                    return new ParsedSecret(mk, shield);
                },
            },
        ];

        for (const rule of rules) {
            let test;
            try {
                test = rule.test(secret, password);
            } catch (e) {
                test = false;
            }
            if (test) {
                return await rule.f(secret, password);
            }
        }
        return null;
        // createAlert('warning', ALERTS.FAILED_TO_IMPORT + '<br>', 6000);
    }
}
