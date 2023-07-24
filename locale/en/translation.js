export const en_translation = {
    // This document is to be used as a template as all the base code is in English
    // Basic HTML tags are allowed such as <b><i> etc. All data is sanitized https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML

    // General words
    amount: 'Amount', //
    staking: 'Staking', //
    wallet: 'Wallet', //
    display: 'Display', //
    activity: 'Activity', //
    yes: 'Yes', //
    no: 'No', //

    // Nav Bar
    navDashboard: 'Dashboard', //
    navStake: 'Stake', //
    navMasternode: 'Masternode', //
    navGovernance: 'Governance', //
    navSettings: 'Settings', //

    // Footer
    footerBuiltWithPivxLabs: 'Built with 💜 by PIVX Labs', //

    // Intro
    loading: 'Loading', //
    loadingTitle: 'My PIVX Wallet is', //

    // Onboarding Dashboard
    dashboardTitle: 'Dashboard', //
    dCardOneTitle: 'Create a', //
    dCardOneSubTitle: 'New Wallet', //
    dCardOneDesc:
        'Create a new PIVX wallet, offering the most secure backup & security methods.', //
    dCardOneButton: 'Create A New Wallet', //

    dCardTwoTitle: 'Create a new', //
    dCardTwoSubTitle: 'Vanity Wallet', //
    dCardTwoDesc:
        'Create a wallet with a custom prefix, this can take a long time!', //
    dCardTwoButton: 'Create A Vanity Wallet', //

    dCardThreeTitle: 'Access your', //
    dCardThreeSubTitle: 'Ledger Wallet', //
    dCardThreeDesc:
        "Use your Ledger Hardware wallet with MPW's familiar interface.", //
    dCardThreeButton: 'Access my Ledger', //

    dCardFourTitle: 'Go to', //
    dCardFourSubTitle: 'My Wallet', //
    dCardFourDesc:
        'Import a PIVX wallet using a Private Key, xpriv, or Seed Phrase.', //
    dCardFourButtonI: 'Import Wallet', //
    dCardFourButtonA: 'Access My Wallet', //

    // Seed Phrase Creation
    thisIsYourSeed: 'This is your seed phrase:', //
    writeDownSeed: "Write it down somewhere. You'll only see this <b>once!</b>", //
    doNotShareWarning:
        'Anyone with a copy of it can access <b>all</b> of your funds.', //
    doNotShare: 'Do NOT share it with anyone.', //
    digitalStoreNotAdvised: 'It is <b>NOT</b> advised to store this digitally.', //
    optionalPassphrase: 'Optional Passphrase', //
    writtenDown: 'I have written down my seed phrase', //

    // Wallet Dashboard
    gettingStarted: 'Getting Started', //
    secureYourWallet: 'Secure your wallet', //
    unlockWallet: 'Unlock wallet', //
    lockWallet: 'Lock wallet', //

    // Encrypt wallet
    encryptWallet: 'Encrypt wallet', //
    encryptPasswordFirst: 'Enter Password', //
    encryptPasswordSecond: 'Re-enter Password', //
    encrypt: 'Encrypt', //

    // Wallet Dashboard Sub-menu
    balanceBreakdown: 'Balance Breakdown', //
    viewOnExplorer: 'View on Explorer', //
    export: 'Export', //
    refreshAddress: 'Refresh address', //
    redeemOrCreateCode: 'Redeem or Create Code', //

    // Send
    transfer: 'Transfer', //
    address: 'Address', //
    receivingAddress: 'Receiving address', //
    sendAmountCoinsMax: 'MAX', //
    paymentRequestMessage: 'Description (from the merchant)', //
    send: 'Send', //

    // Export
    privateKey: 'Private Key', //
    viewPrivateKey: 'View Private Key?', //
    privateWarning1: 'Make sure no one can see your screen.', //
    privateWarning2: 'Anyone with this key can steal your funds.', //
    viewKey: 'View key', //

    // PIVX Promos
    // NOTE: for this below line, continue the sentence "PIVX Promos [...]", since 'PIVX Promos' is a brand, it is not translated.
    pivxPromos: 'is a decentralised system for gift codes worth PIV', // [...] is a decentralised system for gift codes worth PIV
    // NOTE: on this line, if possible, leave 'PIVX Promos' untranslated
    redeemInput: "Enter your 'PIVX Promos' code", //Enter your 'PIVX Promos' code
    createName: 'Promo Name (Optional)', //Promo Name (Optional)
    createAmount: 'Promo Amount', //Promo Amount

    // Stake
    stake: 'Stake', //
    stakeUnstake: 'Unstake', //
    rewardHistory: 'Reward History', //
    loadMore: 'Load more', //

    // Masternode
    mnControlYour: 'Control your', //
    mnSubtext:
        'From this tab you can create and access one or more masternodes', //

    // Governance
    govSubtext:
        'From this tab you can check the proposals and, if you have a masternode, be a part of the <b>DAO</b> and vote!', //
    govMonthlyBudget: 'Monthly Budget', //
    govAllocBudget: 'Allocated Budget', //
    govNextPayout: 'Next Treasury Payout', //
    govTableStatus: 'STATUS', //
    govTableName: 'NAME', //
    govTablePayment: 'PAYMENT', //
    govTableVotes: 'VOTES', //
    govTableVote: 'VOTE', //
    contestedProposalsTitle: 'Contested Proposals', //
    contestedProposalsDesc:
        'These are proposals that received an overwhelming amount of downvotes, making it likely spam or a highly contestable proposal.', //

    // Settings
    settingsCurrency: 'Choose a display currency:', //
    settingsExplorer: 'Choose an explorer:', //
    settingsLanguage: 'Choose a Language:', //
    settingsPivxNode: 'Choose a PIVX node:', //
    settingsAutoSelectNet: 'Auto-select Explorers and Nodes', //
    settingsAnalytics: 'Choose your analytics contribution level:', //
    settingsToggleDebug: 'Debug Mode', //
    settingsToggleTestnet: 'Testnet Mode', //

    // Transparency Report
    transparencyReport: 'Transparency Report',
    hit: 'A ping indicating an app load, no unique data is sent.',
    time_to_sync: 'The time in seconds it took for MPW to last synchronise.',
    transaction:
        'A ping indicating a Tx, no unique data is sent, but may be inferred from on-chain time.',

    // Analytics Levels
    analyticDisabled: 'Disabled',
    analyticMinimal: 'Minimal',
    analyticBalanced: 'Balanced',

    // Alerts
    ALERTS: '<-- DO NOT EDIT! All below entries are for Alert Popups',

    FAILED_TO_IMPORT: '<b>Failed to import!</b> Invalid password',
    TESTNET_ENCRYPTION_DISABLED:
        '<b>Testnet Mode is ON!</b><br>Wallet encryption disabled',
    PASSWORD_TOO_SMALL:
        'That password is a little short!<br>Use at least <b>{MIN_PASS_LENGTH} characters.</b>',
    PASSWORD_DOESNT_MATCH: "Your passwords don't match!",
    NEW_PASSWORD_SUCCESS:
        "<b>You're Secured! 🔐</b><br>Nice stuff, Armoured PIVian!",
    INVALID_AMOUNT: '<b>Invalid amount!</b><br>',
    UNSUPPORTED_CHARACTER:
        "The character '{char}' is unsupported in addresses! (Not Base58 compatible)",
    UNSUPPORTED_WEBWORKERS:
        "This browser doesn't support Web Workers (multi-threaded JS), unfortunately you cannot generate Vanity wallets!",
    INVALID_ADDRESS: '<b>Invalid PIVX address!</b><br> {address}',
    VALIDATE_AMOUNT_LOW: '<br>Minimum amount is {minimumAmount} {coinTicker}!',
    VALIDATE_AMOUNT_DECIMAL: '{coinDecimal} decimal limit exceeded',
    SUCCESS_STAKING_ADDR:
        '<b>Staking Address set!</b><br>Now go ahead and unstake!',
    CONFIRM_UNSTAKE_H_WALLET:
        '<b>Confirm your Unstake</b><br>Confirm the TX on your {strHardwareName}',
    CONFIRM_TRANSACTION_H_WALLET:
        '<b>Confirm your transaction</b><br>Confirm the TX on your {strHardwareName}',
    SUCCESS_STAKING_ADDR_SET:
        '<b>Staking Address set!</b><br>Now go ahead and stake!',
    STAKE_NOT_SEND: 'Here, use the <b>Stake</b> screen, not the Send screen!',
    BAD_ADDR_LENGTH:
        '<b>Invalid PIVX address!<b><br>Bad length ({addressLength})',
    BAD_ADDR_PREFIX:
        '<b>Invalid PIVX address!<b><br>Bad prefix {address} (Should start with {addressPrefix})',
    SENT_NOTHING: "You can't send 'nothing'!",
    MORE_THEN_8_DECIMALS: '8 decimal limit exceeded',
    SAVE_WALLET_PLEASE: '<b>Save your wallet!</b><br>Dashboard ➜ Set Password',
    BACKUP_OR_ENCRYPT_WALLET:
        'Please ENCRYPT and/or BACKUP your keys before leaving, or you may lose them!',
    NO_CAMERAS: 'This device has no camera!',

    SWITCHED_EXPLORERS: '<b>Switched explorer!</b><br>Now using {explorerName}',
    SWITCHED_NODE: '<b>Switched node!</b><br>Now using {node}',
    SWITCHED_ANALYTICS: '<b>Switched analytics level!</b><br>Now {level}',
    SWITCHED_SYNC: '<b>Switched sync mode!</b><br>Now using {sync} sync',
    UNABLE_SWITCH_TESTNET:
        '<b>Unable to switch Testnet Mode!</b><br>A wallet is already loaded',

    WALLET_OFFLINE_AUTOMATIC:
        '<b>Offline Mode is active!</b><br>Please disable Offline Mode for automatic transactions',
    WALLET_UNLOCK_IMPORT:
        'Please {unlock} your wallet before sending transactions!',
    WALLET_FIREFOX_UNSUPPORTED:
        "<b>Firefox doesn't support this!</b><br>Unfortunately, Firefox does not support hardware wallets",
    WALLET_HARDWARE_WALLET:
        '<b>Hardware wallet ready!</b><br>Please keep your {hardwareWallet} plugged in, unlocked, and in the PIVX app',
    WALLET_CONFIRM_L: 'Confirm the import on your Ledger',
    WALLET_NO_HARDWARE:
        "<b>No device available</b><br>Couldn't find a hardware wallet; please plug it in and unlock!",
    WALLET_HARDWARE_CONNECTION_LOST:
        '<b>Lost connection to {hardwareWallet} </b><br>It seems the {hardwareWallet} was unplugged mid-operation, oops!',
    WALLET_HARDWARE_BUSY:
        "<b>{hardwareWallet} is waiting</b><br>Please unlock your {hardwareWallet} or finish it's current prompt",
    WALLET_HARDWARE_ERROR: '<b> {hardwareWallet} </b><br> {error}',

    CONFIRM_POPUP_VOTE: 'Confirm Vote',
    CONFIRM_POPUP_VOTE_HTML: 'Are you sure? It takes 60 minutes to change vote',
    CONFIRM_POPUP_TRANSACTION: 'Confirm your transaction',
    CONFIRM_POPUP_MN_P_KEY: 'Your Masternode Private Key',
    CONFIRM_POPUP_MN_P_KEY_HTML:
        '<br> Save this private key and copy it to your VPS config <br>',
    CONFIRM_POPUP_VERIFY_ADDR: 'Verify your address',
};
