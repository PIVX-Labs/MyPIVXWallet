import {
    HdMasterKey,
    LegacyMasterKey,
    MasterKey,
} from '../../scripts/masterkey.js';
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
// Return + infinity so that we don't have to mock this.#shield.handleBlock(block);
PIVXShield.prototype.getLastSyncedBlock = vi.fn(() => {
    return Infinity;
});
PIVXShield.prototype.getBalance = vi.fn(() => 40 * 10 ** 8);

PIVXShield.prototype.getTxStatus = vi.fn(() => 1.0);
PIVXShield.prototype.proverIsLoaded = vi.fn(() => true);
/**
 * set up and sync a wallet
 * @param {MasterKey} masterKey - masterKey of the wallet
 * @param {boolean} includeShield
 * @returns {Promise<Wallet>}
 */
async function setUpWallet(masterKey, includeShield) {
    const mempool = new Mempool();
    const wallet = new Wallet({ nAccount: 0, isMainWallet: false, mempool });
    await wallet.setMasterKey({ mk: masterKey });
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

export function legacyMainnetInitialBalance() {
    return 10 ** 7 + 10 ** 12;
}
/**
 * Creates a mainnet wallet with a legacy master key and a spendable UTXO and a dummy PIVXShield
 * @returns {Promise<Wallet>}
 */
export async function setUpLegacyMainnetWallet() {
    // TODO: legacy wallets shouldn't have shield, make includeShield = false and rewrite some tests
    const wallet = await setUpWallet(getLegacyMainnet(), true);

    // sanity check on the balance
    expect(wallet.balance).toBe(legacyMainnetInitialBalance());
    expect(wallet.coldBalance).toBe(0);
    expect(wallet.immatureBalance).toBe(0);

    return wallet;
}

/**
 * Create a mainnet HD wallet
 * for the moment includeShield must be false, TODO: generalize
 * @param{boolean} includeShield
 * @returns{Promise<Wallet>}
 */
export async function setUpHDMainnetWallet(includeShield) {
    const wallet = await setUpWallet(getHDMainnet(), includeShield);

    // sanity check on the balance
    expect(wallet.balance).toBe(1 * 10 ** 8);
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

function getHDMainnet() {
    return new HdMasterKey({
        seed: new Uint8Array([
            159, 45, 151, 205, 11, 183, 130, 131, 116, 62, 56, 190, 142, 201,
            142, 222, 16, 196, 8, 154, 101, 90, 8, 12, 191, 160, 222, 153, 10,
            19, 97, 133, 225, 213, 43, 109, 103, 146, 79, 217, 191, 212, 211,
            95, 120, 171, 18, 126, 47, 138, 85, 99, 120, 150, 103, 108, 254,
            209, 99, 51, 209, 70, 127, 81,
        ]),
    });
}

/**
 * Returns a watch only wallet from a given address
 * @param{String} address
 */
export async function getWalletFromAddress(address) {
    return await setUpWallet(new LegacyMasterKey({ address }), false);
}
