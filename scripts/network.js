'use strict';
import { cAnalyticsLevel, cStatKeys, cExplorer, STATS } from "./settings.js";
import { doms, mempool, updateStakingRewardsGUI, updateMasternodeTab } from "./global.js";
import { masterKey, getDerivationPath, getNewAddress } from "./wallet.js";
import { cChainParams, donationAddress, COIN } from "./chain_params.js";
import { createAlert } from "./misc.js";
import { Mempool } from "./mempool.js";
export let networkEnabled = true;
export let cachedBlockCount = 0;
export let arrRewards = [];

// Disable the network, return true if successful.
export function disableNetwork() {
    if (networkEnabled) return !toggleNetwork();
    return false;
}

export function toggleNetwork() {
    networkEnabled = !networkEnabled;
    //TRANSLATION CHANGE
    //doms.domNetwork.innerHTML = '<b>Network:</b> ' + (networkEnabled ? 'Enabled' : 'Disabled');
    doms.domNetworkE.style.display = (networkEnabled ? '' : 'none');
    doms.domNetworkD.style.display = (networkEnabled ? 'none' : '');
    return networkEnabled;
}

// Enable the network, return true if successful.
export function enableNetwork() {
    if (!networkEnabled) return toggleNetwork();
    return false;
}


function networkError() {
  if (disableNetwork()) {
    createAlert('warning',
		'<b>Failed to synchronize!</b> Please try again later.' +
		'<br>You can attempt re-connect via the Settings.', []);
  }
}

export function getBlockCount() {
  var request = new XMLHttpRequest();
  request.open('GET', cExplorer.url + "/api/v2/api", true);
  request.onerror = networkError;
  request.onload = function () {
    const data = JSON.parse(this.response);
    // If the block count has changed, refresh all of our data!
    doms.domBalanceReload.classList.remove("playAnim");
    doms.domBalanceReloadStaking.classList.remove("playAnim");
    if (data.backend.blocks > cachedBlockCount) {
      console.log("New block detected! " + cachedBlockCount + " --> " + data.backend.blocks);
      getUTXOsHeavy();
      getStakingRewards();
    }
    cachedBlockCount = data.backend.blocks;
  }
  request.send();
}

export async function sendTransaction(hex, msg = '') {
  try {
    const data = await (await fetch(cExplorer.url + "/api/v2/sendtx/",
				    {
				      method: "post", body: hex
				    })).json();
    if (data.result && data.result.length === 64) {
      console.log('Transaction sent! ' + data.result);
      if (doms.domAddress1s.value !== donationAddress)
	doms.domTxOutput.innerHTML = ('<h4 style="color:green; font-family:mono !important;">' + data.result + '</h4>');
      else
	doms.domTxOutput.innerHTML = ('<h4 style="color:green">Thank you for supporting MyPIVXWallet! 💜💜💜<br><span style="font-family:mono !important">' + data.result + '</span></h4>');
      doms.domSimpleTXs.style.display = 'none';
      doms.domAddress1s.value = '';
      doms.domValue1s.innerHTML = '';
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
      } catch (e) { console.log('no parse!'); console.log(e); }
      doms.domTxOutput.innerHTML = '<h4 style="color:red;font-family:mono !important;"><pre style="color: inherit;">' + strError + "</pre></h4>";
      return false;
    }
  } catch (e) {
    console.error(e);
    networkError();
  }
}

export function getFee(bytes) {
  // TEMPORARY: Hardcoded fee per-byte
  return bytes * 50; // 50 sat/byte
}

export async function getStakingRewards() {
  if (!networkEnabled || masterKey == undefined) return;
  doms.domGuiStakingLoadMoreIcon.style.opacity = 0.5;
  const stopAnim = () => doms.domGuiStakingLoadMoreIcon.style.opacity = 1;
  const nHeight = arrRewards.length ? arrRewards[arrRewards.length - 1].blockHeight : 0;
  let mapPaths = new Map();
  const txSum = v => v.reduce((t, s) => t + (s.addresses.map(strAddr => mapPaths.get(strAddr)).filter(v => v).length && s.addresses.length === 2 ? parseInt(s.value) : 0), 0);
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
      cData.transactions.filter(tx => tx.vout[0].addresses[0] === "CoinStake TX").map(tx => {
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
      doms.domGuiStakingLoadMore.style.display = "none";
    
    // Update GUI
    stopAnim();
    updateStakingRewardsGUI(true);
  } else {
    // No balance history!
    doms.domGuiStakingLoadMore.style.display = "none";
    
    // Update GUI
    stopAnim();
  }
}



export async function getTxInfo (txHash) {
  const req = await fetch(`${cExplorer.url}/api/v2/tx/${txHash}`);
  return await req.json();
}


// EXPERIMENTAL: a very heavy synchronisation method which can be used to find missing UTXOs in the event of a Blockbook UTXO API failure
export let lastWallet = 0;
var fHeavySyncing = false;
var getUTXOsHeavy = async function () {
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
      for (const cTx of cData.transactions) {
	const fCoinstake = cTx.vout[0].addresses[0] === "CoinStake TX";
	for (const cOut of cTx.vout) {
	  if (cOut.spent) continue; // We don't care about spent outputs
	  const paths = cOut.addresses.map(strAddr => mapPaths.get(strAddr)).filter(v => v);
	  // No addresses match ours
	  if (!paths.length) continue;
	  const isDelegate = cOut.addresses.some(strAddr => strAddr.startsWith(cChainParams.current.STAKING_PREFIX));
	  // Blockbook still returns 119' as the coinType, even in testnet
	  let path = paths[0].split("/");
	  path[2] = (masterKey.isHardwareWallet ? cChainParams.current.BIP44_TYPE_LEDGER : cChainParams.current.BIP44_TYPE) + "'";
	  if (isDelegate) {
	    mempool.addUTXO({ id: cTx.txid, path: path.join("/"), sats: parseInt(cOut.value), script: cOut.hex, vout: cOut.n, height: cTx.blockHeight, status: Mempool.DELEGATE });
	  } else {
	    mempool.addUTXO({ id: cTx.txid, path: path.join("/"), sats: parseInt(cOut.value), script: cOut.hex, vout: cOut.n, height: cTx.blockHeight, status: !fCoinstake ? Mempool.CONFIRMED : Mempool.REWARD });
	  }
	}
      }
      // Update UI
      getNewAddress(true);
      updateMasternodeTab();
    }
  } catch (e) {
    networkError();
    throw e;
  } finally {
    fHeavySyncing = false;
  }
}

// PIVX Labs Analytics: if you are a user, you can disable this FULLY via the Settings.
// ... if you're a developer, we ask you to keep these stats to enhance upstream development,
// ... but you are free to completely strip MPW of any analytics, if you wish, no hard feelings.
export function submitAnalytics(strType, cData = {}) {
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
  const cStats = { 'type': strType, ...cData };
  
  // Send to Labs Analytics
  const request = new XMLHttpRequest();
  request.open('POST', "https://scpscan.net/mpw/statistic", true);
  request.setRequestHeader('Content-Type', 'application/json');
  request.send(JSON.stringify(cStats));
  return true;
}
