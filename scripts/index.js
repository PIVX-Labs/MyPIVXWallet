import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

import '@fortawesome/fontawesome-free/css/all.css';

import '../assets/style/style.css';
import { start, openTab, accessOrImportWallet, guiImportWallet, onPrivateKeyChanged } from './global.js';
import { generateWallet } from "./wallet.js";

window.onload = start;
export { openTab, generateWallet, accessOrImportWallet, guiImportWallet, onPrivateKeyChanged };
