import 'bootstrap/dist/css/bootstrap.min.css';
import '@fontsource/chivo/900.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import '../assets/style/style.css';
import 'bootstrap';

// Import all montserrat font weights
/* eslint-disable */
require.context('@fontsource/montserrat/', false, /\.css$/);

import { start } from './global.js';
import { getNetwork } from './network.js';

window.onload = start;

// Export global functions to the MPW namespace so we can use them in html
export {
    openTab,
    accessOrImportWallet,
    guiImportWallet,
    guiSetColdStakingAddress,
    onPrivateKeyChanged,
    toClipboard,
    toggleExportUI,
    wipePrivateData,
    restoreWallet,
    refreshChainData,
    playMusic,
    selectMaxBalance,
    openExplorer,
    guiEncryptWallet,
    guiPreparePayment,
    openSendQRScanner,
    doms,
    generateVanityWallet,
    importMasternode,
    destroyMasternode,
    startMasternode,
    checkVanity,
    toggleDropDown,
    unblurPrivKey,
    toggleBottomMenu,
    createProposal,
    switchSettings,
    updateActivityGUI,
    govVote,
} from './global.js';
export { generateWallet, getNewAddress, importWallet } from './wallet.js';
export { toggleTestnet, toggleDebug, toggleAutoSwitch } from './settings.js';
export {
    createTxGUI,
    undelegateGUI,
    delegateGUI,
    createMasternode,
} from './transactions.js';
export {
    promoConfirm,
    setPromoMode,
    sweepPromoCode,
    deletePromoCode,
    openPromoQRScanner,
    promosToCSV,
} from './promos';
export { renderWalletBreakdown } from './charting';
export { hexToBytes, bytesToHex, dSHA256 } from './utils.js';

import Masternode from './masternode.js';
export { renderChangelog } from './changelog';
export { Masternode };

export { getNetwork } from './network.js';
const toggleNetwork = () => getNetwork().toggle();
export { toggleNetwork };

export { FlipDown } from './flipdown.js';
