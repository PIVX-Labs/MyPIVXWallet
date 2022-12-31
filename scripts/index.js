import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

import '@fortawesome/fontawesome-free/css/all.css';

import { start } from './global.js';
window.onload = start;

import '../assets/style/style.css';

// Export global functions to the MPW namespace so we can use them in html
export { openTab, accessOrImportWallet, guiImportWallet, onPrivateKeyChanged, toClipboard, toggleExportUI, wipePrivateData, restoreWallet, refreshChainData, doms } from './global.js';
export { generateWallet, getNewAddress } from "./wallet.js";
export { toggleTestnet, toggleDebug }  from "./settings.js";
export { createTxGUI, createRawTransaction, undelegateGUI, delegateGUI, createMasternode } from "./transactions.js";
export { hexToBytes, bytesToHex, dSHA256 } from "./utils.js";
