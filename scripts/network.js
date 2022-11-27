'use strict';

function networkError() {
    if (disableNetwork()) {
        createAlert('warning',
                    '<b>Failed to synchronize!</b> Please try again later.' +
                    '<br>You can attempt re-connect via the Settings.');
    }
}

if (networkEnabled) {
  var getBlockCount = function() {
    var request = new XMLHttpRequest();
    request.open('GET', cExplorer.url + "/api/v2/api", true);
    request.onerror = networkError;
    request.onload = function () {
      const data = JSON.parse(this.response);
      // If the block count has changed, refresh all of our data!
      domBalanceReload.classList.remove("playAnim");
      domBalanceReloadStaking.classList.remove("playAnim");
      if (data.backend.blocks > cachedBlockCount) {
        console.log("New block detected! " + cachedBlockCount + " --> " + data.backend.blocks);
        getUTXOs();
        getStakingRewards();
      }
      cachedBlockCount = data.backend.blocks;
    }
    request.send();
  }

  var arrUTXOsToValidate = [], nTimeSyncStart = 0;
  var acceptUTXO = () => {
    // Cancel if the queue is empty: no wasting precious bandwidth & CPU cycles!
    if (!arrUTXOsToValidate.length) {
      getNewAddress(true);
      // If allowed by settings: submit a sync performance measurement to Labs Analytics
      return submitAnalytics('time_to_sync', { time: (Date.now() / 1000) - nTimeSyncStart, explorer: cExplorer.name });
    }

    const request = new XMLHttpRequest();
    request.open('GET', cExplorer.url + "/api/v2/tx-specific/" + arrUTXOsToValidate[0].txid, true);
    request.onerror = networkError;

    request.onload = function() {
      // Fetch the single output of the UTXO
      const cVout = JSON.parse(this.response).vout[arrUTXOsToValidate[0].vout];
      console.log(arrUTXOsToValidate[0]);
      let path;
      if(arrUTXOsToValidate[0].path) {
	path = arrUTXOsToValidate[0].path.split("/")
	path[2] = (masterKey.isHardwareWallet ? cChainParams.current.BIP44_TYPE_LEDGER : cChainParams.current.BIP44_TYPE) + "'";
	lastWallet = Math.max(parseInt(path[5]), lastWallet);
	path = path.join("/");
      }

      // Convert to MPW format
      const cUTXO = {
        'id': arrUTXOsToValidate[0].txid,
        'vout': cVout.n,
        'sats': Math.round(cVout.value * COIN),
        'script': cVout.scriptPubKey.hex,
	path,
      }

      // Determine the UTXO type, and use it accordingly
      if (cVout.scriptPubKey.type === 'pubkeyhash') {
        // P2PKH type (Pay-To-Pub-Key-Hash)
        cachedUTXOs.push(cUTXO);
      } else
      if (cVout.scriptPubKey.type === 'coldstake') {
        // Cold Stake type
        arrDelegatedUTXOs.push(cUTXO);
      }

      // Shift the queue and update the UI
      getBalance(true);
      getStakingBalance(true);
      updateMasternodeTab();
            
      // Loop validation until queue is empty
      arrUTXOsToValidate.shift();
      acceptUTXO();
    }
    request.send();
  }

  var getUTXOs = async () => {
    // Don't fetch UTXOs if we're already scanning for them!
    if (arrUTXOsToValidate.length) return;

    // Heavy Sync: if enabled, we cancel the regular UTXO call for a full TX history and a manual UTXO search
    if (fAlternativeSync) {
      return getUTXOsHeavy();
    }

    const request = new XMLHttpRequest()
    let publicKey;
    if(masterKey.isHD) {
      const derivationPath = getDerivationPath(masterKey.isHardwareWallet).split("/").slice(0, 4).join("/");
      publicKey = await masterKey.getxpub(derivationPath);
    } else {
      publicKey = await masterKey.getAddress();
    }

    request.open('GET', cExplorer.url + "/api/v2/utxo/" + publicKey, true);
    request.onerror = networkError;
    request.onload = function() {
      arrUTXOsToValidate = JSON.parse(this.response);
      // Clear our UTXOs and begin accepting refreshed ones (TODO: build an efficient 'set merge' algo)
      cachedUTXOs = []; arrDelegatedUTXOs = [];
      if (arrUTXOsToValidate.length) {
        nTimeSyncStart = Date.now() / 1000;
        acceptUTXO();
      }
    }
    request.send();
  }

var sendTransaction = function(hex, msg = '') {
    const request = new XMLHttpRequest();
    request.open('POST', cExplorer.url + "/api/v2/sendtx/", true);
    request.onerror = networkError;
    request.onreadystatechange = function () {
        if (!this.response || (!this.status === 200 && !this.status === 400)) return;
        if (this.readyState !== 4) return;
        const data = JSON.parse(this.response);
        if (data.result && data.result.length === 64) {
            console.log('Transaction sent! ' + data.result);
            if (domAddress1s.value !== donationAddress)
                domTxOutput.innerHTML = ('<h4 style="color:green; font-family:mono !important;">' + data.result + '</h4>');
            else
                domTxOutput.innerHTML = ('<h4 style="color:green">Thank you for supporting MyPIVXWallet! 💜💜💜<br><span style="font-family:mono !important">' + data.result + '</span></h4>');
            domSimpleTXs.style.display = 'none';
            domAddress1s.value = '';
            domValue1s.innerHTML = '';
            createAlert('success', msg || 'Transaction sent!', msg ? (1250 + (msg.length * 50)) : 1500);

            // If allowed by settings: submit a simple 'tx' ping to Labs Analytics
            submitAnalytics('transaction');
        } else {
            console.log('Error sending transaction: ' + data.result);
            createAlert('warning', 'Transaction Failed!', 1250);
            // Attempt to parse and prettify JSON (if any), otherwise, display the raw output.
            let strError = data.error;
            try {
                strError = JSON.stringify(JSON.parse(data), null, 4);
                console.log('parsed');
            } catch(e){console.log('no parse!'); console.log(e);}
            domTxOutput.innerHTML = '<h4 style="color:red;font-family:mono !important;"><pre style="color: inherit;">' + strError + "</pre></h4>";
        }
    }
    request.send(hex);
}

  var getFee = function (bytes) {
    // TEMPORARY: Hardcoded fee per-byte
    return bytes * 50; // 50 sat/byte
  }

  var getStakingRewards = async function() {
    if (!networkEnabled || masterKey == undefined) return;
    domGuiStakingLoadMoreIcon.style.opacity = 0.5;
    const stopAnim = () => domGuiStakingLoadMoreIcon.style.opacity = 1;
    const nHeight = arrRewards.length ? arrRewards[arrRewards.length - 1].blockHeight : 0;
    let mapPaths = new Map();
    const txSum = v => v.reduce((t, s) => t + (s.addresses.map(strAddr=>mapPaths.get(strAddr)).filter(v => v).length && s.addresses.length === 2 ? parseInt(s.value) : 0), 0);
    let cData;
    if (masterKey.isHD) {
      const derivationPath = getDerivationPath(masterKey.isHardwareWallet).split("/").slice(0, 4).join("/");
      const xpub = await masterKey.getxpub(derivationPath);
      cData = await (await fetch(`${cExplorer.url}/api/v2/xpub/${xpub}?details=txs&pageSize=500&to=${nHeight ? nHeight - 1 : 0}`)).json();
      // Map all address <--> derivation paths
      if (cData.tokens) cData.tokens.forEach(cAddrPath => mapPaths.set(cAddrPath.name, cAddrPath.path));
    } else {
      const address = await masterKey.getAddress();
      cData = await (await fetch(`${cExplorer.url}/api/v2/address/${address}?details=txs&pageSize=500&to=${nHeight ? nHeight - 1 : 0}`)).json();
      mapPaths.set(address, ":)");
    }
    if (cData && cData.transactions) {
      // Update rewards
      arrRewards = arrRewards.concat(
        cData.transactions.filter(tx => tx.vout[0].addresses[0] === "CoinStake TX").map(tx =>{
          return {
            id: tx.txid,
            time: tx.blockTime,
            blockHeight: tx.blockHeight,
            amount: (txSum(tx.vout) - txSum(tx.vin)) / COIN,
          };
        }).filter(tx => tx.amount != 0)
      );
      
      // If the results don't match the full 'max/requested results', then we know there's nothing more to load, hide the button!
      if (cData.transactions.length !== cData.itemsOnPage)
        domGuiStakingLoadMore.style.display = "none";
      
      // Update GUI
      stopAnim();
      updateStakingRewardsGUI(true);
    } else {
      // No balance history!
      domGuiStakingLoadMore.style.display = "none";

      // Update GUI
      stopAnim();
    }
  }



  var getTxInfo = async function(txHash) {
    const req = await fetch(`${cExplorer.url}/api/v2/tx/${txHash}`);
    return await req.json();
  }
}

// EXPERIMENTAL: a very heavy synchronisation method which can be used to find missing UTXOs in the event of a Blockbook UTXO API failure
let lastWallet = 0;
var fHeavySyncing = false;
var getUTXOsHeavy = async function() {
  if (fHeavySyncing || !networkEnabled || masterKey == undefined) return;
  fHeavySyncing = true;

  try {
    let cData;
    let mapPaths = new Map();
    if (masterKey.isHD) {
      // Fetch our xpub
      const derivationPath = getDerivationPath(masterKey.isHardwareWallet).split("/").slice(0, 4).join("/");
      const xpub = await masterKey.getxpub(derivationPath);

      // Run an xpub balance synchronisation
      cData = await (await fetch(`${cExplorer.url}/api/v2/xpub/${xpub}?details=txs&pageSize=1000`)).json();

      // Map all address <--> derivation paths
      if (cData.tokens) {
        cData.tokens.forEach(cAddrPath => mapPaths.set(cAddrPath.name, cAddrPath.path));
        lastWallet = parseInt(cData.tokens[cData.tokens.length - 1].path.split("/")[5]);
      }
    } else {
      // Fetch our single address and state, map address to an empty derivation path
      const address = await masterKey.getAddress();
      cData = await (await fetch(`${cExplorer.url}/api/v2/address/${address}?details=txs&pageSize=1000`)).json();
      mapPaths.set(address, ":)");
    }
    if (cData && cData.transactions) {
      cachedUTXOs = []; arrDelegatedUTXOs = [];
      for (const cTx of cData.transactions) {
        for (const cOut of cTx.vout) {
          if (cOut.spent) continue; // We don't care about spent outputs
          const paths = cOut.addresses.map(strAddr => mapPaths.get(strAddr)).filter(v => v);
	  // No addresses match ours
	  if (!paths.length) continue;
	  const arrToPush = cOut.addresses.some(strAddr => strAddr.startsWith(cChainParams.current.STAKING_PREFIX)) ? arrDelegatedUTXOs : cachedUTXOs;
	  // Blockbook still returns 119' as the coinType, even in testnet
	  let path = paths[0].split("/");
	  path[2] = (masterKey.isHardwareWallet ? cChainParams.current.BIP44_TYPE_LEDGER : cChainParams.current.BIP44_TYPE) + "'";
          arrToPush.push({
            'id': cTx.txid,
            'vout': cOut.n,
            'sats': parseInt(cOut.value),
            'script': cOut.hex,
            'path': path.join("/"),
          });
        }
      }
      // Update UI
      getNewAddress(true);
      getBalance(true);
      getStakingBalance(true);
      updateMasternodeTab();
    }
  } catch(e) {
    networkError();
    throw e;
  } finally {
    fHeavySyncing = false;
  }
}

// PIVX Labs Analytics: if you are a user, you can disable this FULLY via the Settings.
// ... if you're a developer, we ask you to keep these stats to enhance upstream development,
// ... but you are free to completely strip MPW of any analytics, if you wish, no hard feelings.
var submitAnalytics = function (strType, cData = {}) {
    if (!networkEnabled) return;

    // Limit analytics here to prevent 'leakage' even if stats are implemented incorrectly or forced
    let i = 0, arrAllowedKeys = [];
    for (i; i < cAnalyticsLevel.stats.length; i++) {
      const cStat = cAnalyticsLevel.stats[i];
      arrAllowedKeys.push(cStatKeys.find(a => STATS[a] === cStat));
    }

    // Check if this 'stat type' was granted permissions
    if (!arrAllowedKeys.includes(strType)) return false;

    // Format
    const cStats = {'type': strType, ...cData};

    // Send to Labs Analytics
    const request = new XMLHttpRequest();
    request.open('POST', "https://scpscan.net/mpw/statistic", true);
    request.setRequestHeader('Content-Type', 'application/json');
    request.send(JSON.stringify(cStats));
    return true;
}
