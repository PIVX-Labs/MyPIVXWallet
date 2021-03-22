if(networkEnabled){
  var url = 'https://' + explorer
  var githubRepo = 'https://api.github.com/repos/dogecash/dogecash-web-wallet/releases';
  var checkPubKey = function(){
    // Create a request variable and assign a new XMLHttpRequest object to it.
    var request = new XMLHttpRequest()
    // Open a new connection, using the GET request on the URL endpoint
    if(explorerType == 'blockbook'){
      request.open('GET', url + '/api/v1/address/' + publicKeyForNetwork, true)
      request.onload = function() {
        var data = JSON.parse(this.response)
        document.getElementById("balance").innerHTML = data['balance'];
        document.getElementById("totalReceived").innerHTML = data['totalReceived'];
        document.getElementById("totalSent").innerHTML = data['totalSent'];
        var typeNumber = 4;
        var errorCorrectionLevel = 'L';
        var qr = qrcode(typeNumber, errorCorrectionLevel);
        qr.addData('dogecash:'+ data['addrStr']);
        qr.make();
        document.getElementById("addrStrQR").innerHTML = qr.createImgTag();
        document.getElementById("addrStr").innerHTML = data['addrStr'];
        //Transactions
        document.getElementById("TransactionNumber").innerHTML = data['txApperances'];
        if(data['txApperances'] > 0){
          var dataTransactions = JSON.stringify(data['transactions']).replace("[","").replace("]","").replace(/"/g,"");
          const splits = dataTransactions.split(',');
          var transactionLinks;
          for (i = 0; i < splits.length; i++) {
            if(i == 0){
              transactionLinks = '<a href="' + url + '/api/v1/tx/' + splits[i] + '">'+ splits[i] + '</a><br>';
            }else{
              transactionLinks += '<a href="' + url + '/api/v1/tx/' + splits[i] + '">'+ splits[i] + '</a><br>';
            }
          }
          document.getElementById("Transactions").innerHTML = transactionLinks;
        }
        document.getElementById("NetworkingJson").innerHTML = this.response;
        console.log(data);
        console.log();
      }
      // Send request
      request.send();
    }
  }
  var getScriptData = function(txid,index){
    var request = new XMLHttpRequest()
    if(explorerType == 'blockbook'){
      if(amountOfTransactions <= 1000){
        request.open('GET', url + '/api/v2/tx/' + txid, true);//Simple queuing fix
      }else{
        request.open('GET', url + '/api/v2/tx/' + txid, false);
      }
      request.onload = function(e) {
        if(request.readyState === 4){
          if(request.status === 200){
            datar = JSON.parse(this.response)
            var script = datar['vout'][index]['hex']
            trx.addinput(txid,index,script);
            console.log(trx);
          }
        }
      }
      request.send();
    }
  }
  var getUnspentTransactions = function(){
    var request = new XMLHttpRequest()
    if(explorerType == 'blockbook'){
      request.open('GET', url + '/api/v2/utxo/' + publicKeyForNetwork +'?confirmed=true', true)
      request.onload = function() {
        data = JSON.parse(this.response)
        if(JSON.stringify(data) === '[]'){
          console.log('No unspent Transactions');
          document.getElementById("errorNotice").innerHTML = '<h4>Error:</h4><h5>It seems there are no unspent inputs associated with your wallet. This means you have no funds! D:</h5>';
        }else{
          amountOfTransactions = JSON.stringify(data['length'])
          var dataTransactions = JSON.stringify(data['0']['txid']);
            if(amountOfTransactions <= 1000){
              for(i = 0; i < amountOfTransactions; i++) {
                if(i == 0){
                  balance = parseFloat(Number(data[i]['value'])/100000000);
                }else{
                  balance = parseFloat(balance) + parseFloat(Number(data[i]['value'])/100000000);
                }
                var txid = JSON.stringify(data[i]['txid']).replace(/"/g,"");
                var index = JSON.stringify(data[i]['vout']);
                getScriptData(txid,index);
              }
            }else{
              //Temporary message for when there are a lot of inputs
              document.getElementById("errorNotice").innerHTML = '<h4>Error:</h4><h5>We are sorry but this address has over 1k inputs. In this version we do not support this. Please import your private key to a desktop wallet or wait for an update</h5>';
            }
          }
          console.log('Total Balance:' + balance);
        }
      request.send();
    }
  }
  var sendTransaction = function(hex){
    if(typeof hex !== 'undefined'){
      document.getElementById("sendIt").style.display = 'none';
      var request = new XMLHttpRequest()
      if(explorerType == 'blockbook'){
        request.open('GET', url + '/api/v2/sendtx/'+hex, true)
        request.onload = function() {
          data = JSON.parse(this.response)
          if(typeof data['result'] !== 'undefined'){
            console.log('Transaction sent tx:' + data['result']);
            document.getElementById("transactionFinal").innerHTML = ('<h4 style="color:green">Transaction sent tx:' + data['result'] + '</h4>');
            document.getElementById("sendIt").style.display = 'none';
            document.getElementById("loadSimpleTransactions").style.display = 'block';
            document.getElementById("simpleTransactions").style.display = 'none';
            document.getElementById("simpleRawTx").innerHTML = '';
            document.getElementById("HumanReadable").innerHTML = '';
            document.getElementById("address1s").innerHTML = '';
            document.getElementById("value1s").innerHTML = '';
          }else{
            console.log('Error sending transaction:' + data['error']['message']);
            document.getElementById("transactionFinal").innerHTML = ('<h4 style="color:green">Error sending transaction:' + data + "</h4>");
          }
        }

        request.send();
      }
    }else{
      console.log("hex undefined");
    }
  }
  var calculatefee = function(bytes){
    var request = new XMLHttpRequest()
    if(explorerType == 'blockbook'){
      request.open('GET', url + '/api/v1/estimatefee/10', false)
      request.onload = function() {
        data = JSON.parse(this.response)
        console.log(data);
        console.log('current fee rate' + data['result']);
        fee = data['result'];
      }
      request.send();
    }
  }
  var versionCheck = function(){
    var request = new XMLHttpRequest()
    if(explorerType == 'blockbook'){
      request.open('GET', githubRepo, true)
      request.onload = function() {
        data = JSON.parse(this.response)
        var currentReleaseVersion = (data[0]['tag_name']).replace("V","")
        if(parseFloat(currentReleaseVersion) > parseFloat(dogecashversion)){
          console.log("out of date");
          document.getElementById("outdated").style.display='block';
        }
      }
      request.send();
    }
  }
  //Call a version check if network is enabled:
  versionCheck();
  document.getElementById('Network').innerHTML = "<b> Network Enabled </b>";
}