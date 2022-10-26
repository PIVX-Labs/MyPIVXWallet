// Ledger Hardware wallet constants
const LEDGER_ERRS = new Map([
  // Ledger error code <--> User-friendly string
  [25870, "Open the PIVX app on your device"],
  [57408, "Navigate to the PIVX app on your device"],
  [27266, "Wrong app! Open the PIVX app on your device"],
  [27904, "Wrong app! Open the PIVX app on your device"],
  [27010, "Unlock your Ledger, then try again!"]
]);

// Construct a full BIP44 pubkey derivation path from it's parts
function getDerivationPath(fLedger = false, nAccount = 0, nReceiving = 0, nIndex = 0) {
  // Coin-Type is different on Ledger, as such, we modify it if we're using a Ledger to derive a key
  const strCoinType = fLedger ? cChainParams.current.BIP44_TYPE_LEDGER : cChainParams.current.BIP44_TYPE;
  return `m/44'/${strCoinType}'/${nAccount}'/${nReceiving}/${nIndex}`;
}

// Generate a new private key OR encode an existing private key from raw bytes
generateOrEncodePrivkey = function (pkBytesToEncode) {
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

// Derive a Secp256k1 network-encoded public key (coin address) from raw private or public key bytes
deriveAddress = function({
  pkBytes,
  publicKey
}) {
    if(!pkBytes && !publicKey) return null;
  // Public Key Derivation
  let nPubkey = (publicKey || Crypto.util.bytesToHex(nSecp256k1.getPublicKey(pkBytes))).substring(2)
  const pubY = Secp256k1.uint256(nPubkey.substr(64), 16);
  nPubkey = nPubkey.substr(0, 64);
  const publicKeyBytesCompressed = Crypto.util.hexToBytes(nPubkey);
  publicKeyBytesCompressed.unshift(pubY.isEven() ? 2 : 3);

  // First pubkey SHA-256 hash
  const pubKeyHashing = new jsSHA(0, 0, { "numRounds": 1 });
  pubKeyHashing.update(publicKeyBytesCompressed);

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
importWallet = async function({
  newWif = false,
  fRaw = false,
  isHardwareWallet = false
} = {}) {
  const strImportConfirm = "Do you really want to import a new address? If you haven't saved the last private key, the wallet will be LOST forever.";
  const walletConfirm = fWalletLoaded ? window.confirm(strImportConfirm) : true;

  if (walletConfirm) {
    if (isHardwareWallet) {
      // Firefox does NOT support WebUSB, thus cannot work with Hardware wallets out-of-the-box
      if (navigator.userAgent.includes("Firefox")) {
        return createAlert("warning", "<b>Firefox doesn't support this!</b><br>Unfortunately, Firefox does not support hardware wallets", 7500);
      }

      const publicKey = await getHardwareWalletPublicKey();
      // Errors are handled within the above function, so there's no need for an 'else' here, just silent ignore.
      if (!publicKey) return;

	// Derive our hardware address and import!
	masterKey = {
	    getAddress: async path => deriveAddress({publicKey: await getHardwareWalletPublicKey(path)}),
	    isHD: true,
	    isHardwareWallet: true,
	};

	createAlert("info", "<b>Hardware wallet ready!</b><br>Please keep your " + strHardwareName + " plugged in, unlocked, and in the PIVX app", 12500);
    } else {
      // If raw bytes: purely encode the given bytes rather than generating our own bytes
      if (fRaw) {
        newWif = generateOrEncodePrivkey(newWif).strWIF;

        // A raw import likely means non-user owned key (i.e: created via VanityGen), thus, we assume safety first and add an exit blocking listener
        addEventListener("beforeunload", beforeUnloadListener, {
          capture: true
        });
      }

      // Select WIF from internal source OR user input
	const privateKeyForTransactions = newWif || domPrivKey.value;
	domPrivKey.value = "";

	if (privateKeyForTransactions.split(" ").length > 10) {
	    if (!bip39.validateMnemonic(privateKeyForTransactions)) {
	      // The reason we want to ask the user for confirmation is that the mnemonic
	      // Could have been generated with another app that has a different dictionary
	      if(!confirm("Warning: The mnemonic is either invalid, or was not generated by MPW. Do you want to proceed?")) {
		  return false;
	      }
	  }
	  const seed = await bip39.mnemonicToSeed(privateKeyForTransactions);
	    masterKey = makeMasterkey({seed});
	} else {
      // Public Key Derivation
	    try {
		if(privateKeyForTransactions.substring(0,4) === "xprv") {
		    masterKey = makeMasterkey({xpriv: privateKeyForTransactions})
		} else {
		    // Incase of an invalid/malformed/incompatible private key: catch and display a nice error!
		    const bArrConvert = from_b58(privateKeyForTransactions);
		    const bArrDropFour = bArrConvert.slice(0, bArrConvert.length - 4);
		    const bKey = bArrDropFour.slice(1, bArrDropFour.length);
		    
		    // Extract raw bytes and derive the key from them
		    const pkBytes = bKey.slice(0, bKey.length - 1);
		    const publicKeyForNetwork = deriveAddress({
			pkBytes
		    });
		    masterKey = {
			getPrivateKeyBytes: async _path => pkBytes,
			getPrivateKey: async _path => privateKeyForTransactions,
			getAddress: async _path => publicKeyForNetwork,
			getKeyToBackup: async path => privateKeyForTransactions,
			isHD: false,
		    }
		}
	    } catch (e) {
		return createAlert('warning', '<b>Failed to import!</b> Invalid private key.' +
				   '<br>Double-check where your key came from!',
				   6000);
	    }
	    
	}
    }
      
    
    // Reaching here: the deserialisation was a full cryptographic success, so a wallet is now imported!
    fWalletLoaded = true;

    // Display Text
    domGuiWallet.style.display = 'block';
      // Update identicon
      domIdenticon.dataset.jdenticonValue = masterKey.getAddress(getDerivationPath());
      jdenticon();
      
    // Hide the encryption warning if the user pasted the private key
    // Or in Testnet mode or is using a hardware wallet
    if (!(newWif || cChainParams.current.isTestnet || isHardwareWallet)) domGenKeyWarning.style.display = 'block';

    // Fetch state from explorer
    if (networkEnabled) refreshChainData();
    
    // Hide all wallet starter options
    hideAllWalletOptions();
  }
}

// Wallet Generation
generateWallet = async function (noUI = false) {
    const strImportConfirm = "Do you really want to import a new address? If you haven't saved the last private key, the wallet will be LOST forever.";
    const walletConfirm = fWalletLoaded && !noUI ? window.confirm(strImportConfirm) : true;
    if (walletConfirm) {
	const mnemonic = await bip39.generateMnemonic();
	if(!noUI)
	    alert(`This is your mnemonic don't forget ok? ${mnemonic}`);
	const seed = await bip39.mnemonicToSeed(mnemonic);
	// Prompt the user to encrypt the seed
	masterKey = makeMasterkey({seed});
	fWalletLoaded = true;

	if( !cChainParams.current.isTestnet) domGenKeyWarning.style.display = 'block';
	// Add a listener to block page unloads until we are sure the user has saved their keys, safety first!
	addEventListener("beforeunload", beforeUnloadListener, {capture: true});
	
	// Display the dashboard
	domGuiWallet.style.display = 'block';
	viewPrivKey = false;
	hideAllWalletOptions();
	
	// Refresh the balance UI (why? because it'll also display any 'get some funds!' alerts)
	getBalance(true);
	getStakingBalance(true);
    
    }

    return masterKey;
}

makeMasterkey = function({seed, xpriv}) {
    let hdKey;
    if(seed) {
	hdKey  = HDKey.fromMasterSeed(seed);
    }
    if(xpriv) {
	hdKey  = HDKey.fromExtendedKey(xpriv);
    }
    if (!hdKey) return null;
    let masterKey = {
	_data: hdKey,
	getPrivateKeyBytes: async path => masterKey._data.derive(path).privateKey,
	getPrivateKey: async path => generateOrEncodePrivkey(await masterKey.getPrivateKeyBytes(path)).strWIF,
	getAddress: async path => deriveAddress({pkBytes: await masterKey.getPrivateKeyBytes(path)}),
	getKeyToBackup: async path => masterKey._data.privateExtendedKey,
	isHD: true,
    };
    return masterKey;
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

encryptWallet = async function (strPassword = '') {
  // Encrypt the wallet WIF with AES-GCM and a user-chosen password - suitable for browser storage
    let strEncWIF = await encrypt(await masterKey.getKeyToBackup(), strPassword);
  if (!strEncWIF) return false;

  // Set the encrypted wallet in localStorage
  localStorage.setItem("encwif", strEncWIF);

  // Hide the encryption warning
  domGenKeyWarning.style.display = 'none';

  // Remove the exit blocker, we can annoy the user less knowing the key is safe in their localstorage!
  removeEventListener("beforeunload", beforeUnloadListener, {capture: true});
}

decryptWallet = async function (strPassword = '') {
  // Check if there's any encrypted WIF available
  const strEncWIF = localStorage.getItem("encwif");
  if (!strEncWIF || strEncWIF.length < 1) return false;

  // Prompt to decrypt it via password
  const strDecWIF = await decrypt(strEncWIF, strPassword);
  if (!strDecWIF || strDecWIF === "decryption failed!") {
    if (strDecWIF) return alert("Incorrect password!");
  } else {
    importWallet({
      newWif: strDecWIF
    });
    return true;
  }
}

hasEncryptedWallet = function () {
  return localStorage.getItem("encwif") ? true : false;
}
//If the privateKey is null then the user connected a hardware wallet
hasHardwareWallet = function() {
    return masterKey.isHardwareWallet == true;
}

hasWalletUnlocked = function (fIncludeNetwork = false) {
  if (fIncludeNetwork && !networkEnabled)
    return createAlert('warning', "<b>Offline Mode is active!</b><br>Please disable Offline Mode for automatic transactions", 5500);
    if (!masterKey) {
      return createAlert('warning', "Please " + (hasEncryptedWallet() ? "unlock " : "import/create") + " your wallet before sending transactions!", 3500);
  } else {
    return true;
  }
}

let cHardwareWallet = null;
let strHardwareName = "";
getHardwareWalletPublicKey = async function(path, verify = false) {
  try {
    // Check if we haven't setup a connection yet OR the previous connection disconnected
    if (!cHardwareWallet || cHardwareWallet.transport._disconnectEmitted) {
      cHardwareWallet = new AppBtc(await window.transport.create());
    }

    // Update device info and fetch the pubkey
    strHardwareName = cHardwareWallet.transport.device.manufacturerName + " " + cHardwareWallet.transport.device.productName;

      // Prompt the user in both UIs
      if(verify) {
	  createAlert("info", "Confirm the import on your Ledger", 3500);
      }

    const cPubkey = await cHardwareWallet.getWalletPublicKey(path, {
      verify,
      format: "legacy"
    });

    return cPubkey.publicKey;
  } catch (e) {
    // If there's no device, nudge the user to plug it in.
    if (e.message.toLowerCase().includes('no device selected')) {
      createAlert("info", "<b>No device available</b><br>Couldn't find a hardware wallet; please plug it in and unlock!", 10000);
      return false;
    }

    // If the device is unplugged, or connection lost through other means (such as spontanious device explosion)
    if (e.message.includes("Failed to execute 'transferIn'")) {
      createAlert("info", "<b>Lost connection to " + strHardwareName + "</b><br>It seems the " + cHardwareWallet.transport.device.productName + " was unplugged mid-operation, oops!", 10000);
      return false;
    }

    // If the ledger is busy, just nudge the user.
    if (e.message.includes('is busy')) {
      createAlert("info", "<b>" + strHardwareName + " is waiting</b><br>Please unlock your " + cHardwareWallet.transport.device.productName + " or finish it's current prompt", 7500);
      return false;
    }

    // Check if this is an expected error
    if (!e.statusCode || !LEDGER_ERRS.has(e.statusCode)) {
      console.error("MISSING LEDGER ERROR-CODE TRANSLATION! - Please report this below error on our GitHub so we can handle it more nicely!");
      console.error(e);
    }

    // Translate the error to a user-friendly string (if possible)
    createAlert("warning", "<b>" + strHardwareName + "</b><br>" + (LEDGER_ERRS.get(e.statusCode) || e.message), 5500);
    return false;
  }
}
