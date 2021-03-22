function toggleWallet(){
    var toggle = document.getElementById("wToggle").innerHTML;
    // Hide and Reset the Vanity address input
    document.getElementById('prefix').value = "";
    document.getElementById('prefix').style.display = 'none';
    if(toggle === "Access My Wallet"){
      document.getElementById("generateWallet").style.display = 'none';
      document.getElementById("importWallet").style.display = 'block';
      document.getElementById("wToggle").innerHTML = "Create A New Wallet";
    }else{
      document.getElementById("generateWallet").style.display = 'block';
      document.getElementById("importWallet").style.display = 'none';
      document.getElementById("wToggle").innerHTML = "Access My Wallet";
    }
  }
  async function generateVanityWallet() {
    // Generate a vanity address with the given prefix
    let strPrefix = document.getElementById('prefix');
    if (strPrefix.value.length === 0) {
      // No prefix, display the intro!
      strPrefix.style.display = 'block';
      document.getElementById('genKeyWarning').style.display = 'block';
      document.getElementById('Privatelabel').style.display = 'block';
      document.getElementById('Publiclabel').style.display = 'block';
      document.getElementById('PrivateTxt').innerHTML = "---";
      document.getElementById('PublicTxt').innerHTML = "---";
    } else {
      // We also don't want users to be mining addresses for years... so cap the letters to four until the generator is more optimized
      if (strPrefix.value.length > 4) return alert("This is a long name! This would take a LONG time to find, please choose a shorter name!");
      // Cache a lowercase equivalent for lower-entropy comparisons (a case-insensitive search is ALOT faster!) and strip accidental spaces
      const nInsensitivePrefix = strPrefix.value.toLowerCase().replace(/ /g, "");
      let attempts = 0;
      // Begin the search, cap'n!!!
      while (true) {
        let nWallet = await generateWallet(nInsensitivePrefix);
        // Check if the prefix matches the pubkey...
        if (nWallet.vanity_match) return console.log("VANITY: Found an address after " + attempts + " attempts!");
        // No match, bump the attempts
        attempts++;
      }
    }
  }
  function explorerCheck(){
    let checkcustom = document.getElementById("explorer").value;
    let checkcustomOpen = document.getElementById("customExplorer").style.display;
    if(checkcustom == 'custom' && checkcustomOpen != "block"){
      toggleDropDown('customExplorer')
    }else if(checkcustom != 'custom'){
      document.getElementById("customExplorer").style.display = 'none';
    }
  }
  function toggleDropDown(id){
    var openClosed = document.getElementById(id).style.display;
    if(openClosed === 'block'){
      document.getElementById(id).style.display = 'none';
    }else{
      document.getElementById(id).style.display = 'block';
    }
  }
  function startNetworkTest(){
    if(networkEnabled){
      if(typeof publicKeyForNetwork !== 'undefined'){
        checkPubKey(); //readout
        document.getElementById("readout").style.display = 'block';
        document.getElementById("networkingNotices").innerHTML = '';
      }else{
        document.getElementById("networkingNotices").innerHTML = 'No public key';
      }
    }else{
      document.getElementById("networkingNotices").innerHTML = 'Network disabled';
    }
  }
  function loadUnspendInputs(){
    if(publicKeyForNetwork){
      trx = bitjs.transaction();
      getUnspentTransactions();
      document.getElementById("loadSimpleTransactions").style.display = 'none';
      document.getElementById("simpleTransactions").style.display = 'block';
      document.getElementById("genIt").style.display = 'block';
    }else{
      console.log("no Public Key");
    }
  }
  function createSimpleTransation(){
    if(trx['inputs']['length'] == amountOfTransactions){
      var address = document.getElementById("address1s").value;
      var value = document.getElementById("value1s").value;
      if(address != '' && value != ''){
        calculatefee();
        trx.addoutput(address,value);//Sending to this address
        addresschange = publicKeyForNetwork;
        totalSent = (parseFloat(fee) + parseFloat(value)).toFixed(8);
        valuechange = (parseFloat(balance) - parseFloat(totalSent)).toFixed(8);
        if(totalSent <= balance){
          document.getElementById("HumanReadable").innerHTML = "Balance:" + balance + "<br>Fee:" + fee + "<br>ToAddress:" + address + "<br>HowMuchSend:" + value + "<br>ChangeAddress:" + addresschange + "<br>HowMuchChange:" +valuechange;
          trx.addoutput(addresschange,valuechange);//Change Address
          if(typeof privateKeyForTransactions !== 'undefined'){
            var wif = privateKeyForTransactions;
            var textArea = document.getElementById("simpleRawTx");
            textArea.value = trx.sign(wif,1);
            document.getElementById("genIt").style.display = 'none';
            document.getElementById("sendIt").style.display = 'block';
          }else{
            console.log("No private key");
          }
        }else{
          document.getElementById("HumanReadable").innerHTML = "You are trying to send more then you have!";
        }
      }else{
        console.log("No address or value");
      }
    }else{
      console.log("wallet Still loading");
    }
  }
  function createRawTransaction() {
    //advanced transaction creation and signing
    var trx = bitjs.transaction();
    var txid = document.getElementById("prevTrxHash").value;
    var index = document.getElementById("index").value;
    var script = document.getElementById("script").value;
    trx.addinput(txid,index,script);
    var address = document.getElementById("address1").value;
    var value = document.getElementById("value1").value;
    trx.addoutput(address,value);
    var address = document.getElementById("address2").value;
    var value = document.getElementById("value2").value;
    trx.addoutput(address,value);
    var wif = document.getElementById("wif").value;
    var textArea = document.getElementById("rawTrx");
    textArea.value = trx.sign(wif,1); //SIGHASH_ALL DEFAULT 1
  }
  function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("nav-link");
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
  }
  document.getElementById("start").click();