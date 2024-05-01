import { parseWIF } from '../../scripts/encoding.js';
import { LegacyMasterKey } from '../../scripts/masterkey.js';
import { Wallet } from '../../scripts/wallet.js';
import { Mempool } from '../../scripts/mempool.js';
import { Transaction } from '../../scripts/transaction.js';
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
 * Creates a mainnet wallet with a legacy master key and a spendable UTXO and a dummy PIVXShield
 * @returns {Promise<Wallet>}
 */
export async function setUpMainnetWallet() {
    const mempool = new Mempool();
    const wallet = new Wallet({ nAccount: 0, isMainWallet: false, mempool });
    wallet.setMasterKey({ mk: getLegacyMainnet() });
    wallet.setShield(new PIVXShield());

    // tx_1 provides a spendable balance of 0.1 * 10^8 satoshi
    const tx_1 =
        '010000000138f9c8ac1b4c6ad54e487206daad1fd12bae510dd70fbd2dc928f617ef6b4a47010000006a47304402200d01891ac5dc6d25452cadbe7ba7edd98143631cc2922da45dde94919593b222022066ef14c01c165a1530e2acf74bcd8648d7151b555fa0bfd0222c33e983091678012102033a004cb71693e809c45e1e491bc797654fa0c012be9dd46401ce8368beb705ffffffff02d02c5d05000000001976a91463fa54dad2e215ec21c54ff45a195d49b570b97988ac80969800000000001976a914f49b25384b79685227be5418f779b98a6be4c73888ac00000000';
    await wallet.addTransaction(Transaction.fromHex(tx_1));
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
