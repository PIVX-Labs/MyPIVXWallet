import {
    setUpHDMainnetWallet,
    setUpLegacyMainnetWallet,
} from '../../utils/test_utils';

import 'fake-indexeddb/auto';
import { describe, it, vi, expect, afterAll } from 'vitest';
import {
    getNetwork,
    resetNetwork,
} from '../../../scripts/__mocks__/network.js';
import { refreshChainData } from '../../../scripts/global.js';
import { sleep } from '../../../scripts/utils.js';

vi.mock('../../../scripts/network.js');

/**
 * @param{import('scripts/wallet').Wallet} wallet - wallet that will generate the transaction
 * @param{string} address - address that will receive funds
 * @param{number} value - amounts to transfer
 * @returns {Promise<void>}
 */
async function crateAndSendTransaction(wallet, address, value) {
    const tx = wallet.createTransaction(address, value);
    await wallet.sign(tx);
    expect(getNetwork().sendTransaction(tx.serialize())).toBeTruthy();
    await wallet.addTransaction(tx);
}

async function mineAndSync() {
    getNetwork().mintBlock();
    await refreshChainData();
    // 500 milliseconds are enough time to make the wallets sync and handle the new blocks
    await sleep(500);
}

describe('Wallet sync tests', () => {
    let walletHD;
    let walletLegacy;
    beforeEach(async () => {
        resetNetwork();
        // Update the global variable blockCount
        await refreshChainData();
        walletHD = await setUpHDMainnetWallet(false);
        walletLegacy = await setUpLegacyMainnetWallet();
        // Reset indexedDB before each test
        vi.stubGlobal('indexedDB', new IDBFactory());
    });

    it('Basic 2 wallets sync test', async () => {
        // --- Verify that funds are received after sending a transaction ---
        // The legacy wallet sends the HD wallet 0.05 PIVs
        await crateAndSendTransaction(
            walletLegacy,
            walletHD.getCurrentAddress(),
            0.05 * 10 ** 8
        );
        // Mint the block with the transaction
        await mineAndSync();
        // getLatestBlocks sync up until chain tip - 1 block,
        // so at this point walletHD doesn't still know about the UTXO he received
        expect(walletHD.balance).toBe(1 * 10 ** 8);
        // mine an empty block and verify that the tx arrived
        await mineAndSync();
        expect(walletHD.balance).toBe((1 + 0.05) * 10 ** 8);

        // Sends funds back to the legacy wallet and verify that he also correctly receives funds
        const legacyBalance = walletLegacy.balance;
        await crateAndSendTransaction(
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
        for (let i = 0; i < 5; i++) {
            nAddress += 20;
            let newAddress = walletHD.getAddressFromPath(
                path.slice(0, -1) + String(nAddress)
            );
            await crateAndSendTransaction(
                walletLegacy,
                newAddress,
                0.01 * 10 ** 8
            );
            await mineAndSync();
            expect(walletHD.balance).toBe((1 + 0.01 * i) * 10 ** 8);
        }
    });
    afterAll(() => {
        vi.clearAllMocks();
    });
});
