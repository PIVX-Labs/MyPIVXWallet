import { vi } from 'vitest';
import { Transaction } from '../../transaction.js';
import { DebugTopics, debugWarn } from '../../debug.js';

export const getNetwork = vi.fn(() => {
    return globalNetwork;
});

class TestNetwork {
    // initial blockHeight
    #blockHeight = 1504903;
    getBlockCount = vi.fn(() => {
        return this.#blockHeight;
    });
    /**
     * map blockHeight -> block
     * @type {Map<number, TestBlock>}
     */
    #mapBlocks = new Map();
    /**
     * The next block that will be added to the blockchain
     * @type{TestBlock}
     */
    #nextBlock;

    constructor() {
        // Mint 5 empty blocks in the past because wallet will ask for them when calling getLatestBlocks
        this.#blockHeight -= 5;
        this.#nextBlock = new TestBlock(this.#blockHeight + 1);
        for (let i = 0; i < 5; i++) {
            this.mintBlock();
        }
    }

    get enabled() {
        return true;
    }
    getNumPages = vi.fn(() => {
        return 1;
    });

    getTxPage = vi.fn((nStartHeight, addr, _n) => {
        if (addr === 'DTSTGkncpC86sbEUZ2rCBLEe2aXSeZPLnC') {
            // 1) Legacy mainnet wallet
            // tx_1 provides a spendable balance of 0.1 * 10^8 satoshi
            const tx_1 =
                '010000000138f9c8ac1b4c6ad54e487206daad1fd12bae510dd70fbd2dc928f617ef6b4a47010000006a47304402200d01891ac5dc6d25452cadbe7ba7edd98143631cc2922da45dde94919593b222022066ef14c01c165a1530e2acf74bcd8648d7151b555fa0bfd0222c33e983091678012102033a004cb71693e809c45e1e491bc797654fa0c012be9dd46401ce8368beb705ffffffff02d02c5d05000000001976a91463fa54dad2e215ec21c54ff45a195d49b570b97988ac80969800000000001976a914f49b25384b79685227be5418f779b98a6be4c73888ac00000000';
            // tx_2 provides a spendable balance of 10000 PIVs
            const tx_2 =
                '010000000198bb641ffb74cf14e4f3e3c329fa7f97d605ca1b89d2c61a1e6d728da49342e2020000006a4730440220437d04f65dbc1e23cab38c1a6d2d2b4905ccfdea9d6e33429af8d58d3a689f41022039830fcae7545d8b5964b7c078b3d158e72e01642d274f9c3b38639d3ed292b9012103109bab9e66c51cb5da0dcc200fa7a336b8a3890489026ba7bbdf8ad379cf0251ffffffff020010a5d4e80000001976a914f49b25384b79685227be5418f779b98a6be4c73888ac228ff73e5d0100001976a914f8e77779f1787490e1459f4bde3afde5c057f6f888ac00000000';
            return [Transaction.fromHex(tx_2), Transaction.fromHex(tx_1)];
        } else if (
            addr ===
            'xpub6DVaPT3irDwUth7Y6Ff137FgA9jjvsmA2CHD7g2vjvvuMiNSUJRs9F8jSoPpXpc1s7ohR93dNAuzR5T2oPZFDTn7G2mHKYtpwtk7krNZmnV'
        ) {
            // 2) HD mainnet wallet
            // tx_1 provides a spendable balance of 1 * 10^8 satoshi to the address with path m/44'/119'/0'/0/0
            const tx_1 =
                '0100000001458de14f4f4fecfdeebfef09fb16e761bbd15029f37bec0a63b86808cbb8a512010000006b483045022100ef4f4364aea7604d749aaff7a2609e3a51a12f49500b7910b34ced0d0837e1db022012d153d96ebcb94e9b905a609c0ea97cdc99ae961be2848e0e8f2f695379c21201210371eca6799221b82cbba9e880a8a5a0f47d811f3ff5cad346931406ab0a0469eeffffffff0200e1f505000000001976a9148952bf31104625a7b3e6fcf4c79b35c6849ef74d88ac905cfb2f010000001976a9144e8d2fcf6d909c62597e4defd1c26d50842d73df88ac00000000';
            return [Transaction.fromHex(tx_1)];
        } else {
            debugWarn(
                DebugTopics.NET,
                'getLatestTxs did not find any txs this wallet! ' + addr
            );
        }
        return [];
    });

    sendTransaction = vi.fn(
        /**
         * @param {string}txHex - transaction hex
         */
        (txHex) => {
            this.#nextBlock.addTransaction(txHex, this.#blockHeight + 1);
            return true;
        }
    );
    getBlock = vi.fn(
        /**
         *
         * @param{number} blockHeight
         * @param{boolean} skipCoinstake
         */
        (blockHeight) => {
            if (!this.#mapBlocks.has(blockHeight)) {
                throw new Error('Requested block does not exist!');
            }
            return this.#mapBlocks.get(blockHeight);
        }
    );

    mintBlock() {
        const nextBlockHeight = this.#blockHeight + 1;
        if (this.#nextBlock.blockHeight !== nextBlockHeight) {
            throw new Error('Block heights do not match!');
        }
        if (this.#mapBlocks.has(nextBlockHeight)) {
            throw new Error('Block already minted!');
        }
        this.#mapBlocks.set(nextBlockHeight, structuredClone(this.#nextBlock));
        this.#blockHeight = nextBlockHeight;
        this.#nextBlock.reset();
        this.#nextBlock.blockHeight = this.#blockHeight + 1;
    }
}

/**
 * Dummy implementation of a blockchain bock
 */
class TestBlock {
    /**
     * list of transactions in the block
     * @type {TestTransaction[]}
     */
    txs = [];
    blockHeight = -1;
    constructor(blockHeight) {
        this.blockHeight = blockHeight;
    }
    /**
     * list of transactions in the block
     * @param {string} txHex - transaction hex
     * @param {number} blockHeight - blockHeight of the transaction
     */
    addTransaction(txHex, blockHeight) {
        // Sanity check
        if (blockHeight !== this.blockHeight) {
            throw new Error('Transaction and block have a different height!');
        }
        this.txs.push(new TestTransaction(txHex, blockHeight));
    }
    reset() {
        this.blockHeight = -1;
        this.txs = [];
    }
}

/**
 * Dummy implementation of a blockchain transaction
 */
class TestTransaction {
    /**
     * @type {string} - hex of the transaction
     */
    hex = '';
    blockTime = -1;
    blockHeight = -1;
    constructor(hex, blockHeight) {
        this.hex = hex;
        this.blockHeight = blockHeight;
    }
}

let globalNetwork = new TestNetwork();

export function resetNetwork() {
    globalNetwork = new TestNetwork();
}
