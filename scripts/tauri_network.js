import { invoke } from '@tauri-apps/api/tauri';
import { Transaction } from './transaction.js';

export class TauriNetwork {
    enable() {}
    disable() {}
    submitAnalytics() {}
    constructor() {
        console.log(this);
    }

    /**
     * Fetch a block from the node given the height
     * @param {number} blockHeight
     * @param {boolean} skipCoinstake - if true coinstake tx will be skipped
     * @returns {Promise<Object>} the block fetched from explorer
     */
    async getBlock(blockHeight, skipCoinstake = false) {
        const block = await invoke('explorer_get_block', {
            blockHeight,
        });
        return JSON.parse(block);
    }

    async getBlockCount() {
        return await invoke('explorer_get_block_count');
    }

    async sendTransaction(transaction) {
        console.log(transaction);
        const res = await invoke('explorer_send_transaction', { transaction });
        return res;
    }

    /**
     * @return {Promise<Number[]>} The list of blocks which have at least one shield transaction
     */
    async getShieldBlockList() {
        // TODO: fixme
        return await (
            await fetch(`https://rpc.duddino.com/mainnet/getshieldblocks`)
        ).json();
    }

    /**
     * @param {import("./wallet.js").Wallet} wallet
     */
    async getLatestTxs(wallet) {
        if (wallet.isSynced) {
            throw new Error('getLatestTxs must only be for initial sync');
        }
        let nStartHeight = Math.max(
            ...wallet.getTransactions().map((tx) => tx.blockHeight)
        );
        let txs = [];
        const addresses = [];
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 1000; j++) {
                const address = wallet.getAddress(i, j);
                addresses.push(address);
            }
        }
        //for (let i = 0; i<30; i++) {
        const first = wallet.getAddress(0, 0);
        //	    const change = wallet.getAddress(1, i);

        txs = [
            ...txs,
            ...(await invoke('explorer_get_txs', {
                addresses: addresses,
            })),
        ];
        console.log(txs);
        const parsedTxs = [];
        const parseTx = async (hex, height, time) => {
            const parsed = Transaction.fromHex(hex);
            parsed.blockHeight = height;
            parsed.blockTime = time;
            parsedTxs.push(parsed);
            return parsed;
        };

        //}
        for (const [hex, height, time] of txs) {
            const parsed = await parseTx(hex, height, time);
            for (let i = 0; i < parsed.vout.length; i++) {
                const vout = parsed.vout[i];
                const path = wallet.getPath(vout.script);
                if (!path) continue;
                const tx = await invoke('explorer_get_tx_from_vin', {
                    vin: {
                        txid: parsed.txid,
                        n: i,
                    },
                });
                if (!tx) continue;
                const [hex, height, time] = tx;
                await parseTx(hex, height, time);
            }
        }
        for (const tx of parsedTxs.sort((tx) => tx.blockHeight)) {
            console.log(tx.txid);
            await wallet.addTransaction(tx);
        }
    }
}
