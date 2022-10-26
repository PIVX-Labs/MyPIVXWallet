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
      // If allowed by settings: submit a sync performance measurement to Labs Analytics
      return submitAnalytics('time_to_sync', { time: (Date.now() / 1000) - nTimeSyncStart, explorer: cExplorer.name });
    }

    const request = new XMLHttpRequest();
    request.open('GET', cExplorer.url + "/api/v2/tx-specific/" + arrUTXOsToValidate[0].txid, true);
    request.onerror = networkError;

    request.onload = function() {
      // Fetch the single output of the UTXO
      const cVout = JSON.parse(this.response).vout[arrUTXOsToValidate[0].vout];

      // Convert to MPW format
      const cUTXO = {
        'id': arrUTXOsToValidate[0].txid,
        'vout': cVout.n,
        'sats': Math.round(cVout.value * COIN),
        'script': cVout.scriptPubKey.hex
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
      
      // Loop validation until queue is empty
      arrUTXOsToValidate.shift();
      acceptUTXO();
    }
    request.send();
  }

var getUTXOs = () => {
    // Don't fetch UTXOs if we're already scanning for them!
    if (arrUTXOsToValidate.length) return;
    
    // Heavy Sync: if enabled, we cancel the regular UTXO call for a full TX history and a manual UTXO search
    if (fAlternativeSync) {
	return getUTXOsHeavy();
    }
    for(let emptyWallets = 0; emptyWallets < 10; ) { // TODO: don't leave liek this
	const request = new XMLHttpRequest()
	request.open('GET', cExplorer.url + "/api/v2/utxo/" + publicKeyForNetwork, true);
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
}

var sendTransaction = function(hex, msg = '') {
    const request = new XMLHttpRequest();
    request.open('GET', cExplorer.url + "/api/v2/sendtx/" + hex, true);
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
    request.send();
}

  var getFee = function (bytes) {
    // TEMPORARY: Hardcoded fee per-byte
    return bytes * 50; // 50 sat/byte
  }

  var getStakingRewards = async function() {
      if (!networkEnabled || lastWallet == undefined) return;
      domGuiStakingLoadMoreIcon.style.opacity = 0.5;
      const stopAnim = () => domGuiStakingLoadMoreIcon.style.opacity = 1;
      const nHeight = arrRewards.length ? arrRewards[arrRewards.length - 1].blockHeight : 0;
      const txSum = (v, addr) => v.reduce((t, s) => t + (s.addresses.includes(addr) && s.addresses.length === 2 ? parseInt(s.value) : 0), 0);

      for(let i=0; i<lastWallet; i++) {
	  const address = await masterKey.getAddress(getDerivationPath(false, 0, 0, addressIndex));
	  const data = await (await fetch(`${cExplorer.url}/api/v2/address/${address}?pageSize=500&details=txs&to=${nHeight ? nHeight - 1 : 0}`)).json()
	  if (data && data.transactions) {
	      // Update rewards
	      arrRewards = arrRewards.concat(
		  data.transactions.filter(tx => tx.vout[0].addresses[0] === "CoinStake TX").map(tx =>{
		      return {
			  id: tx.txid,
			  time: tx.blockTime,
			  blockHeight: tx.blockHeight,
			  amount: (txSum(tx.vout, address) - txSum(tx.vin, address)) / COIN,
		      };
		  }).filter(tx => tx.amount != 0)
	      );
	      
	      // If the results don't match the full 'max/requested results', then we know there's nothing more to load, hide the button!
	      if (data.transactions.length !== data.itemsOnPage)
		  domGuiStakingLoadMore.style.display = "none";
	      
	      // Update GUI
	      stopAnim();
	      updateStakingRewardsGUI(true);
	  }
      }
  }

  var getTxInfo = async function(txHash) {
    const req = await fetch(`${cExplorer.url}/api/v2/tx/${txHash}`);
    return await req.json();
  }
}

// EXPERIMENTAL: a very heavy synchronisation method which can be used to find missing UTXOs in the event of a Blockbook UTXO API failure
var fHeavySyncing = false;
var lastWallet;
var getUTXOsHeavy = async function() {
    if (fHeavySyncing || !networkEnabled || masterKey == undefined) return;
    fHeavySyncing = true;
    cachedUTXOs = []; arrDelegatedUTXOs = [];
    try {
	let emptyWallets = 0;
	let i = 0;
	while(emptyWallets < 10) {
	    const path = getDerivationPath(false, 0, 0, i);
	    const address = await masterKey.getAddress(path);
	    const data = await (await fetch(`${cExplorer.url}/api/v2/address/${address}?details=txs&pageSize=1000`)).json();
	    if(data && data.transactions) {
		emptyWallets = 0;
		for (const cTx of data.transactions) {
		    for (const cOut of cTx.vout) {
			if (cOut.spent) continue; // We don't care about spent outputs
			// If an absence of any address, or a Cold Staking address is detected, we mark this as a delegated UTXO
			if (cOut.addresses.length === 0 || cOut.addresses.some(strAddr => strAddr.startsWith(cChainParams.current.STAKING_PREFIX))) {
			    arrDelegatedUTXOs.push({
				'id': cTx.txid,
				'vout': cOut.n,
				'sats': parseInt(cOut.value),
				'script': cOut.hex,
				path,
			    });
			}
			// Otherwise, check for our pubkey
			else if (cOut.addresses.some(strAddr => strAddr === address)) {
			    cachedUTXOs.push({
				'id': cTx.txid,
				'vout': cOut.n,
				'sats': parseInt(cOut.value),
				'script': cOut.hex,
				path,
			    });
			}
		    }
		}
		lastWallet = i;
	    } else {
		emptyWallets++;
	    }
	    if(!masterKey.isHD) {
		break;
	    }
	    i++;
	}
	// Update UI
	getBalance(true);
	getStakingBalance(true);
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
