import { translation } from './i18n.js';
import { doms } from './global.js';
import qrcode from 'qrcode-generator';
import bs58 from 'bs58';
import { BIP21_PREFIX, cChainParams } from './chain_params.js';
import { dSHA256 } from './utils.js';
import { verifyPubkey, verifyBech32 } from './encoding.js';

// Base58 Encoding Map
export const MAP_B58 =
    '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export const LEN_B58 = MAP_B58.length;

/* --- UTILS --- */
// Cryptographic Random-Gen
export function getSafeRand(nSize = 32) {
    return crypto.getRandomValues(new Uint8Array(nSize));
}

/** Download contents as a file */
export function downloadBlob(content, filename, contentType) {
    // Create a blob
    const blob = new Blob([content], { type: contentType });

    // Create a link to download it
    const pom = document.createElement('a');
    pom.href = URL.createObjectURL(blob);
    pom.setAttribute('download', filename);
    pom.click();
}

/**
 * Shows a Confirm popup with custom HTML.
 *
 * If `resolvePromise` has a value, the popup won't have
 * Confirm/Cancel buttons and will wait for the promise to resolve.
 *
 * Returns the awaited value of `resolvePromise` or `true/false` if the
 * user used a Cancel/Confirm button.
 * @param {object} options
 * @param {string?} options.title - The optional title of the popup
 * @param {string} options.html - The HTML of the popup contents
 * @param {Promise<any>} options.resolvePromise - A promise to resolve before closing the modal
 * @param {boolean?} options.hideConfirm - Whether to hide the Confirm button or not
 * @param {boolean?} options.purpleModal - Toggle a Purple modal, or leave as false for White
 * @param {boolean?} options.textLeft - Toggle to align modal text to the left, or leave as false for center
 * @param {boolean?} options.noPadding - Toggle zero padding, or leave as false for default padding
 * @param {number?} options.maxHeight - An optional modal Max Height, omit for default modal max
 * @returns {Promise<boolean|any>}
 */
export async function confirmPopup({
    title,
    html,
    resolvePromise,
    hideConfirm,
    purpleModal,
    textLeft,
    noPadding,
    maxHeight,
    centerButtons,
    wideModal,
}) {
    // If there's a title provided: display the header and text
    doms.domConfirmModalHeader.style.display = title ? 'block' : 'none';
    doms.domConfirmModalTitle.innerHTML = title || '';

    // If there's a promise to resolve, don't display buttons; the modal visibility will be controlled by the promise (f.e: a 'pls wait' screen)
    doms.domConfirmModalButtons.style.setProperty(
        'display',
        resolvePromise ? 'none' : 'block',
        resolvePromise ? 'important' : undefined
    );
    $('#confirmModal').modal(resolvePromise ? 'show' : { keyboard: false });

    // Show or hide the confirm button, and replace 'Cancel' with 'Close'
    doms.domConfirmModalConfirmButton.style.display = hideConfirm ? 'none' : '';
    doms.domConfirmModalCancelButton.innerHTML =
        '<span>' +
        (hideConfirm ? translation.popupClose : translation.popupCancel) +
        '</span>';

    // Set content display
    doms.domConfirmModalContent.innerHTML = html;

    // Set text align to left
    if (textLeft) {
        doms.domConfirmModalContent.classList.remove('center-text');
    } else {
        doms.domConfirmModalContent.classList.add('center-text');
    }

    // Use the purple modal
    if (purpleModal) {
        doms.domConfirmModalMain.classList.add('exportKeysModalColor');
    } else {
        doms.domConfirmModalMain.classList.remove('exportKeysModalColor');
    }

    // If modal is wide
    if (wideModal) {
        doms.domConfirmModalDialog.classList.add('masternodeModalDialog');
        doms.domConfirmModalDialog.classList.add('masternodeModalDialog2');

        doms.domConfirmModalContent.classList.remove('center-text');
    }

    // Remove padding
    if (noPadding) {
        doms.domConfirmModalContent.classList.add('px-0');
        doms.domConfirmModalContent.classList.add('pb-0');
    } else {
        doms.domConfirmModalContent.classList.remove('px-0');
        doms.domConfirmModalContent.classList.remove('pb-0');
    }

    // Set max-height (removed at `.finally` context)
    if (maxHeight)
        doms.domConfirmModalDialog.classList.add(`max-w-${maxHeight}`);

    // If there's an input in the prompt, focus the cursor upon it
    for (const domElement of doms.domConfirmModalContent.children) {
        if (domElement.type === 'text' || domElement.type === 'password') {
            domElement.focus();
            break;
        }
    }

    // Center the buttons
    if (centerButtons) {
        doms.domConfirmModalButtons.classList.add('centerFlex');
    }

    // Wait for the promise to resolve OR create a new one which resolves upon a modal button click
    resolvePromise =
        resolvePromise ||
        new Promise((res, _) => {
            doms.domConfirmModalConfirmButton.onclick = () => {
                res(true);
            };
            doms.domConfirmModalCancelButton.onclick = () => {
                res(false);
            };
        });
    try {
        return await resolvePromise;
    } finally {
        // We want to hide the modal even if an exception occurs
        $('#confirmModal').modal('hide');

        // Reset any modal settings
        doms.domConfirmModalDialog.classList.remove(`max-w-${maxHeight}`);
    }
}

// Generates and sets a QRCode image from a string and dom element
export function createQR(strData = '', domImg, size = 5) {
    // QRCode class consists of 'typeNumber' & 'errorCorrectionLevel'
    const cQR = qrcode(size, 'L');
    cQR.addData(strData);
    cQR.make();
    domImg.innerHTML = cQR.createImgTag(2, 2);
    domImg.firstChild.style.borderRadius = '8px';
}

/**
 * Prompt image selection, and return base64 of an image file.
 * @returns {Promise<string>} The base64 string of the selected image file.
 */
export async function getImageFile() {
    return new Promise((resolve) => {
        let input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            let file = e.target.files[0];
            let reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
        };
        input.click();
    });
}

/**
 * A quick check to see if an address is a Standard (P2PKH) address
 * @param {string} strAddress - The address to check
 * @returns {boolean} - `true` if a Standard address, `false` if not
 */
export function isStandardAddress(strAddress) {
    return verifyPubkey(strAddress);
}

/**
 * A quick check to see if an address is a Cold (P2CS) address
 * @param {string} strAddress - The address to check
 * @returns {boolean} - `true` if a Cold address, `false` if not
 */
export function isColdAddress(strAddress) {
    return verifyPubkey(strAddress, cChainParams.current.STAKING_ADDRESS);
}

/**
 * A quick check to see if an address is an exchange address
 * @param {string} strAddress - The address to check
 * @returns {boolean} - `true` if an exchange address, `false` if not
 */
export function isExchangeAddress(strAddress) {
    return verifyPubkey(
        strAddress,
        cChainParams.current.EXCHANGE_ADDRESS_PREFIX
    );
}

/**
 * @param {string} strAddress - The address to check
 * @returns {boolean} if strAddress is a valid Shield address
 */
export function isShieldAddress(strAddress) {
    return verifyBech32(strAddress, cChainParams.current.SHIELD_PREFIX);
}

/**
 * @param {string} strAddress
 * @return {boolean} If a straddress is a valid PIVX address,
 * i.e. shield, xpub or standard
 */
export function isValidPIVXAddress(strAddress) {
    return (
        isStandardAddress(strAddress) ||
        isColdAddress(strAddress) ||
        isShieldAddress(strAddress) ||
        isExchangeAddress(strAddress) ||
        isXPub(strAddress)
    );
}

/**
 * A quick check to see if a string is an XPub key
 * @param {string} strXPub - The XPub to check
 * @returns {boolean} - `true` if a valid formatted XPub, `false` if not
 */
export function isXPub(strXPub) {
    if (!strXPub.startsWith('xpub')) return false;

    // Attempt to Base58 decode the XPub
    try {
        // Slice away the `xpub` prefix and decode
        const decoded = bs58.decode(strXPub.slice(4));

        // Then verify the final length too
        return decoded.length === 78;
    } catch (e) {
        return false;
    }
}

/**
 * Attempt to safely parse a BIP21 Payment Request
 * @param {string} strReq - BIP21 Payment Request string
 * @returns {object | false}
 */
export function parseBIP21Request(strReq) {
    // Format should match: pivx:addr[?amount=x&label=x]
    if (!strReq.includes(BIP21_PREFIX + ':')) return false;

    const [addressPart, optionsPart] = strReq.includes('?')
        ? strReq.split('?')
        : [strReq, false];
    const strAddress = addressPart.substring(BIP21_PREFIX.length + 1); // remove 'pivx:' prefix
    let cOptions = {};

    // Ensure the address is valid
    if (
        // Standard address
        !isStandardAddress(strAddress) &&
        // Shield address
        !isShieldAddress(strAddress)
    ) {
        return false;
    }

    if (optionsPart) {
        cOptions = Object.fromEntries(
            optionsPart
                .split('&')
                .map((opt) => opt.split('=').map(decodeURIComponent))
        );
    }

    return { address: strAddress, options: cOptions };
}

/**
 * Generate an encoded private key for masternodes
 */
export function generateMasternodePrivkey() {
    // Prefix the network byte with the private key (32 random bytes)
    const data = [cChainParams.current.SECRET_KEY, ...getSafeRand(32)];

    // Compute and concatenate the checksum, then encode the private key as Base58
    return bs58.encode([...data, ...dSHA256(data).slice(0, 4)]);
}

export function sanitizeHTML(text) {
    const element = document.createElement('div');
    element.innerText = text;
    return element.innerHTML;
}

/**
 * "Beautifies" a number with HTML, by displaying decimals in a lower opacity
 * @param {string} strNumber - The number in String form to beautify
 * @param {string?} strDecFontSize - The optional font size to display decimals in
 * @returns {string} - A HTML string with beautified number handling
 */
export function beautifyNumber(
    strNumber,
    strDecFontSize = '',
    showFirstNumber = true
) {
    if (typeof strNumber === 'number') strNumber = strNumber.toString();

    // Only run this for numbers with decimals
    if (!strNumber.includes('.'))
        return parseInt(strNumber).toLocaleString('en-GB');

    // Split the number in to Full and Decimal parts
    const arrNumParts = strNumber.split('.');

    // Return a HTML that renders the decimal in a lower opacity
    const strFontSize = strDecFontSize ? 'font-size: ' + strDecFontSize : '';
    return `${
        showFirstNumber ? parseInt(arrNumParts[0]).toLocaleString('en-GB') : ''
    }<span style="opacity: 0.55; ${strFontSize}">.${arrNumParts[1]}</span>`;
}

/**
 * Check if a string is valid Base64 encoding
 * @param {string} str - String to check
 * @returns {boolean}
 */
export function isBase64(str) {
    const base64Regex = /^[A-Za-z0-9+/=]+$/;

    // Check if the string contains only Base64 characters:
    if (!base64Regex.test(str)) {
        return false;
    }

    // Check if the length is a multiple of 4 (required for Base64):
    if (str.length % 4 !== 0) {
        return false;
    }

    // Try decoding the Base64 string to check for errors:
    try {
        atob(str);
    } catch (e) {
        return false;
    }

    // The string is likely Base64-encoded:
    return true;
}

/**
 * Checks if two values are of the same type.
 *
 * @param {any} a - The first value.
 * @param {any} b - The second value.
 * @returns {boolean} - `true` if the values are of the same type, `false` if not or if there was an error comparing.
 */
export function isSameType(a, b) {
    try {
        if (a === null || b === null) return a === b;
        if (typeof a !== typeof b) return false;
        if (typeof a === 'object')
            return Object.getPrototypeOf(a) === Object.getPrototypeOf(b);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Checks if a value is 'empty'.
 *
 * @param {any} val - The value to check.
 * @returns {boolean} - `true` if the value is 'empty', `false` otherwise.
 * ---
 * Values **considered 'empty'**: `null`, `undefined`, empty strings, empty arrays, empty objects.
 *
 * Values **NOT considered 'empty'**: Any non-nullish primitive value: numbers (including `0` and `NaN`), `true`, `false`, `Symbol()`, `BigInt()`.
 */
export function isEmpty(val) {
    return (
        val == null ||
        val === '' ||
        (Array.isArray(val) && val.length === 0) ||
        (typeof val === 'object' && Object.keys(val).length === 0)
    );
}
