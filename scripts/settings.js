//Settings Defaults
var debug = false;
var explorer = 'explorer.dogec.io';
var networkEnabled = true;
//Users need not look below here.
//------------------------------
var publicKeyForNetwork;
var trx;
var amountOfTransactions;
var fee;
var privateKeyForTransactions;
var walletAlreadyMade = 0;
var wallet_version = '1.02';
var closeTheAlert = '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>'
function setExplorer() {
  explorer = document.getElementById("explorer").value
  alert(`${explorer} has been set succesfully`);
}
function toggleDebug() {
  if (debug) {
    debug = false;
    document.getElementById('Debug').innerHTML = "";
  } else {
    debug = true;
    document.getElementById('Debug').innerHTML = "<b> DEBUG MODE </b>" + closeTheAlert;
  }
  alert(`Debug set to ${debug}`);
}
function toggleNetwork() {
  if (networkEnabled) {
    networkEnabled = false;
    document.getElementById('Network').innerHTML = "";
  } else {
    networkEnabled = true;
    document.getElementById('Network').innerHTML = "<b> Network Enabled </b>" + closeTheAlert;
  }
  alert(`Network set to ${networkEnabled}`);
}
