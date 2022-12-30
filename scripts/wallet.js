'use strict';
/**
 * Abstract class masterkey
 * @abstract
 */
class MasterKey {
  
  constructor() { }

  /**
   * @param {String} [path] - BIP32 path pointing to the private key.
   * @return {Promise<Array<Number>>} Array of bytes containing private key
   * @abstract
   */
  async getPrivateKeyBytes(path) {
    throw new Error("Not implemented");
  }
  
  /**
   * @param {String} [path] - BIP32 path pointing to the private key.
   * @return {String} encoded private key
   * @abstract
   */
  async getPrivateKey(path) {
    return generateOrEncodePrivkey(await this.getPrivateKeyBytes(path)).strWIF;
  }

  /**
   * @param {String} [path] - BIP32 path pointing to the address
   * @return {String} Address
   * @abstract
   */
  async getAddress(path) {
    return deriveAddress({pkBytes: await this.getPrivateKeyBytes(path)});
  }
  
  /**
   * @param {String} path - BIP32 path pointing to the xpub
   * @return {Promise<String>} xpub
   * @abstract
   */
  async getxpub(path) {
    throw new Error("Not implemented");
  }

  /**
   * Wipe all private data from key.
   * @return {void}
   * @abstract
   */
  wipePrivateData() {
    throw new Error("Not implemented");
  }
  
  /**
   * @return {String} private key suitable for backup.
   * @abstract
   */
  get keyToBackup() {
    throw new Error("Not implemented");
  }

  /**
   * @return {String} public key to export. Only suitable for monitoring balance.
   * @abstract
   */
  get keyToExport() {
    throw new Error("Not implemented");
  }

  /**
   * @return {Boolean} Whether or not this is a Hierarchical Deterministic wallet
   */
  get isHD() {
    return this._isHD;
  }

  /**
   * @return {Boolean} Whether or not this is a hardware wallet
   */
  get isHardwareWallet() {
    return this._isHardwareWallet;
  }

  /**
   * @return {Boolean} Whether or not this key is view only or not
   */
  get isViewOnly() {
    return this._isViewOnly;
  }
}

export class HdMasterKey extends MasterKey {
  constructor({seed, xpriv, xpub}) {
    super();
    // Generate the HDKey
    if(seed) this._hdKey = HDKey.fromMasterSeed(seed);
    if(xpriv) this._hdKey = HDKey.fromExtendedKey(xpriv);
    if(xpub) this._hdKey = HDKey.fromExtendedKey(xpub);
    this._isViewOnly = !!xpub;
    if (!this._hdKey) throw new Error("All of seed, xpriv and xpub are undefined");
    this._isHD = true;
    this._isHardwareWallet = false;
  }
  
  async getPrivateKeyBytes(path) {
    if(this.isViewOnly) {
      throw new Error("Trying to get private key bytes from a view only key");
    }
    return this._hdKey.derive(path).privateKey;
  }
  
  get keyToBackup() {
    if (this.isViewOnly) {
      throw new Error("Trying to get private key from a view only key");
    }
    return this._hdKey.privateExtendedKey;
  }
  
  async getxpub(path) {
    if(this.isViewOnly) return this._hdKey.publicExtendedKey;
    return this._hdKey.derive(path).publicExtendedKey;
  }

  getAddress(path) {
    let child;
    if (this.isViewOnly) {
      // If we're view only we can't derive hardened keys, so we'll assume
      // That the xpub has already been derived
      child = this._hdKey.derive(path.split("/").filter(n=>!n.includes("'")).join("/"))
    } else {
      child = this._hdKey.derive(path);
    }
    return deriveAddress({publicKey: Crypto.util.bytesToHex(child.publicKey)});
  }

  wipePrivateData() {
    if(this._isViewOnly) return;

    this._hdKey = HDKey.fromExtendedKey(this.keyToExport);
    this._isViewOnly = true;
  }

  get keyToExport() {
    if (this._isViewOnly) return this._hdKey.publicExtendedKey;
    // We need the xpub to point at the account level
    return this._hdKey.derive(getDerivationPath(false)
				     .split("/")
				     .slice(0, 4)
				     .join("/")).publicExtendedKey;
  }
}

export class HardwareWalletMasterKey extends MasterKey {
  constructor() {
    super();
    this._isHD = true;
    this._isHardwareWallet = true;
  }
  async getPrivateKeyBytes(path) {
    throw new Error("Hardware wallets cannot export private keys");
  }
  
  async getAddress(path, { verify } = {}) {
    return deriveAddress({publicKey: await getHardwareWalletKeys(path, false, verify)});
  }
  
  get keyToBackup() {
    throw new Error("Hardware wallets don't have keys to backup");
  }
  
  async getxpub(path) {
    if(!this.xpub) {
      this.xpub = await getHardwareWalletKeys(path, true);
    }
    return this.xpub;
  }

  // Hardware Wallets don't have exposed private data
  wipePrivateData() { }
  
  get isViewOnly() {
    return false;
  }
  get keyToExport() {
    return this.getxpub(getDerivationPath(true)
			.split("/")
			.filter(v=>!v.includes("'"))
			.join("/"));
  }
}

export class LegacyMasterKey extends MasterKey {
  constructor ({pkBytes, address}) {
    super();
    this._isHD = false;
    this._isHardwareWallet = false;
    this._pkBytes = pkBytes;
    this._address = address || super.getAddress();
    this._isViewOnly = !!address;
  }

  getAddress() {
    return this._address;
  }

  get keyToExport() {
    return this._address;
  }
  
  async getPrivateKeyBytes(_path) {
    if (this.isViewOnly) {
      throw new Error("Trying to get private key bytes from a view only key");
    }
    return this._pkBytes;
  }
  
  get keyToBackup() {
    return generateOrEncodePrivkey(this._pkBytes).strWIF;
  }
  
  async getxpub(path) {
    throw new Error("Trying to get an extended public key from a legacy address");
  }
  
  wipePrivateData() {
    this._pkBytes = null;
    this._isViewOnly = true;
  }
}

// Ledger Hardware wallet constants
export const LEDGER_ERRS = new Map([
  // Ledger error code <--> User-friendly string
  [25870, "Open the PIVX app on your device"],
  [25873, "Open the PIVX app on your device"],
  [57408, "Navigate to the PIVX app on your device"],
  [27157, "Wrong app! Open the PIVX app on your device"],
  [27266, "Wrong app! Open the PIVX app on your device"],
  [27904, "Wrong app! Open the PIVX app on your device"],
  [27010, "Unlock your Ledger, then try again!"],
  [27404, "Unlock your Ledger, then try again!"]
]);

// Construct a full BIP44 pubkey derivation path from it's parts
export function getDerivationPath(fLedger = false,nAccount = 0, nReceiving = 0, nIndex = 0) {
  // Coin-Type is different on Ledger, as such, we modify it if we're using a Ledger to derive a key
  const strCoinType = fLedger ? cChainParams.current.BIP44_TYPE_LEDGER : cChainParams.current.BIP44_TYPE;
  if (!masterKey.isHD && !fLedger) {
    return `:)//${strCoinType}'`
  }
  return `m/44'/${strCoinType}'/${nAccount}'/${nReceiving}/${nIndex}`;
}

// Verify the integrity of a WIF private key, optionally parsing and returning the key payload
export function verifyWIF(strWIF = "", fParseBytes = false, skipVerification = false) {
  // Convert from Base58
  const bWIF = from_b58(strWIF);
    
  if(!skipVerification) {
    // Verify the byte length
    if (bWIF.byteLength !== PRIVKEY_BYTE_LENGTH) {
      throw Error("Private key length (" + bWIF.byteLength + ") is invalid, should be " + PRIVKEY_BYTE_LENGTH + "!");
    }
    
    // Verify the network byte
    if (bWIF[0] !== cChainParams.current.SECRET_KEY) {
      // Find the network it's trying to use, if any
      const cNetwork = Object.keys(cChainParams).filter(strNet => strNet !== 'current').map(strNet => cChainParams[strNet]).find(cNet => cNet.SECRET_KEY === bWIF[0]);
      // Give a specific alert based on the byte properties
      throw Error(cNetwork ? "This private key is for " + (cNetwork.isTestnet ? "Testnet" : "Mainnet") + ", wrong network!" : "This private key belongs to another coin, or is corrupted.");
    }
    
    // Perform SHA256d hash of the WIF bytes
    const shaHash = new jsSHA(0, 0, { "numRounds": 2 });
    shaHash.update(bWIF.slice(0, 34));
    
    // Verify checksum (comparison by String since JS hates comparing object-like primitives)
    const bChecksumWIF = bWIF.slice(bWIF.byteLength - 4);
    const bChecksum = shaHash.getHash(0).slice(0, 4);
    if (bChecksumWIF.join('') !== bChecksum.join('')) {
      throw Error("Private key checksum is invalid, key may be modified, mis-typed, or corrupt.");
    }
  }
  
  return fParseBytes ? Uint8Array.from(bWIF.slice(1, 33)) : true;
}

// A convenient alias to verifyWIF that returns the raw byte payload
export function parseWIF(strWIF, skipVerification = false) {
  return verifyWIF(strWIF, true, skipVerification);
}

// Generate a new private key OR encode an existing private key from raw bytes
export function generateOrEncodePrivkey(pkBytesToEncode) {
  // Private Key Generation
  const pkBytes = pkBytesToEncode || getSafeRand();
  const pkNetBytesLen = pkBytes.length + 2;
  const pkNetBytes = new Uint8Array(pkNetBytesLen);

  // Network Encoding
  pkNetBytes[0] = cChainParams.current.SECRET_KEY; // Private key prefix (1 byte)
  writeToUint8(pkNetBytes, pkBytes, 1);            // Private key bytes  (32 bytes)
  pkNetBytes[pkNetBytesLen - 1] = 1;               // Leading digit      (1 byte)

  // Double SHA-256 hash
  const shaObj = new jsSHA(0, 0, { "numRounds": 2 });
  shaObj.update(pkNetBytes);

  // WIF Checksum
  const checksum = shaObj.getHash(0).slice(0, 4);
  const keyWithChecksum = new Uint8Array(pkNetBytesLen + checksum.length);
  writeToUint8(keyWithChecksum, pkNetBytes, 0);
  writeToUint8(keyWithChecksum, checksum, pkNetBytesLen);

  // Return both the raw bytes and the WIF format
  return { pkBytes, strWIF: to_b58(keyWithChecksum) };
}

/**
 * Compress an uncompressed Public Key in byte form
 * @param {Array<Number> | Uint8Array} pubKeyBytes - The uncompressed public key bytes
 * @returns {Array<Number>} The compressed public key bytes
 */
function compressPublicKey(pubKeyBytes) {
  if(pubKeyBytes.length != 65) throw new Error("Attempting to compress an invalid uncompressed key");
  const x = pubKeyBytes.slice(1, 33);
  const y = pubKeyBytes.slice(33);

  // Compressed key is [key_parity + 2, x]
  return [ y[31] % 2 === 0 ? 2 : 3, ...x ];
}

/**
 * Derive a Secp256k1 network-encoded public key (coin address) from raw private or public key bytes
 * @param {Object} options - The object to deconstruct
 * @param {String} [options.publicKey] - The hex encoded public key. Can be both compressed or uncompressed
 * @param {Array<Number> | Uint8Array} [options.pkBytes] - An array of bytes containing the private key
 * @param {"ENCODED" | "UNCOMPRESSED_HEX" | "COMPRESSED_HEX"} options.output - Output
 * @return {String} the public key with the specified encoding
 */
export function deriveAddress({
  pkBytes,
  publicKey,
  output = "ENCODED",
}) {
  if(!pkBytes && !publicKey) return null;
  const compress = output !== "UNCOMPRESSED_HEX";
  // Public Key Derivation
  let pubKeyBytes = (publicKey ? Crypto.util.hexToBytes(publicKey) : (nobleSecp256k1.getPublicKey(pkBytes, compress)));

  if (output === "UNCOMPRESSED_HEX") {
    if (pubKeyBytes.length !== 65) {
      // It's actually possible, but it's probably not something that we'll need
      throw new Error("Can't uncompress an already compressed key");
    }
    return Crypto.util.bytesToHex(pubKeyBytes);
  }
  
  if(pubKeyBytes.length === 65) {
    pubKeyBytes = compressPublicKey(pubKeyBytes);
  }

  if (pubKeyBytes.length != 33) {
    throw new Error("Invalid public key");
  }

  if (output === "COMPRESSED_HEX") {
    return Crypto.util.bytesToHex(pubKeyBytes);
  }

  // First pubkey SHA-256 hash
  const pubKeyHashing = new jsSHA(0, 0, { "numRounds": 1 });
  pubKeyHashing.update(pubKeyBytes);

  // RIPEMD160 hash
  const pubKeyHashRipemd160 = ripemd160(pubKeyHashing.getHash(0));

  // Network Encoding
  const pubKeyHashNetwork = new Uint8Array(pubKeyHashNetworkLen);
  pubKeyHashNetwork[0] = cChainParams.current.PUBKEY_ADDRESS;
  writeToUint8(pubKeyHashNetwork, pubKeyHashRipemd160, 1);

  // Double SHA-256 hash
  const pubKeyHashingS = new jsSHA(0, 0, { "numRounds": 2 });
  pubKeyHashingS.update(pubKeyHashNetwork);
  const pubKeyHashingSF = pubKeyHashingS.getHash(0);

  // Checksum
  const checksumPubKey = pubKeyHashingSF.slice(0, 4);

  // Public key pre-base58
  const pubKeyPreBase = new Uint8Array(pubPrebaseLen);
  writeToUint8(pubKeyPreBase, pubKeyHashNetwork, 0);
  writeToUint8(pubKeyPreBase, checksumPubKey, pubKeyHashNetworkLen);

  // Encode as Base58 human-readable network address
  return to_b58(pubKeyPreBase);
}

// Wallet Import
export async function importWallet({
  newWif = false,
  fRaw = false,
  isHardwareWallet = false,
  skipConfirmation = false,
} = {}) {
  const strImportConfirm = "Do you really want to import a new address? If you haven't saved the last private key, the wallet will be LOST forever.";
  const walletConfirm = (fWalletLoaded && !skipConfirmation) ? await confirmPopup({html: strImportConfirm}) : true;

  if (walletConfirm) {
    if (isHardwareWallet) {
      // Firefox does NOT support WebUSB, thus cannot work with Hardware wallets out-of-the-box
      if (navigator.userAgent.includes("Firefox")) {
        return createAlert("warning", ALERTS.WALLET_FIREFOX_UNSUPPORTED, [], 7500);
      }

      const publicKey = await getHardwareWalletKeys(getDerivationPath(true));
      // Errors are handled within the above function, so there's no need for an 'else' here, just silent ignore.
      if (!publicKey) return;

      // Derive our hardware address and import!
      masterKey = new HardwareWalletMasterKey();

      // Hide the 'export wallet' button, it's not relevant to hardware wallets
      domExportWallet.style.display = "none";

      createAlert("info", ALERTS.WALLET_HARDWARE_WALLET, [{hardwareWallet : strHardwareName}], 12500);
    } else {
      // If raw bytes: purely encode the given bytes rather than generating our own bytes
      if (fRaw) {
        newWif = generateOrEncodePrivkey(newWif).strWIF;

        // A raw import likely means non-user owned key (i.e: created via VanityGen), thus, we assume safety first and add an exit blocking listener
        addEventListener("beforeunload", beforeUnloadListener, {
          capture: true
        });
      }

      // Select WIF from internal source OR user input (could be: WIF, Mnemonic or xpriv)
      const privateImportValue = newWif || domPrivKey.value;
      domPrivKey.value = "";

      if (await verifyMnemonic(privateImportValue)) {
        // Generate our masterkey via Mnemonic Phrase
        const seed = await bip39.mnemonicToSeed(privateImportValue);
        masterKey = new HdMasterKey({seed});
      } else {
        // Public Key Derivation
        try {
	  if (privateImportValue.startsWith("xpub")) {
	    masterKey = new HdMasterKey({xpub: privateImportValue});
	  } else if (privateImportValue.startsWith("xprv")) {
            masterKey = new HdMasterKey({xpriv: privateImportValue});
          } else if (privateImportValue.length === 34 && cChainParams.current.PUBKEY_PREFIX.includes(privateImportValue[0])) {
	    masterKey = new LegacyMasterKey({address: privateImportValue});
	  } else {
            // Lastly, attempt to parse as a WIF private key
            const pkBytes = parseWIF(privateImportValue);

            // Hide the 'new address' button, since non-HD wallets are essentially single-address MPW wallets
            domNewAddress.style.display = "none";

            // Import the raw private key
            masterKey = new LegacyMasterKey({pkBytes});
          }
        } catch (e) {
          return createAlert('warning', ALERTS.FAILED_TO_IMPORT + e.message, [],
                             6000);
        }
      }
    }

    // Reaching here: the deserialisation was a full cryptographic success, so a wallet is now imported!
    fWalletLoaded = true;

    // Hide wipe wallet button if there is no private key
    if (masterKey.isViewOnly || masterKey.isHardwareWallet) {
      domWipeWallet.hidden = true;
      if (hasEncryptedWallet()) {
	domRestoreWallet.hidden = false;
      }
    }

    getNewAddress({updateGUI: true});
    // Display Text
    domGuiWallet.style.display = 'block';

    // Update identicon
    domIdenticon.dataset.jdenticonValue = masterKey.getAddress(getDerivationPath());
    jdenticon();

    // Hide the encryption warning if the user pasted the private key
    // Or in Testnet mode or is using a hardware wallet or is view-only mode
    if (!(newWif || cChainParams.current.isTestnet || isHardwareWallet || masterKey.isViewOnly)) domGenKeyWarning.style.display = 'block';

    // Fetch state from explorer
    if (networkEnabled) refreshChainData();

    // Hide all wallet starter options
    hideAllWalletOptions();
  }
}

// Wallet Generation
export async function generateWallet(noUI = false) {
    const strImportConfirm = "Do you really want to import a new address? If you haven't saved the last private key, the wallet will be LOST forever.";
    const walletConfirm = fWalletLoaded && !noUI ? await confirmPopup({html: strImportConfirm}) : true;
    if (walletConfirm) {
      const mnemonic = await bip39.generateMnemonic();

      if(!noUI) await informUserOfMnemonic(mnemonic);
      const seed = await bip39.mnemonicToSeed(mnemonic);

      // Prompt the user to encrypt the seed
      masterKey = new HdMasterKey({seed});
      fWalletLoaded = true;

      if(!cChainParams.current.isTestnet) domGenKeyWarning.style.display = 'block';
      // Add a listener to block page unloads until we are sure the user has saved their keys, safety first!
      addEventListener("beforeunload", beforeUnloadListener, {capture: true});

      // Display the dashboard
      domGuiWallet.style.display = 'block';
      hideAllWalletOptions();

      // Update identicon
      domIdenticon.dataset.jdenticonValue = masterKey.getAddress(getDerivationPath());
      jdenticon();

      getNewAddress({ updateGUI: true });

      // Refresh the balance UI (why? because it'll also display any 'get some funds!' alerts)
      getBalance(true);
      getStakingBalance(true);
    }

    return masterKey;
}

export async function verifyMnemonic(strMnemonic = "", fPopupConfirm = true) {
  const nWordCount = strMnemonic.trim().split(/\s+/g).length;

  // Sanity check: Convert to lowercase
  strMnemonic = strMnemonic.toLowerCase();

  // Ensure it's a word count that makes sense
  if (nWordCount >= 12 && nWordCount <= 24) {
    if (!bip39.validateMnemonic(strMnemonic)) {
      // The reason we want to ask the user for confirmation is that the mnemonic
      // Could have been generated with another app that has a different dictionary
      return fPopupConfirm && await confirmPopup({ title: "Unexpected Seed Phrase", html: "The seed phrase is either invalid, or was not generated by MPW.<br>Do you still want to proceed?"});
    } else {
      // Valid count and mnemonic
      return true;
    }
  } else {
    // Invalid count
    return false;
  }
}

function informUserOfMnemonic(mnemonic) {
  return new Promise((res, rej) => {
    $('#mnemonicModal').modal({keyboard: false})
    domMnemonicModalContent.innerText = mnemonic;
    domMnemonicModalButton.onclick = () => {
      res();
      $('#mnemonicModal').modal("hide");
    };
    $('#mnemonicModal').modal("show");
  });
}


async function benchmark(quantity) {
  let i = 0;
  const nStartTime = Date.now();
  while (i < quantity) {
    await generateWallet(true);
    i++;
  }
  const nEndTime = Date.now();
  console.log("Time taken to generate " + i + " addresses: " + (nEndTime - nStartTime).toFixed(2) + 'ms');
}

export async function encryptWallet(strPassword = '') {
  // Encrypt the wallet WIF with AES-GCM and a user-chosen password - suitable for browser storage
  let strEncWIF = await encrypt(masterKey.keyToBackup, strPassword);
  if (!strEncWIF) return false;

  // Set the encrypted wallet in localStorage
  localStorage.setItem("encwif", strEncWIF);
  localStorage.setItem("publicKey", await masterKey.keyToExport);

  // Hide the encryption warning
  domGenKeyWarning.style.display = 'none';

  // Remove the exit blocker, we can annoy the user less knowing the key is safe in their localstorage!
  removeEventListener("beforeunload", beforeUnloadListener, {capture: true});
}

export async function decryptWallet(strPassword = '') {
  // Check if there's any encrypted WIF available
  const strEncWIF = localStorage.getItem("encwif");
  if (!strEncWIF || strEncWIF.length < 1) return false;

  // Prompt to decrypt it via password
  const strDecWIF = await decrypt(strEncWIF, strPassword);
  if (!strDecWIF || strDecWIF === "decryption failed!") {
    if (strDecWIF) return createAlert("warning", "Incorrect password!", 6000);
  } else {
    await importWallet({
      newWif: strDecWIF,
      skipConfirmation: true,
    });
    // Ensure publicKey is set
    localStorage.setItem("publicKey", await masterKey.keyToExport);
    return true;
  }
}

export function hasEncryptedWallet() {
  return localStorage.getItem("encwif") ? true : false;
}

// If the privateKey is null then the user connected a hardware wallet
function hasHardwareWallet() {
  if (!masterKey) return false;
  return masterKey.isHardwareWallet == true;
}

function hasWalletUnlocked(fIncludeNetwork = false) {
  if (fIncludeNetwork && !networkEnabled)
    return createAlert('warning', ALERTS.WALLET_OFFLINE_AUTOMATIC, [], 5500);
    if (!masterKey) {
      return createAlert('warning', ALERTS.WALLET_UNLOCK_IMPORT, [{unlock : (hasEncryptedWallet() ? "unlock " : "import/create")}], 3500);
  } else {
    return true;
  }
}

let cHardwareWallet = null;
let strHardwareName = "";
async function getHardwareWalletKeys(path, xpub = false, verify = false, _attempts = 0) {
  try {
    // Check if we haven't setup a connection yet OR the previous connection disconnected
    if (!cHardwareWallet || cHardwareWallet.transport._disconnectEmitted) {
      cHardwareWallet = new AppBtc(await window.transport.create());
    }

    // Update device info and fetch the pubkey
    strHardwareName = cHardwareWallet.transport.device.manufacturerName + " " + cHardwareWallet.transport.device.productName;

    // Prompt the user in both UIs
    if (verify) createAlert("info", WALLET_CONFIRM_L, [], 3500);
    const cPubKey = await cHardwareWallet.getWalletPublicKey(path, {
      verify,
      format: "legacy",
    });

    if (xpub) {
      return createXpub({
        depth: 3,
        childNumber: 2147483648,
        chainCode: cPubKey.chainCode,
        publicKey: cPubKey.publicKey,
      });
    } else {
      return cPubKey.publicKey;
    }
  } catch (e) {
    if(e.message.includes("denied by the user")) { // User denied an operation
      return false;
    }
    if (_attempts < 10) { // This is an ugly hack :(
      // in the event where multiple parts of the code decide to ask for an address, just
      // Retry at most 10 times waiting 200ms each time
      await sleep(200);
      return getHardwareWalletKeys(path, xpub, verify, _attempts+1);
    }
    // If there's no device, nudge the user to plug it in.
    if (e.message.toLowerCase().includes('no device selected')) {
      createAlert("info", ALERTS.WALLET_NO_HARDWARE, [], 10000);
      return false;
    }

    // If the device is unplugged, or connection lost through other means (such as spontanious device explosion)
    if (e.message.includes("Failed to execute 'transferIn'")) {
      createAlert("info", ALERTS.WALLET_HARDWARE_CONNECTION_LOST, [{hardwareWallet : strHardwareName, hardwareWalletProductionName : cHardwareWallet.transport.device.productName}], 10000);
      return false;
    }

    // If the ledger is busy, just nudge the user.
    if (e.message.includes('is busy')) {
      createAlert("info", ALERTS.WALLET_HARDWARE_BUSY, [{hardwareWallet : strHardwareName, hardwareWalletProductionName : cHardwareWallet.transport.device.productName}], 7500);
      return false;
    }

    // Check if this is an expected error
    if (!e.statusCode || !LEDGER_ERRS.has(e.statusCode)) {
      console.error("MISSING LEDGER ERROR-CODE TRANSLATION! - Please report this below error on our GitHub so we can handle it more nicely!");
      console.error(e);
    }

    // Translate the error to a user-friendly string (if possible)
    createAlert("warning", ALERTS.WALLET_HARDWARE_ERROR, [{hardwareWallet : strHardwareName, error: (LEDGER_ERRS.get(e.statusCode))}], 5500);
    return false;
  }
}
