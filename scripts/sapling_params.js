import { getEventEmitter } from './event_bus.js';
/**
 * Manages fetching, caching and loading bar updates of sapling params
 */
export class SaplingParams {
    #network;
    #database;

    /**
     * @param {import('./network/network.js').Network} network
     * @param {import('./database.js').Database} database
     */
    constructor(network, database) {
        this.#network = network;
        this.#database = database;
    }

    /**
     * @param {import('pivx-shield').PIVXShield} shield
     * @returns {Promise<boolean>} true if the params have been loaded, false otherwise
     */
    async #getFromDatabase(shield) {
        try {
            const params = await this.#database.getShieldParams();
            if (!params) return false;
            const [saplingOutput, saplingSpend] = params;
            await shield.loadSaplingProverWithBytes(
                saplingOutput,
                saplingSpend
            );
            return true;
        } catch (e) {
            // The stored params are invalid, delete them
            await this.#database.setShieldParams(null, null);
            return false;
        }
    }

    /**
     * @param {import('pivx-shield').PIVXShield} shield
     */
    async fetch(shield, emitter = () => {}) {
        if (await this.#getFromDatabase(shield)) return;
        const streams = [
            {
                start: () => this.#network.getSaplingOutput(),
                ratio: 0.1,
            },
            {
                start: () => this.#network.getSaplingSpend(),
                ratio: 0.9,
            },
        ];

        let percentage = 0;

        for (const stream of streams) {
            const { start, ratio } = stream;
            const request = await start();
            const reader = request.clone().body.getReader();
            const totalBytes = request.headers?.get('Content-Length');

            while (true) {
                const { done, value } = await reader.read();
                if (value) {
                    percentage += (100 * ratio * value.length) / totalBytes;
                    emitter(
                        percentage,
                        // state: 0 = loading shield params
                        //        1 = proving tx
                        //        2 = finished
                        0
                    );
                }
                if (done) break;
            }

            stream.bytes = new Uint8Array(await request.arrayBuffer());
        }
        await shield.loadSaplingProverWithBytes(
            streams[0].bytes,
            streams[1].bytes
        );
        await this.#database.setShieldParams(
            streams[0].bytes,
            streams[1].bytes
        );
    }
}
