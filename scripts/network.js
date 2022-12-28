'use strict';
let lastWallet = 0;

function networkError() {
    if (disableNetwork()) {
        createAlert('warning',
                    '<b>Failed to synchronize!</b> Please try again later.' +
                    '<br>You can attempt re-connect via the Settings.', []);
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


  /**
   * Parses UTXOs and puts them in the mempool
   * @param {Array<Object>} arrUTXOs - Array of object-formatted UTXOs
   * @returns {Promise<void>} Resolves when it has parsed every UTXO
   */
  async function acceptUTXO(arrUTXOs) {
    const nTimeSyncStart = Date.now() / 1000;
    
    for (const cUTXO of arrUTXOs) {
      if(mempool.isAlreadyStored({id: cUTXO.txid, vout: cUTXO.vout})) {
	mempool.updateUTXO({id: cUTXO.txid, vout: cUTXO.vout});
	continue;
      }
      const cTx = await (await fetch(`${cExplorer.url}/api/v2/tx-specific/${cUTXO.txid}`)).json();
      const cVout = cTx.vout[cUTXO.vout];
      
      let path;
      if(cUTXO.path) {
	path = cUTXO.path.split("/")
	path[2] = (masterKey.isHardwareWallet ? cChainParams.current.BIP44_TYPE_LEDGER : cChainParams.current.BIP44_TYPE) + "'";
	lastWallet = Math.max(parseInt(path[5]), lastWallet);
	path = path.join("/");
      }
      
      const isColdStake = cVout.scriptPubKey.type === 'coldstake';
      const isStandard = cVout.scriptPubKey.type === 'pubkeyhash';
      const isReward = cTx.vout[0].hex === "";
      // We don't know what this is
      if (!isColdStake && !isStandard) {
	continue;
      }
      
      mempool.addUTXO({
	id: cUTXO.txid,
	path,
	sats: Math.round(cVout.value * COIN),
	script: cVout.scriptPubKey.hex,
	vout: cVout.n,
	height: cachedBlockCount - (cTx.confirmations - 1),
	status: cTx.confirmations < 1 ? Mempool.PENDING : Mempool.CONFIRMED,
	isDelegate: isColdStake,
	isReward,
      });
    }
    getNewAddress(true);
    if(arrUTXOs.length) {
      // If allowed by settings: submit a sync performance measurement to Labs Analytics
      return submitAnalytics('time_to_sync', { time: (Date.now() / 1000) - nTimeSyncStart, explorer: cExplorer.name });
    }
  }

  /**
   * Fetch UTXOs from the current primary explorer
   * @returns {Promise<void>} Resolves when it has finished fetching UTXOs
   */
  async function getUTXOs() {
    // Don't fetch UTXOs if we're already scanning for them!
    if (getUTXOs.isSyncing) return;
    getUTXOs.isSyncing = true;
    try {
      let publicKey;
      if(masterKey.isHD) {
	const derivationPath = getDerivationPath(masterKey.isHardwareWallet).split("/").slice(0, 4).join("/");
	publicKey = await masterKey.getxpub(derivationPath);
      } else {
	publicKey = await masterKey.getAddress();
      }
      // Validate and sync these UTXOs
      await acceptUTXO(await (await fetch(`${cExplorer.url}/api/v2/utxo/${publicKey}`)).json());
    } catch(e) {
      console.error(e);
      networkError();
    } finally {
      getUTXOs.isSyncing = false;
    }
  }

 var sendTransaction = async function(hex, msg = '') {
  try {
    const data = await (await fetch(cExplorer.url + "/api/v2/sendtx/",
    {
      method:"post",body: hex
    })).json();
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
        return true;
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
      return false;
    }
  } catch (e) {
    console.error(e);
    networkError();
  }
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
