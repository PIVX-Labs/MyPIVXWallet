//Settings Defaults
var debug = false;
var networkEnabled = true;
//Users need not look below here.
//------------------------------
var publicKeyForNetwork;
var privateKeyForTransactions;
var walletAlreadyMade = 0;

function toggleDebug() {
  if (debug) {
    debug = false;
    document.getElementById('Debug').innerHTML = "";
  } else {
    debug = true;
    document.getElementById('Debug').innerHTML = "<b> DEBUG MODE </b>";
  }
  alert(`Debug set to ${debug}`);
}

function toggleNetwork() {
  if (networkEnabled) {
    networkEnabled = false;
    document.getElementById('Network').innerHTML = "";
  } else {
    networkEnabled = true;
    document.getElementById('Network').innerHTML = "<b> Network Enabled </b>";
  }
  alert(`Network set to ${networkEnabled}`);
}
