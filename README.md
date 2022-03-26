# MyPIVXWallet
## JS-based web 3.0 wallet for PIVX

### Installation
To use this web wallet locally click the clone or download button, then choose download as a zip. Unzip the file. Once it is unzipped, open the index.html file in your favorite **_MODERN_** browser. In order to generate new address you must change the debug setting to false, This will generate secure keys by way of window.crypto. There are some cases where this may not work properly make sure you are using a modern browser and that window.crypto works with your browser. Otherwise the generation may not be secure.
### USE

#### Key Generation
**_IF YOU ARE IN DEBUG MODE (top right it will say DEBUG) MAKE SURE TO DEACTIVATE DEBUG BEFORE GENERATING KEYS AS IT WILL GENERATE THE SAME KEY OVER AND OVER AND IT IS NOT SECURE._**

The current setup allows for users to generate one private key and one public key. This is not a HD Wallet (Hierarchical deterministic Wallet) and because of that you must remember to back up every private key you generate. There is no one master. Losing any of the private keys you generate could result in the loss of funds.

#### Transaction
##### Simple Transactions
**Warning:** _in the current state do not use this if you have to have more then 1000 input transactions. In that case it would be better to import your wallet to a software wallet or wait for an update. A small transaction was recently sent using this so it does work, but be cautious as this is still in beta_

Simple transactions require you to have networking enabled (cycle the toggle if its not on) in order to connect to a explorer. This is required because simple transactions do all of the heavy lifting for you.
To run a simple transaction go to the transaction tab, then click load transactions (make sure that you have imported or generated a wallet otherwise it won't work.). Then simple put in the wallet address you want to send the coins to and the amount, everything else will be calculated for you (for example, the change address and fees). You will then see the whole signed transaction displayed. You can check that this transaction is what you want by taking the signed transaction and putting in into a software wallet with the command decoderawtransaction. If you feel comfortable with it feel free to send it via explorer or by pressing the button on the site.

#### SETTINGS TAB
##### Explorer
_Note for devs if you want this to connect to your explorer you must set the CORS header to all, otherwise local users won't be able to connect to your explorer_

This is where you can change the explorer this currently is only set up for explorer.dogec.io which is the main current explorer. It is best to currently not mess with this setting as it will be developed more in the future.

##### Toggles
###### Debug Mode
Debug mode sets some things mainly for testing do not use this if you are using this as a user. It will make wallet generation insecure and some other problems if you are meaning to use the site normally.

###### Networking mode
This turns on and off the networking functions of the script. If you truly want privacy and security run this on a offline computer but this should be reasonably secure. With this turned off the script doesn't have access to any networking parts meaning anything that connects to a explorer or outside server doesn't work.

#### BETA: **_PROCEED WITH CAUTION, DON'T STORE LARGE AMOUNTS OF FUNDS_**
