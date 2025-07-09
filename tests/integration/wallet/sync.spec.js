import {
    getWalletFromAddress,
    setUpHDMainnetWallet,
    setUpLegacyMainnetWallet,
} from '../../utils/test_utils';

import 'fake-indexeddb/auto';
import { describe, it, vi, expect, afterAll } from 'vitest';
import {
    getNetwork,
    resetNetwork,
} from '../../../scripts/network/__mocks__/network_manager.js';
import { refreshChainData } from '../../../scripts/global.js';
import { COIN } from '../../../scripts/chain_params.js';
import { flushPromises } from '@vue/test-utils';
import { HistoricalTxType } from '../../../scripts/historical_tx.js';
import { Database } from '../../../scripts/database.js';

vi.mock('../../../scripts/network/network_manager.js');

/**
 * @param{import('scripts/wallet').Wallet} wallet - wallet that will generate the transaction
 * @param{string} address - address that will receive funds
 * @param{number} value - amounts to transfer
 * @returns {Promise<void>}
 */
async function createAndSendTransaction(wallet, address, value) {
    const tx = wallet.createTransaction(address, value);
    await wallet.sign(tx);
    expect(getNetwork().sendTransaction(tx.serialize())).toBeTruthy();
    await wallet.addTransaction(tx);
}

async function mineAndSync() {
    await mineBlocks(1);
    await refreshChainData();
}

/**
 * Mine a given number of blocks
 * @param{number} nBlocks
 * @returns {Promise<void>}
 */
async function mineBlocks(nBlocks) {
    for (let i = 0; i < nBlocks; i++) {
        getNetwork().mintBlock();
    }
    await refreshChainData();
    /*
     * This is the amount of flushes we need
     * To let the wallet sync.
     * This is implementation-depended, so it's not ideal. Increase this number
     * If tests don't pass
     */
    for (let i = 0; i < 10; i++) await flushPromises();
}

describe('Wallet sync tests', () => {
    let walletHD;
    let walletLegacy;
    beforeEach(async () => {
        resetNetwork();
        const instance = await Database.getInstance();
        instance.close();

        vi.stubGlobal('indexedDB', new IDBFactory());
        // Update the global variable blockCount
        await refreshChainData();
        walletHD = await setUpHDMainnetWallet(false);
        walletLegacy = await setUpLegacyMainnetWallet();
        // Reset indexedDB before each test
    });

    it('Basic 2 wallets sync test', async () => {
        // --- Verify that funds are received after sending a transaction ---
        // The legacy wallet sends the HD wallet 0.05 PIVs
        await createAndSendTransaction(
            walletLegacy,
            walletHD.getCurrentAddress(),
            0.05 * 10 ** 8
        );
        // Mint the block with the transaction
        await mineAndSync();
        // getLatestBlocks sync up until the actual chain tip
        expect(walletHD.balance).toBe((1 + 0.05) * 10 ** 8);

        // Sends funds back to the legacy wallet and verify that he also correctly receives funds
        const legacyBalance = walletLegacy.balance;
        await createAndSendTransaction(
            walletHD,
            walletLegacy.getCurrentAddress(),
            1 * 10 ** 8
        );
        await mineAndSync();
        // again we need an empty block...
        await mineAndSync();
        expect(walletLegacy.balance - legacyBalance).toBe(1 * 10 ** 8);
    });
    it('MAX_ACCOUNT_GAP is respected', async () => {
        // --- Verify that MAX_ACCOUNT_GAP is respected ---
        // at this point the HD wallet has only 1 UTXO received at path .../0
        let path = "m/44'/119'/0'/0/0";
        let nAddress = 0;
        // So according to BIP32 standard
        // wallets must be aware of addresses up to nAddress + MAX_ACCOUNT_GAP
        for (let i = 1; i <= 5; i++) {
            nAddress += 20;
            let newAddress = walletHD.getAddressFromPath(
                path.slice(0, -1) + String(nAddress)
            );
            // Create a Tx to the new account address
            await createAndSendTransaction(
                walletLegacy,
                newAddress,
                0.01 * 10 ** 8
            );
            await mineAndSync();
            expect(walletHD.balance).toBe((1 + 0.01 * i) * 10 ** 8);
        }
    });
    it('recognizes immature balance', async () => {
        const globalNetWork = getNetwork();
        const DLabsWatchOnly = await getWalletFromAddress(
            'DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb'
        );
        // Starting point: the wallet might have some initial balance that we don't really care
        const initBalance = DLabsWatchOnly.balance;
        const initImmatureBalance = DLabsWatchOnly.immatureBalance;
        const initialColdBalance = DLabsWatchOnly.coldBalance;

        // At this point superblock happens... and people decided to fund 20k PIVs to a cat
        const superblockTx =
            '01000000012f4c0d09d96acce3e6f3dbb3d076bd5e13aae0a8cd79825fd31c81ec00bbfdba010000004847304402205d80a436187e90a416d0f30d39de8e47d2edbedf9af0bafcb1e117d4eac636e40220486914efa286caf31479f6e1d28ad82eed05acaa32b5925589682990760925e001ffffffff030000000000000000001d29131125000000232102c9461a4648cf10d61da673feb4486ee0ba9a3f62810364ff2a509a58be58a5a4ac00204aa9d10100001976a914a95cc6408a676232d61ec29dc56a180b5847835788ac00000000';
        let superblockProfit = 20000 * COIN;

        expect(globalNetWork.sendTransaction(superblockTx)).toBeTruthy();
        // Mint a couple of block to have the balance updated.
        await mineBlocks(2);
        expect(DLabsWatchOnly.immatureBalance - initImmatureBalance).toBe(
            superblockProfit
        );
        expect(DLabsWatchOnly.balance - initBalance).toBe(0);
        expect(DLabsWatchOnly.coldBalance - initialColdBalance).toBe(0);

        await mineBlocks(48);
        // after a while balance is still unchanged, but the wallet receives a cold stake reward
        expect(DLabsWatchOnly.immatureBalance - initImmatureBalance).toBe(
            superblockProfit
        );
        expect(DLabsWatchOnly.balance - initBalance).toBe(0);
        expect(DLabsWatchOnly.coldBalance - initialColdBalance).toBe(0);

        const coldStakeTx =
            '01000000016308bafc9df672f80b657fadaac1217b790a470c2cfbbb489cce59a7508b76c2010000006c47304402207718aa50f2f583815e8e6920eea7d26127bdc8fedf1af92352e736cc077862880220070d2b670cad0e57f4cb302f10e4246c3d1d211f5bdb575fd40d054c8db24c610101512102883374ead5b57d8db4a302f64b0b72e214f6a428dd1eff85919ec289ad92c52effffffff03000000000000000000007cead30b0000003376a97b63d114b3be8567d0190c67ca4675a0019089c55fe695f96714a95cc6408a676232d61ec29dc56a180b584783576888ac0046c323000000001976a914d4a0bee06c596bfd9fec604d316cbc3b67f4424e88ac00000000';
        let coldStakeProfit = 508 * COIN;
        expect(globalNetWork.sendTransaction(coldStakeTx)).toBeTruthy();
        // Mint a couple of block to have the balance updated.
        await mineBlocks(2);
        expect(DLabsWatchOnly.immatureBalance - initImmatureBalance).toBe(
            superblockProfit + coldStakeProfit
        );
        expect(DLabsWatchOnly.balance - initBalance).toBe(0);
        expect(DLabsWatchOnly.coldBalance - initialColdBalance).toBe(0);

        // 99 blocks after the superblock... still nothing
        await mineBlocks(48);
        expect(DLabsWatchOnly.immatureBalance - initImmatureBalance).toBe(
            superblockProfit + coldStakeProfit
        );
        expect(DLabsWatchOnly.balance - initBalance).toBe(0);
        expect(DLabsWatchOnly.coldBalance - initialColdBalance).toBe(0);

        await mineBlocks(1);
        expect(DLabsWatchOnly.immatureBalance - initImmatureBalance).toBe(
            coldStakeProfit
        );
        expect(DLabsWatchOnly.balance - initBalance).toBe(superblockProfit);
        expect(DLabsWatchOnly.coldBalance - initialColdBalance).toBe(0);

        // 99 blocks after the coldStake reward... unchanged
        await mineBlocks(49);
        expect(DLabsWatchOnly.immatureBalance - initImmatureBalance).toBe(
            coldStakeProfit
        );
        expect(DLabsWatchOnly.balance - initBalance).toBe(superblockProfit);
        expect(DLabsWatchOnly.coldBalance - initialColdBalance).toBe(0);

        await mineBlocks(1);
        expect(DLabsWatchOnly.immatureBalance - initImmatureBalance).toBe(0);
        expect(DLabsWatchOnly.balance - initBalance).toBe(superblockProfit);
        expect(DLabsWatchOnly.coldBalance - initialColdBalance).toBe(
            coldStakeProfit
        );
    });
    it('correctly rotates addresses', async () => {
        let rotatedAddresses = [walletHD.getCurrentAddress()];
        // 1) walletHD receives a tx to his current address
        await createAndSendTransaction(
            walletLegacy,
            rotatedAddresses[0],
            0.01 * 10 ** 8
        );
        // Transaction sent but not received. current address must remain the same.
        expect(walletHD.getCurrentAddress()).toBe(rotatedAddresses[0]);
        // Mine the block
        await mineBlocks(1);
        // Current address now must be different.
        let newAddress = walletHD.getCurrentAddress();
        expect(rotatedAddresses.includes(newAddress)).toBeFalsy();
        rotatedAddresses.push(newAddress);

        // 2) The owner of the wallet sends a transaction to himself
        await createAndSendTransaction(walletHD, newAddress, 0.01 * 10 ** 8);
        // Since the transaction is to self, rotation already happened!
        newAddress = walletHD.getCurrentAddress();
        expect(rotatedAddresses.includes(newAddress)).toBeFalsy();
        rotatedAddresses.push(newAddress);
        await mineBlocks(1);
        expect(walletHD.getCurrentAddress()).toBe(newAddress);

        // 3) Send a tx to a previous current address and verify that rotation doesn't happen
        await createAndSendTransaction(
            walletLegacy,
            rotatedAddresses[0],
            0.01 * 10 ** 8
        );
        await mineBlocks(1);
        expect(walletHD.getCurrentAddress()).toBe(newAddress);
    });
    it('correctly updates historical txs', async () => {
        // Keep track of previous historical txs
        let prevIds = walletHD.getHistoricalTxs().map((hTx) => {
            return hTx.id;
        });
        /**
         * @type {HistoricalTx[]}
         */
        let diffCache = [].concat(walletHD.getHistoricalTxs());

        // 1) Receive a transaction to the current address
        let addr = walletHD.getCurrentAddress();
        let blockHeight = getNetwork().getBlockCount() + 1;
        await createAndSendTransaction(walletLegacy, addr, 0.01 * 10 ** 8);

        // Sanity check: Before mining the block the history is unchanged (receiving from external wallet)
        getHistDiff(walletHD.getHistoricalTxs(), prevIds, 0);
        checkHistPersistence(walletHD.getHistoricalTxs(), diffCache);

        // Mine and assert that a new tx has been added
        await mineBlocks(1);
        let diff = getHistDiff(walletHD.getHistoricalTxs(), prevIds, 1);
        checkHistPersistence(walletHD.getHistoricalTxs(), diffCache);
        prevIds.push(diff[0].id);
        diffCache.push(diff[0]);
        checkHistDiff(diff[0], {
            blockHeight,
            isToSelf: false,
            type: HistoricalTxType.RECEIVED,
            receivers: [addr, walletLegacy.getCurrentAddress()],
        });

        // 2) This time send a transaction (To external wallet)
        blockHeight = getNetwork().getBlockCount() + 1;
        addr = walletLegacy.getCurrentAddress();
        await createAndSendTransaction(walletHD, addr, 0.5 * 10 ** 8);

        // Since walletHD created the tx, it must already be in its history... even without mining a block
        diff = getHistDiff(walletHD.getHistoricalTxs(), prevIds, 1);
        checkHistPersistence(walletHD.getHistoricalTxs(), diffCache);
        checkHistDiff(diff[0], {
            blockHeight: -1, // pending block height
            isToSelf: false,
            type: HistoricalTxType.SENT,
            receivers: [addr],
        });

        await mineBlocks(1);
        diff = getHistDiff(walletHD.getHistoricalTxs(), prevIds, 1);
        checkHistPersistence(walletHD.getHistoricalTxs(), diffCache);
        checkHistDiff(diff[0], {
            blockHeight,
            isToSelf: false,
            type: HistoricalTxType.SENT,
            receivers: [walletLegacy.getCurrentAddress()],
        });
        diffCache.push(diff[0]);
        prevIds.push(diff[0].id);

        // 3) Create a self transaction
        blockHeight = getNetwork().getBlockCount() + 1;
        addr = walletHD.getCurrentAddress();
        await createAndSendTransaction(walletHD, addr, 0.2 * 10 ** 8);

        diff = getHistDiff(walletHD.getHistoricalTxs(), prevIds, 1);
        checkHistPersistence(walletHD.getHistoricalTxs(), diffCache);
        checkHistDiff(diff[0], {
            blockHeight: -1, // pending block height
            isToSelf: true,
            type: HistoricalTxType.SENT,
            receivers: [addr],
        });

        await mineBlocks(1);
        diff = getHistDiff(walletHD.getHistoricalTxs(), prevIds, 1);
        checkHistPersistence(walletHD.getHistoricalTxs(), diffCache);
        checkHistDiff(diff[0], {
            blockHeight,
            isToSelf: true,
            type: HistoricalTxType.SENT,
            receivers: [addr],
        });
    });
    afterAll(() => {
        vi.clearAllMocks();
    });

    /**
     * @param {HistoricalTx[]} historicalTxs
     * @param {string[]} txIds
     * @param {number} expectedLength - expected size of the diff
     * @returns {HistoricalTx[]} the history difference
     */
    function getHistDiff(historicalTxs, txIds, expectedLength) {
        const diff = historicalTxs.filter((hTx) => {
            return !txIds.includes(hTx.id);
        });
        expect(diff.length).toBe(expectedLength);
        return diff;
    }

    /**
     * @typedef {Object} SimplifiedHistoricalTx
     * @property {number} blockHeight
     * @property {HistoricalTxType} type
     * @property {boolean} isToSelf
     * @property {string[]} receivers - a SUBSET of the receivers of a historical tx
     */

    /**
     * @param {HistoricalTx} historicalTx
     * @param {SimplifiedHistoricalTx} exp
     */
    function checkHistDiff(historicalTx, exp) {
        expect(historicalTx.blockHeight).toStrictEqual(exp.blockHeight);
        expect(historicalTx.type).toStrictEqual(exp.type);
        expect(historicalTx.isToSelf).toStrictEqual(exp.isToSelf);
        for (let r of exp.receivers) {
            expect(historicalTx.receivers.includes(r)).toBeTruthy();
        }
    }
    /**
     * @param {HistoricalTx[]} historicalTxs
     * @param {HistoricalTx[]} diffCache
     */
    function checkHistPersistence(historicalTxs, diffCache) {
        for (let hTx of diffCache) {
            expect(historicalTxs.includes(hTx)).toBeTruthy();
        }
    }
});
