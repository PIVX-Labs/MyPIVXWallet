import { vi } from 'vitest';
import { UTXO, COutpoint } from '../transaction.js';

const Mempool = vi.fn();

Mempool.prototype.balance = 0.1 * 10 ** 8;
Mempool.prototype.coldBalance = 0;
Mempool.prototype.isSpent = vi.fn(() => false);
Mempool.prototype.addToOrderedTxMap = vi.fn();
Mempool.prototype.setSpent = vi.fn();
Mempool.prototype.addTransaction = vi.fn();
Mempool.prototype.getUTXOs = vi.fn(() => [
    new UTXO({
        outpoint: new COutpoint({
            txid: 'f8f968d80ac382a7b64591cc166489f66b7c4422f95fbd89f946a5041d285d7c',
            n: 1,
        }),
        script: '76a914f49b25384b79685227be5418f779b98a6be4c73888ac',
        value: 0.1 * 10 ** 8,
    }),
]);
const OutpointState = {
    OURS: 1 << 0, // This outpoint is ours

    P2PKH: 1 << 1, // This is a P2PKH outpoint
    P2CS: 1 << 2, // This is a P2CS outpoint

    SPENT: 1 << 3, // This outpoint has been spent
    IMMATURE: 1 << 4, // Coinbase/coinstake that it's not mature (hence not spendable) yet
    LOCKED: 1 << 5, // Coins in the LOCK set
};

export { Mempool, OutpointState };
