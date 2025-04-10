/**
 * A local Account, containing sensitive user-data
 */
export class Account {
    /**
     * Create an Account.
     * @param {Object} accountData - The account data.
     * @param {String} accountData.publicKey - The public key.
     * @param {String} [accountData.encWif] - The encrypted WIF.
     * @param {Array<Object>} [accountData.localProposals] - The local proposals.
     * @param {Array<import('./contact-book.js').Contact>} [accountData.contacts] - The Contacts saved in this account.
     * @param {String} [accountData.name] - The Contact Name of the account.
     * @param {String} [accountData.shieldData] - Shield data necessary to load shielding
     * @param {String} [accountData.encExtsk] - Encrypted extended spending key
     * @param {boolean} [accountData.isHardware] - Whether this is a hardware wallet
     */
    constructor(accountData) {
        // Keys take the Constructor as priority, but if missing, default to their "Type" in empty form for type-safety
        this.publicKey = accountData?.publicKey || '';
        this.encWif = accountData?.encWif || '';
        this.localProposals = accountData?.localProposals || [];
        this.contacts = accountData?.contacts || [];
        this.name = accountData?.name || '';
        this.shieldData = accountData?.shieldData || '';
        this.encExtsk = accountData?.encExtsk || '';
        this.isHardware = accountData?.isHardware || false;
    }

    /** @type {String} The public key. */
    publicKey = '';

    /** @type {String} The encrypted WIF. */
    encWif = '';

    /** @type {Array<Object>} The local proposals. */
    localProposals = [];

    /** @type {Array<import('./contact-book.js').Contact>} The Contacts saved in this account. */
    contacts = [];

    /** @type {String} The Contact Name of the account. */
    name = '';

    /** @type {String} Shield data necessary to load shielding */
    shieldData = '';

    /** @type {String} Encrypted extended spending key*/
    encExtsk = '';

    /** @type{boolean} whether this is a hardware/ledger account */
    isHardware = false;

    /**
     * Search for a Contact in this account, by specific properties
     * @param {Object} settings
     * @param {string?} settings.name - The Name of the contact to search for
     * @param {string?} settings.pubkey - The Pubkey of the contact to search for
     * @returns {import('./contact-book.js').Contact?} - A Contact, if found
     */
    getContactBy({ name, pubkey }) {
        // Get by Name
        if (name) return this.contacts.find((a) => a.label === name);
        // Get by Pubkey
        if (pubkey) return this.contacts.find((a) => a.pubkey === pubkey);

        // Nothing found
        return null;
    }
}
