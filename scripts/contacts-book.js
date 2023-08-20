import { Database } from './database';
import { doms } from './global';
import {
    confirmPopup,
    createAlert,
    isStandardAddress,
    sanitizeHTML,
} from './misc';

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
        contacts: arrContacts,
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
            contacts: arrContacts,
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
}

/**
 * A GUI wrapper that renders the current Account's contacts list
 */
export async function guiRenderContacts() {
    const cDB = await Database.getInstance();
    const cAccount = await cDB.getAccount();
    return renderContacts(cAccount);
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
