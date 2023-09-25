import { Buffer } from 'buffer';
import { Account } from './accounts';
import { Database } from './database';
import { doms, toClipboard } from './global';
import { ALERTS, tr, translation } from './i18n';
import {
    confirmPopup,
    createAlert,
    createQR,
    getImageFile,
    isStandardAddress,
    isXPub,
    sanitizeHTML,
} from './misc';
import { scanQRCode } from './scanner';
import { wallet, hasEncryptedWallet } from './wallet';

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
 * @param {Account} account - The account to add the Contact to
 * @param {Contact} contact - The contact object
 */
export async function addContact(account, contact) {
    // TODO: once multi-account is added, ensure this function adds the contact to the correct account (by pubkey)
    const cDB = await Database.getInstance();

    // Push contact in to the account
    account.contacts.push(contact);

    // Save to the DB
    await cDB.updateAccount(account);
}

/**
 * Remove a Contact from an Account's contact list
 * @param {Account} account - The account to remove the Contact from
 * @param {string} pubkey - The contact pubkey
 */
export async function removeContact(account, pubkey) {
    // TODO: once multi-account is added, ensure this function adds the contact to the correct account (by pubkey)
    const cDB = await Database.getInstance();

    // Find the contact by index, if it exists; splice it away
    const nIndex = account.contacts.findIndex((a) => a.pubkey === pubkey);
    if (nIndex > -1) {
        // Splice out the contact, and save to DB
        account.contacts.splice(nIndex, 1);
        await cDB.updateAccount(account, true);
    }
}

/**
 * Render an Account's contact list
 * @param {Account} account
 * @param {boolean} fPrompt - If this is a Contact Selection prompt
 */
export async function renderContacts(account, fPrompt = false) {
    let strHTML = '';
    let i = 0;

    // For non-prompts: we allow the user to Add, Edit or Delete their contacts
    if (!fPrompt) {
        // Render an editable Contacts Table
        for (const cContact of account.contacts || []) {
            const strPubkey = isXPub(cContact.pubkey)
                ? cContact.pubkey.slice(0, 32) + '…'
                : cContact.pubkey;
            strHTML += `
            <div class="d-flex px-3 py-3 contactItem">
                <div>
                    <img onclick="MPW.guiAddContactImage('${i}')" class="ptr" style="margin-right:20px; width: 50px; height: 50px; border-radius: 100%; background-color: white; border: 2px solid #d5adff;" ${
                cContact.icon ? 'src="' + cContact.icon + '"' : ''
            }>
                </div>
                <div style="width: 100%; line-height: 15px;">
                    <span id="contactsName${i}" onclick="MPW.guiEditContactNamePrompt('${i}')" style="word-wrap: anywhere; cursor:pointer; color: #d5adff; font-weight: 600; margin-top: 8px; display: block;">${sanitizeHTML(
                cContact.label
            )}</span>
                    <span id="contactsAddress${i}" style="word-wrap: anywhere; font-size: 13px; position: relative; top: 3px;">${sanitizeHTML(
                strPubkey
            )}</span>
                </div>
                <div style="display: flex; justify-content: flex-end; align-items: center; padding-right: 6px; padding-left: 15px;">
                    <i style="cursor:pointer;" onclick="MPW.guiRemoveContact(${i})" class="far fa-trash-alt"></i>
                </div>
            </div>
            `;
            i++;
        }

        // Lastly, inject the "Add Account" UI to the table
        strHTML += `
            <div class="d-flex px-3 addContact" style="margin-top:20px;">
                <div class="contactName">
                    <input id="contactsNameInput" class="m-0" placeholder="${translation.name}" autocomplete="nope">
                </div>
                <div class="contactAddr">
                    <input id="contactsAddressInput" class="m-0" placeholder="${translation.addressOrXPub}" autocomplete="nope">
                </div>
                <div class="d-flex" style="align-items: center;">
                    <div onclick="MPW.guiAddContact()" class="addContactBtn">
                        <i class="fas fa-plus"></i>
                    </div>
                    <div onclick="MPW.guiAddContactQRPrompt()" class="qrContactBtn">
                        <i class="fa-solid fa-qrcode"></i>
                    </div>
                </div>
            </div>
        `;

        doms.domContactsTable.innerHTML = strHTML;
    } else {
        // For prompts: the user must click an address (or cancel), and cannot add, edit or delete contacts
        strHTML += `<div id="contactsList" class="contactsList">`;
        for (const cContact of account.contacts || []) {
            const strPubkey = isXPub(cContact.pubkey)
                ? cContact.pubkey.slice(0, 32) + '…'
                : cContact.pubkey;
            strHTML += `
            <div class="d-flex px-3 py-3 contactItem ptr" id="contactsSelector${i}">
                <div id="contactsAvatarContainer${i}">
                    <img id="contactsAvatar${i}" class="ptr" style="margin-right:20px; width: 50px; height: 50px; border-radius: 100%; background-color: white; border: 2px solid #d5adff;" ${
                cContact.icon ? 'src="' + cContact.icon + '"' : ''
            }>
                </div>
                <div id="contactsNameContainer${i}" style="width: 100%; line-height: 15px;">
                    <span id="contactsName${i}" style="word-wrap: anywhere; color: #d5adff; font-weight: 600; margin-top: 8px; display: block;">${sanitizeHTML(
                sanitizeHTML(cContact.label)
            )}</span>
                    <span id="contactsAddress${i}" style="word-wrap: anywhere; font-size: 13px; position: relative; top: 3px;">${sanitizeHTML(
                strPubkey
            )}</span>
                </div>
            </div>
            `;
            i++;
        }

        // Add the final "Back" button
        strHTML += `
            <span class="d-flex px-3 py-3 contactItem ptr" id="contactsSelector-1">
                ${translation.back}
            </span>
        `;

        // Finish the display
        strHTML += `</div>`;

        // Prepare the Contact list Prompt
        const cPrompt = getUserContactClick();

        // Hook the Contact Prompt to the Popup UI, which resolves when the user has interacted with the Contact Prompt
        return await confirmPopup({
            title: translation.chooseAContact,
            html: strHTML,
            resolvePromise: cPrompt(),
            purpleModal: true,
            textLeft: true,
            noPadding: true,
            maxHeight: 450,
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
                    // If this is the Exit button (a -1 index), just silently quit
                    if (event.target.id.endsWith('-1')) return resolve('');

                    // Splice the 'Contact Index' from the button clicked
                    const nIndex = event.target.id.match(/([0-9]+)$/)[0];
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
                    let i = -1;
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
                let i = -1;
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
    if (!cAccount || (cAccount.contacts && cAccount.contacts.length === 0))
        return createAlert('warning', ALERTS.CONTACTS_YOU_HAVE_NONE, 2500);
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

    if (!cAccount || !cAccount.contacts) {
        return createAlert(
            'warning',
            tr(ALERTS.CONTACTS_ENCRYPT_FIRST, [
                { button: translation.secureYourWallet },
            ]),
            3500
        );
    }

    return renderContacts(cAccount);
}

/**
 * Set the current Account's Contact name
 * @param {Account} account - The account to add the new Name to
 * @param {String} name - The name to set
 */
export async function setAccountContactName(account, name) {
    const cDB = await Database.getInstance();

    // Set the name
    account.name = name;

    // Save name to the DB
    await cDB.updateAccount(account);
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
            strPubkey = await wallet.getKeyToExport();

            // Construct the Contact Share URI
            const strContactURI = await localContactToURI(cAccount, strPubkey);

            // Render Copy Button
            doms.domModalQrLabel.innerHTML = `${translation.shareContactURL}<i onclick="MPW.localContactToClipboard(event)" id="guiAddressCopy" class="fas fa-clipboard" style="cursor: pointer; width: 20px;"></i>`;

            // We'll render a short informational text, alongside a QR below for Contact scanning
            doms.domModalQR.innerHTML = `
                <p>${translation.onlyShareContactPrivately}</p>
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
            const strAddress = await wallet.getCurrentAddress();

            // Update the QR Label (we'll show the address here for now, user can set Contact "Name" optionally later)
            doms.domModalQrLabel.innerHTML =
                strAddress +
                `<i onclick="MPW.toClipboard('${strAddress}', this)" id="guiAddressCopy" class="fas fa-clipboard" style="cursor: pointer; width: 20px;"></i>`;

            // Update the QR section
            if (await hasEncryptedWallet()) {
                doms.domModalQR.innerHTML = `
                    <center>
                        <b>${translation.setupYourContact}</b>
                        <p>${translation.receiveWithContact}</p>
                        <input id="setContactName" placeholder="${translation.username}" style="text-align: center;"></input>
                        <button onclick="MPW.guiSetAccountName('setContactName')">${translation.createContact}</button>
                    </center>
                `;
            } else {
                doms.domModalQR.innerHTML = `
                    <center>
                        <b>${translation.secureYourWallet}</b>
                        <p>${tr(translation.encryptFirstForContacts, [
                            { button: translation.secureYourWallet },
                        ])}</p>
                    </center>
                `;
            }
        }
    } else if (cReceiveType === RECEIVE_TYPES.ADDRESS) {
        // Get our current wallet address
        const strAddress = await wallet.getCurrentAddress();
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
        const strXPub = await wallet.getXPub();

        // Update the QR Label (we'll show the address here for now, user can set Contact "Name" optionally later)
        doms.domModalQrLabel.innerHTML =
            strXPub +
            `<i onclick="MPW.toClipboard('${strXPub}', this)" id="guiAddressCopy" class="fas fa-clipboard" style="cursor: pointer; width: 20px;"></i>`;

        // We'll render a short informational text, alongside a QR below for Contact scanning
        doms.domModalQR.innerHTML = `
            <p>${translation.onlyShareContactPrivately}</p>
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
    return guiToggleReceiveType(cReceiveType);
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
 * @param {number?} nForceType - Optionally force the Receive Type
 */
export async function guiToggleReceiveType(nForceType = null) {
    // Figure out which Types can be used with this wallet
    const nTypeMax = wallet.isHD() ? 3 : 2;

    // Loop back to the first if we hit the end
    cReceiveType =
        nForceType !== null ? nForceType : (cReceiveType + 1) % nTypeMax;

    // Convert the *next* Type to text (also runs through i18n system)
    const nNextType = (cReceiveType + 1) % nTypeMax;
    let strNextType = '';
    switch (nNextType) {
        case RECEIVE_TYPES.CONTACT:
            strNextType = translation.contact;
            break;
        case RECEIVE_TYPES.ADDRESS:
            strNextType = translation.address;
            break;
        case RECEIVE_TYPES.XPUB:
            strNextType = translation.xpub;
            break;
    }

    // Render the new UI
    doms.domModalQrReceiveTypeBtn.innerText =
        translation.changeTo + ' ' + strNextType;
    guiRenderReceiveModal(cReceiveType);

    // Return the new Receive Type index
    return cReceiveType;
}

/** A GUI wrapper that adds a contact to the current Account's contacts list */
export async function guiAddContact() {
    const strName = document.getElementById('contactsNameInput').value.trim();
    const strAddr = document
        .getElementById('contactsAddressInput')
        .value.trim();

    // Verify the name
    if (strName.length < 1)
        return createAlert('warning', ALERTS.CONTACTS_NAME_REQUIRED, 2500);
    if (strName.length > 32)
        return createAlert('warning', ALERTS.CONTACTS_NAME_TOO_LONG, 2500);

    // Verify the address
    if (!isStandardAddress(strAddr) && !isXPub(strAddr))
        return createAlert(
            'warning',
            tr(ALERTS.INVALID_ADDRESS, [{ address: strAddr }]),
            3000
        );

    // Ensure we're not adding our own XPub
    if (isXPub(strAddr)) {
        if (wallet.isHD()) {
            // Compare the XPub against our own
            const fOurs = strAddr === (await wallet.getXPub());
            if (fOurs) {
                createAlert(
                    'warning',
                    ALERTS.CONTACTS_CANNOT_ADD_YOURSELF,
                    3500
                );
                return false;
            }
        }
    } else {
        // Ensure we're not adding (one of) our own address(es)
        if (await wallet.isOwnAddress(strAddr)) {
            createAlert('warning', ALERTS.CONTACTS_CANNOT_ADD_YOURSELF, 3500);
            return false;
        }
    }

    // Fetch the current Account
    const cDB = await Database.getInstance();
    const cAccount = await cDB.getAccount();

    // Check this Contact isn't already saved, either fully or partially
    const cContactByName = cAccount.getContactBy({ name: strName });
    const cContactByPubkey = cAccount.getContactBy({ pubkey: strAddr });

    // If both Name and Key are saved, then they just tried re-adding the same Contact twice
    if (cContactByName && cContactByPubkey) {
        createAlert('warning', ALERTS.CONTACTS_ALREADY_EXISTS, 3000);
        return true;
    }

    // If the Name is saved, but not key, then this *could* be a kind of Username-based phishing attempt
    if (cContactByName && !cContactByPubkey) {
        createAlert('warning', ALERTS.CONTACTS_NAME_ALREADY_EXISTS, 4000);
        return true;
    }

    // If the Key is saved, but not the name: perhaps the Contact changed their name?
    if (!cContactByName && cContactByPubkey) {
        createAlert(
            'warning',
            tr(ALERTS.CONTACTS_KEY_ALREADY_EXISTS, [
                { newName: strName },
                { oldName: cContactByPubkey.label },
            ]),
            7500
        );
        return true;
    }

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
        return createAlert('warning', ALERTS.CONTACTS_NAME_REQUIRED, 2500);
    if (strName.length > 32)
        return createAlert('warning', ALERTS.CONTACTS_NAME_TOO_LONG, 2500);

    // Verify the address
    if (!isStandardAddress(strPubkey) && !isXPub(strPubkey))
        return createAlert(
            'warning',
            tr(ALERTS.INVALID_ADDRESS, [{ address: strPubkey }]),
            4000
        );

    // Ensure we're not adding our own XPub
    if (isXPub(strPubkey)) {
        if (wallet.isHD()) {
            // Compare the XPub against our own
            const fOurs = strPubkey === (await wallet.getXPub());
            if (fOurs) {
                createAlert(
                    'warning',
                    ALERTS.CONTACTS_CANNOT_ADD_YOURSELF,
                    3500
                );
                return false;
            }
        }
    } else {
        // Ensure we're not adding (one of) our own address(es)
        if (await wallet.isOwnAddress(strPubkey)) {
            createAlert('warning', ALERTS.CONTACTS_CANNOT_ADD_YOURSELF, 3500);
            return false;
        }
    }

    const cDB = await Database.getInstance();
    const cAccount = await cDB.getAccount();

    // Check this Contact isn't already saved, either fully or partially
    const cContactByName = cAccount.getContactBy({ name: strName });
    const cContactByPubkey = cAccount.getContactBy({ pubkey: strPubkey });

    // If both Name and Key are saved, then they just tried re-adding the same Contact twice
    if (cContactByName && cContactByPubkey) {
        if (fDuplicateNotif)
            createAlert('warning', ALERTS.CONTACTS_ALREADY_EXISTS, 3000);
        return true;
    }

    // If the Name is saved, but not key, then this *could* be a kind of Username-based phishing attempt
    if (cContactByName && !cContactByPubkey) {
        if (fDuplicateNotif)
            createAlert('warning', ALERTS.CONTACTS_NAME_ALREADY_EXISTS, 4000);
        return true;
    }

    // If the Key is saved, but not the name: perhaps the Contact changed their name?
    if (!cContactByName && cContactByPubkey) {
        if (fDuplicateNotif)
            createAlert(
                'warning',
                tr(ALERTS.CONTACTS_KEY_ALREADY_EXISTS, [
                    { newName: strName },
                    { oldName: cContactByPubkey.label },
                ]),
                7500
            );
        return true;
    }

    // Render an 'Add to Contacts' UI
    const strHTML = `
        <p>
            ${tr(translation.addContactSubtext, [{ strName: strName }])}
            <br>
            <br>
            <i style="opacity: 0.75">${tr(translation.addContactWarning, [
                { strName: strName },
            ])}</i>
        </p>
    `;

    // Hook the Contact Prompt to the Popup UI, which resolves when the user has interacted with the Contact Prompt
    const fAdd = await confirmPopup({
        title: tr(translation.addContactTitle, [{ strName: strName }]),
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
            tr(ALERTS.CONTACTS_ADDED, [{ strName: strName }]),
            3000
        );
    }

    // Return if the user accepted or declined
    return fAdd;
}

/**
 * Prompt the user to edit a contact by it's original name
 *
 * The new name will be taken from the internal prompt input
 * @param {number} nIndex - The DB index of the Contact to edit
 * @returns {Promise<boolean>} - `true` if contact was edited, `false` if not
 */
export async function guiEditContactNamePrompt(nIndex) {
    // Fetch the desired Contact to edit
    const cDB = await Database.getInstance();
    const cAccount = await cDB.getAccount();
    const cContact = cAccount.contacts[nIndex];

    // Render an 'Add to Contacts' UI
    const strHTML = `
        <input type="text" id="contactsNewNameInput" style="text-align: center;" placeholder="${translation.newName}">
    `;

    // Hook the Contact Prompt to the Popup UI, which resolves when the user has interacted with the Contact Prompt
    const fContinue = await confirmPopup({
        title: tr(translation.editContactTitle, [
            { strName: sanitizeHTML(cContact.label) },
        ]),
        html: strHTML,
    });
    if (!fContinue) return false;

    // Verify the name
    const strNewName = document.getElementById('contactsNewNameInput').value;
    if (strNewName.length < 1) {
        createAlert('warning', ALERTS.CONTACTS_NAME_REQUIRED, 2500);
        return false;
    }
    if (strNewName.length > 32) {
        createAlert('warning', ALERTS.CONTACTS_NAME_TOO_LONG, 2500);
        return false;
    }

    // Check this new Name isn't already saved
    const cContactByNewName = cAccount.getContactBy({ name: strNewName });
    if (cContactByNewName) {
        createAlert(
            'warning',
            tr(ALERTS.CONTACTS_EDIT_NAME_ALREADY_EXISTS, [
                { strNewName: strNewName },
            ]),
            4500
        );
        return false;
    }

    // Edit it (since it's a pointer to the Account's Contacts)
    cContact.label = strNewName;

    // Commit to DB
    await cDB.updateAccount(cAccount);

    // Re-render the Contacts UI
    await renderContacts(cAccount);

    // Return if the user accepted or declined
    return true;
}

/**
 * Prompt the user to add an image to a contact by it's DB index
 *
 * The new image will be taken from the internal system prompt
 * @param {number} nIndex - The DB index of the Contact to edit
 * @returns {Promise<boolean>} - `true` if contact was edited, `false` if not
 */
export async function guiAddContactImage(nIndex) {
    const cDB = await Database.getInstance();
    const cAccount = await cDB.getAccount();
    const cContact = cAccount.contacts[nIndex];

    // Prompt for the image
    const strImage = await getImageFile();
    if (!strImage) return false;

    // Fetch the original contact, edit it (since it's a pointer to the Account's Contacts)
    cContact.icon = strImage;

    // Commit to DB
    await cDB.updateAccount(cAccount);

    // Re-render the Contacts UI
    await renderContacts(cAccount);

    // Return that the edit was successful
    return true;
}

/**
 * A GUI wrapper to open a QR Scanner prompt for Contact imports
 * @returns {boolean} - `true` if contact was added, `false` if not
 */
export async function guiAddContactQRPrompt() {
    const cScan = await scanQRCode();

    // Empty (i.e: rejected or no camera) can just silently exit
    if (!cScan) return false;

    // MPW Contact Request URI
    if (cScan?.data?.includes('addcontact=')) {
        // Parse as URL Params
        const cURL = new URL(cScan.data);
        const urlParams = new URLSearchParams(cURL.search);
        const strURI = urlParams.get('addcontact');

        // Sanity check the URI
        if (strURI?.includes(':')) {
            // Split to 'name' and 'pubkey'
            const arrParts = strURI.split(':');

            // Convert Name from HEX to UTF-8
            const strName = Buffer.from(arrParts[0], 'hex').toString('utf8');
            const strPubkey = arrParts[1];

            // Prompt the user to add the Contact
            const fAdded = await guiAddContactPrompt(
                sanitizeHTML(strName),
                strPubkey
            );

            // Re-render the list
            await guiRenderContacts();

            // Return the status
            return fAdded;
        }
    } else {
        createAlert('warning', ALERTS.CONTACTS_NOT_A_CONTACT_QR, 2500);
        return false;
    }
}

/** A GUI wrapper that removes a contact from the current Account's contacts list */
export async function guiRemoveContact(index) {
    // Fetch the current Account
    const cDB = await Database.getInstance();
    const cAccount = await cDB.getAccount();

    // Fetch the Contact
    const cContact = cAccount.contacts[index];

    // Confirm the deletion
    const fConfirmed = await confirmPopup({
        title: tr(translation.removeContactTitle, [
            { strName: sanitizeHTML(cContact.label) },
        ]),
        html: `
            <p>
                ${tr(translation.removeContactSubtext, [
                    { strName: sanitizeHTML(cContact.label) },
                ])}
                <br>
                <br>
                <i style="opacity: 0.65">${translation.removeContactNote}</i>
            </p>
        `,
    });
    if (!fConfirmed) return;

    // Remove the Contact from it
    await removeContact(cAccount, cAccount.contacts[index].pubkey);

    // Render the new list
    return renderContacts(cAccount);
}

/** A GUI wrapper that sets the name of the current Account */
export async function guiSetAccountName(strDOM) {
    const domInput = document.getElementById(strDOM);

    // Verify the name
    const strNewName = domInput.value.trim();
    if (strNewName.length < 1) {
        createAlert('warning', ALERTS.CONTACTS_NAME_REQUIRED, 2500);
        return false;
    }
    if (strNewName.length > 32) {
        createAlert('warning', ALERTS.CONTACTS_NAME_TOO_LONG, 2500);
        return false;
    }

    // Fetch the current Account
    const cDB = await Database.getInstance();
    const cAccount = await cDB.getAccount();

    // Set the account's name
    await setAccountContactName(cAccount, strNewName);

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
    const cContact = cAccount?.getContactBy({
        name: strInput,
        pubkey: strInput,
    });
    if (cContact) {
        // Yep, nice!
        return (event.target.style.color = 'green');
    }

    // Not a contact: dig deeper, is this a Standard address or XPub?
    if (isStandardAddress(strInput) || isXPub(strInput)) {
        // Yep!
        return (event.target.style.color = 'green');
    } else {
        // We give up: this appears to be nonsense
        return (event.target.style.color = '#b20000');
    }
}

/**
 * Search for a Name of a Contact from a given Account and Address
 * @param {Account} cAccount - The Account to search for the Contact
 * @param {string} address - The address to search for a Contact with
 * @returns {string} - The Name of the address Contact, or just the address if none is found
 */
export function getNameOrAddress(cAccount, address) {
    return (
        cAccount?.contacts?.find((a) => a.pubkey === address)?.label || address
    );
}

/**
 * Convert the current Account's Contact to a Share URI
 * @param {Account?} account - An optional Account to construct the Contact URI from, if omitted, the current DB account is used
 * @param {string?} pubkey - An optional Master Public Key to attach to the Contact URI
 */
export async function localContactToURI(account, pubkey) {
    // Fetch the current Account
    const cDB = await Database.getInstance();
    const cAccount = account || (await cDB.getAccount());

    // Use the given pubkey; but if none is passed, we'll derive our loaded Public Key
    let strPubkey = pubkey || '';

    // If HD: use xpub, otherwise we'll fallback to our single address
    if (!strPubkey) strPubkey = await wallet.getKeyToExport();

    // Construct the Contact URI Root
    const strURL = window.location.origin + window.location.pathname;

    // Convert our Name and Pubkey to HEX
    const strHexName = Buffer.from(cAccount.name).toString('hex');

    // Encode in our URI and return
    const strEncodedURI = encodeURIComponent(strHexName + ':' + strPubkey);
    return `${strURL}?addcontact=${strEncodedURI}`;
}

/**
 * A GUI wrapper for the Contact URI and Clipboard functions
 * @param {InputEvent} event - The DOM element calling the copy function
 */
export async function localContactToClipboard(event) {
    return toClipboard(await localContactToURI(), event.target);
}
