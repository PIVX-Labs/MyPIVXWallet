if (networkEnabled) {
  var getBlockCount = function() {
    var request = new XMLHttpRequest();
    request.open('GET', "https://stakecubecoin.net/pivx/blocks", true);
    request.onload = function () {
      const data = Number(this.response);
      // If the block count has changed, refresh all of our data!
      domBalanceReload.className = domBalanceReload.className.replace(/ playAnim/g, "");
      domBalanceReloadStaking.className = domBalanceReloadStaking.className.replace(/ playAnim/g, "");
      if (data > cachedBlockCount) {
        console.log("New block detected! " + cachedBlockCount + " --> " + data);
        if (publicKeyForNetwork)
          getUnspentTransactions();
      }
      cachedBlockCount = data;
    }
    request.send();
  }

  var getUnspentTransactions = function () {
    var request = new XMLHttpRequest()
    request.open('GET', "https://chainz.cryptoid.info/pivx/api.dws?q=unspent&active=" + publicKeyForNetwork + "&key=fb4fd0981734", true)
    request.onload = function () {
      const data = JSON.parse(this.response);
      cachedUTXOs = [];
      if (!data.unspent_outputs || data.unspent_outputs.length === 0) {
        console.log('No unspent Transactions');
        document.getElementById("errorNotice").innerHTML = '<div class="alert alert-danger" role="alert"><h4>Note:</h4><h5>You don\'t have any funds, get some coins first!</h5></div>';
      } else {
        document.getElementById("errorNotice").innerHTML = '';
        // Standardize the API UTXOs into a simplified MPW format
        data.unspent_outputs.map(cUTXO => cachedUTXOs.push({
          'id': cUTXO.tx_hash,
          'vout': cUTXO.tx_ouput_n,
          'sats': cUTXO.value,
          'script': cUTXO.script
        }));
        // Update the GUI with the newly cached UTXO set
        getBalance(true);
      }
    }
    request.send();
    // In parallel, fetch Cold Staking UTXOs
    getDelegatedUTXOs();
  }

  var arrUTXOsToSearch = [];
  var searchUTXO = function () {
    if (!arrUTXOsToSearch.length) return;
    var request = new XMLHttpRequest()
    request.open('GET', "https://stakecubecoin.net/pivx/api/tx-specific/" + arrUTXOsToSearch[0].txid, true);
    request.onload = function () {
      const data = JSON.parse(this.response);
      // Check the UTXOs
      for (const cVout of data.vout) {
        if (cVout.spent) continue;
        if (cVout.scriptPubKey.type === 'coldstake' && cVout.scriptPubKey.addresses.includes(publicKeyForNetwork)) {
          if (!arrDelegatedUTXOs.find(a => a.id === data.txid && a.vout === cVout.n)) {
            arrDelegatedUTXOs.push({
              'id': data.txid,
              'vout': cVout.n,
              'sats': Number(cVout.value * COIN),
              'script': cVout.scriptPubKey.hex
            });
          }
        }
      }
      arrUTXOsToSearch.shift();
      getStakingBalance(true);
      if (arrUTXOsToSearch.length) searchUTXO();
    }
    request.send();
  }

  var getDelegatedUTXOs = function () {
    if (arrUTXOsToSearch.length) return;
    var request = new XMLHttpRequest()
    request.open('GET', "https://stakecubecoin.net/pivx/api/utxo/" + publicKeyForNetwork, true);
    request.onload = function () {
      arrUTXOsToSearch = JSON.parse(this.response);
      arrDelegatedUTXOs = [];
      searchUTXO();
    }
    request.send();
  }

  var sendTransaction = function (hex, msg = '') {
    var request = new XMLHttpRequest();
    request.open('GET', 'https://stakecubecoin.net/pivx/submittx?tx=' + hex, true)
    request.onload = function () {
      const data = this.response;
      if (data.length === 64) {
        console.log('Transaction sent! ' + data);
        if (domAddress1s.value !== donationAddress)
          document.getElementById("transactionFinal").innerHTML = ('<h4 style="color:green">Transaction sent! ' + data + '</h4>');
        else
          document.getElementById("transactionFinal").innerHTML = ('<h4 style="color:green">Thank you for supporting MyPIVXWallet! 💜💜💜<br>' + data + '</h4>');
        domSimpleTXs.style.display = 'none';
        domAddress1s.value = '';
        domValue1s.innerHTML = '';
        if (msg) alert(msg);
      } else {
        console.log('Error sending transaction: ' + data);
        document.getElementById("transactionFinal").innerHTML = ('<h4 style="color:red">Error sending transaction: ' + data + "</h4>");
      }
    }
    request.send();
  }

  var calculatefee = function (bytes) {
    // TEMPORARY: Hardcoded fee per-byte
    return (bytes * 50) / COIN; // 50 sat/byte
  }

  document.getElementById('Network').innerHTML = "<b> Network:</b> Enabled";
}

  var calculatefee = function (bytes) {
    // TEMPORARY: Hardcoded fee per-byte
    return (bytes * 50) / COIN; // 50 sat/byte
  }

  document.getElementById('Network').innerHTML = "<b> Network:</b> Enabled";
}