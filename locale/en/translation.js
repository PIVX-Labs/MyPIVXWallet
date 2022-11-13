var en_translation = {
    //This document is to be used as a template as all the base code is in English
    //Basic HTML tags are allowed such as <b><i> etc. All data is sanitized https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML

    //General words
    enabled: "enabled",                    //
    active: "Active",                     //
    disabled: "disabled",                   //
    on:"On",                          //
    experimental:"Experimental",                //
    amount:"Amount",                      //
    staking:"Staking",                     //
    rewards:"rewards",                     //
    available:"Available",                   //

    //NAV BAR
    navIntro: "Intro",                   //
    navDashboard: "Dashboard",               //
    navSend: "Send",                    //
    navStake: "Stake",                   //
    navSettings: "Settings",                //

    navTestnet: "<b>Testnet Mode On</b>",                 //
    navNetwork: "<b>Network:</b>",                 //
    navDebug: "Debug",                   //
    navExperimentalSync:"<b>Experimental Sync Active</b>",         //

    //Footer
    footerDonateLink: "Donate!",           //
    footerBuiltWithPivxLabs: "Built with 💜 by PIVX Labs",    //
    footerGithubLink: "MyPIVXWallet",           //

    //Intro
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

    //Dashboard
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

    //SEND
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

    //Stake
    stakeTitle:"<b>New Feature!<b>",                  //
    stakeSubTitle:"Please be aware MPW Cold Staking is a new, slightly experimental feature, it may be unstable, and is currently slow. Please have patience when using this feature, and wait for block confirmations before actions and balances are shown on-screen.",               //
    stakeUnstake:"Unstake",                //
    stakeLoadMore:"Load more",               //

    //Settings
    settingsExplorer:"Choose an explorer",            //
    settingsLanguage:"Choose an Language:",            //
    settingsAnalytics:"Choose your analytics contribution level:",           //
    settingsToggleDebug:"Toggle Debug Mode",         //
    settingsToggleSync:"Toggle Sync Mode",          //
    settingsToggleTestnet:"Toggle Testnet Mode",       //

    //Transparency Report
    transparencyReport: "Transparency Report",
    hit:"A ping indicating an app load, no unique data is sent.",
    time_to_sync:"The time in seconds it took for MPW to last synchronise.",
    transaction:"A ping indicating a Tx, no unique data is sent, but may be inferred from on-chain time.",

    //ALERTS
    FAILED_TO_IMPORT: '<b>Failed to import!</b> Invalid password',
    TESTNET_ENCRYPTION_DISABLED: "<b>Testnet Mode is ON!</b><br>Wallet encryption disabled",
    PASSWORD_TOO_SMALL: "That password is a little short!<br>Use at least <b>{MIN_PASS_LENGTH} characters.</b>",
    PASSWORD_DOESNT_MATCH: 'Your passwords don\'t match!',
    NEW_PASSWORD_SUCCESS: '<b>You\'re Secured! 🔐</b><br>Nice stuff, Armoured PIVian!',
    INVALID_AMOUNT: '<b>Invalid amount!</b><br>',
    VALIDATE_AMOUNT_LOW: '<br>Minimum amount is ',
    VALIDATE_AMOUNT_DECIMAL: ' decimal limit exceeded',
    SUCCESS_STAKING_ADDR: '<b>Staking Address set!</b><br>Now go ahead and unstake!',
    CONFIRM_UNSTAKE_H_WALLET:"<b>Confirm your Unstake</b><br>Confirm the TX on your {strHardwareName}",
    CONFIRM_TRANSACTION_HA_WALLET:"<b>Confirm your transaction</b><br>Confirm the TX on your ",
    SUCCESS_STAKING_ADDR_SET: '<b>Staking Address set!</b><br>Now go ahead and stake!',
    STAKE_NOT_SEND: 'Here, use the <b>Stake</b> screen, not the Send screen!',
    BAD_ADDR_LENGTH: '<b>Invalid PIVX address!<b><br>Bad length (',
    BAD_ADDR_PREFIX: '<b>Invalid PIVX address!<b><br>Bad prefix ',
    BAD_ADDR_PREFIX_2: ' (Should start with ',
    SENT_NOTHING: 'You can\'t send \'nothing\'!',
    MORE_THEN_8_DECIMALS: '8 decimal limit exceeded',
    SAVE_WALLET_PLEASE: "<b>Save your wallet!</b><br>Dashboard ➜ Set Password",
    BACKUP_OR_ENCRYPT_WALLET: "Please ENCRYPT and/or BACKUP your keys before leaving, or you may lose them!"
    

}