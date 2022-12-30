import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

import "fontawesome";
import '../assets/style/style.css';
import { start, openTab, accessOrImportWallet, guiImportWallet } from './global.js';
import { generateWallet } from "./wallet.js";

window.onload = start;
export { openTab, generateWallet, accessOrImportWallet, guiImportWallet };
