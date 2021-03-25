# DogeCashWebWallet
## Js based wallet for DogeCash

live version at https://wallet.dogec.io

### Installation
To use this web wallet locally download from the [latest release](https://github.com/dogecash/dogecash-web-wallet/releases). Unzip the file. Once it is unzipped, open the index.html file in your favorite **_MODERN_** browser. Make sure you are using a modern browser and that `window.crypto` works with your browser. Otherwise the generation may not be secure.
### USE

#### Key Generation

The current setup allows for users to generate one private key and one public key. This is not a HD Wallet (Hierarchical deterministic Wallet) and because of that you must remember to back up every private key you generate. There is no one master. Losing any of the private keys you generate could result in the loss of funds.

The current setup also now allow vanity generated addresses which allow a user to select a short custom prefix of 3 or 4 letters max. If you want to learn more about vanity addresses check out https://en.bitcoin.it/wiki/Vanitygen. The website may 'lock up' while generating.

#### Transaction
##### Simple Transactions
_In the current state do not use this if you have to have more then 1000 input transactions. In that case it would be better to import your wallet to a software wallet or wait for an update._

Simple transactions require you to have networking enabled in order to connect to a explorer.
To run a simple transaction go to the Create Transaction tab, then click load transactions (make sure that you have imported or generated a wallet otherwise it won't work.). Then simple put in the wallet address you want to send the coins to and the amount, everything else will be calculated for you (for example, the change address and fees). You will then see the whole signed transaction displayed. Then simply click Send Transaction.

##### Advanced Transaction
*The current setup only allows one input transaction and two output transactions if you need more inputs use the simple transaction for now. This will be changed in future updates.*

Advanced transactions do not require network access you can create the whole transaction then send the signed transaction on any node/wallet/explorer. It takes a little knowledge of how transactions work in bitcoin to understand how to use the Create Transaction page. I will briefly go over what needs to be done, if you are unsure I recommend doing more research and testing with small amounts in order to not lose funds. How this works is it takes the inputs from the previous transaction (the one that funded the wallet) and it make a new transaction that funds other wallets instead. Here is how you do this. We are going to be using one of my transaction in order to understand how this works. You can follow along here: https://explorer.dogec.io/tx/f52fad9c89a5a71532632679dc6cef84e6f7be949925d9190d054457052a61ef 
###### Inputs
_for right now you can only manually create a transaction with one input_
Under the raw transactions section you to put the top Transaction ID (TXID) where it says Trx Hash, In our example it would be "f52fad9c89a5a71532632679dc6cef84e6f7be949925d9190d054457052a61ef". The next step would be to figure out which part of the transaction funded your public key, this is put into the index field. you can find this based on the VOUT under the vin section. In this example it would be 1. For the script field you need to put in the hex scriptPubKey of that VOUT with the same value under the VOUT section in Raw Transaction. In our example that would be 76a9142a8248f72e7ca9250f837b6cec46aedd6cf1edb288ac. 
###### Outputs
Now the easy part under outputs you need to put in the address you want to send coins to and a change address. The change address is used for any extra coins currently associated with the account that you don't want to go to fees in most cases this would be your public key. In our example I have 1 DOGEC in my public address I wish to send 0.99 DOGEC to my friend at the address of DQJ24v6oFsobif8MQ6JFuFk6vefGAUQ6f2 . Then I set the change address( which is just my public address) D91rzgEmTyUcPEMPBLLPHVoKjSzwUreeoy with the amount 0.009 (Any money in this transaction not allocated will be used as fees and lost!) which means that the fee for this transaction is 0.001. 
###### WIF KEY
Under WIF key you put you private key in WIF (Wallet Import Format)  which if you used the keypair generator it already is. You can see the end result of my transaction here https://explorer.dogec.io/tx/c445a56c5236a6665f88d3fda012e84778588b9a923f3e13d77927313070b14e
###### Signed Raw Transaction
In the big box you will get the signed raw transaction. You can input this into an explorer or node to broadcast the transaction. The command in dogec wallets, and most wallets, is sendrawtransaction. 

#### NETWORK DATA TAB
This show users what the explorer see in association with the public key

#### SETTINGS TAB
##### Explorer
_Note for devs if you want this to connect to your explorer you must set the CORS header to all, otherwise local users won't be able to connect to your explorer_

This is where you can change the explorer this currently is only set up for explorer.dogec.io which is the main explorer for DogeCash. The custom setting do work but 
if you are using the custom setting please make sure that you input the website without https://,http://, or www. It should look something like `explorer.dogec.io`

##### Toggles
###### Debug Mode
Debug mode sets some things mainly for testing do not use this if you are using this as a user. It will make wallet generation generate the same wallet and some other problems if you are meaning to use the site normally.

###### Networking mode
This turns on and off the networking functions of the script. If you truly want privacy and security run this on a offline computer but this should be reasonably secure. With this turned off the script doesn't have access to any networking parts meaning anything that connects to a explorer or outside server doesn't work.
