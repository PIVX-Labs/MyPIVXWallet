export default {
    // Sono consentiti tag HTML di base, come <b><i> ecc. Tutti i dati vengono puliti https://developer.mozilla.org/fr/docs/Web/API/Element/innerHTML

    // NOTA: Se una sezione NON necessita di traduzione , lasciala vuota.
    // NOTA: Le variabili che MPW inserisce sono indicate da parentesi {}, ad esempio, {button}, NON tradurre le variabili, ma posizionale dove ha più senso.

    // General words
    amount: 'Quantità', //Amount
    staking: 'Staking', //Staking
    wallet: 'Wallet', //Wallet
    display: 'Display', //Display
    activity: 'Attività', //Activity
    yes: 'Sì', //Yes
    no: 'No', //No

    // Nav Bar
    navDashboard: 'Dashboard', //Dashboard
    navStake: 'Stake', //Stake
    navMasternode: 'Masternode', //Masternode
    navGovernance: 'Governance', //Governance
    navSettings: 'Impostazioni', //Settings

    // Footer
    footerBuiltWithPivxLabs: 'Costruito col 💜 da PIVX Labs 🇮🇹', //Built with 💜 by PIVX Labs

    // Intro
    loading: 'Caricamento', //Loading
    loadingTitle: 'Il mio Wallet PIVX', //My PIVX Wallet is

    // Onboarding Dashboard
    dashboardTitle: 'Dashboard', //Dashboard
    dCardOneTitle: 'Crea un ', //Create a
    dCardOneSubTitle: 'Nuovo Wallet', //New Wallet
    dCardOneDesc:
        'Crea un nuovo Wallet PIVX, con metodi di sicurezza & di backup più sicuri.', //Create a new PIVX wallet, offering the most secure backup & security methods.
    dCardOneButton: 'Crea un Nuovo Wallet', //Create A New Wallet

    dCardTwoTitle: 'Crea un nuovo ', //Create a new
    dCardTwoSubTitle: 'Wallet Vanity', //Vanity Wallet
    dCardTwoDesc:
        'Crea un wallet con un prefisso personalizzato, potrebbe impiegarci molto tempo!', //Create a wallet with a custom prefix, this can take a long time!
    dCardTwoButton: 'Crea un Wallet vanity', //Create A Vanity Wallet

    dCardThreeTitle: 'Accedi al tuo ', //Access your
    dCardThreeSubTitle: 'Hardware wallet', //Hardware Wallet
    dCardThreeDesc:
        'Utilizza il tuo wallet Ledger con la solita interfaccia di MPW.', //Use your Ledger Hardware wallet with MPW's familiar interface.
    dCardThreeButton: 'Accedi al mio Ledger', //Access my Ledger

    dCardFourTitle: 'Vai al ', //Go to
    dCardFourSubTitle: 'Mio Wallet', //My Wallet
    dCardFourDesc:
        'Importa un wallet PIVX usando una Chiave Privata, xpriv, o una Seed Phrase.', //Import a PIVX wallet using a Private Key, xpriv, or Seed Phrase.
    dCardFourButtonI: 'Importa Wallet', //Import Wallet
    dCardFourButtonA: 'Accedi al mio Wallet', //Access My Wallet

    // Seed Phrase Creation
    thisIsYourSeed: 'Questa è la tua seed phrase:', //This is your seed phrase:
    writeDownSeed:
        'Scrivila da qualche parte. La vedrai solo <b>una volta!</b>', //Write it down somewhere. You'll only see this <b>once!</b>
    doNotShareWarning:
        'Chiunque ne ha una copia può accedere a <b> tutti </b> i tuoi fondi', //Anyone with a copy of it can access <b>all</b> of your funds.
    doNotShare: 'NON condividerla con nessuno.', //Do NOT share it with anybody.
    digitalStoreNotAdvised: 'Si consiglia di <b>NON</b> non salvarla online', //It is <b>NOT</b> advised to store this digitally.
    optionalPassphrase: 'Passphrase opzionale', //Optional Passphrase
    writtenDown: 'Ho segnato la mia seed phrase', //I have written down my seed phrase

    // Wallet Dashboard
    gettingStarted: 'Iniziamo', //Getting Started
    secureYourWallet: 'Proteggi il tuo wallet', //Secure your wallet
    unlockWallet: 'Sblocca il wallet', //Unlock wallet
    lockWallet: 'Blocca wallet', //Lock wallet

    // Encrypt wallet
    encryptWallet: 'Cripta il wallet', //Encrypt wallet
    encryptPasswordCurrent: 'Password attuale', //Current Password
    encryptPasswordFirst: 'Inserisci Password', //Enter Password
    encryptPasswordSecond: 'Reinserisci Password', //Re-enter Password
    encrypt: 'Cripta', //Encrypt
    changePassword: 'Cambia Password', //Change Password

    // Wallet Dashboard Sub-menu
    balanceBreakdown: 'Scomposizione del saldo', //Balance Breakdown
    viewOnExplorer: 'Visualizza su Explorer', //View on Explorer
    export: 'Esporta', //Export
    refreshAddress: 'Aggiorna indirizzo', //Refresh address
    redeemOrCreateCode: 'Riscatta o crea codice', //Redeem or Create Code

    // Send
    transfer: 'Transferisci', //Transfer
    address: 'Indirizzo', //Address
    receivingAddress: 'Indirizzo di ricevimento', //Receiving address
    sendAmountCoinsMax: 'MAX', //MAX
    paymentRequestMessage: 'Descrizione (dal commerciante)', //Description (from the merchant)
    send: 'Invia', //Send

    // Contacts System
    receive: 'Ricevi', //Receive
    contacts: 'Contatti', //Contacts
    name: 'Nome', //Name
    username: 'Cognome', //Username
    addressOrXPub: 'Indirizzo o XPub', //Address or XPub
    back: 'Indietro', //Back
    chooseAContact: 'Scegli un contatto', //Choose a Contact
    createContact: 'Crea un contatto', //Create Contact
    encryptFirstForContacts:
        'Dopo aver premuto "{button}" nella Dashboard, puoi creare un contatto per facilitare la ricezione dei PIV!', //Once you hit "{button}"in the Dashboard, you can create a Contact to make receiving PIV easier!
    shareContactURL: 'Condividi contatto URL', //Share Contact URL
    setupYourContact: 'Imposta il tuo contatto', //Setup your Contact
    receiveWithContact:
        'Ricevi utilizzando un semplice contatto basato sul nome utente', //Receive using a simple username-based Contact
    onlyShareContactPrivately:
        'Condividi il tuo contatto <b>solamente</b> con persone fidate (familiari, amici)', //<b>Only</b> share your Contact with trusted people (family, friends)

    /* Context: The "Change to"is used in-app with one of the Three options below it, i.e: "Change to Contact"*/
    changeTo: 'Cambia in ', //Change to
    contact: 'Contatto', //Contact
    xpub: 'XPub', //XPub

    addContactTitle: 'Aggiungi {strName} ai contatti', //Add {strName} to Contacts
    addContactSubtext:
        'Una volta aggiunto, sarai in grado di inviare transazioni a {strName} con il suo nome (digitando o facendo clic), niente più indirizzi, carino e facile.', //Once added you\'ll be able to send transactions to {strName} by their name (either typing, or clicking), no more addresses, nice \'n easy.
    addContactWarning:
        'Assicurati che questo sia il vero "{strName}", non accettare richieste di contatto da fonti sconosciute!', //Ensure that this is the real "{strName}", do not accept Contact requests from unknown sources!

    editContactTitle: 'Cambia contatto "{strName}".', //Change "{strName}"Contact
    newName: 'Nuovo Nome ', //New Name

    removeContactTitle: 'Rimuovi {strName}?', //Remove {strName}?
    removeContactSubtext:
        'Sei sicuro di voler cancellare {strName} dai tuoi contatti?', //Are you sure you wish to remove {strName} from your Contacts?
    removeContactNote:
        'Puoi aggiungerlo di nuovo in qualsiasi momento in futuro.', //You can add them again any time in the future.

    // Export
    privateKey: 'Chiave Privata', //Private Key
    viewPrivateKey: 'Visualizzare la chiave privata?', //View Private Key?
    privateWarning1: 'Assicurati che nessuno possa vedere il tuo schermo.', //Make sure no one can see your screen.
    privateWarning2: 'Chiunque abbia questa chiave può rubare i tuoi fondi.', //Anyone with this key can steal your funds.
    viewKey: 'Viasualizza chiave', //View key

    // PIVX Promos
    // NOTE: for this below line, continue the sentence "PIVX Promos [...]", since 'PIVX Promos' is a brand, it is not translated.
    pivxPromos: 'è un sistema decentralizzato per codici regalo con valore PIV', // [...] is a decentralised system for gift codes worth PIV
    // NOTE: on this line, if possible, leave 'PIVX Promos' untranslated
    redeemInput: "Inserisci il tuo codice 'PIVX Promos'", //Enter your 'PIVX Promos' code
    createName: 'Nome della Promo (Facoltativo)', //Promo Name (Optional)
    createAmount: 'Valore della Promo', //Promo Amount

    // Stake
    stake: 'Stake', //Stake
    stakeUnstake: 'Unstake', //Unstake
    rewardHistory: 'Cronologia delle ricompense', //Reward History
    loadMore: 'Carica altro', //Load more

    // Masternode
    mnControlYour: 'Controlla il tuo', //Control your
    mnSubtext:
        'Da questa scheda puoi creare e accedere a uno o più masternode.', //From this tab you can create and access one or more masternodes

    // Governance
    govSubtext:
        'Da questa scheda puoi controllare le proposte, se hai un masternode puoi far parte della <b>DAO</b> e votare!', //From this tab you can check the proposals and, if you have a masternode, be a part of the <b>DAO</b> and vote!
    govMonthlyBudget: 'Budget Mensile', //Monthly Budget
    govAllocBudget: 'Budget Assegnato', //Allocated Budget
    govNextPayout: 'Prossimo pagamento della Tesoriera', //Next Treasury Payout
    govTableStatus: 'STATO', //STATUS
    govTableName: 'NOME', //NAME
    govTablePayment: 'PAGAMENTO', //PAYMENT
    govTableVotes: 'VOTI', //VOTES
    govTableVote: 'VOTAZIONE', //VOTE
    contestedProposalsDesc:
        'Si tratta di proposte che hanno ricevuto tanti voti negativi, rendendole probabilmente spam o altamente contestabili.', //These are proposals that received an overwhelming amount of downvotes, making it likely spam or a highly contestable proposal.

    // Settings
    settingsCurrency: 'Scegli una valuta da visualizzare:', //Choose a display currency:
    priceProvidedBy: 'Dati sui prezzi forniti da', //Price data provided by
    settingsDecimals: 'Cifre decimali del saldo:', //Balance Decimals:
    settingsExplorer: 'Scegli un explorer:', //Choose an explorer:
    settingsLanguage: 'Scegli una lingua', //Choose a Language:
    settingsPivxNode: 'Scegli un nodo PIVX', //Choose a PIVX node:
    settingsAutoSelectNet: "Auto selezione dell'Explorer e del nodo ", //Auto-select Explorers and Nodes
    settingsAnalytics: 'Scegli il tuo livello di contributo analitico:', //Choose your analytics contribution level:
    settingsToggleDebug: 'Modalità Debug', //Debug Mode
    settingsToggleTestnet: 'Modalità testnet', //Testnet Mode

    // Network switching (mainnet <---> testnet)
    netSwitchUnsavedWarningTitle: 'Il tuo wallet {network} non è salvato!', //Your {network} wallet isn\'t saved!
    netSwitchUnsavedWarningSubtitle: 'Il tuo account {network} è a rischio', //Your {network} account is at risk!
    netSwitchUnsavedWarningSubtext:
        "Se passi a {network} prima di salvarlo, perderai l'account!", //If you switch to {network} before saving it, you\'ll lose the account!
    netSwitchUnsavedWarningConfirmation: 'Ne sei veramente sicuro?', //Are you really sure?

    // Transparency Report
    transparencyReport: 'Rapporto sulla trasparenza', //Transparency Report
    hit: "Un ping che indica il caricamento dell'app, non vengono inviati dati univoci.", //A ping indicating an app load, no unique data is sent.
    time_to_sync:
        "Il tempo in secondi impiegato da MPW per l'ultima sincronizzazione.", //The time in seconds it took for MPW to last synchronise.
    transaction:
        'Un ping che indica un Tx, non vengono inviati dati univoci, ma possono essere dedotti dal tempo in chain.', //A ping indicating a Tx, no unique data is sent, but may be inferred from on-chain time.

    // Analytics Levels
    analyticDisabled: 'Disattivato', //Disabled
    analyticMinimal: 'Minimo', //Minimal
    analyticBalanced: 'Saldo', //Balanced

    // Migration System
    MIGRATION_ACCOUNT_FAILURE_TITLE: "Impossibile recuperare l'account", //Failed to recover account
    MIGRATION_ACCOUNT_FAILURE_HTML:
        'Si è verificato un errore durante il recupero del tuo account. <b> Reimporta il tuo wallet utilizzando la seguente chiave:', //There was an error recovering your account. <br> Please reimport your wallet using the following key:

    // Dynamic Elements (Rendered at runtime - TODO in future PR: sort in to above categories for consistency)
    ID: 'ID', //ID
    time: 'Tempo', //Time
    description: 'Descrizione', //Description
    activityBlockReward: 'Ricompensa del blocco', //Block Reward
    activitySentTo: 'Inviato a {r}', //Sent to
    activitySelf: 'te stesso', //Self
    activityShieldedAddress: 'Indirizzo protetto', //Shielded address
    activityReceivedFrom: 'Ricevuto da {s}', //Received from
    activityDelegatedTo: 'Delegato a {r}', //Delegated to
    activityUndelegated: 'Non delegato', //Undelegated
    activityUnknown: 'Tx sconosciuta', //Unknown Tx
    password: 'Password', //Password
    walletUnlock: 'Sblocca il tuo wallet', //Unlock your wallet
    walletPassword: 'Password del wallet', //Wallet password
    walletUnlockCreateMN: 'Sblocca per creare il tuo Masternode!', //Unlock to create your Masternode!
    walletUnlockMNStart: 'Sblocca per avviare il tuo Masternode! ', //Unlock to start your Masternode!
    walletUnlockProposal: 'Sblocca per creare la tua proposta!', //Unlock to create a proposal!
    walletUnlockPromo: 'Sblocca per finalizzare il tuo Promo Code!', //Unlock to finalise your Promo Code!
    walletUnlockTx: 'Sblocca per inviare la tua transazione! ', //Unlock to send your transaction!
    walletUnlockStake: 'Sblocca per mettere in stake i tuoi', //Unlock to stake your
    walletUnlockUnstake: 'Sblocca per togliere dallo stake i tuoi', //Unlock to unstake your
    changelogTitle: 'Novità nella ', //What's New in
    popupSetColdAddr: 'Configura il tuo indirizzo di Cold Staking', //Set your Cold Staking address
    popupCurrentAddress: 'Indirizzo attuale:', //Current address:
    popupColdStakeNote:
        "Con un Cold Address puoi mettere in stake i tuoi PIVs anche usando l'address di uno sconosciuto, che non potrà spenderli!", //A Cold Address stakes coins on your behalf, it cannot spend coins, so it's even safe to use a stranger's Cold Address!
    popupExample: 'Esempio:', //Example:
    popupWalletLock: 'Vuoi bloccare il tuo wallet?', //Do you want to lock your wallet?
    popupWalletWipe: 'Vuoi cancellare i dati privati ​​del tuo wallet?', //Do you want to wipe your wallet private data?
    popupWalletLockNote:
        'Dovrai inserire la tua password per accedere ai tuoi fondi', //You will need to enter your password to access your funds
    popupWalletWipeNote:
        "Perderai l'accesso ai tuoi fondi se non hai eseguito il backup della chiave privata o della seed phrase", //You will lose access to your funds if you haven't backed up your private key or seed phrase
    popupSeedPhraseBad: 'Seed Phrase inaspettata', //Unexpected Seed Phrase
    popupSeedPhraseBadNote:
        'La frase seed non è valida o non è stata generata da MPW.<br>Vuoi comunque procedere?', //The seed phrase is either invalid or was not generated by MPW.<br>Do you still want to proceed?
    popupCreateProposal: 'Crea proposta', //Create Proposal
    popupCreateProposalCost: 'Costo', //Cost
    popupProposalName: 'Nome della proposta', //Proposal Name
    popupProposalAddress: '', //Proposal Address (Optional)
    popupProposalDuration: 'Durata in cicli', //Duration in cycles
    popupProposalPerCycle: 'per ciclo', //per cycle
    popupProposalEncryptFirst: '', //You need to hit "{button}" before you can create proposals!
    popupProposalVoteHash: 'Hash del voto:', //Vote Hash:
    popupProposalFinalisedNote:
        '<b>Congratulazioni per aver pubblicato la tua proposta!</b><br>I proprietari di Masternode possono utilizzare il tuo Hash di voto per votare da portafogli diversi da MPW, quindi assicurati di aggiungerlo al tuo post sul forum, se applicabile!', //<b>Congratulations on launching your proposal!</b><br>Masternode owners can use your Vote Hash to vote from wallets other than MPW, so make sure to add this to your forum post, if applicable!
    popupProposalFinalisedSignoff:
        'Buona fortuna per il tuo viaggio attraverso la DAO, PIVian', //Good luck on your journey through the DAO, PIVian!
    popupHardwareAddrCheck:
        "Conferma che questo è l'indirizzo che vedi sul tuo", //Please confirm this is the address you see on your
    proposalFinalisationConfirming: 'Confermando...', //Confirming...
    proposalFinalisationRemaining: 'rimanenti', //remaining
    proposalFinalisationExpired: 'Proposta scaduta', //Proposal Expired
    proposalFinalisationReady: "Pronto per l'invio", //Ready to submit
    proposalPassing: 'Passata', //PASSING
    proposalFailing: 'Fallita', //FAILING
    proposalTooYoung: '', //TOO YOUNG
    proposalFunded: 'Finanziata', //FUNDED
    proposalNotFunded: 'Non finanziata', //NOT FUNDED
    proposalPaymentsRemaining: 'rata/i rimanente<br>di', //installment(s) remaining<br>of
    proposalPaymentTotal: 'totale', //total
    proposalNetYes: 'Netto si', //Net Yes
    popupConfirm: 'Conferma', //Confirm
    popupClose: 'Chiusa', //Close
    popupCancel: 'Annulla', //Cancel
    chartPublicAvailable: 'Disponibile pubblicamente', //Public Available
    timeDays: 'Giorni', //Days
    timeHours: 'Ore', //Hours
    timeMinutes: 'Minuti', //Minutes
    timeSeconds: 'Secondi', //Seconds
    unhandledException: 'Eccezione non gestita', //Unhandled exception.

    // Alerts
    ALERTS: '<-- DO NOT EDIT THIS LINE! All below entries are for Alert Popups',

    INTERNAL_ERROR: 'Errore interno, rirova più tardi', //Internal error, please try again later
    FAILED_TO_IMPORT: '<b>Impossibile importare!</b> Password non valida', //<b>Failed to import!</b> Invalid password
    UNSUPPORTED_CHARACTER:
        "Il carattere '{char}' non è supportato negli indirizzi! (Non compatibile con Base58)", //The character '{char}' is unsupported in addresses! (Not Base58 compatible)
    UNSUPPORTED_WEBWORKERS:
        'Questo browser non supporta i Web Worker (JS multi-thread), sfortunatamente non puoi generare portafogli Vanity!', //This browser doesn\'t support Web Workers (multi-threaded JS), unfortunately you cannot generate Vanity wallets!
    INVALID_ADDRESS: '<b>Indirizzo PIVX non valido!</b><br> {address}', //<b>Invalid PIVX address!</b><br> {address}
    TESTNET_ENCRYPTION_DISABLED:
        '<b>La modalità Testnet è attiva!</b><br>Crittografia del wallet disabilitata', //<b>Testnet Mode is ON!</b><br>Wallet encryption disabled
    PASSWORD_TOO_SMALL:
        "La password è un po' corta.<br>Utilizza almeno <b>{MIN_PASS_LENGTH} caratteri.</b>", //That password is a little short!<br>Use at least <b>{MIN_PASS_LENGTH} characters.</b>
    PASSWORD_DOESNT_MATCH: 'La password non corrisponde', //Your passwords don\'t match!
    NEW_PASSWORD_SUCCESS:
        '<b>Sei protetto! 🔐</b><br>Bel lavoro, PIVian corazzato!', //<b>You\'re Secured! 🔐</b><br>Nice stuff, Armoured PIVian!
    INCORRECT_PASSWORD: 'Password sbagliata', //Incorrect password!
    INVALID_AMOUNT: '<b>Importo non valido!</b><br>', //<b>Invalid amount!</b><br>
    TX_SENT: 'Transazione inviata!', //Transaction sent!
    TX_FAILED: 'Transazione fallita!', //Transaction Failed!
    QR_SCANNER_BAD_RECEIVER: 'Il destinatario del pagamento non è valido', //is not a valid payment receiver
    VALIDATE_AMOUNT_LOW: "L'importo minimo è di {minimumAmount} {coinTicker}!", //<br>Minimum amount is {minimumAmount} {coinTicker}!
    VALIDATE_AMOUNT_DECIMAL: '{coinDecimal} limite decimale superato', //{coinDecimal} decimal limit exceeded
    SUCCESS_STAKING_ADDR:
        '<b>Indirizzo di staking impostato!</b><br>Ora vai avanti e annulla lo staking!', //<b>Staking Address set!</b><br>Now go ahead and unstake!
    STAKE_ADDR_SET:
        '<b>Cold Address impostato!</b><br>Gli stake futuri utilizzeranno questo indirizzo.', //<b>Cold Address set!</b><br>Future stakes will use this address.
    STAKE_ADDR_BAD: "L'indirizzo del Cold Staking non è valido", //Invalid Cold Staking address!
    CONFIRM_UNSTAKE_H_WALLET:
        '<b>Conferma il tuo Unstake</b><br>Conferma la TX sul tuo {strHardwareName}', //<b>Confirm your Unstake</b><br>Confirm the TX on your {strHardwareName}
    CONFIRM_TRANSACTION_H_WALLET:
        '<b>Conferma la tua transazione</b><br>Conferma la TX sul tuo {strHardwareName}', //<b>Confirm your transaction</b><br>Confirm the TX on your {strHardwareName}
    SUCCESS_STAKING_ADDR_SET:
        '<b>Indirizzo di staking impostato!</b><br>Ora vai avanti e inizia lo staking!', //<b>Staking Address set!</b><br>Now go ahead and stake!
    STAKE_NOT_SEND:
        'In questo caso, utilizza la schermata <b>Stake</b>, NON la schermata Invia!', //Here, use the <b>Stake</b> screen, not the Send screen!
    BAD_ADDR_LENGTH:
        '<b>Indirizzo PIVX non valido!<b><br>Lunghezza errata ({addressLength})', //<b>Invalid PIVX address!<b><br>Bad length ({addressLength})
    BAD_ADDR_PREFIX:
        '<b>Indirizzo PIVX non valido!<b><br>Prefisso {address} errato (dovrebbe iniziare con {addressPrefix})', //<b>Invalid PIVX address!<b><br>Bad prefix {address} (Should start with {addressPrefix})
    SENT_NOTHING: "Non puoi inviare 'niente'!", //You can\'t send \'nothing\'!
    MORE_THEN_8_DECIMALS: 'limite di 8 decimali superato', //8 decimal limit exceeded
    SAVE_WALLET_PLEASE:
        '<b>Salva il tuo wallet!</b><br>Dashboard ➜ Proteggi il tuo wallet', //<b>Save your wallet!</b><br>Dashboard ➜ Secure your wallet
    BACKUP_OR_ENCRYPT_WALLET:
        'Ti preghiamo di crittografare e/o eseguire il backup delle tue chiavi prima di chiudere, altrimenti potresti perderle!', //Please ENCRYPT and/or BACKUP your keys before leaving, or you may lose them!
    NO_CAMERAS: 'Questo dispositivo non ha una fotocamera!', //This device has no camera!
    STAKING_LEDGER_NO_SUPPORT: 'Il Ledger non è supportato per il Cold Staking', //Ledger is not supported for Cold Staking
    CONNECTION_FAILED:
        '<b>Impossibile sincronizzare!</b> Riprova più tardi.<br>Puoi provare a riconnetterti tramite le Impostazioni.', //<b>Failed to synchronize!</b> Please try again later.<br>You can attempt re-connect via the Settings.
    MN_NOT_ENABLED: 'Il tuo masternode non è ancora abilitato!', //Your masternode is not enabled yet!
    VOTE_SUBMITTED: 'Voto inviato!', //Vote submitted!
    VOTED_ALREADY:
        'Hai già votato per questa proposta! Si prega di attendere 1 ora', //You already voted for this proposal! Please wait 1 hour
    VOTE_SIG_BAD:
        'Impossibile verificare la firma, controlla la chiave privata del tuo masternode', //Failed to verify signature, please check your masternode\'s private key
    MN_CREATED_WAIT_CONFS:
        '<b>Masternode creato!<b><br>Attendere 15 conferme per procedere ulteriormente', //<b>Masternode Created!<b><br>Wait 15 confirmations to proceed further
    MN_ACCESS_BEFORE_VOTE: 'Accedi a un masternode prima di votare!', //Access a masternode before voting!
    MN_OFFLINE_STARTING: 'Il tuo masternode è offline, proviamo ad avviarlo', //Your masternode is offline, we will try to start it
    MN_STARTED: '<b>Il Masternode è stato avviato!</b>', //<b>Masternode started!</b>
    MN_RESTARTED: '<b>Il Masternode è stato riavviato<b/>', //<b>Masternode restarted!</b>
    MN_STARTED_ONLINE_SOON:
        '<b>Il Masternode è stato avviato!</b><br>Sarà presto online', //<b>Masternode started!</b><br>It\'ll be online soon
    MN_START_FAILED: '<b>Il Masternode è stato avviato!</b>', //<b>Masternode started!</b>
    MN_RESTART_FAILED: '<b>Masternode riavviato!</b>', //<b>Masternode restarted!</b>
    MN_DESTROYED: '<b>Il distrutto!</b><br>Le tue monete ora sono spendibili.', //<b>Masternode destroyed!</b><br>Your coins are now spendable.
    MN_STATUS_IS: 'Lo stato del tuo Masternode è ', //Your masternode status is
    MN_STATE: 'Il tuo masternode è <b>{state}</b>', //Your masternode is in <b>{state}</b> state
    MN_BAD_IP: "L'indirizzo IP non è valido!", //The IP address is invalid!
    MN_NOT_ENOUGH_COLLAT:
        'Hai bisogno di <b>{amount} altri {ticker}</b> per creare un Masternode!', //You need <b>{amount} more {ticker}</b> to create a Masternode!
    MN_ENOUGH_BUT_NO_COLLAT:
        'Hai un saldo sufficiente per un Masternode, ma nessun UTXO collaterale valido di {amount} {ticker}', //You have enough balance for a Masternode, but no valid collateral UTXO of {amount} {ticker}
    MN_COLLAT_NOT_SUITABLE: 'Questo UTXO non è adatto per un Masternode', //This is not a suitable UTXO for a Masternode
    MN_CANT_CONNECT: 'Impossibile connettersi al nodo RPC!', //Unable to connect to RPC node!

    /* Contacts System Alerts */
    CONTACTS_ENCRYPT_FIRST:
        'Devi premere "{button}" prima di poter utilizzare i Contatti!', //You need to hit "{button}"before you can use Contacts!
    CONTACTS_NAME_REQUIRED: 'Nome richiesto!', //A name is required!
    CONTACTS_NAME_TOO_LONG: 'Questo nome è troppo lungo!', //That name is too long!
    CONTACTS_CANNOT_ADD_YOURSELF: 'Non puoi aggiungerti come contatto!', //You cannot add yourself as a Contact!
    CONTACTS_ALREADY_EXISTS:
        '<b>Il contatto esiste già!</b><br>Hai già salvato questo contatto', //<b>Contact already exists!</b><br>You already saved this contact
    CONTACTS_NAME_ALREADY_EXISTS:
        '<b>Il nome del contatto esiste già!</b><br>Potrebbe trattarsi di un tentativo di phishing, attenzione!', //<b>Contact name already exists!</b><br>This could potentially be a phishing attempt, beware!
    CONTACTS_EDIT_NAME_ALREADY_EXISTS:
        '<b>Il contatto esiste già!</b><br>Un contatto si chiama già "{strNewName}"!', //<b>Contact already exists!</b><br>A contact is already called "{strNewName}"!
    CONTACTS_KEY_ALREADY_EXISTS:
        '<b>Il contatto esiste già, ma con un nome diverso!</b><br>Hai {newName} salvato come <b>{oldName}</b> nei tuoi contatti', //<b>Contact already exists, but under a different name!</b><br>You have {newName} saved as <b>{oldName}</b> in your contacts
    CONTACTS_NOT_A_CONTACT_QR: 'Questo non è un Contatto QR!', //This isn\'t a Contact QR!
    CONTACTS_ADDED:
        '<b>Nuovo contatto aggiunto!</b><br>{strName} è stato aggiunto, evviva!', //<b>New Contact added!</b><br>{strName} has been added, hurray!
    CONTACTS_YOU_HAVE_NONE: 'Non hai contatti!', //You have no contacts!

    SWITCHED_EXPLORERS:
        '<b>Explorer cambiato!</b><br>Stai utilizzando {explorerName}', //<b>Switched explorer!</b><br>Now using {explorerName}
    SWITCHED_NODE: '<b>Nodo cambiato!</b><br>Stai usando {node}', //<b>Switched node!</b><br>Now using {node}
    SWITCHED_ANALYTICS: 'Livello di analisi cambiato!</b><br>Ora {level}', //<b>Switched analytics level!</b><br>Now {level}
    SWITCHED_SYNC:
        '<b>Modalità di sincronizzazione cambiata!</b><br>Ora stai utilizzando la sincronizzazione {sync}', //<b>Switched sync mode!</b><br>Now using {sync} sync
    UNABLE_SWITCH_TESTNET:
        '<b>Impossibile cambiare la modalità Testnet!</b><br>Un wallet è già caricato', //<b>Unable to switch Testnet Mode!</b><br>A wallet is already loaded

    WALLET_OFFLINE_AUTOMATIC:
        '<b>La modalità offline è attiva!</b><br>Disattiva la modalità offline per le transazioni automatiche', //<b>Offline Mode is active!</b><br>Please disable Offline Mode for automatic transactions
    WALLET_UNLOCK_IMPORT:
        'Per favore, {unlock} il tuo wallet prima di compiere transazioni di invio!', //Please {unlock} your wallet before sending transactions!
    WALLET_FIREFOX_UNSUPPORTED:
        '<b>Firefox non lo supporta!</b><br>, Firefox sfortunatamnete non supporta portafogli hardware ', //<b>Firefox doesn't support this!</b><br>Unfortunately, Firefox does not support hardware wallets
    WALLET_HARDWARE_WALLET:
        "<b>Wallet hardware pronto!</b><br>Tieni il tuo {hardwareWallet} collegato, sbloccato e nell'app PIVX", //<b>Hardware wallet ready!</b><br>Please keep your {hardwareWallet} plugged in, unlocked, and in the PIVX app
    WALLET_CONFIRM_L: "Conferma l'importo sulla tua Ledger", //Confirm the import on your Ledger
    WALLET_NO_HARDWARE:
        '<b>Nessun dispositivo disponibile</b><br>Impossibile trovare un wallet hardware; per favore collegalo e sbloccalo!', //<b>No device available</b><br>Couldn't find a hardware wallet; please plug it in and unlock!
    WALLET_HARDWARE_CONNECTION_LOST:
        "<b>Connessione a {hardwareWallet} persa </b><br>Sembra che {hardwareWalletProductionName} sia stato scollegato durante l'operazione, ops!", //<b>Lost connection to {hardwareWallet} </b><br>It seems the {hardwareWalletProductionName} was unplugged mid-operation, oops!
    WALLET_HARDWARE_BUSY:
        '<b>{hardwareWallet} è in attesa</b><br>Sblocca il tuo {hardwareWalletProductionName} o completa la richiesta corrente', //<b>{hardwareWallet} is waiting</b><br>Please unlock your {hardwareWalletProductionName} or finish it's current prompt
    WALLET_HARDWARE_ERROR: 'b> {hardwareWallet} </b><br> {errore}', //<b> {hardwareWallet} </b><br> {error}

    CONFIRM_POPUP_VOTE: 'Conferma voto', //Confirm Vote
    CONFIRM_POPUP_VOTE_HTML:
        'Ne sei sicuro? Dovrai aspettare 60 minuti per cambiare il tuo voto', //Are you sure? It takes 60 minutes to change vote
    CONFIRM_POPUP_TRANSACTION: 'Conferma la transazione', //Confirm your transaction
    CONFIRM_POPUP_MN_P_KEY: 'Chiave privata del tuo Masternode', //Your Masternode Private Key
    CONFIRM_POPUP_MN_P_KEY_HTML:
        '<br> Salva questa chiave privata e copiala nella configurazione VPS <br>', // <br> Save this private key and copy it to your VPS config <br>
    CONFIRM_POPUP_VERIFY_ADDR: 'Verifica il tuo indirizzo', //Verify your address

    MIGRATION_MASTERNODE_FAILURE:
        'Impossibile recuperare il tuo masternode. Per favore reimportalo.', //Failed to recover your masternode. Please reimport it.
    MIGRATION_ACCOUNT_FAILURE:
        'Impossibile recuperare il tuo account. Per favore reimportalo.', //Failed to recover your account. Please reimport it.
    APP_INSTALLED: 'Applicazione installata!', //App Installed!
};
