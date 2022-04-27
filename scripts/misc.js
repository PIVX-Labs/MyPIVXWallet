'use strict';

/* MPW constants */
const pubKeyHashNetworkLen = 21;
const pubChksum = 4;
const pubPrebaseLen = pubKeyHashNetworkLen + pubChksum;

// Base58 Encoding Map
const MAP_B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

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



/* --- BASE58 (EN/DE)CODING */
// ByteArray to Base58 String
const to_b58 = function (B) {
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
const from_b58 = function (S) {
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
function createAlert(type, message, timeout = 0) {
    const domAlert = document.createElement("div");
    domAlert.className = "alertpop " + type;
    // Message
    domAlert.innerHTML = message;
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