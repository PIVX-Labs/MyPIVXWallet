//Settings Defaults
var debug = false;
var explorer = 'explorer.dogec.io';
var explorerType ='blockbook';
var networkEnabled = true;
//Users need not look below here.
//------------------------------
var publicKeyForNetwork;
var trx;
var amountOfTransactions;
var balance;
var fee;
var privateKeyForTransactions;
var walletAlreadyMade = 0;
var dogecashversion = '1.02';
var closeTheAlert = '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>';
function setExplorer(){
  let explorerURL = document.getElementById("explorer").value
  if(explorerURL == 'custom'){
    explorerURL = document.getElementById("explorerURL").value
    let explorerType = document.getElementById("explorerType").value
  }
  //Make sure URL is functional
  explorerURL.trim().replace('https://','').replace('http://','').replace('www.','');
  url = 'https://'+explorerURL;
  explorer = explorerURL;
  //Different Explorer Api Types to be added as necessary 
  alert(`${explorerURL} has been set successfully`);
}
function toggleDebug(){
  if(debug){
    debug = false;
    document.getElementById('Debug').innerHTML = "";
  }else{
    debug = true;
    document.getElementById('Debug').innerHTML = "<b> DEBUG MODE </b>" + closeTheAlert;
  }
  alert(`Debug set to ${debug}`);
}
function toggleNetwork(){
  if(networkEnabled){
    networkEnabled = false;
    document.getElementById('Network').innerHTML = "";
  }else{
    networkEnabled = true;
    document.getElementById('Network').innerHTML = "<b> Network Enabled </b>" + closeTheAlert;
  }
  alert(`Network set to ${networkEnabled}`);
}