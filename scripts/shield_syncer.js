import { Reader } from './reader.js';
import { bytesToNum } from './encoding.js';
import { bytesToHex, sleep } from './utils.js';
import { Transaction } from './transaction.js';
import { cChainParams } from './chain_params.js';

class ShieldSyncer {
    /**
     * @returns {Block[] | null} Array of blocks or null if finished
     */
    getNextBlocks() {}
}

export class BinaryShieldSyncer extends ShieldSyncer {
    /**
     * @type {Reader}
     */
    #reader;

    /**
     * @type{import('./database.js').Database}
     */
    #database;

    #lastSyncedBlock = 0;

    #skippedBytes = 0;

    async getNextBlocks() {
        // If we are not ready (i.e. we're still downloading data before our first synced block)
        // sleep for a bit, then return to the caller so it can update the UI
        if (this.#reader.isBusy()) {
            await sleep(200);
            return [];
        }
        let txs = [];
        const blocksArray = [];
        while (blocksArray.length <= 10) {
            const packetLengthBytes = await this.#reader.read(4);
            if (!packetLengthBytes) break;
            const packetLength = Number(bytesToNum(packetLengthBytes));

            const bytes = await this.#reader.read(packetLength);
            if (!bytes) throw new Error('Stream was cut short');
            if (bytes[0] === 0x5d) {
                const height = Number(bytesToNum(bytes.slice(1, 5)));
                this.#lastSyncedBlock = height;
                const time = Number(bytesToNum(bytes.slice(5, 9)));

                blocksArray.push({ txs, height, time });
                txs = [];
            } else if (bytes[0] === 0x03) {
                // 0x03 is the tx version. We should only get v3 transactions
                const hex = bytesToHex(bytes);
                txs.push({
                    hex,
                    txid: Transaction.getTxidFromHex(hex),
                });
            } else {
                // This is neither a block or a tx.
                throw new Error('Failed to parse shield binary');
            }
        }
        if (!blocksArray.length) {
            await this.#save();
            return null;
        }
        return blocksArray;
    }

    async #save() {
        await this.#database.setShieldSyncData({
            lastSyncedBlock: this.#lastSyncedBlock,
            shieldData: this.#reader.getReadBuffer(),
        });
    }

    constructor() {
        super();

        if (new.target !== BinaryShieldSyncer)
            throw new Error('Call create instead');
    }

    /**
     * @param {import('./network/network.js').Network} network
     * @param {import('./database.js').Database} database
     * @returns {Promise<BinaryShieldSyncer>}
     */
    static async create(network, database, startFrom) {
        const { lastSyncedBlock, shieldData } =
            await database.getShieldSyncData();
        const req = await network.getShieldData(lastSyncedBlock + 1);
        const skipBytes = await network.getShieldDataLength(
            cChainParams.current.defaultStartingShieldBlock + 1,
            startFrom + 3
        );

        if (!req.ok) throw new Error("Couldn't sync shield");
        const instance = new BinaryShieldSyncer();
        instance.#lastSyncedBlock = lastSyncedBlock;
        instance.#database = database;
        instance.#reader = new Reader(req, shieldData);
        // skip the inital bytes
        instance.#reader.discard(skipBytes).then(() => {});
        // If we haven't downloaded the shield data don't treat it as skipped
        // Otherwise we may get a stuck loading bar
        instance.#skippedBytes = Math.min(skipBytes, shieldData.length);

        return instance;
    }

    getLength() {
        return this.#reader.contentLength - this.#skippedBytes;
    }

    getReadBytes() {
        return this.#reader.readBytes - this.#skippedBytes;
    }
}
