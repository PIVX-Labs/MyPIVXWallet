export const en_translation = {
    // This document is to be used as a template as all the base code is in English
    // Basic HTML tags are allowed such as <b><i> etc. All data is sanitized https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML

    // General words
    enabled: "enabled",                    //
    active: "Active",                     //
    disabled: "disabled",                   //
    on:"On",                          //
    experimental:"Experimental",                //
    amount:"Amount",                      //
    staking:"Staking",                     //
    rewards:"rewards",                     //
    available:"Available",                   //

    // Nav Bar
    navIntro: "Intro",                   //
    navDashboard: "Dashboard",               //
    navSend: "Send",                    //
    navStake: "Stake",                   //
    navMasternode: "Masternode",              //
    navGovernance:"Governance",               //
    navSettings: "Settings",                //

    navTestnet: "<b>Testnet Mode On</b>",                 //
    navNetwork: "<b>Network:</b>",                 //
    navDebug: "Debug",                   //
    navExperimentalSync:"<b>Experimental Sync Active</b>",         //

    // Footer
    footerDonateLink: "Donate!",           //
    footerBuiltWithPivxLabs: "Built with 💜 by PIVX Labs",    //
    footerGithubLink: "MyPIVXWallet",           //

    // Intro
    title: "Welcome to",                      //
    titleName: "My PIVX Wallet!",                  //

    cardOneTitle: "Be your own Bank!",               //
    cardOneDesc: "MyPIVXWallet has <b>no custody</b> over your funds. You are in full ownership of your keys and your PIV. ",                //
    cardOneLink: "Know more",                //

    cardTwoTitle: "Universal and Portable",               //
    cardTwoDesc: "You can generate cryptographically-secure addresses with your browser and hardware.",                // 
    cardTwoLink: "Know more",                //

    cardThreeTitle: "Don't trust, verify!",             //
    cardThreeDesc: "MyPIVXWallet is completely open-source, available on the PIVX Labs github.",              //
    cardThreeLink: "Know more",              //

    cardFourTitle: "For the community",              //
    cardFourDesc: "MyPIVXWallet is built with love without any fees, privacy intrusions or advertising. ",               //
    cardFourLink: "Know more",               //

    buttonDonate: "Donate - Pay with MyPIVXWallet",               //

    // Dashboard
    dashboardTitle: "Dashboard",             //
    dCardOneTitle: "Create a",              //
    dCardOneSubTitle: "New Wallet",           //
    dCardOneDesc: "This will create a new, random PIVX wallet that will contain no initial funds, you may transfer to-and-from this wallet with ease.",               //
    dCardOneButton: "Create A New Wallet",             //

    dCardTwoTitle: "Create a new",              //
    dCardTwoSubTitle: "Vanity Wallet",           //
    dCardTwoDesc: "This will create a PIVX wallet with a customized prefix of your choosing, requiring more processing power to generate such addresses, it is recommended to generate a prefix of less than 6 characters, for example: 'DAD' is a possible address prefix.",               //
    dCardTwoButton: "Create A Vanity Wallet",             //

    dCardThreeTitle: "Access your",            //
    dCardThreeSubTitle: "Hardware Wallet",         //
    dCardThreeDesc: "This will help managing the PIVX wallet on your ledger. Notice that the private key will remain safe in your hardware device",             //
    dCardThreeButton: "Access my hardware wallet",           //

    dCardFourTitle: "Go to",             //
    dCardFourSubTitle: "My Wallet",          //
    dCardFourDesc: "This will import a PIVX wallet that you hold via it's private key, loading the address and pulling your existing balance, if any, from an explorer node.",              //
    dCardFourSubDesc:"*Note: MPW developers can NOT access your wallet, this wallet runs purely in YOUR browser using JavaScript.",            //
    dCardFourButtonI:"Import Wallet",            //
    dCardFourButtonA:"Access My Wallet",            //

    // Send
    sendTitle: "Create a",                  //
    sendSubTitle: "Transaction",               //
    sendShieldingWarning: "Please <b>AVOID</b> sending to Shielded addresses using this wallet - this functionality is currently unsupported.",       //

    sendSimpleTxTitle: "Create Simple Transactions",          //
    sendSimpleTxAddress: "Address",        //
    sendSimpleTxAll: "(Send All)",            //
    sendSimpleTxDesc: "Description (from the merchant)",           //
    sendSimpleTxButton:"Send Transaction",          //

    sendManualTxTitle:"Create Manual Transactions",           //
    sendManualTxInput:"Inputs",           //
    sendManualTxTRXHash: "Trx Hash",        //
    sendManualTxIndex:"Index",           //
    sendManualTxScript:"Script",          //
    sendManualTxOutputs:"Outputs",         //
    sendManualTxOutputAddr:"Output address 1",      //
    sendManualTxOutputAddrTwo:"Output address 2",   //
    sendManualTxWIFKey:"WIF key",          //
    sendManualTxWarning:"<b>WARNING:</b> ANY FUNDS NOT ALLOCATED WILL BE USED AS FEES",         //
    sendManualTxButton:"Create Raw Signed Transction",          //
    sendSignedRawTx:"Signed Raw Transaction",             //
    sendSignedTutorial:"Don't understand how this works? ",          //
    sendSignedTutorialLink:"Tutorial Here",      //
    sendSignedTutorialAdvInfo:"Advanced Details: <br>locktime is set to 0, sequence is set to max. SIGHASH_ALL option is chosen for signing raw Transaction.",   //

    // Stake
    stakeTitle:"<b>New Feature!<b>",                  //
    stakeSubTitle:"Please be aware MPW Cold Staking is a new, slightly experimental feature, it may be unstable, and is currently slow. Please have patience when using this feature, and wait for block confirmations before actions and balances are shown on-screen.",               //
    stakeUnstake:"Unstake",                //
    stakeLoadMore:"Load more",               //

    // Settings
    settingsExplorer:"Choose an explorer",            //
    settingsLanguage:"Choose an Language:",            //
    settingsPivxNode:"Choose a PIVX node:",            //
    settingsAnalytics:"Choose your analytics contribution level:",           //
    settingsToggleDebug:"Toggle Debug Mode",         //
    settingsToggleSync:"Toggle Sync Mode",          //
    settingsToggleTestnet:"Toggle Testnet Mode",       //

    // Transparency Report
    transparencyReport: "Transparency Report",
    hit:"A ping indicating an app load, no unique data is sent.",
    time_to_sync:"The time in seconds it took for MPW to last synchronise.",
    transaction:"A ping indicating a Tx, no unique data is sent, but may be inferred from on-chain time.",

    // Alerts
    ALERTS: "<-- DO NOT EDIT! All below entries are for Alert Popups",

    FAILED_TO_IMPORT: '<b>Failed to import!</b> Invalid password',
    TESTNET_ENCRYPTION_DISABLED: "<b>Testnet Mode is ON!</b><br>Wallet encryption disabled",
    PASSWORD_TOO_SMALL: "That password is a little short!<br>Use at least <b>{MIN_PASS_LENGTH} characters.</b>",
    PASSWORD_DOESNT_MATCH: 'Your passwords don\'t match!',
    NEW_PASSWORD_SUCCESS: '<b>You\'re Secured! 🔐</b><br>Nice stuff, Armoured PIVian!',
    INVALID_AMOUNT: '<b>Invalid amount!</b><br>',
    UNSUPPORTED_CHARACTER: "The character '{char}' is unsupported in addresses! (Not Base58 compatible)",
    UNSUPPORTED_WEBWORKERS: "This browser doesn\'t support Web Workers (multi-threaded JS), unfortunately you cannot generate Vanity wallets!",
    INVALID_ADDRESS: "<b>Invalid PIVX address!</b><br> {address}",
    VALIDATE_AMOUNT_LOW: '<br>Minimum amount is {minimumAmount} {coinTicker}!',
    VALIDATE_AMOUNT_DECIMAL: '{coinDecimal} decimal limit exceeded',
    SUCCESS_STAKING_ADDR: '<b>Staking Address set!</b><br>Now go ahead and unstake!',
    CONFIRM_UNSTAKE_H_WALLET:"<b>Confirm your Unstake</b><br>Confirm the TX on your {strHardwareName}",
    CONFIRM_TRANSACTION_H_WALLET:"<b>Confirm your transaction</b><br>Confirm the TX on your {strHardwareName}",
    SUCCESS_STAKING_ADDR_SET: '<b>Staking Address set!</b><br>Now go ahead and stake!',
    STAKE_NOT_SEND: 'Here, use the <b>Stake</b> screen, not the Send screen!',
    BAD_ADDR_LENGTH: '<b>Invalid PIVX address!<b><br>Bad length ({addressLength})',
    BAD_ADDR_PREFIX: '<b>Invalid PIVX address!<b><br>Bad prefix {address} (Should start with {addressPrefix})',
    SENT_NOTHING: 'You can\'t send \'nothing\'!',
    MORE_THEN_8_DECIMALS: '8 decimal limit exceeded',
    SAVE_WALLET_PLEASE: "<b>Save your wallet!</b><br>Dashboard ➜ Set Password",
    BACKUP_OR_ENCRYPT_WALLET: "Please ENCRYPT and/or BACKUP your keys before leaving, or you may lose them!",
    
    SWITCHED_EXPLORERS : "<b>Switched explorer!</b><br>Now using {explorerName}",
    SWITCHED_NODE : "<b>Switched node!</b><br>Now using {node}",
    SWITCHED_ANALYTICS: "<b>Switched analytics level!</b><br>Now {level}",
    SWITCHED_SYNC: "<b>Switched sync mode!</b><br>Now using {sync} sync",
    UNABLE_SWITCH_TESTNET: "<b>Unable to switch Testnet Mode!</b><br>A wallet is already loaded",

    WALLET_OFFLINE_AUTOMATIC: "<b>Offline Mode is active!</b><br>Please disable Offline Mode for automatic transactions",
    WALLET_UNLOCK_IMPORT: "Please {unlock} your wallet before sending transactions!",
    WALLET_FIREFOX_UNSUPPORTED: "<b>Firefox doesn't support this!</b><br>Unfortunately, Firefox does not support hardware wallets",
    WALLET_HARDWARE_WALLET:"<b>Hardware wallet ready!</b><br>Please keep your {hardwareWallet} plugged in, unlocked, and in the PIVX app",
    WALLET_CONFIRM_L:"Confirm the import on your Ledger",
    WALLET_NO_HARDWARE: "<b>No device available</b><br>Couldn't find a hardware wallet; please plug it in and unlock!",
    WALLET_HARDWARE_CONNECTION_LOST: "<b>Lost connection to {hardwareWallet} </b><br>It seems the {hardwareWallet} was unplugged mid-operation, oops!",
    WALLET_HARDWARE_BUSY: "<b>{hardwareWallet} is waiting</b><br>Please unlock your {hardwareWallet} or finish it's current prompt",
    WALLET_HARDWARE_ERROR: "<b> {hardwareWallet} </b><br> {error}",


    CONFIRM_POPUP_VOTE: "Confirm Vote",             
    CONFIRM_POPUP_VOTE_HTML: "Are you sure? It takes 60 minutes to change vote",        
    CONFIRM_POPUP_TRANSACTION: "Confirm your transaction",      
    CONFIRM_POPUP_MN_P_KEY: "Your Masternode Private Key",         
    CONFIRM_POPUP_MN_P_KEY_HTML: "<br> Save this private key and copy it to your VPS config <br>",  
    CONFIRM_POPUP_VERIFY_ADDR: "Verify your address",      

}
