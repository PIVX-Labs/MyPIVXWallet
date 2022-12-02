'use strict';

/* MPW constants */
const pubKeyHashNetworkLen = 21;
const pubChksum = 4;
const pubPrebaseLen = pubKeyHashNetworkLen + pubChksum;

// Notifications map
let ALERTS = {}

// Base58 Encoding Map
const MAP_B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const LEN_B58= MAP_B58.length;

/* --- UTILS --- */
// Cryptographic Random-Gen
function getSafeRand(nSize = 32) {
    return crypto.getRandomValues(new Uint8Array(nSize));
}

// Writes a sequence of Array-like bytes into a location within a Uint8Array
function writeToUint8(arr, bytes, pos) {
    const arrLen = arr.length;
    // Sanity: ensure an overflow cannot occur, if one is detected, somewhere in MPW's state could be corrupted.
    if ((arrLen - pos) - bytes.length < 0) {
        const strERR = 'CRITICAL: Overflow detected (' + ((arrLen - pos) - bytes.length) + '), possible state corruption, backup and refresh advised.';
        alert(strERR);
        throw Error(strERR);
    }
    let i = 0;
    while (pos < arrLen)
        arr[pos++] = bytes[i++];
}

// bn.js alias
function uint256(x, base) {
    return new BN(x, base)
}



/* --- BASE58 (EN/DE)CODING */
// ByteArray to Base58 String
function to_b58(B) {
    var d = [],    //the array for storing the stream of base58 digits
        s = "",    //the result string variable that will be returned
        i,         //the iterator variable for the byte input
        j,         //the iterator variable for the base58 digit array (d)
        c,         //the carry amount variable that is used to overflow from the current base58 digit to the next base58 digit
        n;         //a temporary placeholder variable for the current base58 digit
    for (i in B) { //loop through each byte in the input stream
        j = 0,                           //reset the base58 digit iterator
        c = B[i];                        //set the initial carry amount equal to the current byte amount
        s += c || s.length ^ i ? "" : 1; //prepend the result string with a "1" (0 in base58) if the byte stream is zero and non-zero bytes haven't been seen yet (to ensure correct decode length)
        while (j in d || c) {            //start looping through the digits until there are no more digits and no carry amount
            n = d[j];                    //set the placeholder for the current base58 digit
            n = n ? n * 256 + c : c;     //shift the current base58 one byte and add the carry amount (or just add the carry amount if this is a new digit)
            c = n / 58 | 0;              //find the new carry amount (floored integer of current digit divided by 58)
            d[j] = n % 58;                //reset the current base58 digit to the remainder (the carry amount will pass on the overflow)
            j++                          //iterate to the next base58 digit
        }
    }
    while (j--) //since the base58 digits are backwards, loop through them in reverse order
        s += MAP_B58[d[j]]; //lookup the character associated with each base58 digit
    return s; //return the final base58 string
}

// Base58 String to ByteArray
function from_b58(S) {
    var d = [], //the array for storing the stream of decoded bytes
        b = [], //the result byte array that will be returned
        i,      //the iterator variable for the base58 string
        j,      //the iterator variable for the byte array (d)
        c,      //the carry amount variable that is used to overflow from the current byte to the next byte
        n;      //a temporary placeholder variable for the current byte
    for (i in S) { //loop through each base58 character in the input string
        j = 0,                             //reset the byte iterator
        c = MAP_B58.indexOf(S[i]);         //set the initial carry amount equal to the current base58 digit
        if (c < 0)                         //see if the base58 digit lookup is invalid (-1)
            return undefined;              //if invalid base58 digit, bail out and return undefined
        c || b.length ^ i ? i : b.push(0); //prepend the result array with a zero if the base58 digit is zero and non-zero characters haven't been seen yet (to ensure correct decode length)
        while (j in d || c) {              //start looping through the bytes until there are no more bytes and no carry amount
            n = d[j];                      //set the placeholder for the current byte
            n = n ? n * 58 + c : c;        //shift the current byte 58 units and add the carry amount (or just add the carry amount if this is a new byte)
            c = n >> 8;                    //find the new carry amount (1-byte shift of current byte value)
            d[j] = n % 256;                //reset the current byte to the remainder (the carry amount will pass on the overflow)
            j++                            //iterate to the next byte
        }
    }
    while (j--) //since the byte array is backwards, loop through it in reverse order
        b.push(d[j]); //append each byte to the result
    return new Uint8Array(b); //return the final byte array in Uint8Array format
}



/* --- NOTIFICATIONS --- */
// Alert - Do NOT display arbitrary / external errors, the use of `.innerHTML` allows for input styling at this cost.
// Supported types: success, info, warning
function createAlert(type, message, alertVariables = [], timeout = 0) {
    const domAlert = document.createElement("div");
    domAlert.classList.add("alertpop");
    domAlert.classList.add(type);

    // Maintainer QoL adjustment: if `alertVariables` is a number, it is instead assumed to be `timeout`
    if (typeof alertVariables === "number") {
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
        domAlert.style.opacity = "0";
        setTimeout(() => {
            domAlert.remove();
        }, 600);
    }
    // On Click: Delete alert from DOM after close animation.
    domAlert.addEventListener("click", domAlert.destroy);
    // On Timeout: Delete alert from DOM after a period of inactive time.
    if (timeout > 0) domAlert.timer = setTimeout(domAlert.destroy, timeout);
    domAlertPos.appendChild(domAlert);
}

// Shows the confirm modal with the provided html.
// If resolvePromise has a value, the popup won't have
// Confirm/Cancel buttons and will wait for the promise to resolve
// Returns the awaited value of resolvePromise
// or true/false if the user confirmed or not the modal
async function confirmPopup({ title, html, resolvePromise }) {
    // If there's a title provided: display the header and text
    domConfirmModalHeader.style.display = title ? "block" : "none";
    domConfirmModalTitle.innerHTML = title || "";

    // If there's a promise to resolve, don't display buttons; the modal visibility will be controlled by the promise (f.e: a 'pls wait' screen)
    domConfirmModalButtons.style.setProperty("display", resolvePromise ? "none" : "block", resolvePromise ? "important" : undefined);
    $("#confirmModal").modal(resolvePromise ? "show" : { keyboard: false });

    // Set content display
    domConfirmModalContent.innerHTML = html;

    // Wait for the promise to resolve OR create a new one which resolves upon a modal button click
    resolvePromise = resolvePromise || new Promise((res, _) => {
        domConfirmModalConfirmButton.onclick = () => { res(true); }
        domConfirmModalCancelButton.onclick = () => { res(false); }
    });
    try {
        return await resolvePromise;
    } finally { // We want to hide the modal even if an exception occurs
        $("#confirmModal").modal("hide");
    }
}

// Generates and sets a QRCode image from a string and dom element
function createQR(strData = '', domImg,size=4) {
    // QRCode class consists of 'typeNumber' & 'errorCorrectionLevel'
    const cQR = qrcode(size, 'L');
    cQR.addData(strData);
    cQR.make();
    domImg.innerHTML = cQR.createImgTag();
    domImg.firstChild.style.borderRadius = '8px';
}


//generate private key for masternodes
async function generateMnPrivkey(){
    // maximum value for a decoded private key
    let max_decoded_value=115792089237316195423570985008687907852837564279074904382605163141518161494337n;
    let valid=false;
    let priv_key=0;
    while(!valid){
        
        priv_key=Crypto.util.bytesToHex(Crypto.util.randomBytes(32));
        let decoded_priv_key = BigInt("0x"+priv_key); 
        
        if(0<decoded_priv_key && decoded_priv_key<max_decoded_value){
            valid=true;
        }
    }
    return await convertMnPrivKeyFromHex(priv_key);
}

async function convertMnPrivKeyFromHex(hexStr){
    //prefixes
    let WIF_PREFIX = 212;  
    let TESTNET_WIF_PREFIX = 239; 
    let base58_secret = cChainParams.current.isTestnet ? TESTNET_WIF_PREFIX : WIF_PREFIX;

    //convert the hexStr+ initial prefix to byte array Crypto.util.hexToBytes(string)
    let data=Crypto.util.hexToBytes(hexStr);
    data.unshift(base58_secret); 
 
    //generate the checksum with double sha256 hashing
    let checksum= Crypto.util.hexToBytes((await hash(Crypto.util.hexToBytes( await hash(data))))).slice(0,4);

    //concatenate data and checksum
    let i=0;
    for(i in checksum){
        data.push(checksum[i])
    }
    
    return to_b58(data);

}

//sha256 a bytearray and return the hash in hexadecimal
async function hash(byteArray) {
    const utf8 = new Uint8Array(byteArray);
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((bytes) => bytes.toString(16).padStart(2, '0'))
      .join('');
    return hashHex;
  }

/**
 * Swaps the endianness of a HEX string
 * @param {String} HEX - HEX string to swap the endianness of
 * @returns {String} Swapped Endian HEX
 */
const swapHEXEndian = (HEX) => {
    const result = [];
    let len = HEX.length;
    while (len >= 0) {
        result.push(HEX.substring(len, len-2));
        len -= 2;
    }
    return result.join('');
    }

function sanitizeHTML(text) {
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
function sleep(ms) {
    return new Promise((res, _) => setTimeout(res, ms));
}