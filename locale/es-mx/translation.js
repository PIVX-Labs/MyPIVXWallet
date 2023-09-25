export const es_mx_translation = {
    // Este documento se debe usar como una plantilla ya que todo el código base está en inglés
    // Se permiten etiquetas HTML básicas como <b><i> etc. Todos los datos están saneados https://developer.mozilla.org/es/docs/Web/API/Element/innerHTML

    // NOTA: Si una sección NO necesita traducción, déjala vacía.
    // NOTA: Las variables que inserta MPW se denotan con corchetes {}, por ejemplo, {button}, NO traduzcas las variables, pero colócalas donde tenga más sentido.

    // General words
    amount: 'Cantidad', //Amount
    staking: 'Staking', //Staking
    wallet: 'Wallet', //Wallet
    display: 'Visualizar', //Display
    activity: 'Actividad', //Activity
    yes: 'Si', //Yes
    no: 'No', //No

    // Nav Bar
    navDashboard: 'Panel', //Dashboard
    navStake: 'Stake', //Stake
    navMasternode: 'Masternode', //Masternode
    navGovernance: 'Gobernanza', //Governance
    navSettings: 'Ajustes', //Settings

    // Footer
    footerBuiltWithPivxLabs: 'Hecho con 💜 por PIVX Labs 🇲🇽', //Built with 💜 by PIVX Labs

    // Intro
    loading: 'Cargando', //Loading
    loadingTitle: 'My PIVX Wallet está', //My PIVX Wallet is

    // Onboarding Dashboard
    dashboardTitle: 'Panel', //Dashboard
    dCardOneTitle: 'crea una', //Create a
    dCardOneSubTitle: 'Nueva Wallet', //New Wallet
    dCardOneDesc:
        'Crear una nueva PIVX Wallet, ofreciendo los métodos de respaldo y seguridad más seguros.', //Create a new PIVX wallet, offering the most secure backup & security methods.
    dCardOneButton: 'Crear una nueva PIVX Wallet', //Create A New Wallet

    dCardTwoTitle: 'Crear una nueva', //Create a new
    dCardTwoSubTitle: 'Vanity Wallet', //Vanity Wallet
    dCardTwoDesc:
        'Crear una wallet con un prefijo personalizado, ¡Esto puede llevar mucho tiempo!', //Create a wallet with a custom prefix, this can take a long time!
    dCardTwoButton: 'Crear una Vanity Wallet', //Create A Vanity Wallet

    dCardThreeTitle: 'Accede a tu', //Access your
    dCardThreeSubTitle: 'Wallet de Hardware', //Hardware Wallet
    dCardThreeDesc:
        'Utiliza tu wallet Ledger Hardware con en la interfaz de MPW.', //Use your Ledger Hardware wallet with MPW's familiar interface.
    dCardThreeButton: 'Acceder a mi Ledger', //Access my Ledger

    dCardFourTitle: 'Ir a', //Go to
    dCardFourSubTitle: 'Mi Wallet', //My Wallet
    dCardFourDesc:
        'Importar una wallet de PIVX usando una llave privada, xpriv o frase de semilla.', //Import a PIVX wallet using a Private Key, xpriv, or Seed Phrase.
    dCardFourButtonI: 'Importar Wallet', //Import Wallet
    dCardFourButtonA: 'Acceder a mi Wallet', //Access My Wallet

    // Vanity Creation
    vanityPrefixNote: 'Nota: las direcciones siempre comenzarán con:', //Note: addresses will always start with:
    vanityPrefixInput: 'Prefijo de direcciones', //Address Prefix

    // Seed Phrase Creation
    thisIsYourSeed: 'Esta es tu frase de semilla:', //This is your seed phrase:
    writeDownSeed:
        'Escríbelo en alguna parte. ¡Solo verás esto <b>una vez!</b>', //Write it down somewhere. You'll only see this <b>once!</b>
    doNotShareWarning:
        'Cualquiera que tenga una copia puede acceder a <b>todos</b> tus fondos.', //Anyone with a copy of it can access <b>all</b> of your funds.
    doNotShare: 'NO lo compartas con nadie.', //Do NOT share it with anybody.
    digitalStoreNotAdvised:
        '<b>NO</b> se recomienda almacenar esto digitalmente.', //It is <b>NOT</b> advised to store this digitally.
    optionalPassphrase: 'Frase de contraseña opcional (BIP39)', //Optional Passphrase (BIP39)
    writtenDown: 'He escrito mi frase semilla', //I have written down my seed phrase

    // Seed Phrase Import
    importSeedValid: '¡La frase de semilla es válida!', //Seed Phrase is valid!
    importSeedError: '¡La frase de semilla no es válida!', //Seed Phrase is invalid!
    importSeedErrorSize:
        '¡Una frase de semilla debe tener entre 12 y 24 palabras!', //A Seed Phrase should be 12 or 24 words long!
    importSeedErrorTypo:
        '¡La frase de semilla contiene errores tipográficos! Revisa atentamente tu escritura', //Seed Phrase contains typing errors! Check your input carefully
    importSeedErrorSkip:
        'La frase de semilla parece ser no válida, pero el usuario omitió la advertencia', //Seed Phrase appears invalid, but the warning was skipped by the user

    // Wallet Dashboard
    gettingStarted: 'Primeros pasos', //Getting Started
    secureYourWallet: 'Asegura tu wallet', //Secure your wallet
    unlockWallet: 'Desbloquear wallet', //Unlock wallet
    lockWallet: 'Bloquear wallet', //Lock wallet

    // Encrypt wallet
    encryptWallet: 'Encriptar wallet', //Encrypt wallet
    encryptPasswordCurrent: 'Contraseña actual', //Current Password
    encryptPasswordFirst: 'Introduce la contraseña', //Enter Password
    encryptPasswordSecond: 'Volver a introducir contraseña', //Re-enter Password
    encrypt: 'Encriptar', //Encrypt
    changePassword: 'Cambiar contraseña', //Change Password

    // Wallet Dashboard Sub-menu
    balanceBreakdown: 'Desglose del Balance', //Balance Breakdown
    viewOnExplorer: 'Ver en el Explorador', //View on Explorer
    export: 'Exportar', //Export
    refreshAddress: 'Actualizar la dirección', //Refresh address
    redeemOrCreateCode: 'Canjear o Crear un Código', //Redeem or Create Code

    // Send
    address: 'Dirección', //Address
    receivingAddress: 'Dirección receptora', //Receiving address
    sendAmountCoinsMax: 'MÁXIMO', //MAX
    paymentRequestMessage: 'Descripción (de la tienda)', //Description (from the merchant)
    send: 'Enviar', //Send

    // Contacts System
    receive: 'Recibir', //Receive
    contacts: 'Contactos', //Contacts
    name: 'Nombre', //Name
    username: 'Nombre de usuario', //Username
    addressOrXPub: 'Dirección o XPub', //Address or XPub
    back: 'Regresar', //Back
    chooseAContact: 'Elegir un contacto', //Choose a Contact
    createContact: 'Crear un contacto', //Create Contact
    encryptFirstForContacts:
        'Una vez que pulses "{button}" en el Panel de control, podrás crear un Contacto para facilitar la recepción de PIV.', //Once you hit "{button}" in the Dashboard, you can create a Contact to make receiving PIV easier!
    shareContactURL: 'Compartir URL de contacto', //Share Contact URL
    setupYourContact: 'Configurar el contacto', //Setup your Contact
    receiveWithContact:
        'Recibir usando un contacto simple basado en el nombre de usuario', //Receive using a simple username-based Contact
    onlyShareContactPrivately:
        'Comparte tus Contactos <b>sólamente</b> con personas de confianza (familia, amigos, etc.)', //<b>Only</b> share your Contact with trusted people (family, friends)

    /* Context: The "Change to" is used in-app with one of the Three options below it, i.e: "Change to Contact" */
    changeTo: 'Cambiar a', //Change to
    contact: 'Contacto', //Contact
    xpub: 'XPub', //XPub

    addContactTitle: 'Añadir a {strName} a los Contactos', //Add {strName} to Contacts
    addContactSubtext:
        'Una vez añadido, podrás enviar transacciones a {strName} por su nombre (escribiendo o haciendo click), no más direcciones, fácil y sencillo.', //Once added you\'ll be able to send transactions to {strName} by their name (either typing, or clicking), no more addresses, nice \'n easy.
    addContactWarning:
        'Asegúrate de que se trata del verdadero "{strName}", ¡No aceptes solicitudes de personas desconocidas!', //Ensure that this is the real "{strName}", do not accept Contact requests from unknown sources!

    editContactTitle: '', //Change "{strName}" Contact
    newName: '', //New Name

    removeContactTitle: '¿Eliminar a {strName}?', //Remove {strName}?
    removeContactSubtext:
        '¿Estás seguro de que deseas eliminar a {strName} de tus Contactos?', //Are you sure you wish to remove {strName} from your Contacts?
    removeContactNote: 'Puedes volver a añadirle en cualquier otro momento.', //You can add them again any time in the future.

    // Export
    privateKey: 'Llave Privada', //Private Key
    viewPrivateKey: '¿Ver la Llave privada?', //View Private Key?
    privateWarning1: 'Asegúrate de que nadie pueda ver tu pantalla.', //Make sure no one can see your screen.
    privateWarning2: 'Cualquiera con esta clave puede robar tus fondos.', //Anyone with this key can steal your funds.
    viewKey: 'Ver la llave', //View key

    // PIVX Promos
    // NOTE: for this below line, continue the sentence "PIVX Promos [...]", since 'PIVX Promos' is a brand, it is not translated.
    pivxPromos:
        'es un sistema descentralizado de códigos de regalo comprados con PIV', // [...] is a decentralised system for gift codes worth PIV
    // NOTE: on this line, if possible, leave 'PIVX Promos' untranslated
    redeemInput: 'Introduce tu código de PIVX Promos', //Enter your 'PIVX Promos' code
    createName: 'Nombre de la Promoción (Opcional)', //Promo Name (Optional)
    createAmount: 'Monto de la Promo', //Promo Amount

    // Stake
    stake: 'Stake', //Stake
    stakeUnstake: 'Unstake', //Unstake
    rewardHistory: 'Historial de recompensas', //Reward History
    loadMore: 'Cargar más', //Load more

    // Masternode
    mnControlYour: 'Controla tu', //Control your
    mnSubtext:
        'Desde esta pestaña puedes crear y acceder a uno o varios masternodes', //From this tab you can create and access one or more masternodes

    // Governance
    govSubtext:
        'Desde esta pestaña puedes consultar las propuestas y, si tienes un masternode, ¡ser parte de la <b>DAO</b> y votar!', //From this tab you can check the proposals and, if you have a masternode, be a part of the <b>DAO</b> and vote!
    govMonthlyBudget: 'Presupuesto Mensual', //Monthly Budget
    govAllocBudget: 'Presupuesto Asignado', //Allocated Budget
    govNextPayout: 'Próximo Pago de la Tesorería', //Next Treasury Payout
    govTableStatus: 'ESTATUS', //STATUS
    govTableName: 'NOMBRE', //NAME
    govTablePayment: 'PAGOS', //PAYMENT
    govTableVotes: 'VOTOS', //VOTES
    govTableVote: 'VOTA', //VOTE
    contestedProposalsDesc:
        'Estas son propuestas que han recibido una cantidad abrumadora de votos negativos, por lo que es probable que se trate de spam o de una propuesta muy cuestionable.', //These are proposals that received an overwhelming amount of downvotes, making it likely spam or a highly contestable proposal.

    // Settings
    settingsCurrency: 'Elije una divisa de visualización:', //Choose a display currency:
    priceProvidedBy: 'Datos de precios proporcionados por', //Price data provided by
    settingsDecimals: 'Decimales en el saldo:', //Balance Decimals:
    settingsExplorer: 'Elige un explorador:', //Choose an explorer:
    settingsLanguage: 'Elige un idioma:', //Choose a Language:
    settingsPivxNode: 'Elige un nodo PIVX:', //Choose a PIVX node:
    settingsAutoSelectNet: 'Selección automática de exploradores y nodos', //Auto-select Explorers and Nodes
    settingsAnalytics: 'Elige tu nivel de contribución a las analíticas:', //Choose your analytics contribution level:
    settingsToggleDebug: 'Modo de depuración', //Debug Mode
    settingsToggleTestnet: 'Modo Testnet', //Testnet Mode
    settingsToggleAdvancedMode: 'Modo Avanzado', //Advanced Mode
    settingsToggleAdvancedModeSubtext:
        'Esto desbloquea una mayor funcionalidad y personalización, pero puede resultar abrumador y potencialmente peligroso para los usuarios inexpertos.', //This unlocks deeper functionality and customisation, but may be overwhelming and potentially dangerous for unexperienced users!

    // Network switching (mainnet <---> testnet)
    netSwitchUnsavedWarningTitle: '¡Tu wallet {network} no está guardada!', //Your {network} wallet isn\'t saved!
    netSwitchUnsavedWarningSubtitle: '¡Tu cuenta {network} está en riesgo!', //Your {network} account is at risk!
    netSwitchUnsavedWarningSubtext:
        'Si cambias a la {network} antes de guardarla, ¡perderás la cuenta!', //If you switch to {network} before saving it, you\'ll lose the account!
    netSwitchUnsavedWarningConfirmation: '¿Estás seguro?', //Are you really sure?

    // Transparency Report
    transparencyReport: 'Informe de Transparencia', //Transparency Report
    hit: 'Un ping que indica la carga de la aplicación, ningún dato se ha enviado.', //A ping indicating an app load, no unique data is sent.
    time_to_sync:
        'El tiempo en segundos que tardó MPW en sincronizarse por última vez.', //The time in seconds it took for MPW to last synchronise.
    transaction:
        'Un ping que indica un Tx, ningún dato se ha enviado, pero puede inferirse del tiempo en la cadena.', //A ping indicating a Tx, no unique data is sent, but may be inferred from on-chain time.

    // Analytics Levels
    analyticDisabled: 'Deshabilitado', //Disabled
    analyticMinimal: 'Mínimo', //Minimal
    analyticBalanced: 'Balanceado', //Balanced

    // Migration System
    MIGRATION_ACCOUNT_FAILURE_TITLE: 'Error al recuperar la cuenta', //Failed to recover account
    MIGRATION_ACCOUNT_FAILURE_HTML:
        'Se produjo un error al recuperar tu cuenta. <br> Vuelva a importar su wallet usando la siguiente clave:', //There was an error recovering your account. <br> Please reimport your wallet using the following key:

    // Dynamic Elements (Rendered at runtime - TODO in future PR: sort in to above categories for consistency)
    ID: 'ID', //ID
    time: 'Hora', //Time
    description: 'Descripción', //Description
    activityBlockReward: 'Recompensa del Bloque', //Block Reward
    activitySentTo: 'Enviar a {r}', //Sent to
    activitySelf: 'ti mismo', //Self
    activityShieldedAddress: 'Dirección Shielded', //Shielded address
    activityReceivedFrom: 'Recibido de {s}', //Received from
    activityDelegatedTo: 'Delegado a {r}', //Delegated to
    activityUndelegated: 'No delegado', //Undelegated
    activityUnknown: 'Tx desconocido', //Unknown Tx
    password: 'Contraseña', //Password
    walletUnlock: 'Desbloquea tu wallet', //Unlock your wallet
    walletPassword: 'Contraseña de la Wallet', //Wallet password
    walletUnlockCreateMN: '¡Desbloquea para crear tu Masternode!', //Unlock to create your Masternode!
    walletUnlockMNStart: '¡Desbloquea para iniciar tu Masternode!', //Unlock to start your Masternode!
    walletUnlockProposal: '¡Desbloquea para crear una propuesta!', //Unlock to create a proposal!
    walletUnlockPromo: '¡Desbloquea para finalizar tu Código Promocional!', //Unlock to finalise your Promo Code!
    walletUnlockTx: '¡Desbloquea para enviar tu transacción!', //Unlock to send your transaction!
    walletUnlockStake: 'Desbloquea para hacer stake tus', //Unlock to stake your
    walletUnlockUnstake: 'Desbloquea para dejar de hacer stake tus', //Unlock to unstake your
    changelogTitle: 'Novedades en', //What's New in
    popupSetColdAddr: 'Configura tu dirección de Cold Staking', //Set your Cold Staking address
    popupCurrentAddress: 'Dirección actual', //Current address:
    popupColdStakeNote:
        '¡Una dirección de Cold Staking hace stake de monedas en tu nombre, pero no puede gastar las monedas, por lo que es seguro utilizar la Dirección Cold Staking de un desconocido!', //A Cold Address stakes coins on your behalf, it cannot spend coins, so it's even safe to use a stranger's Cold Address!
    popupExample: 'Ejemplo:', //Example:
    popupWalletLock: '¿Quieres bloquear tu wallet?', //Do you want to lock your wallet?
    popupWalletWipe: '¿Quieres eliminar los datos privados de tu wallet?', //Do you want to wipe your wallet private data?
    popupWalletLockNote:
        'Deberás introducir tu contraseña para acceder a tus fondos', //You will need to enter your password to access your funds
    popupWalletWipeNote:
        'Perderás el acceso a tus fondos si no haz hecho una copia de seguridad de tu llave privada o frase de semilla', //You will lose access to your funds if you haven't backed up your private key or seed phrase
    popupSeedPhraseBad: 'Frase de Semilla Inesperada', //Unexpected Seed Phrase
    popupSeedPhraseBadNote:
        'La frase de semilla no es válida o no ha sido generada por MPW.<br>¿Aún así deseas continuar?', //The seed phrase is either invalid or was not generated by MPW.<br>Do you still want to proceed?
    popupCreateProposal: 'Crear una Propuesta', //Create Proposal
    popupCreateProposalCost: 'Costo', //Cost
    popupProposalName: 'Nombre de la Propuesta', //Proposal Name
    popupProposalAddress: '', //Proposal Address (Optional)
    popupProposalDuration: 'Duración en Ciclos', //Duration in cycles
    popupProposalPerCycle: 'por ciclo', //per cycle
    popupProposalEncryptFirst: '', //You need to hit "{button}" before you can create proposals!
    popupProposalVoteHash: 'Hash de Votación:', //Vote Hash:
    popupProposalFinalisedNote:
        '<b>¡Felicitaciones por el lanzamiento de tu propuesta!</b><br>¡Los propietarios de Masternode pueden utilizar tu Hash de Votación para votar desde wallets que no sean MPW, así que asegúrate de añadirlo a tu mensaje en el foro, si aplica!', //<b>Congratulations on launching your proposal!</b><br>Masternode owners can use your Vote Hash to vote from wallets other than MPW, so make sure to add this to your forum post, if applicable!
    popupProposalFinalisedSignoff:
        '¡Buena suerte en tu viaje por la DAO, PIVian!', //Good luck on your journey through the DAO, PIVian!
    popupHardwareAddrCheck:
        'Por favor, confirma que esta es la dirección que ve en tu', //Please confirm this is the address you see on your
    proposalFinalisationConfirming: 'Confirmando...', //Confirming...
    proposalFinalisationRemaining: 'restante', //remaining
    proposalFinalisationExpired: 'Propuesta Expirada', //Proposal Expired
    proposalFinalisationReady: 'Listo para enviarla', //Ready to submit
    proposalPassing: 'PASANDO', //PASSING
    proposalFailing: 'FRACASANDO', //FAILING
    proposalTooYoung: '', //TOO YOUNG
    proposalFunded: 'FINANCIADA', //FUNDED
    proposalNotFunded: 'NO FINANCIADA', //NOT FUNDED
    proposalPaymentsRemaining: 'plazo(s) restante(s)<br>de', //installment(s) remaining<br>of
    proposalPaymentTotal: 'total', //total
    proposalNetYes: 'Sí de la Red', //Net Yes
    popupConfirm: 'Confirmar', //Confirm
    popupClose: 'Cerrar', //Close
    popupCancel: 'Cancelar', //Cancel
    chartPublicAvailable: 'Disponible al Público', //Public Available
    timeDays: 'Días', //Days
    timeHours: 'Horas', //Hours
    timeMinutes: 'Minutos', //Minutes
    timeSeconds: 'Segundos', //Seconds
    unhandledException: 'Excepción sin resolver.', //Unhandled exception.

    // Alerts
    ALERTS: '<-- DO NOT EDIT THIS LINE! All below entries are for Alert Popups',

    INTERNAL_ERROR: 'Error interno, vuelve a intentarlo más tarde', //Internal error, please try again later
    FAILED_TO_IMPORT: '<b>¡No se ha podido importar!</b> Contraseña inválida', //<b>Failed to import!</b> Invalid password
    UNSUPPORTED_CHARACTER:
        '¡El carácter {char} no está soportado en las direcciones! (No compatible con Base58)', //The character '{char}' is unsupported in addresses! (Not Base58 compatible)
    UNSUPPORTED_WEBWORKERS:
        'Este navegador no soporta Web Workers (multi-threaded JS), ¡lamentablemente no puedes generar wallets Vanity!', //This browser doesn\'t support Web Workers (multi-threaded JS), unfortunately you cannot generate Vanity wallets!
    INVALID_ADDRESS: '<b>¡Dirección PIVX no válida!</b><br> {address}', //<b>Invalid PIVX address!</b><br> {address}
    TESTNET_ENCRYPTION_DISABLED:
        '<b>¡El modo Testnet está activado!</b><br>Encriptado de wallet deshabilitado', //<b>Testnet Mode is ON!</b><br>Wallet encryption disabled
    PASSWORD_TOO_SMALL:
        '¡La contraseña es un poco corta!<br>Utilice al menos <b>{MIN_PASS_LENGTH} caracteres.</b>', //That password is a little short!<br>Use at least <b>{MIN_PASS_LENGTH} characters.</b>
    PASSWORD_DOESNT_MATCH: '¡Tus contraseñas no coinciden!', //Your passwords don\'t match!
    NEW_PASSWORD_SUCCESS:
        '<b>¡Estás asegurado! 🔐</b><br>¡Buen trabajo, eres un PIVian precavido!', //<b>You\'re Secured! 🔐</b><br>Nice stuff, Armoured PIVian!
    INCORRECT_PASSWORD: '¡Contraseña incorrecta!', //Incorrect password!
    INVALID_AMOUNT: '<b>¡Cantidad no válida!</b><br>', //<b>Invalid amount!</b><br>
    TX_SENT: '¡Transacción enviada!', //Transaction sent!
    TX_FAILED: '¡Transacción fallida!', //Transaction Failed!
    QR_SCANNER_BAD_RECEIVER: 'no es un receptor de pago válido', //is not a valid payment receiver
    VALIDATE_AMOUNT_LOW:
        '¡La cantidad mínima es {minimum Amount} {coinTicker}!', //<br>Minimum amount is {minimumAmount} {coinTicker}!
    VALIDATE_AMOUNT_DECIMAL: '{coinDecimal} límite decimal excedido', //{coinDecimal} decimal limit exceeded
    SUCCESS_STAKING_ADDR:
        '<b>¡Dirección de Staking establecida!</b><br>¡Ahora puedes dejar de hacer stake!', //<b>Staking Address set!</b><br>Now go ahead and unstake!
    STAKE_ADDR_SET:
        '<b>¡Dirección de Cold Staking establecida!</b><br>El Staking futuro usarán esta dirección.', //<b>Cold Address set!</b><br>Future stakes will use this address.
    STAKE_ADDR_BAD: '¡Dirección de Cold Staking no válida!', //Invalid Cold Staking address!
    CONFIRM_UNSTAKE_H_WALLET:
        '<b>Confirma tu retiro de Staking</b><br>Confirma el TX en tu {strHardwareName}', //<b>Confirm your Unstake</b><br>Confirm the TX on your {strHardwareName}
    CONFIRM_TRANSACTION_H_WALLET:
        '<b>Confirma tu transacción</b><br>Confirma el TX en tu {strHardwareName}', //<b>Confirm your transaction</b><br>Confirm the TX on your {strHardwareName}
    SUCCESS_STAKING_ADDR_SET:
        '<b>¡Dirección de Staking establecida!</b><br>¡Ahora puedes hacer stake!', //<b>Staking Address set!</b><br>Now go ahead and stake!
    STAKE_NOT_SEND:
        '¡Aquí, usa la pantalla <b>Stake</b>, no la pantalla Enviar!', //Here, use the <b>Stake</b> screen, not the Send screen!
    BAD_ADDR_LENGTH:
        '<b>¡Dirección PIVX no válida!<b><br>Longitud incorrecta ({addressLength})', //<b>Invalid PIVX address!<b><br>Bad length ({addressLength})
    BAD_ADDR_PREFIX:
        '<b>¡Dirección PIVX no válida!<b><br>Prefijo {address} incorrecto (debe comenzar con {addressPrefix})', //<b>Invalid PIVX address!<b><br>Bad prefix {address} (Should start with {addressPrefix})
    SENT_NOTHING: "¡No puedes enviar 'cero'!", //You can\'t send \'nothing\'!
    MORE_THEN_8_DECIMALS: 'Se superó el límite de 8 decimales', //8 decimal limit exceeded
    SAVE_WALLET_PLEASE:
        '<b>¡Guarda su wallet!</b><br>Panel de control ➜ Asegura tu wallet', //<b>Save your wallet!</b><br>Dashboard ➜ Secure your wallet
    BACKUP_OR_ENCRYPT_WALLET:
        '¡Por favor ENCRIPTA y/o HAGA UNA COPIA DE SEGURIDAD de tus llaves antes de irte, o puedes perderlas!', //Please ENCRYPT and/or BACKUP your keys before leaving, or you may lose them!
    NO_CAMERAS: '¡Este dispositivo no tiene cámara!', //This device has no camera!
    STAKING_LEDGER_NO_SUPPORT: 'Ledger no es compatible con Cold Staking', //Ledger is not supported for Cold Staking
    CONNECTION_FAILED:
        '<b>¡Error al sincronizar!</b> Vuelve a intentarlo más tarde.<br>Puedes intentar volver a conectarte a través de los Ajustes.', //<b>Failed to synchronize!</b> Please try again later.<br>You can attempt re-connect via the Settings.
    MN_NOT_ENABLED: '¡Tu masternode aún no está habilitado!', //Your masternode is not enabled yet!
    VOTE_SUBMITTED: '¡Voto enviado!', //Vote submitted!
    VOTED_ALREADY: '¡Ya votaste por esta propuesta! Por favor espera 1 hora', //You already voted for this proposal! Please wait 1 hour
    VOTE_SIG_BAD:
        'No se pudo verificar la firma, verifica la llave privada de tu masternode', //Failed to verify signature, please check your masternode\'s private key
    MN_CREATED_WAIT_CONFS:
        '<b>¡Masternode creado!<b><br>Espere 15 confirmaciones para continuar', //<b>Masternode Created!<b><br>Wait 15 confirmations to proceed further
    MN_ACCESS_BEFORE_VOTE: '¡Accede a un masternode antes de votar!', //Access a masternode before voting!
    MN_OFFLINE_STARTING:
        'Tu masternode está fuera de línea, intentaremos iniciarlo', //Your masternode is offline, we will try to start it
    MN_STARTED: '<b>¡Masternode iniciado!</b>', //<b>Masternode started!</b>
    MN_RESTARTED: '<b>¡Masternode reiniciado!</b>', //<b>Masternode restarted!</b>
    MN_STARTED_ONLINE_SOON:
        '<b>¡Masternode iniciado!</b><br>Estará en línea muy pronto', //<b>Masternode started!</b><br>It\'ll be online soon
    MN_START_FAILED: '<b>¡El inicio del Masternode ha fallado!</b>', //<b>Masternode started!</b>
    MN_RESTART_FAILED: '<b>¡El reiniciado del Masternode ha fallado!</b>', //<b>Masternode restarted!</b>
    MN_DESTROYED:
        '<b>¡Masternode destruido!</b><br>Tus monedas ahora se pueden gastar.', //<b>Masternode destroyed!</b><br>Your coins are now spendable.
    MN_STATUS_IS: 'El estado de tu masternode es', //Your masternode status is
    MN_STATE: 'Tu masternode está <b>{state}</b>', //Your masternode is in <b>{state}</b> state
    MN_BAD_IP: '¡La dirección IP no es válida!', //The IP address is invalid!
    MN_NOT_ENOUGH_COLLAT:
        '¡Necesitas <b>{amount} más {ticker}</b> para crear un Masternode!', //You need <b>{amount} more {ticker}</b> to create a Masternode!
    MN_ENOUGH_BUT_NO_COLLAT:
        'Tienes suficiente saldo para un Masternode, pero no tienes una garantía UTXO válida de {amount} {ticker}', //You have enough balance for a Masternode, but no valid collateral UTXO of {amount} {ticker}
    MN_COLLAT_NOT_SUITABLE: 'Este no es un UTXO adecuado para un Masternode', //This is not a suitable UTXO for a Masternode
    MN_CANT_CONNECT: '¡No se puede conectar al nodo RPC!', //Unable to connect to RPC node!

    /* Contacts System Alerts */
    CONTACTS_ENCRYPT_FIRST:
        '¡Debes presionar "{button}" antes de poder usar Contactos!', //You need to hit "{button}" before you can use Contacts!
    CONTACTS_NAME_REQUIRED: '¡Se requiere un nombre!', //A name is required!
    CONTACTS_NAME_TOO_LONG: '¡El nombre es demasiado largo!', //That name is too long!
    CONTACTS_CANNOT_ADD_YOURSELF:
        '¡No puedes agregarte a ti mismo como contacto!', //You cannot add yourself as a Contact!
    CONTACTS_ALREADY_EXISTS:
        '<b>¡El contacto ya existe!</b><br>Ya haz guardado este contacto', //<b>Contact already exists!</b><br>You already saved this contact
    CONTACTS_NAME_ALREADY_EXISTS:
        '<b>¡El nombre del contacto ya existe!</b><br>Esto podría ser un intento de phishing, ¡cuidado!', //<b>Contact name already exists!</b><br>This could potentially be a phishing attempt, beware!
    CONTACTS_EDIT_NAME_ALREADY_EXISTS:
        '<b>¡El contacto ya existe!</b><br>¡Un contacto ya se llama "{strNewName}"!', //<b>Contact already exists!</b><br>A contact is already called "{strNewName}"!
    CONTACTS_KEY_ALREADY_EXISTS:
        '<b>¡El contacto ya existe, pero con un nombre diferente!</b><br>Tienes {newName} guardado como <b>{oldName}</b> en tus contactos', //<b>Contact already exists, but under a different name!</b><br>You have {newName} saved as <b>{oldName}</b> in your contacts
    CONTACTS_NOT_A_CONTACT_QR: '¡Este no es un QR de contacto!', //This isn\'t a Contact QR!
    CONTACTS_ADDED:
        '<b>¡Nuevo contacto añadido!</b><br>Se ha añadido {strName}, ¡bravo!', //<b>New Contact added!</b><br>{strName} has been added, hurray!
    CONTACTS_YOU_HAVE_NONE: '¡No tienes contactos!', //You have no contacts!

    SWITCHED_EXPLORERS:
        '<b>¡El Explorador a cambiado!</b><br>Ahora se usa {explorerName}', //<b>Switched explorer!</b><br>Now using {explorerName}
    SWITCHED_NODE: '<b>¡El Nodo a cambiado!</b><br>Ahora se usa {nodo}', //<b>Switched node!</b><br>Now using {node}
    SWITCHED_ANALYTICS:
        '<b>¡El Nivel de análisis a cambiado!</b><br>Ahora se usa {level}', //<b>Switched analytics level!</b><br>Now {level}
    SWITCHED_SYNC:
        '<b>¡El Modo de sincronización a cambiado!</b><br>Ahora se usa la sincronización {sync}', //<b>Switched sync mode!</b><br>Now using {sync} sync
    UNABLE_SWITCH_TESTNET:
        '<b>¡No se puede cambiar a modo Testnet!</b><br>Ya hay una wallet cargada', //<b>Unable to switch Testnet Mode!</b><br>A wallet is already loaded

    WALLET_OFFLINE_AUTOMATIC:
        '<b>¡El modo sin conexión está activo!</b><br>Desactiva el modo sin conexión para transacciones automáticas', //<b>Offline Mode is active!</b><br>Please disable Offline Mode for automatic transactions
    WALLET_UNLOCK_IMPORT:
        '¡Por favor {unlock} tu wallet antes de enviar transacciones!', //Please {unlock} your wallet before sending transactions!
    WALLET_FIREFOX_UNSUPPORTED:
        '<b>¡Firefox no admite esto!</b><br>Desafortunadamente, Firefox no admite wallets de hardware', //<b>Firefox doesn't support this!</b><br>Unfortunately, Firefox does not support hardware wallets
    WALLET_HARDWARE_WALLET:
        '<b>¡Listo para la wallet de hardware!</b><br>Manten tu {hardwareWallet} conectada, desbloqueada y en la aplicación PIVX.', //<b>Hardware wallet ready!</b><br>Please keep your {hardwareWallet} plugged in, unlocked, and in the PIVX app
    WALLET_CONFIRM_L: 'Confirma la importación en tu Ledger', //Confirm the import on your Ledger
    WALLET_NO_HARDWARE:
        '<b>No hay ningún dispositivo disponible</b><br>No se pudo encontrar una wallet de hardware; ¡Conéctala y desbloquéala!', //<b>No device available</b><br>Couldn't find a hardware wallet; please plug it in and unlock!
    WALLET_HARDWARE_CONNECTION_LOST:
        '<b>Se perdió la conexión con {hardwareWallet} </b><br>Parece que {hardwareWalletProductionName} se desconectó en mitad de la operación, ¡ups!', //<b>Lost connection to {hardwareWallet} </b><br>It seems the {hardwareWalletProductionName} was unplugged mid-operation, oops!
    WALLET_HARDWARE_BUSY:
        '<b>{hardwareWallet} está esperando</b><br>Desbloquea tu {hardwareWalletProductionName} o finaliza este mensaje', //<b>{hardwareWallet} is waiting</b><br>Please unlock your {hardwareWalletProductionName} or finish it's current prompt
    WALLET_HARDWARE_ERROR: '<b> {hardwareWallet} </b><br> {error}', //<b> {hardwareWallet} </b><br> {error}

    CONFIRM_POPUP_VOTE: 'Confirmar Voto', //Confirm Vote
    CONFIRM_POPUP_VOTE_HTML:
        '¿Está seguro? Se necesitan 60 minutos para cambiar el voto.', //Are you sure? It takes 60 minutes to change vote
    CONFIRM_POPUP_TRANSACTION: 'Confirma tu transacción', //Confirm your transaction
    CONFIRM_POPUP_MN_P_KEY: 'Tu llave privada de Masternode', //Your Masternode Private Key
    CONFIRM_POPUP_MN_P_KEY_HTML:
        '<br>Guarda esta llave privada y cópiala en la configuración de tu VPS<br>', //<br> Save this private key and copy it to your VPS config <br>
    CONFIRM_POPUP_VERIFY_ADDR: 'Verifica tu direccion', //Verify your address

    MIGRATION_MASTERNODE_FAILURE:
        'No se pudo recuperar tu masternode. Por favor vuelve a importarlo.', //Failed to recover your masternode. Please reimport it.
    MIGRATION_ACCOUNT_FAILURE:
        'No se pudo recuperar tu cuenta. Por favor vuelva a importarlo.', //Failed to recover your account. Please reimport it.
    APP_INSTALLED: '¡Aplicación instalada!', //App Installed!
};
