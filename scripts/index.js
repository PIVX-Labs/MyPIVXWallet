import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import '../assets/style/style.css';

import 'bootstrap';
import { start } from './global.js';
import { getNetwork } from './network.js';

window.onload = start;

// Export global functions to the MPW namespace so we can use them in html
export {
    openTab,
    accessOrImportWallet,
    guiImportWallet,
    onPrivateKeyChanged,
    toClipboard,
    toggleExportUI,
    wipePrivateData,
    restoreWallet,
    refreshChainData,
    playMusic,
    selectMaxBalance,
    guiEncryptWallet,
    guiPreparePayment,
    doms,
    generateVanityWallet,
    importMasternode,
    destroyMasternode,
    startMasternode,
    checkVanity,
    toggleDropDown,
    unblurPrivKey,
    toggleBottomMenu,
    updateStakingRewardsGUI,
} from './global.js';
export { generateWallet, getNewAddress, importWallet } from './wallet.js';
export { toggleTestnet, toggleDebug } from './settings.js';
export {
    createTxGUI,
    createRawTransaction,
    undelegateGUI,
    delegateGUI,
    createMasternode,
} from './transactions.js';
export { hexToBytes, bytesToHex, dSHA256 } from './utils.js';
export { getNetwork } from './network.js';
const toggleNetwork = () => getNetwork().toggle();
export { toggleNetwork };
