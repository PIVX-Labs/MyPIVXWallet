# MyPIVXWallet
## JS-based web 3.0 wallet for PIVX

### Installation
To use this web wallet locally click the clone or download button, then choose download as a zip. Unzip the file. Once it is unzipped, open the index.html file in your favorite **_MODERN_** browser. In order to generate new address you must change the debug setting to false, This will generate secure keys by way of window.crypto. There are some cases where this may not work properly make sure you are using a modern browser and that window.crypto works with your browser. Otherwise the generation may not be secure.
### USE

#### Key Generation

The current setup allows for users to generate one private key and one public key. This is not a HD Wallet (Hierarchical deterministic Wallet) and because of that you must remember to back up every private key you generate. There is no one master. Losing any of the private keys you generate could result in the loss of funds.

The current setup also now allow vanity generated addresses which allow a user to select a short custom prefix of 3 or 4 letters max. If you want to learn more about vanity addresses check out https://en.bitcoin.it/wiki/Vanitygen. The website may 'lock up' while generating.

#### Transaction
##### Simple Transactions
**Warning:** _in the current state do not use this if you have to have more then 1000 input transactions. In that case it would be better to import your wallet to a software wallet or wait for an update. A small transaction was recently sent using this so it does work, but be cautious as this is still in beta_

Simple transactions require you to have networking enabled in order to connect to a explorer.
To run a simple transaction go to the Create Transaction tab, then click load transactions (make sure that you have imported or generated a wallet otherwise it won't work.). Then simple put in the wallet address you want to send the coins to and the amount, everything else will be calculated for you (for example, the change address and fees). You will then see the whole signed transaction displayed. Then simply click Send Transaction.

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

#### BETA: **_PROCEED WITH CAUTION, DON'T STORE LARGE AMOUNTS OF FUNDS_**
