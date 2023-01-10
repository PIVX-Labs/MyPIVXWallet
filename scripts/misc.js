import { translateAlerts } from './i18n.js';
import { doms } from './global.js';
import qrcode from 'qrcode-generator';
import bs58 from 'bs58';
import { cChainParams } from './chain_params';
import { hexToBytes, bytesToHex } from './utils.js';

/* MPW constants */
export const pubKeyHashNetworkLen = 21;
export const pubChksum = 4;
export const pubPrebaseLen = pubKeyHashNetworkLen + pubChksum;

// Base58 Encoding Map
export const MAP_B58 =
    '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export const LEN_B58 = MAP_B58.length;

/* --- UTILS --- */
// Cryptographic Random-Gen
export function getSafeRand(nSize = 32) {
    return crypto.getRandomValues(new Uint8Array(nSize));
}

// Writes a sequence of Array-like bytes into a location within a Uint8Array
export function writeToUint8(arr, bytes, pos) {
    const arrLen = arr.length;
    // Sanity: ensure an overflow cannot occur, if one is detected, somewhere in MPW's state could be corrupted.
    if (arrLen - pos - bytes.length < 0) {
        const strERR =
            'CRITICAL: Overflow detected (' +
            (arrLen - pos - bytes.length) +
            '), possible state corruption, backup and refresh advised.';
        createAlert('warning', strERR, 5000);
        throw Error(strERR);
    }
    let i = 0;
    while (pos < arrLen) arr[pos++] = bytes[i++];
}

/* --- NOTIFICATIONS --- */
// Alert - Do NOT display arbitrary / external errors, the use of `.innerHTML` allows for input styling at this cost.
// Supported types: success, info, warning
export function createAlert(type, message, alertVariables = [], timeout = 0) {
    const domAlert = document.createElement('div');
    domAlert.classList.add('alertpop');
    domAlert.classList.add(type);

    // Maintainer QoL adjustment: if `alertVariables` is a number, it is instead assumed to be `timeout`
    if (typeof alertVariables === 'number') {
        timeout = alertVariables;
        alertVariables = [];
    }

    // Apply translations
    const translatedMessage = translateAlerts(message, alertVariables);

    // Message
    domAlert.innerHTML = translatedMessage;
    domAlert.destroy = () => {
        // Fully destroy timers + DOM elements, no memory leaks!
        clearTimeout(domAlert.timer);
        domAlert.style.opacity = '0';
        setTimeout(() => {
            domAlert.remove();
        }, 600);
    };
    // On Click: Delete alert from DOM after close animation.
    domAlert.addEventListener('click', domAlert.destroy);
    // On Timeout: Delete alert from DOM after a period of inactive time.
    if (timeout > 0) domAlert.timer = setTimeout(domAlert.destroy, timeout);
    doms.domAlertPos.appendChild(domAlert);
}

// Shows the confirm modal with the provided html.
// If resolvePromise has a value, the popup won't have
// Confirm/Cancel buttons and will wait for the promise to resolve
// Returns the awaited value of resolvePromise
// or true/false if the user confirmed or not the modal
export async function confirmPopup({ title, html, resolvePromise }) {
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

    // Set content display
    doms.domConfirmModalContent.innerHTML = html;

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
    }
}

// Generates and sets a QRCode image from a string and dom element
export function createQR(strData = '', domImg, size = 4) {
    // QRCode class consists of 'typeNumber' & 'errorCorrectionLevel'
    const cQR = qrcode(size, 'L');
    cQR.addData(strData);
    cQR.make();
    domImg.innerHTML = cQR.createImgTag();
    domImg.firstChild.style.borderRadius = '8px';
}

//generate private key for masternodes
export async function generateMnPrivkey() {
    // maximum value for a decoded private key
    let max_decoded_value =
        115792089237316195423570985008687907852837564279074904382605163141518161494337n;
    let valid = false;
    let priv_key = 0;
    while (!valid) {
        priv_key = bytesToHex(getSafeRand(32));
        let decoded_priv_key = BigInt('0x' + priv_key);

        if (0 < decoded_priv_key && decoded_priv_key < max_decoded_value) {
            valid = true;
        }
    }
    return await convertMnPrivKeyFromHex(priv_key);
}

export async function convertMnPrivKeyFromHex(hexStr) {
    //prefixes
    let WIF_PREFIX = 212;
    let TESTNET_WIF_PREFIX = 239;
    let base58_secret = cChainParams.current.isTestnet
        ? TESTNET_WIF_PREFIX
        : WIF_PREFIX;

    //convert the hexStr+ initial prefix to byte array hexToBytes(string)
    let data = [...hexToBytes(hexStr)];
    data.unshift(base58_secret);

    //generate the checksum with double sha256 hashing
    let checksum = hexToBytes(await hash(hexToBytes(await hash(data)))).slice(
        0,
        4
    );

    //concatenate data and checksum
    for (const byte of checksum) {
        data.push(byte);
    }

    return bs58.encode(data);
}

//sha256 a bytearray and return the hash in hexadecimal
export async function hash(byteArray) {
    const utf8 = new Uint8Array(byteArray);
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
        .map((bytes) => bytes.toString(16).padStart(2, '0'))
        .join('');
    return hashHex;
}

export function sanitizeHTML(text) {
    const element = document.createElement('div');
    element.innerText = text;
    return element.innerHTML;
}

/**
 * An artificial sleep function to pause code execution
 *
 * @param {Number} ms - The milliseconds to sleep
 *
 * @example
 * // Pause an asynchronous script for 1 second
 * await sleep(1000);
 */
export function sleep(ms) {
    return new Promise((res, _) => setTimeout(res, ms));
}
