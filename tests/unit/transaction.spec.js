import { describe, it } from 'vitest';
import {
    Transaction,
    CTxIn,
    CTxOut,
    COutpoint,
} from '../../scripts/transaction.js';

describe('transaction tests', () => {
    function getDummyTx() {
        const tx = new Transaction();
        tx.version = 1;
        tx.vin = [
            new CTxIn({
                outpoint: new COutpoint({
                    txid: 'ee0127d930f229af13c89f24a5225923baaa1b83cdc124fc607d8f15f82f126d',
                    n: 0,
                }),
                scriptSig:
                    '473044022076f02ec10f8e2888acdfb5ddd86594d9cc748cfbcab12bb86472ebb80d8ebe7002205f74dd9bd32864a5d56b8cb9cf0a7f4c615eb0dfffc93bf6b823631fc30ab4830121021b05603bb95122194b76512b1d48e29556929eee82da9bcb27ece733a6e909e9',
            }),
        ];
        tx.vout = [
            new CTxOut({
                outpoint: null, // Outpoint not needed for serialization
                script: '76a9144fa2d68062add2e67fd32718686a95d9d744f0bc88ac',
                value: 429790,
            }),
            new CTxOut({
                outpoint: null, // Outpoint not needed for serialization
                script: '76a91436cac54460ac36205c43661ef6303a66bc12026688ac',
                value: 3335221778,
            }),
        ];
        return tx;
    }
    it('serializes correctly', () => {
        const tx = getDummyTx();
        expect(tx.serialize()).toBe(
            '01000000016d122ff8158f7d60fc24c1cd831baaba235922a5249fc813af29f230d92701ee000000006a473044022076f02ec10f8e2888acdfb5ddd86594d9cc748cfbcab12bb86472ebb80d8ebe7002205f74dd9bd32864a5d56b8cb9cf0a7f4c615eb0dfffc93bf6b823631fc30ab4830121021b05603bb95122194b76512b1d48e29556929eee82da9bcb27ece733a6e909e9ffffffff02de8e0600000000001976a9144fa2d68062add2e67fd32718686a95d9d744f0bc88ac1272cbc6000000001976a91436cac54460ac36205c43661ef6303a66bc12026688ac00000000'
        );
        expect(tx.txid).toBe(
            '1c359af8ea7ce2acad650d1b474c678d308670142d68a8c4e5d9598833480803'
        );
    });

    it('deserializes correctly', () => {
        const tx = Transaction.fromHex(
            '01000000016d122ff8158f7d60fc24c1cd831baaba235922a5249fc813af29f230d92701ee000000006a473044022076f02ec10f8e2888acdfb5ddd86594d9cc748cfbcab12bb86472ebb80d8ebe7002205f74dd9bd32864a5d56b8cb9cf0a7f4c615eb0dfffc93bf6b823631fc30ab4830121021b05603bb95122194b76512b1d48e29556929eee82da9bcb27ece733a6e909e9ffffffff02de8e0600000000001976a9144fa2d68062add2e67fd32718686a95d9d744f0bc88ac1272cbc6000000001976a91436cac54460ac36205c43661ef6303a66bc12026688ac00000000'
        );
        expect(tx).toStrictEqual(getDummyTx());
    });

    it('computes sighash correctly', () => {
	const tx = getDummyTx();
	expect(tx.transactionHash(0)).toBe('');
    });
});
