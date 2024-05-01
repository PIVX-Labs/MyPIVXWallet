import { LegacyMasterKey, MasterKey } from '../../scripts/masterkey.js';
import { Wallet } from '../../scripts/wallet.js';
import { Mempool } from '../../scripts/mempool.js';
import { vi } from 'vitest';

export function getLegacyMainnet() {
    return new LegacyMasterKey({
        pkBytes: new Uint8Array([
            181, 66, 141, 90, 213, 58, 137, 158, 160, 57, 109, 252, 51, 227,
            221, 192, 8, 4, 223, 42, 42, 8, 191, 7, 251, 231, 167, 119, 54, 161,
            194, 229,
        ]),
    });
}

export const PIVXShield = vi.fn();
PIVXShield.prototype.createTransaction = vi.fn(() => {
    return {
        hex: '00',
    };
});
PIVXShield.prototype.getBalance = vi.fn(() => 40 * 10 ** 8);

/**
 * set up and sync a wallet
 * @param {MasterKey} masterKey - masterKey of the wallet
 * @param {boolean} includeShield
 * @returns {Promise<Wallet>}
 */
async function setUpWallet(masterKey, includeShield) {
    const mempool = new Mempool();
    const wallet = new Wallet({ nAccount: 0, isMainWallet: false, mempool });
    wallet.setMasterKey(masterKey);
    await wallet.sync();
    if (includeShield) {
        // TODO: shield sync is a bit problematic and a better plan to mock it is needed
        // for the moment just set the shield after the initial sync
        wallet.setShield(new PIVXShield());
    }
    expect(wallet.isSynced).toBeTruthy();
    expect(wallet.isSyncing).toBeFalsy();
    return wallet;
}
/**
 * Creates a mainnet wallet with a legacy master key and a spendable UTXO and a dummy PIVXShield
 * @returns {Promise<Wallet>}
 */
export async function setUpLegacyMainnetWallet() {
    // TODO: legacy wallets shouldn't have shield, make includeShield = false and rewrite some tests
    const wallet = await setUpWallet(getLegacyMainnet(), true);

    // sanity check on the balance
    expect(wallet.balance).toBe(0.1 * 10 ** 8);
    expect(wallet.coldBalance).toBe(0);
    expect(wallet.immatureBalance).toBe(0);

    return wallet;
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
