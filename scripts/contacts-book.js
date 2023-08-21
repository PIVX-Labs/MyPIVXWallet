import { Database } from './database';
import { doms } from './global';
import { translation } from './i18n';
import {
    confirmPopup,
    createAlert,
    createQR,
    isStandardAddress,
    sanitizeHTML,
} from './misc';
import { getDerivationPath, hasEncryptedWallet, masterKey } from './wallet';

/**
 * Represents an Account contact
 */
export class Contact {
    /**
     * Creates a new Account contact
     * @param {Object} options - The contact options
     * @param {string} options.label - The label of the contact
     * @param {string} options.icon - The optional icon of the contact (base64)
     * @param {string} options.pubkey - The Master public key of the contact
     * @param {number} options.date - The date (unix timestamp) of the contact being saved
     */
    constructor({ label, icon, pubkey, date }) {
        this.label = label;
        this.icon = icon;
        this.pubkey = pubkey;
        this.date = date;
    }

    /** The label of the Contact
     * @type {string}
     */
    label;

    /** The optional icon of the Contact (base64)
     * @type {string}
     */
    icon;

    /** The Master public key of the Contact
     * @type {string}
     */
    pubkey;

    /** The date (unix timestamp) of the Contact being saved
     * @type {number}
     */
    date;
}

/**
 * Add a Contact to an Account's contact list
 * @param {{publicKey: String, encWif: String?, localProposals: Array<any>, contacts: Array<Contact>}} account - The account to add the Contact to
 * @param {Contact} contact - The contact object
 */
export async function addContact(account, contact) {
    // TODO: once multi-account is added, ensure this function adds the contact to the correct account (by pubkey)
    const cDB = await Database.getInstance();

    // Push contact in to the account
    const arrContacts = account?.contacts || [];
    arrContacts.push(contact);

    // Save to the DB
    await cDB.addAccount({
        publicKey: account.publicKey,
        encWif: account.encWif,
        localProposals: account?.localProposals || [],
        contacts: arrContacts,
        name: account?.name || '',
    });
}

/**
 * Search for a Contact in a given Account, by specific properties
 * @param {{publicKey: String, encWif: String?, localProposals: Array<any>, contacts: Array<Contact>}} account - The account to search for a Contact
 * @param {Object} settings
 * @param {string?} settings.name - The Name of the contact to search for
 * @param {string?} settings.pubkey - The Pubkey of the contact to search for
 * @returns {Contact?} - A Contact, if found
 */
export function getContactBy(account, { name, pubkey }) {
    if (!name && !pubkey)
        throw Error(
            'getContactBy(): At least ONE search parameter MUST be set!'
        );
    const arrContacts = account?.contacts || [];

    // Get by Name
    if (name) return arrContacts.find((a) => a.label === name);
    // Get by Pubkey
    if (pubkey) return arrContacts.find((a) => a.pubkey === pubkey);

    // Nothing found
    return null;
}

/**
 * Remove a Contact from an Account's contact list
 * @param {{publicKey: String, encWif: String?, localProposals: Array<any>, contacts: Array<Contact>}} account - The account to remove the Contact from
 * @param {string} pubkey - The contact pubkey
 */
export async function removeContact(account, pubkey) {
    // TODO: once multi-account is added, ensure this function adds the contact to the correct account (by pubkey)
    const cDB = await Database.getInstance();

    // Find the contact by index, if it exists; splice it away
    const arrContacts = account?.contacts || [];
    const nIndex = arrContacts.findIndex((a) => a.pubkey === pubkey);
    if (nIndex > -1) {
        // Splice out the contact, and save to DB
        arrContacts.splice(nIndex, 1);
        await cDB.addAccount({
            publicKey: account.publicKey,
            encWif: account.encWif,
            localProposals: account?.localProposals || [],
            contacts: account?.contacts || [],
            name: account?.name || '',
        });
    }
}

/**
 * Render an Account's contact list
 * @param {{publicKey: String, encWif: String?, localProposals: Array<any>, contacts: Array<Contact>}} account
 * @param {boolean} fPrompt - If this is a Contact Selection prompt
 */
export async function renderContacts(account, fPrompt = false) {
    let strHTML = '';
    let i = 0;

    // For non-prompts: we allow the user to Add, Edit or Delete their contacts
    if (!fPrompt) {
        // Render an editable Contacts Table
        for (const cContact of account.contacts || []) {
            strHTML += `
                <tr>
                    <td id="contactsName${i}">${sanitizeHTML(
                cContact.label
            )}</td>
                    <td style="word-wrap: anywhere;" id="contactsAddress${i}">${sanitizeHTML(
                cContact.pubkey
            )}</td>
                    <td>
                        <button onclick="MPW.guiRemoveContact(${i})" class="btn btn-danger">Delete</button>
                    </td>
                </tr>
            `;
            i++;
        }

        // Lastly, inject the "Add Account" UI to the table
        strHTML += `
            <tr>
                <td><input id="contactsNameInput" placeholder="Name"></td>
                <td><input id="contactsAddressInput" placeholder="Address or XPub"></td>
                <td>
                    <button onclick="MPW.guiAddContact()" class="btn btn-primary">Add</button>
                </td>
            </tr>
        `;

        doms.domContactsTable.innerHTML = strHTML;
    } else {
        // For prompts: the user must click an address (or cancel), and cannot add, edit or delete contacts
        for (const cContact of account.contacts || []) {
            strHTML += `
                <tr>
                    <td> <span id="contactsName${i}">${sanitizeHTML(
                cContact.label
            )}</span></td>
                    <td> <span style="word-wrap: anywhere;" id="contactsAddress${i}">${sanitizeHTML(
                cContact.pubkey
            )}</span></td>
                    <td>
                        <button id="contactsSelector${i}" class="btn btn-primary">Use</button>
                    </td>
                </tr>
            `;
            i++;
        }

        // Inject the buttons in to the table
        strHTML = `
            <table class="table table-hover">
                <thead>
                    <tr>
                        <td class="text-center"><b> Contact </b></td>
                        <td class="text-center"><b> Public Key </b></td>
                        <td class="text-center"><b> Manage </b></td>
                    </tr>
                </thead>
                <tbody id="contactsList" style="text-align: center; vertical-align: middle;">
                    ${strHTML}
                </tbody>
            </table>
        `;

        // Prepare the Contact list Prompt
        const cPrompt = getUserContactClick();

        // Hook the Contact Prompt to the Popup UI, which resolves when the user has interacted with the Contact Prompt
        return await confirmPopup({
            title: 'Choose a Contact',
            html: strHTML,
            resolvePromise: cPrompt(),
        });
    }
}

/**
 * Creates and returns a function that returns a promise for a click event.
 *
 * The promise will resolve with the Contact Name of whichever button is clicked first.
 *
 * Once a button is clicked, all remaining listeners are removed.
 */
function getUserContactClick() {
    // Specify the function to return
    return function () {
        // Note that the return type is a Promise, this will wait on the click
        return new Promise((resolve, _reject) => {
            // Wait a bit for the DOM to fully render, then setup the handler functions + attach them to the Contact Buttons via Event Listeners
            setTimeout(() => {
                // The function to handle the click
                function handleClick(event) {
                    // Splice the 'Contact Index' from the button clicked
                    const nIndex = event.target.id.replace(
                        'contactsSelector',
                        ''
                    );
                    // Fetch the associated Contact Name from the table
                    // TODO: maybe don't rely on the table, and just fetch the Contact Index from the DB Contacts?
                    const strName = document.getElementById(
                        `contactsName${nIndex}`
                    ).innerText;
                    // Resolve the promise with the Contact Name of the button that was clicked first
                    resolve(strName);
                    // Remove all the remaining click listeners
                    removeRemainingListeners();
                }

                // The function to iterate over the buttons and remove their listeners
                function removeRemainingListeners() {
                    let i = 0;
                    let button;
                    // This iteration removes the listener from each button
                    // eslint-disable-next-line no-cond-assign
                    while (
                        (button = document.getElementById(
                            `contactsSelector${i}`
                        ))
                    ) {
                        button.removeEventListener('click', handleClick);
                        i++;
                    }
                }

                // Attach a click listener to each `contactsSelector` button
                let i = 0;
                let button;
                // eslint-disable-next-line no-cond-assign
                while (
                    (button = document.getElementById(`contactsSelector${i}`))
                ) {
                    button.addEventListener('click', handleClick, {
                        once: true,
                    });
                    i++;
                }
            }, 500); // Waits 500ms to ensure the all the elements have been added to the DOM (yeah, not the most elegant, but cannot think of a better solution yet)
        });
    };
}

/**
 * A function that uses the Prompt system to ask the user for a contact
 */
export async function promptForContact() {
    const cDB = await Database.getInstance();
    const cAccount = await cDB.getAccount();
    if (cAccount.contacts && cAccount.contacts.length === 0)
        return createAlert('warning', 'You have no contacts!', [], 2500);
    return renderContacts(cAccount, true);
}

/**
 * A GUI button wrapper that fills an Input with a user-selected Contact
 * @param {HTMLInputElement} domInput - The input box to fill with a selected Contact Address
 */
export async function guiSelectContact(domInput) {
    // Fill the 'Input box' with a user-chosen Contact
    domInput.value = (await promptForContact()) || '';

    // Run the validity checker for double-safety
    await guiCheckRecipientInput({ target: domInput });
}

/**
 * A GUI wrapper that renders the current Account's contacts list
 */
export async function guiRenderContacts() {
    const cDB = await Database.getInstance();
    const cAccount = await cDB.getAccount();
    return renderContacts(cAccount);
}

/**
 * Set the current Account's Contact name
 * @param {{publicKey: String, encWif: String?, localProposals: Array<any>, contacts: Array<Contact>, name: String?}} account - The account to add the new Name to
 * @param {String} name - The name to set
 */
export async function setAccountContactName(account, name) {
    const cDB = await Database.getInstance();

    // Save name to the DB
    await cDB.addAccount({
        publicKey: account.publicKey,
        encWif: account.encWif,
        localProposals: account?.localProposals || [],
        contacts: account?.contacts || [],
        name: name,
    });
}

/**
 * Render the Receive Modal with either our Contact or Address
 * @param {boolean} fContact - `true` to render our Contact, `false` to render our current Address
 */
export async function guiRenderReceiveModal(
    cReceiveType = RECEIVE_TYPES.CONTACT
) {
    if (cReceiveType === RECEIVE_TYPES.CONTACT) {
        // Fetch Contact info from the current Account
        const cDB = await Database.getInstance();
        const cAccount = await cDB.getAccount();

        // Check that a local Contact name was set
        if (cAccount?.name) {
            // Derive our Public Key
            let strPubkey = '';

            // If HD: use xpub, otherwise we'll fallback to our single address
            if (masterKey.isHD) {
                // Get our current wallet XPub
                const derivationPath = getDerivationPath(
                    masterKey.isHardwareWallet
                )
                    .split('/')
                    .slice(0, 4)
                    .join('/');
                strPubkey = await masterKey.getxpub(derivationPath);
            } else {
                strPubkey = await masterKey.getCurrentAddress();
            }

            // Construct the Contact URI
            const strURL = window.location.origin + window.location.pathname;
            const strEncodedURI = encodeURIComponent(
                cAccount.name + ':' + strPubkey
            );
            const strContactURI = `${strURL}?addcontact=${strEncodedURI}`;

            // Render Copy Button
            doms.domModalQrLabel.innerHTML = `Share Contact URL<i onclick="MPW.toClipboard('${strContactURI}', this)" id="guiAddressCopy" class="fas fa-clipboard" style="cursor: pointer; width: 20px;"></i>`;

            // We'll render a short informational text, alongside a QR below for Contact scanning
            doms.domModalQR.innerHTML = `
                <p><b>Only</b> share your Contact with trusted people (family, friends)</p>
                <div id="receiveModalEmbeddedQR"></div>
            `;
            const domQR = document.getElementById('receiveModalEmbeddedQR');
            createQR(strContactURI, domQR, 10);
            domQR.firstChild.style.width = '100%';
            domQR.firstChild.style.height = 'auto';
            domQR.firstChild.classList.add('no-antialias');
            document.getElementById('clipboard').value = strPubkey;
        } else {
            // Get our current wallet address
            const strAddress = await masterKey.getCurrentAddress();

            // Update the QR Label (we'll show the address here for now, user can set Contact "Name" optionally later)
            doms.domModalQrLabel.innerHTML =
                strAddress +
                `<i onclick="MPW.toClipboard('${strAddress}', this)" id="guiAddressCopy" class="fas fa-clipboard" style="cursor: pointer; width: 20px;"></i>`;

            // Update the QR section
            if (await hasEncryptedWallet()) {
                doms.domModalQR.innerHTML = `
                    <center>
                        <b>Setup your Contact</b>
                        <p>Receive using a simple username-based Contact</p>
                        <input id="setContactName" placeholder="Username" style="text-align: center;"></input><button onclick="MPW.guiSetAccountName('setContactName')">Create Contact</button>
                    </center>
                `;
            } else {
                doms.domModalQR.innerHTML = `
                    <center>
                        <b>Encrypt your wallet!</b>
                        <p>Once you hit "${translation.secureYourWallet}" in the Dashboard, you can create a Contact to make receiving PIV easier!</p>
                    </center>
                `;
            }
        }
    } else if (cReceiveType === RECEIVE_TYPES.ADDRESS) {
        // Get our current wallet address
        const strAddress = await masterKey.getCurrentAddress();
        createQR('pivx:' + strAddress, doms.domModalQR);
        doms.domModalQrLabel.innerHTML =
            strAddress +
            `<i onclick="MPW.toClipboard('${strAddress}', this)" id="guiAddressCopy" class="fas fa-clipboard" style="cursor: pointer; width: 20px;"></i>`;
        doms.domModalQR.firstChild.style.width = '100%';
        doms.domModalQR.firstChild.style.height = 'auto';
        doms.domModalQR.firstChild.classList.add('no-antialias');
        document.getElementById('clipboard').value = strAddress;
    } else {
        // Get our current wallet XPub
        const derivationPath = getDerivationPath(masterKey.isHardwareWallet)
            .split('/')
            .slice(0, 4)
            .join('/');
        const strXPub = await masterKey.getxpub(derivationPath);

        // Update the QR Label (we'll show the address here for now, user can set Contact "Name" optionally later)
        doms.domModalQrLabel.innerHTML =
            strXPub +
            `<i onclick="MPW.toClipboard('${strXPub}', this)" id="guiAddressCopy" class="fas fa-clipboard" style="cursor: pointer; width: 20px;"></i>`;

        // We'll render a short informational text, alongside a QR below for Contact scanning
        doms.domModalQR.innerHTML = `
            <p><b>Only</b> share your XPub with trusted people (family, friends)</p>
            <div id="receiveModalEmbeddedQR"></div>
        `;

        // Update the QR section
        const domQR = document.getElementById('receiveModalEmbeddedQR');
        createQR(strXPub, domQR, 10);
        domQR.firstChild.style.width = '100%';
        domQR.firstChild.style.height = 'auto';
        domQR.firstChild.classList.add('no-antialias');
        document.getElementById('clipboard').value = strXPub;
    }
}

/**
 * A GUI wrapper to re-render the current Receive Modal configuration
 */
export async function guiRenderCurrentReceiveModal() {
    return guiRenderReceiveModal(cReceiveType);
}

/**
 * An enum of Receive Types (i.e: receive by Contact, Address, XPub)
 */
export const RECEIVE_TYPES = {
    CONTACT: 0,
    ADDRESS: 1,
    XPUB: 2,
};

/** The current Receive Type used by Receive UIs */
export let cReceiveType = RECEIVE_TYPES.CONTACT;

/**
 * Cycles through the Receive Types with each run
 */
export async function guiToggleReceiveType() {
    // Figure out which Types can be used with this wallet
    const nTypeMax = masterKey.isHD ? 3 : 2;

    // Loop back to the first if we hit the end
    cReceiveType = (cReceiveType + 1) % nTypeMax;

    // Convert the *next* Type to text (also runs through i18n system)
    const nNextType = (cReceiveType + 1) % nTypeMax;
    let strNextType = '';
    switch (nNextType) {
        case RECEIVE_TYPES.CONTACT:
            strNextType = 'Contact';
            break;
        case RECEIVE_TYPES.ADDRESS:
            strNextType = 'Address';
            break;
        case RECEIVE_TYPES.XPUB:
            strNextType = 'XPub';
            break;
    }

    // Render the new UI
    doms.domModalQrReceiveTypeBtn.innerText = 'Change to ' + strNextType;
    guiRenderReceiveModal(cReceiveType);

    // Return the new Receive Type index
    return cReceiveType;
}

/** A GUI wrapper that adds a contact to the current Account's contacts list */
export async function guiAddContact() {
    const strName = document.getElementById('contactsNameInput').value;
    const strAddr = document.getElementById('contactsAddressInput').value;

    // Verify the name
    if (strName.length < 1)
        return createAlert('warning', 'A name is required!', [], 2500);
    if (strName.length > 64)
        return createAlert('warning', 'That name is too long!', [], 2500);

    // Verify the address
    if (!isStandardAddress(strAddr) && !strAddr.startsWith('xpub'))
        return createAlert(
            'warning',
            'Invalid or unsupported address!',
            [],
            3000
        );

    // Fetch the current Account
    const cDB = await Database.getInstance();
    const cAccount = await cDB.getAccount();

    // Add the Contact to it
    await addContact(cAccount, {
        label: strName,
        pubkey: strAddr,
        date: Date.now(),
    });

    // Render the new list
    return renderContacts(cAccount);
}

/**
 * Prompt the user to add a new Contact, safely checking for duplicates
 * @param {String} strName - The Name of the Contact
 * @param {String} strPubkey - The Public Key of the Contact
 * @param {boolean} fDuplicateNotif - Notify the user if the incoming Contact is a duplicate
 * @returns {Promise<boolean>} - `true` if contact was added, `false` if not
 */
export async function guiAddContactPrompt(
    strName,
    strPubkey,
    fDuplicateNotif = true
) {
    // Verify the name
    if (strName.length < 1)
        return createAlert(
            'warning',
            "That contact didn't set a name!",
            [],
            2500
        );
    if (strName.length > 64)
        return createAlert(
            'warning',
            'That contact name is too long!',
            [],
            2500
        );

    // Verify the address
    if (!isStandardAddress(strPubkey) && !strPubkey.startsWith('xpub'))
        return createAlert(
            'warning',
            'Contact has an invalid or unsupported address!',
            [],
            4000
        );

    const cDB = await Database.getInstance();
    const cAccount = await cDB.getAccount();

    // Check this Contact isn't already saved, either fully or partially
    const cContactByName = getContactBy(cAccount, { name: strName });
    const cContactByPubkey = getContactBy(cAccount, { pubkey: strPubkey });

    // If both Name and Key are saved, then they just tried re-adding the same Contact twice
    if (cContactByName && cContactByPubkey) {
        if (fDuplicateNotif)
            createAlert(
                'warning',
                '<b>Contact already exists!</b><br>You already saved this contact',
                [],
                3000
            );
        return true;
    }

    // If the Name is saved, but not key, then this *could* be a kind of Username-based phishing attempt
    if (cContactByName && !cContactByPubkey) {
        if (fDuplicateNotif)
            createAlert(
                'warning',
                '<b>Contact name already exists!</b><br>This could potentially be a phishing attempt, beware!',
                [],
                4000
            );
        return true;
    }

    // If the Key is saved, but not the name: perhaps the Contact changed their name?
    if (!cContactByName && cContactByPubkey) {
        if (fDuplicateNotif)
            createAlert(
                'warning',
                `<b>Contact already exists, but under a different name!</b><br>You have ${strName} saved as <b>${cContactByPubkey.label}!</b> in your contacts`,
                [],
                5000
            );
        return true;
    }

    // Render an 'Add to Contacts' UI
    const strHTML = `
        <p>
            Once added you'll be able to send transactions to ${strName} by their name (either typing, or clicking), no more addresses, nice 'n easy.
            <br>
            <br>
            <i style="opacity: 0.75">Ensure that this is the real '${strName}', do not accept Contact requests from unknown sources!</i>
        </p>
    `;

    // Hook the Contact Prompt to the Popup UI, which resolves when the user has interacted with the Contact Prompt
    const fAdd = await confirmPopup({
        title: `Add ${strName} to Contacts`,
        html: strHTML,
    });

    // If accepted, then we add to contacts!
    if (fAdd) {
        // Add the Contact to the current account
        await addContact(cAccount, {
            label: strName,
            pubkey: strPubkey,
            date: Date.now(),
        });

        // Notify
        createAlert(
            'success',
            `<b>New Contact added!</b><br>${strName} has been added, hurray!`,
            [],
            3000
        );
    }

    // Return if the user accepted or declined
    return fAdd;
}

/** A GUI wrapper that removes a contact from the current Account's contacts list */
export async function guiRemoveContact(index) {
    // Fetch the current Account
    const cDB = await Database.getInstance();
    const cAccount = await cDB.getAccount();

    // Remove the Contact from it
    await removeContact(cAccount, cAccount.contacts[index].pubkey);

    // Render the new list
    return renderContacts(cAccount);
}

/** A GUI wrapper that sets the name of the current Account */
export async function guiSetAccountName(strDOM) {
    const domInput = document.getElementById(strDOM);

    // Fetch the current Account
    const cDB = await Database.getInstance();
    const cAccount = await cDB.getAccount();

    // Set the account's name
    await setAccountContactName(cAccount, domInput.value.trim());

    // Render the new Receive Modal
    await guiRenderReceiveModal();
}

/**
 * Checks the input from the recipient field
 *
 * This function should be connected to an `input` as it's `onchange` function
 * @param {InputEvent} event - The change event from the input
 */
export async function guiCheckRecipientInput(event) {
    const strInput = event.target.value.trim();

    // If the value is empty, we don't do any checks and simply reset the colourcoding
    if (!strInput) {
        return (event.target.style.color = '');
    }

    // Fetch the current Account
    const cDB = await Database.getInstance();
    const cAccount = await cDB.getAccount();

    // Check if this is a Contact
    const cContact = getContactBy(cAccount, {
        name: strInput,
        pubkey: strInput,
    });
    if (cContact) {
        // Yep, nice!
        return (event.target.style.color = 'green');
    }

    // Not a contact: dig deeper, is this a Standard address or XPub?
    if (isStandardAddress(strInput) || strInput.startsWith('xpub')) {
        // Yep!
        return (event.target.style.color = 'green');
    } else {
        // We give up: this appears to be nonsense
        return (event.target.style.color = '#b20000');
    }
}
