import { validateMnemonic } from 'bip39';
import { decrypt } from './aes-gcm.js';
import { beforeUnloadListener } from './global.js';
import { getNetwork } from './network.js';
import { MAX_ACCOUNT_GAP } from './chain_params.js';
import { Mempool } from './mempool.js';
import { HistoricalTx, HistoricalTxType } from './historical_tx.js';
import { COutpoint, Transaction } from './transaction.js';
import { confirmPopup, createAlert } from './misc.js';
import { cChainParams } from './chain_params.js';
import { COIN } from './chain_params.js';
import { ALERTS, tr, translation } from './i18n.js';
import { encrypt } from './aes-gcm.js';
import { Database } from './database.js';
import { guiRenderCurrentReceiveModal } from './contacts-book.js';
import { Account } from './accounts.js';
import { fAdvancedMode } from './settings.js';
import { bytesToHex, hexToBytes } from './utils.js';
import { strHardwareName } from './ledger.js';
import { OutpointState } from './mempool.js';
import {
    isP2CS,
    isP2PKH,
    getAddressFromHash,
    COLD_START_INDEX,
    P2PK_START_INDEX,
    OWNER_START_INDEX,
} from './script.js';
import { TransactionBuilder } from './transaction_builder.js';

/**
 * Class Wallet, at the moment it is just a "realization" of Masterkey with a given nAccount
 * it also remembers which addresses we generated.
 * in future PRs this class will manage balance, UTXOs, masternode etc...
 */
export class Wallet {
    /**
     * We are using two chains: The external chain, and the internal one (i.e. change addresses)
     * See https://github.com/bitcoin/bips/blob/master/bip-0048.mediawiki for more info
     * (Change paragraph)
     */
    static chains = 2;
    /**
     * @type {import('./masterkey.js').MasterKey}
     */
    #masterKey;
    /**
     * @type {number}
     */
    #nAccount;

    /**
     * Map bip48 change -> Loaded index
     * Number of loaded indexes, loaded means that they are in the ownAddresses map
     * @type {Map<number, number>}
     */
    #loadedIndexes = new Map();
    /**
     * Map bip48 change -> Highest used index
     * Highest index used, where used means that the corresponding address is on chain (for example in a tx)
     * @type {Map<number, number>}
     */
    #highestUsedIndices = new Map();
    /**
     * @type {Map<number, number>}
     */
    #addressIndices = new Map();
    /**
     * Map our own address -> Path
     * @type {Map<String, String?>}
     */
    #ownAddresses = new Map();
    /**
     * Map public key hash -> Address
     * @type {Map<String,String>}
     */
    #knownPKH = new Map();
    /**
     * True if this is the global wallet, false otherwise
     * @type {Boolean}
     */
    #isMainWallet;

    /**
     * @type {Mempool}
     */
    #mempool;

    /**
     * Set of unique representations of Outpoints that keep track of locked utxos.
     * @type {Set<String>}
     */
    constructor(nAccount, isMainWallet, mempool = new Mempool()) {
        this.#nAccount = nAccount;
        this.#isMainWallet = isMainWallet;
        this.#mempool = mempool;
        for (let i = 0; i < Wallet.chains; i++) {
            this.#highestUsedIndices.set(i, 0);
            this.#loadedIndexes.set(i, 0);
        }
    }

    /**
     * Check whether a given outpoint is locked
     * @param {COutpoint} opt
     * @return {boolean} true if opt is locked, false otherwise
     */
    isCoinLocked(opt) {
        return !!(this.#mempool.getOutpointStatus(opt) & OutpointState.LOCKED);
    }

    /**
     * Lock a given Outpoint
     * @param {COutpoint} opt
     */
    lockCoin(opt) {
        this.#mempool.addOutpointStatus(opt, OutpointState.LOCKED);
    }

    /**
     * Unlock a given Outpoint
     * @param {COutpoint} opt
     */
    unlockCoin(opt) {
        this.#mempool.removeOutpointStatus(opt, OutpointState.LOCKED);
    }

    getMasterKey() {
        return this.#masterKey;
    }

    /**
     * Gets the Cold Staking Address for the current wallet, while considering user settings and network automatically.
     * @return {Promise<String>} Cold Address
     */
    async getColdStakingAddress() {
        // Check if we have an Account with custom Cold Staking settings
        const cDB = await Database.getInstance();
        const cAccount = await cDB.getAccount();

        // If there's an account with a Cold Address, return it, otherwise return the default
        return (
            cAccount?.coldAddress ||
            cChainParams.current.defaultColdStakingAddress
        );
    }

    get nAccount() {
        return this.#nAccount;
    }

    wipePrivateData() {
        this.#masterKey.wipePrivateData(this.#nAccount);
    }

    isViewOnly() {
        if (!this.#masterKey) return false;
        return this.#masterKey.isViewOnly;
    }

    isHD() {
        if (!this.#masterKey) return false;
        return this.#masterKey.isHD;
    }

    async hasWalletUnlocked(fIncludeNetwork = false) {
        if (fIncludeNetwork && !getNetwork().enabled)
            return createAlert(
                'warning',
                ALERTS.WALLET_OFFLINE_AUTOMATIC,
                5500
            );
        if (!this.isLoaded()) {
            return createAlert(
                'warning',
                tr(ALERTS.WALLET_UNLOCK_IMPORT, [
                    {
                        unlock: (await hasEncryptedWallet())
                            ? 'unlock '
                            : 'import/create',
                    },
                ]),
                3500
            );
        } else {
            return true;
        }
    }

    /**
     * Set or replace the active Master Key with a new Master Key
     * @param {import('./masterkey.js').MasterKey} mk - The new Master Key to set active
     */
    setMasterKey(mk, nAccount = 0) {
        const isNewAcc =
            mk?.getKeyToExport(nAccount) !==
            this.#masterKey?.getKeyToExport(this.#nAccount);
        this.#masterKey = mk;
        this.#nAccount = nAccount;
        if (isNewAcc) {
            this.reset();
            // If this is the global wallet update the network master key
            if (this.#isMainWallet) {
                getNetwork().setWallet(this);
            }
            for (let i = 0; i < Wallet.chains; i++) this.loadAddresses(i);
        }
    }

    /**
     * Reset the wallet, indexes address map and so on
     */
    reset() {
        this.#highestUsedIndices = new Map();
        this.#loadedIndexes = new Map();
        this.#ownAddresses = new Map();
        this.#addressIndices = new Map();
        // TODO: readd this.#mempool = new Mempool();
        for (let i = 0; i < Wallet.chains; i++) {
            this.#highestUsedIndices.set(i, 0);
            this.#loadedIndexes.set(i, 0);
            this.#addressIndices.set(i, 0);
        }
        // TODO: This needs to be refactored to remove the getNetwork dependency
        if (this.#isMainWallet) {
            getNetwork().reset();
        }
    }

    /**
     * Derive the current address (by internal index)
     * @return {string} Address
     *
     */
    getCurrentAddress() {
        return this.getAddress(0, this.#addressIndices.get(0));
    }

    /**
     * Derive a generic address (given nReceiving and nIndex)
     * @return {string} Address
     */
    getAddress(nReceiving = 0, nIndex = 0) {
        const path = this.getDerivationPath(nReceiving, nIndex);
        return this.#masterKey.getAddress(path);
    }

    /**
     * Derive a generic address (given the full path)
     * @return {string} Address
     */
    getAddressFromPath(path) {
        return this.#masterKey.getAddress(path);
    }

    /**
     * Derive xpub (given nReceiving and nIndex)
     * @return {string} Address
     */
    getXPub(nReceiving = 0, nIndex = 0) {
        // Get our current wallet XPub
        const derivationPath = this.getDerivationPath(nReceiving, nIndex)
            .split('/')
            .slice(0, 4)
            .join('/');
        return this.#masterKey.getxpub(derivationPath);
    }

    /**
     * Derive xpub (given nReceiving and nIndex)
     * @return {boolean} Return true if a masterKey has been loaded in the wallet
     */
    isLoaded() {
        return !!this.#masterKey;
    }

    /**
     * Check if the current encrypted keyToBackup can be decrypted with the given password
     * @param {string} strPassword
     * @return {Promise<boolean>}
     */
    async checkDecryptPassword(strPassword) {
        // Check if there's any encrypted WIF available
        const database = await Database.getInstance();
        const { encWif: strEncWIF } = await database.getAccount();
        if (!strEncWIF || strEncWIF.length < 1) return false;

        const strDecWIF = await decrypt(strEncWIF, strPassword);
        return !!strDecWIF;
    }

    /**
     * Encrypt the keyToBackup with a given password
     * @param {string} strPassword
     * @returns {Promise<boolean}
     */
    async encrypt(strPassword) {
        // Encrypt the wallet WIF with AES-GCM and a user-chosen password - suitable for browser storage
        let strEncWIF = await encrypt(this.#masterKey.keyToBackup, strPassword);
        if (!strEncWIF) return false;

        // Prepare to Add/Update an account in the DB
        const cAccount = new Account({
            publicKey: this.getKeyToExport(),
            encWif: strEncWIF,
        });

        // Incase of a "Change Password", we check if an Account already exists
        const database = await Database.getInstance();
        if (await database.getAccount()) {
            // Update the existing Account (new encWif) in the DB
            await database.updateAccount(cAccount);
        } else {
            // Add the new Account to the DB
            await database.addAccount(cAccount);
        }

        // Remove the exit blocker, we can annoy the user less knowing the key is safe in their database!
        removeEventListener('beforeunload', beforeUnloadListener, {
            capture: true,
        });
        return true;
    }

    /**
     * @return [string, string] Address and its BIP32 derivation path
     */
    getNewAddress(nReceiving = 0) {
        const last = this.#highestUsedIndices.get(nReceiving);
        this.#addressIndices.set(
            nReceiving,
            (this.#addressIndices.get(nReceiving) > last
                ? this.#addressIndices.get(nReceiving)
                : last) + 1
        );
        if (this.#addressIndices.get(nReceiving) - last > MAX_ACCOUNT_GAP) {
            // If the user creates more than ${MAX_ACCOUNT_GAP} empty wallets we will not be able to sync them!
            this.#addressIndices.set(nReceiving, last);
        }
        const path = this.getDerivationPath(
            nReceiving,
            this.#addressIndices.get(nReceiving)
        );
        const address = this.getAddress(
            nReceiving,
            this.#addressIndices.get(nReceiving)
        );
        return [address, path];
    }

    isHardwareWallet() {
        return this.#masterKey?.isHardwareWallet === true;
    }

    /**
     * Check if the vout is owned and in case update highestUsedIdex
     * @param {CTxOut} vout
     */
    updateHighestUsedIndex(vout) {
        const dataBytes = hexToBytes(vout.script);
        const iStart = isP2PKH(dataBytes) ? P2PK_START_INDEX : COLD_START_INDEX;
        const address = this.getAddressFromHashCache(
            bytesToHex(dataBytes.slice(iStart, iStart + 20)),
            false
        );
        const path = this.isOwnAddress(address);
        if (path) {
            const nReceiving = parseInt(path.split('/')[4]);
            this.#highestUsedIndices.set(
                nReceiving,
                Math.max(
                    parseInt(path.split('/')[5]),
                    this.#highestUsedIndices.get(nReceiving)
                )
            );
            if (
                this.#highestUsedIndices.get(nReceiving) + MAX_ACCOUNT_GAP >=
                this.#loadedIndexes.get(nReceiving)
            ) {
                this.loadAddresses(nReceiving);
            }
        }
    }

    /**
     * Load MAX_ACCOUNT_GAP inside #ownAddresses map.
     * @param {number} chain - Chain to load
     */
    loadAddresses(chain) {
        if (this.isHD()) {
            const start = this.#loadedIndexes.get(chain);
            const end = start + MAX_ACCOUNT_GAP;
            for (let i = start; i <= end; i++) {
                const path = this.getDerivationPath(chain, i);
                const address = this.#masterKey.getAddress(path);
                this.#ownAddresses.set(address, path);
            }

            this.#loadedIndexes.set(chain, end);
        } else {
            this.#ownAddresses.set(this.getKeyToExport(), ':)');
        }
    }

    /**
     * @param {string} address - address to check
     * @return {string?} BIP32 path or null if it's not your address
     */
    isOwnAddress(address) {
        return this.#ownAddresses.get(address) ?? null;
    }

    /**
     * @return {String} BIP32 path or null if it's not your address
     */
    getDerivationPath(nReceiving = 0, nIndex = 0) {
        return this.#masterKey.getDerivationPath(
            this.#nAccount,
            nReceiving,
            nIndex
        );
    }

    getKeyToExport() {
        return this.#masterKey?.getKeyToExport(this.#nAccount);
    }

    async getKeyToBackup() {
        if (await hasEncryptedWallet()) {
            const account = await (await Database.getInstance()).getAccount();
            return account.encWif;
        } else {
            return this.getMasterKey()?.keyToBackup;
        }
    }

    //Get path from a script
    getPath(script) {
        const dataBytes = hexToBytes(script);
        // At the moment we support only P2PKH and P2CS
        const iStart = isP2PKH(dataBytes) ? P2PK_START_INDEX : COLD_START_INDEX;
        const address = this.getAddressFromHashCache(
            bytesToHex(dataBytes.slice(iStart, iStart + 20)),
            false
        );
        return this.isOwnAddress(address);
    }

    /**
     * Get the outpoint state based on the script.
     * This functions only tells us the type of the script and if it's ours
     * It doesn't know about LOCK, IMMATURE or SPENT statuses, for that
     * it's necessary to interrogate the mempool
     */
    getScriptType(script) {
        const { type, addresses } = this.getAddressesFromScript(script);
        let status = 0;
        const isOurs = addresses.some((s) => this.isOwnAddress(s));
        if (isOurs) status |= OutpointState.OURS;
        if (type === 'p2pkh') status |= OutpointState.P2PKH;
        if (type === 'p2cs') {
            status |= OutpointState.P2CS;
        }
        return status;
    }

    /**
     * Get addresses from a script
     * @returns {{ type: 'p2pkh'|'p2cs'|'unknown', addresses: string[] }}
     */
    getAddressesFromScript(script) {
        const dataBytes = hexToBytes(script);
        if (isP2PKH(dataBytes)) {
            const address = this.getAddressFromHashCache(
                bytesToHex(
                    dataBytes.slice(P2PK_START_INDEX, P2PK_START_INDEX + 20)
                ),
                false
            );
            return {
                type: 'p2pkh',
                addresses: [address],
            };
        } else if (isP2CS(dataBytes)) {
            const addresses = [];
            for (let i = 0; i < 2; i++) {
                const iStart = i == 0 ? OWNER_START_INDEX : COLD_START_INDEX;
                addresses.push(
                    this.getAddressFromHashCache(
                        bytesToHex(dataBytes.slice(iStart, iStart + 20)),
                        iStart === OWNER_START_INDEX
                    )
                );
            }
            return { type: 'p2cs', addresses };
        } else {
            return { type: 'unknown', addresses: [] };
        }
    }

    // Avoid calculating over and over the same getAddressFromHash by saving the result in a map
    getAddressFromHashCache(pkh_hex, isColdStake) {
        if (!this.#knownPKH.has(pkh_hex)) {
            this.#knownPKH.set(
                pkh_hex,
                getAddressFromHash(hexToBytes(pkh_hex), isColdStake)
            );
        }
        return this.#knownPKH.get(pkh_hex);
    }

    /**
     * Return true if the transaction contains undelegations regarding the given wallet
     * @param {Transaction} tx
     */
    checkForUndelegations(tx) {
        for (const vin of tx.vin) {
            const status = this.#mempool.getOutpointStatus(vin.outpoint);
            if (status & OutpointState.P2CS) {
                return true;
            }
        }
        return false;
    }

    /**
     * Return true if the transaction contains delegations regarding the given wallet
     * @param {Transaction} tx
     */
    checkForDelegations(tx) {
        const txid = tx.txid;
        for (let i = 0; i < tx.vout.length; i++) {
            const outpoint = new COutpoint({
                txid,
                n: i,
            });
            if (
                this.#mempool.getOutpointStatus(outpoint) & OutpointState.P2CS
            ) {
                return true;
            }
        }
        return false;
    }

    /**
     * Return the output addresses for a given transaction
     * @param {Transaction} tx
     */
    getOutAddress(tx) {
        return tx.vout.reduce(
            (acc, vout) => [
                ...acc,
                ...this.getAddressesFromScript(vout.script).addresses,
            ],
            []
        );
    }

    /**
     * Convert a list of Blockbook transactions to HistoricalTxs
     * @param {Array<Transaction>} arrTXs - An array of the Blockbook TXs
     * @returns {Array<HistoricalTx>} - A new array of `HistoricalTx`-formatted transactions
     */
    // TODO: add shield data to txs
    toHistoricalTXs(arrTXs) {
        let histTXs = [];
        for (const tx of arrTXs) {
            // The total 'delta' or change in balance, from the Tx's sums
            let nAmount =
                (this.#mempool.getCredit(tx) - this.#mempool.getDebit(tx)) /
                COIN;
            console.log(
                nAmount,
                this.#mempool.getCredit(tx),
                this.#mempool.getDebit(tx)
            );
            if (nAmount === 0) {
                console.log(tx);
            }

            // The receiver addresses, if any
            let arrReceivers = this.getOutAddress(tx);

            // Figure out the type, based on the Tx's properties
            let type = HistoricalTxType.UNKNOWN;
            if (tx.isCoinStake()) {
                type = HistoricalTxType.STAKE;
            } else if (this.checkForUndelegations(tx)) {
                type = HistoricalTxType.UNDELEGATION;
            } else if (this.checkForDelegations(tx)) {
                type = HistoricalTxType.DELEGATION;
                arrReceivers = arrReceivers.filter((addr) => {
                    return addr[0] === cChainParams.current.STAKING_PREFIX;
                });
                nAmount = this.#mempool.getCredit(tx) / COIN;
            } else if (nAmount > 0) {
                type = HistoricalTxType.RECEIVED;
            } else if (nAmount < 0) {
                type = HistoricalTxType.SENT;
            } else if (tx.shieldData.length > 0) {
                type = HistoricalTxType.SHIELD;
            }

            histTXs.push(
                new HistoricalTx(
                    type,
                    tx.txid,
                    arrReceivers,
                    false,
                    tx.blockTime,
                    tx.blockHeight,
                    Math.abs(nAmount)
                )
            );
        }
        return histTXs;
    }

    /**
     * Create a non signed transaction
     * @param {string} address - Address to send to
     * @param {number} value - Amount of satoshis to send
     * @param {object} [opts] - Options
     * @param {boolean} [opts.isDelegation] - Whether or not this delegates PIVs to `address`.
     *     If set to true, `address` must be a valid cold staking address
     * @param {boolean} [opts.useDelegatedInputs] - Whether or not cold stake inputs are to be used.
     *    Should be set if this is an undelegation transaction.
     * @param {string?} [opts.changeDelegationAddress] - Which address to use as change when `useDelegatedInputs` is set to true.
     *     Only changes >= 1 PIV can be delegated
     * @param {boolean} [opts.isProposal] - Whether or not this is a proposal transaction
     */
    createTransaction(
        address,
        value,
        {
            isDelegation = false,
            useDelegatedInputs = false,
            delegateChange = false,
            changeDelegationAddress = null,
            isProposal = false,
        } = {}
    ) {
        const balance = useDelegatedInputs
            ? this.#mempool.coldBalance
            : this.#mempool.balance;
        if (balance < value) {
            throw new Error('Not enough balance');
        }
        if (delegateChange && !changeDelegationAddress)
            throw new Error(
                '`delegateChange` was set to true, but no `changeDelegationAddress` was provided.'
            );
        const requirement = useDelegatedInputs
            ? OutpointState.P2CS
            : OutpointState.P2PKH;
        const utxos = this.#mempool.getUTXOs({ requirement, target: value });
        const transactionBuilder = TransactionBuilder.create().addUTXOs(utxos);

        const fee = transactionBuilder.getFee();
        const changeValue = transactionBuilder.valueIn - value - fee;

        // Add change output
        if (changeValue > 0) {
            const [changeAddress] = this.getNewAddress(1);
            if (delegateChange && changeValue > 1.01 * COIN) {
                transactionBuilder.addColdStakeOutput({
                    address: changeAddress,
                    value: changeValue,
                    addressColdStake: changeDelegationAddress,
                });
            } else {
                transactionBuilder.addOutput({
                    address: changeAddress,
                    value: changeValue,
                });
            }
        } else {
            // We're sending alot! So we deduct the fee from the send amount. There's not enough change to pay it with!
            value -= fee;
        }

        // Add primary output
        if (isDelegation) {
            const [returnAddress] = this.getNewAddress(1);
            transactionBuilder.addColdStakeOutput({
                address: returnAddress,
                addressColdStake: address,
                value,
            });
        } else if (isProposal) {
            transactionBuilder.addProposalOutput({
                hash: address,
                value,
            });
        } else {
            transactionBuilder.addOutput({
                address,
                value,
            });
        }
        return transactionBuilder.build();
    }

    /**
     * @param {Transaction} transaction - transaction to sign
     * @throws {Error} if the wallet is view only
     * @returns {Promise<Transaction>} a reference to the same transaction, signed
     */
    async sign(transaction) {
        if (this.isViewOnly()) {
            throw new Error('Cannot sign with a view only wallet');
        }
        for (let i = 0; i < transaction.vin.length; i++) {
            const input = transaction.vin[i];
            const { type } = this.getAddressesFromScript(input.scriptSig);
            const path = this.getPath(input.scriptSig);
            const wif = this.getMasterKey().getPrivateKey(path);
            await transaction.signInput(i, wif, {
                isColdStake: type === 'p2cs',
            });
        }
        return transaction;
    }

    /**
     * Adds a transaction to the mempool. To be called after it's signed and sent to the network, if successful
     * @param {Transaction} transaction
     */
    addTransaction(transaction) {
        this.#mempool.addTransaction(transaction);
        let i = 0;
        for (const out of transaction.vout) {
            const status = this.getScriptType(out.script);
            if (status & OutpointState.OURS) {
                this.#mempool.setOutpointStatus(
                    new COutpoint({
                        txid: transaction.txid,
                        n: i,
                    }),
                    status
                );
            }
            i++;
        }
    }

    getMasternodeUTXOs() {
        const collateralValue = cChainParams.current.collateralInSats;
    }

    /**
     * @returns {Transaction[]} a list of all transactions
     */
    getTransactions() {
        return this.#mempool.getTransactions();
    }

    get balance() {
        return this.#mempool.balance;
    }

    get immatureBalance() {
        return this.#mempool.immatureBalance;
    }

    get coldBalance() {
        return this.#mempool.coldBalance;
    }

    loadFromDisk() {
        // TODO
    }
}

/**
 * @type{Wallet}
 */
export const wallet = new Wallet(0, true); // For now we are using only the 0-th account, (TODO: update once account system is done)

/**
 * Clean a Seed Phrase string and verify it's integrity
 *
 * This returns an object of the validation status and the cleaned Seed Phrase for safe low-level usage.
 * @param {String} strPhraseInput - The Seed Phrase string
 * @param {Boolean} fPopupConfirm - Allow a warning bypass popup if the Seed Phrase is unusual
 */
export async function cleanAndVerifySeedPhrase(
    strPhraseInput = '',
    fPopupConfirm = true
) {
    // Clean the phrase (removing unnecessary spaces) and force to lowercase
    const strPhrase = strPhraseInput.trim().replace(/\s+/g, ' ').toLowerCase();

    // Count the Words
    const nWordCount = strPhrase.trim().split(' ').length;

    // Ensure it's a word count that makes sense
    if (nWordCount === 12 || nWordCount === 24) {
        if (!validateMnemonic(strPhrase)) {
            // If a popup is allowed and Advanced Mode is enabled, warn the user that the
            // ... seed phrase is potentially bad, and ask for confirmation to proceed
            if (!fPopupConfirm || !fAdvancedMode)
                return {
                    ok: false,
                    msg: translation.importSeedErrorTypo,
                    phrase: strPhrase,
                };

            // The reason we want to ask the user for confirmation is that the mnemonic
            // could have been generated with another app that has a different dictionary
            const fSkipWarning = await confirmPopup({
                title: translation.popupSeedPhraseBad,
                html: translation.popupSeedPhraseBadNote,
            });

            if (fSkipWarning) {
                // User is probably an Arch Linux user and used `-f`
                return {
                    ok: true,
                    msg: translation.importSeedErrorSkip,
                    phrase: strPhrase,
                };
            } else {
                // User heeded the warning and rejected the phrase
                return {
                    ok: false,
                    msg: translation.importSeedError,
                    phrase: strPhrase,
                };
            }
        } else {
            // Valid count and mnemonic
            return {
                ok: true,
                msg: translation.importSeedValid,
                phrase: strPhrase,
            };
        }
    } else {
        // Invalid count
        return {
            ok: false,
            msg: translation.importSeedErrorSize,
            phrase: strPhrase,
        };
    }
}

/**
 * @returns {Promise<boolean>} If the wallet has an encrypted database backup
 */
export async function hasEncryptedWallet() {
    const database = await Database.getInstance();
    const account = await database.getAccount();
    return !!account?.encWif;
}

export async function getNewAddress({
    updateGUI = false,
    verify = false,
    nReceiving = 0,
} = {}) {
    const [address, path] = wallet.getNewAddress(nReceiving);
    if (verify && wallet.isHardwareWallet()) {
        // Generate address to present to the user without asking to verify
        const confAddress = await confirmPopup({
            title: ALERTS.CONFIRM_POPUP_VERIFY_ADDR,
            html: createAddressConfirmation(address),
            resolvePromise: wallet.getMasterKey().verifyAddress(path),
        });
        console.log(address, confAddress);
        if (address !== confAddress) {
            throw new Error('User did not verify address');
        }
    }

    // If we're generating a new address manually, then render the new address in our Receive Modal
    if (updateGUI) {
        guiRenderCurrentReceiveModal();
    }

    return [address, path];
}

function createAddressConfirmation(address) {
    return `${translation.popupHardwareAddrCheck} ${strHardwareName}.
              <div class="seed-phrase">${address}</div>`;
}
