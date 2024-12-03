import 'bootstrap/dist/css/bootstrap.min.css';
import '@fontsource/chivo/900.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import '../assets/style/style.css';
import 'bootstrap';

// Import all montserrat font weights
import.meta.webpackContext('@fontsource/montserrat/', {
    recursive: false,
    regExp: /\.css$/,
});
import './global.js';

// Export global functions to the MPW namespace so we can use them in html
export {
    openTab,
    accessOrImportWallet,
    toClipboard,
    restoreWallet,
    playMusic,
    doms,
    switchSettings,
} from './global.js';
export { wallet, getNewAddress } from './wallet.js';
export {
    logOut,
    toggleTestnet,
    toggleDebug,
    toggleAutoSwitch,
    toggleAdvancedMode,
    toggleAutoLockWallet,
    changePassword,
} from './settings.js';
export {
    promoConfirm,
    setPromoMode,
    sweepPromoCode,
    deletePromoCode,
    openPromoQRScanner,
    promosToCSV,
} from './promos.js';
export {
    guiRenderContacts,
    guiAddContact,
    guiRemoveContact,
    guiSelectContact,
    guiToggleReceiveType,
    guiSetAccountName,
    guiCheckRecipientInput,
    guiRenderCurrentReceiveModal,
    guiAddContactQRPrompt,
    guiEditContactNamePrompt,
    guiAddContactImage,
    localContactToClipboard,
} from './contacts-book.js';
export { renderWalletBreakdown } from './charting.js';
export { hexToBytes, bytesToHex, dSHA256 } from './utils.js';

import Masternode from './masternode.js';
export { renderChangelog } from './changelog.js';
export { Masternode };

export { getNetwork } from './network/network_manager.js';

export { FlipDown } from './flipdown.js';
