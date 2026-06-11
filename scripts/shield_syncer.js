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

// Sapling wire field sizes (bytes) inside a compact tx packet.
const NULLIFIER_LEN = 32;
const CV_LEN = 32; // 0x04 only; unused for IVK decryption
const CMU_LEN = 32;
const EPK_LEN = 32;
const ENC_CIPHERTEXT_LEN = 580;
const OUT_CIPHERTEXT_LEN = 80; // 0x04 only; unused (no OVK recovery yet)

// Upper bound on a single packet's declared length. The largest legitimate
// packet is a compact tx with 255 spends + 255 outputs (~200KB) or a full v3
// transaction; 10 MiB is far above either. Guards against a hostile/corrupt
// length prefix triggering a multi-GB allocation in `reader.read()`.
const MAX_PACKET_LENGTH = 10 * 1024 * 1024;

/**
 * Read a Bitcoin CompactSize varint at `pos`. Returns `[value, nextPos]`.
 * `< 0xfd` is a single byte; `0xfd`/`0xfe`/`0xff` prefix a 2/4/8-byte LE value.
 * @param {Uint8Array} bytes
 * @param {number} pos
 * @returns {[number, number]}
 */
function readCompactSize(bytes, pos) {
    const first = bytes[pos];
    if (first === undefined) {
        throw new Error('Truncated compact size in shield packet');
    }
    if (first < 0xfd) return [first, pos + 1];
    const width = first === 0xfd ? 2 : first === 0xfe ? 4 : 8;
    if (pos + 1 + width > bytes.length) {
        throw new Error('Truncated compact size in shield packet');
    }
    return [Number(bytesToNum(bytes.slice(pos + 1, pos + 1 + width))), pos + 1 + width];
}

/**
 * Parse a compact transaction packet. Two wire layouts are accepted:
 *   0x04 (Compact):     per output cv(32) + cmu(32) + epk(32) + enc(580) + out_ct(80)
 *   0x05 (CompactPlus): per output           cmu(32) + epk(32) + enc(580)
 * Both share the header `[type:1][nSpends:CompactSize][nOutputs:CompactSize]`
 * followed by `nSpends` nullifiers of 32 bytes. Only cmu/epk/enc are needed for
 * IVK decryption, so the `cv` and `out_ciphertext` carried by the 0x04 layout
 * are skipped — and the 0x05 stream avoids downloading them (~112 bytes/output).
 *
 * Counts are CompactSize varints (not single bytes): a tx can legitimately have
 * >255 spends/outputs, and a u8 count silently truncated those (dropping
 * nullifiers/outputs → wrong balance). For counts <253 the encoding is a single
 * byte, identical to the old format.
 *
 * The data comes from a remote bridge, so a truncated/malformed packet must fail
 * loudly rather than slice past the end (Uint8Array.slice silently returns a
 * short array, which would feed truncated cmu/epk/enc downstream and desync the
 * commitment tree). We require the packet to hold at least the declared fields.
 * @param {Uint8Array} bytes - packet payload (first byte is the type)
 */
function parseCompactTx(bytes) {
    const hasCvAndOutCt = bytes[0] === 0x04;
    let pos = 1;
    let nSpends, nOutputs;
    [nSpends, pos] = readCompactSize(bytes, pos);
    [nOutputs, pos] = readCompactSize(bytes, pos);
    const headerLen = pos; // 1 (type) + CompactSize(nSpends) + CompactSize(nOutputs)

    const perOutput =
        (hasCvAndOutCt ? CV_LEN : 0) +
        CMU_LEN +
        EPK_LEN +
        ENC_CIPHERTEXT_LEN +
        (hasCvAndOutCt ? OUT_CIPHERTEXT_LEN : 0);
    const minLength = headerLen + nSpends * NULLIFIER_LEN + nOutputs * perOutput;
    if (bytes.length < minLength) {
        throw new Error(
            `Truncated compact tx packet: length ${bytes.length} < required ${minLength} (nSpends=${nSpends}, nOutputs=${nOutputs})`
        );
    }

    const nullifiers = [];
    for (let i = 0; i < nSpends; i++) {
        nullifiers.push(bytesToHex(bytes.slice(pos, pos + NULLIFIER_LEN)));
        pos += NULLIFIER_LEN;
    }

    const outputs = [];
    for (let i = 0; i < nOutputs; i++) {
        if (hasCvAndOutCt) pos += CV_LEN; // cv — unused for IVK decryption
        // Keep cmu/epk/enc as raw bytes — passed straight to the worker (as
        // Uint8Array) so neither side hex-encodes the 580-byte ciphertext.
        const cmu = bytes.slice(pos, pos + CMU_LEN);
        pos += CMU_LEN;
        const epk = bytes.slice(pos, pos + EPK_LEN);
        pos += EPK_LEN;
        const enc_ciphertext = bytes.slice(pos, pos + ENC_CIPHERTEXT_LEN);
        pos += ENC_CIPHERTEXT_LEN;
        if (hasCvAndOutCt) pos += OUT_CIPHERTEXT_LEN; // out_ciphertext — retained in 0x04 stream for future OVK/sent-memo recovery
        outputs.push({ cmu, epk, enc_ciphertext });
    }

    return { nullifiers, outputs };
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

    /**
     * Whether we're using the compact (0x04) stream format.
     */
    #isCompact = false;

    /**
     * In-progress compact block whose transactions are still being read.
     *
     * In the compact stream the `0x5d` packet is a block HEADER that precedes
     * its `0x04` transaction packets, so a block isn't complete until the next
     * header (or end of stream) arrives. We hold it here and carry it across
     * `getNextBlocks()` calls — otherwise a batch boundary landing right after
     * a header would return an empty block and silently drop its transactions
     * on the next call (their commitment-tree appends would be lost).
     * @type {Block | null}
     */
    #pendingBlock = null;

    /**
     * Wall time (ms) spent blocked awaiting bytes from the network reader.
     * This is the download cost on the critical path (not overlapped by
     * processing). Kept separate from parse time so benchmarks don't conflate
     * "waiting for the download" with "parsing the stream".
     */
    #readWaitMs = 0;

    /** Wall time (ms) spent parsing packets into block/tx objects. */
    #parseMs = 0;

    async getNextBlocks() {
        // If we are not ready (i.e. we're still downloading data before our first synced block)
        // sleep for a bit, then return to the caller so it can update the UI
        if (this.#reader.isBusy()) {
            await sleep(200);
            return [];
        }
        let txs = [];
        const blocksArray = [];
        const batchSize = this.#isCompact ? 500 : 200;
        while (blocksArray.length <= batchSize) {
            // ── network-wait: time blocked awaiting bytes from the reader ──
            const readStart = performance.now();
            const packetLengthBytes = await this.#reader.read(4);
            if (!packetLengthBytes) {
                this.#readWaitMs += performance.now() - readStart;
                // End of stream: the in-progress compact block (if any) is now
                // complete — all its transactions have been read. Finalize it.
                if (this.#pendingBlock) {
                    this.#lastSyncedBlock = this.#pendingBlock.height;
                    blocksArray.push(this.#pendingBlock);
                    this.#pendingBlock = null;
                }
                break;
            }
            const packetLength = Number(bytesToNum(packetLengthBytes));
            if (packetLength > MAX_PACKET_LENGTH) {
                throw new Error(
                    `Shield packet length ${packetLength} exceeds maximum ${MAX_PACKET_LENGTH}`
                );
            }

            const bytes = await this.#reader.read(packetLength);
            this.#readWaitMs += performance.now() - readStart;
            if (!bytes) throw new Error('Stream was cut short');

            // ── parse: CPU time turning packet bytes into block/tx objects ──
            const parseStart = performance.now();
            if (bytes[0] === 0x5d) {
                // Detect format from packet size: 5 bytes = compact header, 9 bytes = PivxCompat footer
                if (packetLength === 5 || this.#isCompact) {
                    // Compact format: 0x5d is a block HEADER (before txs). Finalize
                    // the previous block — its txs are fully read now — and open a
                    // new pending block that carries across batch boundaries.
                    this.#isCompact = true;
                    const height = Number(bytesToNum(bytes.slice(1, 5)));
                    if (this.#pendingBlock) {
                        this.#lastSyncedBlock = this.#pendingBlock.height;
                        blocksArray.push(this.#pendingBlock);
                    }
                    this.#pendingBlock = { txs: [], height, compact: true };
                } else {
                    // PivxCompat format: 0x5d is a block FOOTER (after txs, 9 bytes with time)
                    const height = Number(bytesToNum(bytes.slice(1, 5)));
                    this.#lastSyncedBlock = height;
                    const time = Number(bytesToNum(bytes.slice(5, 9)));
                    blocksArray.push({ txs, height, time });
                    txs = [];
                }
            } else if (bytes[0] === 0x04 || bytes[0] === 0x05) {
                // Compact transaction (0x04) or CompactPlus (0x05) — belongs to
                // the current pending block. A compact tx with no open block
                // means the stream is malformed; dropping it would silently
                // desync the commitment tree, so fail loudly instead.
                this.#isCompact = true;
                if (!this.#pendingBlock) {
                    throw new Error(
                        'Compact transaction packet before any block header'
                    );
                }
                this.#pendingBlock.txs.push(parseCompactTx(bytes));
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
            this.#parseMs += performance.now() - parseStart;
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
            startFrom + 1
        );

        if (!req.ok) throw new Error("Couldn't sync shield");
        const instance = new BinaryShieldSyncer();
        instance.#lastSyncedBlock = lastSyncedBlock;
        instance.#database = database;
        // Compact format: don't reuse saved PivxCompat buffer — formats are
        // incompatible and the Reader would feed old 0x03 packets to the
        // compact parser. The compact stream is small enough to re-download.
        instance.#reader = new Reader(req, new Uint8Array(0));
        instance.#skippedBytes = 0;

        return instance;
    }

    getLength() {
        return this.#reader.contentLength - this.#skippedBytes;
    }

    getReadBytes() {
        return this.#reader.readBytes - this.#skippedBytes;
    }

    /** ms spent blocked waiting for network bytes (download on critical path). */
    getReadWaitMs() {
        return this.#readWaitMs;
    }

    /** ms spent parsing packets into block/tx objects (pure CPU). */
    getParseMs() {
        return this.#parseMs;
    }
}
