var MPW;(()=>{var e,t,r,n,a={56691:(e,t,r)=>{"use strict";var n=r(48764),a=r(17748);function o(e){return n.Buffer.from(e).toString("hex")}var s=r(27760),i=r(72697);r(2153);const c=10**8,l={current:null,main:{name:"mainnet",collateralInSats:1e12,isTestnet:!1,TICKER:"PIV",PUBKEY_PREFIX:["D"],STAKING_PREFIX:"S",PUBKEY_ADDRESS:30,SECRET_KEY:212,BIP44_TYPE:119,BIP44_TYPE_LEDGER:77,PROTOCOL_VERSION:70926,MASTERNODE_PORT:51472,Explorers:[{name:"rockdev",url:"https://explorer.rockdev.org"},{name:"zkBitcoin",url:"https://zkbitcoin.com"},{name:"Duddino",url:"https://explorer.duddino.com"}],Nodes:[{name:"Duddino",url:"https://rpc.duddino.com/mainnet"}],Consensus:{UPGRADE_V6_0:void 0},budgetCycleBlocks:43200,proposalFee:5e9,maxPaymentCycles:6,maxPayment:432e11},testnet:{name:"testnet",collateralInSats:1e12,isTestnet:!0,TICKER:"tPIV",PUBKEY_PREFIX:["x","y"],STAKING_PREFIX:"W",PUBKEY_ADDRESS:139,SECRET_KEY:239,BIP44_TYPE:1,BIP44_TYPE_LEDGER:1,PROTOCOL_VERSION:70926,MASTERNODE_PORT:51474,Explorers:[{name:"rockdev",url:"https://testnet.rockdev.org"}],Nodes:[{name:"Duddino",url:"https://rpc.duddino.com/testnet"}],Consensus:{UPGRADE_V6_0:void 0},budgetCycleBlocks:144,proposalFee:5e9,maxPaymentCycles:20,maxPayment:144e9}};l.current=l.main,r(26269);var u=r(25108);class d{cData={};strName="";strEndpoint="";async ensureCacheExists(){this.cData&&Object.keys(this.cData).length||await this.fetch()}async fetch(){try{return this.cData=await(await fetch(this.strEndpoint)).json()}catch(e){return u.warn("CoinGecko: Failed to fetch prices!"),u.warn(e),null}}}let p="usd",h=new class extends d{constructor(){super(),this.strName="CoinGecko",this.strEndpoint="https://api.coingecko.com/api/v3/coins/pivx?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false"}async getPrice(e){return await this.ensureCacheExists(),this.cData?.market_data?.current_price[e]||0}async getCurrencies(){return await this.ensureCacheExists(),null==(e=this.cData)||""===e||Array.isArray(e)&&0===e.length||"object"==typeof e&&0===Object.keys(e).length?[]:Object.keys(this.cData.market_data.current_price);var e}},m=(l.current.Explorers[0],l.current.Nodes[0],2),E={hit:"A ping indicating an app load, no unique data is sent.",time_to_sync:"The time in seconds it took for MPW to last synchronise.",transaction:"A ping indicating a Tx, no unique data is sent, but may be inferred from on-chain time."};Object.keys(E);r(91555);Object.freeze({0:0,FALSE:0,PUSHDATA1:76,PUSHDATA2:77,PUSHDATA4:78,"1NEGATE":79,RESERVED:80,1:81,TRUE:81,2:82,3:83,4:84,5:85,6:86,7:87,8:88,9:89,10:90,11:91,12:92,13:93,14:94,15:95,16:96,NOP:97,VER:98,IF:99,NOTIF:100,VERIF:101,VERNOTIF:102,ELSE:103,ENDIF:104,VERIFY:105,RETURN:106,TOALTSTACK:107,FROMALTSTACK:108,"2DROP":109,"2DUP":110,"3DUP":111,"2OVER":112,"2ROT":113,"2SWAP":114,IFDUP:115,DEPTH:116,DROP:117,DUP:118,NIP:119,OVER:120,PICK:121,ROLL:122,ROT:123,SWAP:124,TUCK:125,CAT:126,SUBSTR:127,LEFT:128,RIGHT:129,SIZE:130,INVERT:131,AND:132,OR:133,XOR:134,EQUAL:135,EQUALVERIFY:136,RESERVED1:137,RESERVED2:138,"1ADD":139,"1SUB":140,"2MUL":141,"2DIV":142,NEGATE:143,ABS:144,NOT:145,"0NOTEQUAL":146,ADD:147,SUB:148,MUL:149,DIV:150,MOD:151,LSHIFT:152,RSHIFT:153,BOOLAND:154,BOOLOR:155,NUMEQUAL:156,NUMEQUALVERIFY:157,NUMNOTEQUAL:158,LESSTHAN:159,GREATERTHAN:160,LESSTHANOREQUAL:161,GREATERTHANOREQUAL:162,MIN:163,MAX:164,WITHIN:165,RIPEMD160:166,SHA1:167,SHA256:168,HASH160:169,HASH256:170,CODESEPARATOR:171,CHECKSIG:172,CHECKSIGVERIFY:173,CHECKMULTISIG:174,CHECKMULTISIGVERIFY:175,NOP1:176,NOP2:177,CHECKLOCKTIMEVERIFY:177,NOP3:178,NOP4:179,NOP5:180,NOP6:181,NOP7:182,NOP8:183,NOP9:184,NOP10:185,ZEROCOINMINT:193,ZEROCOINSPEND:194,ZEROCOINPUBLICSPEND:195,CHECKCOLDSTAKEVERIFY_LOF:209,CHECKCOLDSTAKEVERIFY:210,INVALIDOPCODE:255});var y=r(77191),T=r.n(y);r(60743),r(25108),r(3006),r(51409),r(25108),r(19755);r(25108);class f{static version=null;#e;constructor({db:e}){this.#e=e}close(){this.#e.close(),this.#e=null}async addMasternode(e,t){const r=this.#e.transaction("masternodes","readwrite").objectStore("masternodes");await r.put(e,"masternode")}async removeMasternode(e){const t=this.#e.transaction("masternodes","readwrite").objectStore("masternodes");await t.delete("masternode")}async addPromo(e){const t=this.#e.transaction("promos","readwrite").objectStore("promos");await t.put(e,e.code)}async removePromo(e){const t=this.#e.transaction("promos","readwrite").objectStore("promos");await t.delete(e)}async addAccount(e){if(!(e instanceof Account))return database_console.error("---- addAccount() called with invalid input, input dump below ----"),database_console.error(e),database_console.error("---- end of account dump ----"),createAlert("warning","<b>Account Creation Error</b><br>Logs were dumped in your Browser Console<br>Please submit these privately to PIVX Labs Developers!"),!1;const t=new Account;for(const r of Object.keys(t))isSameType(e[r],t[r])?t[r]=e[r]:database_console.error('DB: addAccount() key "'+r+'" does NOT match the correct class type, likely data mismatch, please report!');const r=this.#e.transaction("accounts","readwrite").objectStore("accounts");if(await r.get("account"))return database_console.error("DB: Ran addAccount() when account already exists!");await r.put(t,"account")}async updateAccount(e,t=!1){if(!(e instanceof Account))return database_console.error("---- updateAccount() called with invalid input, input dump below ----"),database_console.error(e),database_console.error("---- end of account dump ----"),createAlert("warning","<b>DB Update Error</b><br>Your wallet is safe, logs were dumped in your Browser Console<br>Please submit these privately to PIVX Labs Developers!"),!1;const r=await this.getAccount();if(!r)return database_console.error("---- updateAccount() called without an account existing, input dump below ----"),database_console.error(e),database_console.error("---- end of input dump ----"),createAlert("warning","<b>DB Update Error</b><br>Logs were dumped in your Browser Console<br>Please submit these privately to PIVX Labs Developers!"),!1;for(const n of Object.keys(r))isSameType(e[n],r[n])?!t&&isEmpty(e[n])||(r[n]=e[n]):database_console.error('DB: updateAccount() key "'+n+'" does NOT match the correct class type, likely data mismatch, please report!');const n=this.#e.transaction("accounts","readwrite").objectStore("accounts");await n.put(r,"account")}async removeAccount({publicKey:e}){const t=this.#e.transaction("accounts","readwrite").objectStore("accounts");await t.delete("account")}async getAccount(){const e=this.#e.transaction("accounts","readonly").objectStore("accounts"),t=await e.get("account");if(!t)return null;const r=new Account;for(const e of Object.keys(r))isSameType(t[e],r[e])?r[e]=t[e]:database_console.error('DB: getAccount() key "'+e+'" does NOT match the correct class type, likely bad data saved, please report!');return r}async getMasternode(e){const t=this.#e.transaction("masternodes","readonly").objectStore("masternodes");return new Masternode(await t.get("masternode"))}async getAllPromos(){const e=this.#e.transaction("promos","readonly").objectStore("promos");return(await e.getAll()).map((e=>new PromoWallet(e)))}async getSettings(){const e=this.#e.transaction("settings","readonly").objectStore("settings");return new Settings(await e.get("settings"))}async setSettings(e){const t=await this.getSettings(),r=this.#e.transaction("settings","readwrite").objectStore("settings");await r.put({...t,...e},"settings")}async#t(){if(0===localStorage.length)return;const e=new Settings({analytics:localStorage.analytics,explorer:localStorage.explorer,node:localStorage.node,translation:localStorage.translation,displayCurrency:localStorage.displayCurrency});if(await this.setSettings(e),localStorage.masternode)try{const e=JSON.parse(localStorage.masternode);await this.addMasternode(e)}catch(e){database_console.error(e),createAlert("warning",ALERTS.MIGRATION_MASTERNODE_FAILURE)}if(localStorage.encwif||localStorage.publicKey)try{const e=JSON.parse(localStorage.localProposals||"[]"),t=new Account({publicKey:localStorage.publicKey,encWif:localStorage.encwif,localProposals:e});await this.addAccount(t)}catch(e){database_console.error(e),createAlert("warning",ALERTS.MIGRATION_ACCOUNT_FAILURE),localStorage.encwif&&await confirmPopup({title:translation.MIGRATION_ACCOUNT_FAILURE_TITLE,html:`${translation.MIGRATION_ACCOUNT_FAILURE_HTML} <code id="exportPrivateKeyText">${sanitizeHTML(localStorage.encwif)} </code>`})}}static async create(e){const t=new f({db:null}),r=await openDB(`MPW-${e}`,2,{upgrade:(e,t)=>{database_console.log("DB: Upgrading from "+t+" to 2"),0==t&&(e.createObjectStore("masternodes"),e.createObjectStore("accounts"),e.createObjectStore("settings")),t<=1&&e.createObjectStore("promos")},blocking:()=>{t.close(),alert("New update received!"),window.location.reload()}});return t.#e=r,t}static#r=new Map;static async getInstance(){const e=cChainParams.current.name,t=this.#r.get(e);return t&&t.#e||this.#r.set(e,await f.create(e)),this.#r.get(e)}}r(25108);let g={};function O(e=32){return crypto.getRandomValues(new Uint8Array(e))}function b(e,t,r){const n=e.length;if(n-r-t.length<0){const e="CRITICAL: Overflow detected ("+(n-r-t.length)+"), possible state corruption, backup and refresh advised.";throw S("warning",e,5e3),Error(e)}let a=0;for(;r<n;)e[r++]=t[a++]}function S(e,t,r=0){const n=document.createElement("div");let a;switch(n.classList.add("notifyWrapper"),n.classList.add(e),setTimeout((()=>{n.style.opacity="1",n.style.zIndex="999999",n.classList.add("bounce-ani"),n.classList.add("bounce")}),100),e){case"warning":a="fa-exclamation";break;case"info":a="fa-info";break;default:a="fa-check"}n.innerHTML=`\n    <div class="notifyIcon notify-${e}">\n        <i class="fas ${a} fa-xl"></i>\n    </div>\n    <div class="notifyText">\n        ${t}\n    </div>`,n.destroy=()=>{clearTimeout(n.timer),n.style.opacity="0",setTimeout((()=>{n.remove()}),600)},n.addEventListener("click",n.destroy),r>0&&(n.timer=setTimeout(n.destroy,r)),U.domAlertPos.appendChild(n)}function v(e,t=""){if("number"==typeof e&&(e=e.toString()),!e.includes("."))return e;const r=e.split("."),n=t?"font-size: "+t:"";return`${r[0]}<span style="opacity: 0.55; ${n}">.${r[1]}</span>`}r(96192),r(27715),r(19755);const w=new(r(17187).EventEmitter);r(25108);var A=r(25108);class R{constructor({id:e,path:t,sats:r,script:n,vin:a=[],vout:o,height:s,status:i,isDelegate:c=!1,isReward:l=!1}={}){this.id=e,this.path=t,this.sats=r,this.script=n,this.vin=a,this.vout=o,this.height=s,this.status=i,this.isDelegate=c,this.isReward=l}equalsUTXO(e){return this.id===e.id&&this.vout===e.vout&&this.status===e.status}}class P{constructor(){this.UTXOs=[],this.subscribeToNetwork()}static CONFIRMED=0;static REMOVED=1;static PENDING=2;getUTXO(e,t){return this.UTXOs.find((r=>r.id===e&&r.vout===t))}async removeWithDelay(e,t){var r;await(r=60*e*1e3,new Promise(((e,t)=>setTimeout(e,r)))),this.removeUTXO(t)}isAlreadyStored({id:e,vout:t,status:r}){return this.UTXOs.some((n=>n.id===e&&n.vout===t&&(!r||n.status===r)))}getUTXOsByState(e){return this.UTXOs.filter((t=>t.status===e))}removeFromState(e,t){const r=this.getUTXOsByState(t);for(const t of r)if(t.id===e.id&&t.vout===e.vout){this.removeUTXO(t);break}}addUTXO({id:e,path:t,sats:r,script:n,vin:a,vout:o,height:s,status:i,isDelegate:c,isReward:l}){const u=new R({id:e,path:t,sats:r,script:n,vin:a,vout:o,height:s,status:i,isDelegate:c,isReward:l});if(this.isAlreadyStored({id:e,vout:o}))this.updateUTXO({id:e,vout:o});else{if(l&&1===a?.length){const e=this.getUTXO(a[0].txid,a[0].vout);e&&this.removeUTXO(e)}this.UTXOs.push(u)}N(!0),_(!0)}updateUTXO({id:e,vout:t}){const r=this.UTXOs.find((r=>r.id===e&&r.vout==t));r.status===P.PENDING&&(r.status=P.CONFIRMED),N(!0),_(!0)}removeUTXO(e){this.UTXOs=this.UTXOs.filter((t=>!t.equalsUTXO(e)))}autoRemoveUTXO({id:e,vout:t}){for(const r of this.UTXOs)if(r.id===e&&r.vout===t)return r.status=P.REMOVED,void this.removeWithDelay(12,r);A.error("Mempool: Failed to find UTXO "+e+" ("+t+") for auto-removal!")}autoRemoveUTXOs(e){for(const t of e)for(const e of this.UTXOs)if(e.equalsUTXO(t)){e.status=P.REMOVED,this.removeWithDelay(12,e);break}}getConfirmed(){return this.getUTXOsByState(P.CONFIRMED)}getStandardUTXOs(){return this.UTXOs.filter((e=>e.status!==P.REMOVED&&!e.isDelegate))}getDelegatedUTXOs(){return this.UTXOs.filter((e=>e.status!==P.REMOVED&&e.isDelegate))}getBalance(){return this.getStandardUTXOs().filter((e=>!function(e,t){if(t?.collateralTxId){const{collateralTxId:r,outidx:n}=t;return r===e.id&&e.vout===n}return!1}(e))).reduce(((e,t)=>e+t.sats),0)}static isValidUTXO(e){return!e.isReward||null.cachedBlockCount-e.height>100}getDelegatedBalance(){return this.getDelegatedUTXOs().reduce(((e,t)=>e+t.sats),0)}subscribeToNetwork(){w.on("utxo",(async e=>{for(const t of e)this.isAlreadyStored({id:t.txid,vout:t.vout})?this.updateUTXO({id:t.txid,vout:t.vout}):this.addUTXO(await null.getUTXOFullInfo(t))}))}}r(9424),r(25108),new TextEncoder,new TextDecoder,r(19755),r(25108);let U={};const I=new P;function D(){U.domGuiBalanceValueCurrency.innerText=p.toUpperCase(),U.domGuiStakingValueCurrency.innerText=p.toUpperCase(),U.domSendAmountValueCurrency.innerText=p.toUpperCase(),U.domSendAmountCoinsTicker.innerText=l.current.TICKER,U.domStakeAmountValueCurrency.innerText=p.toUpperCase(),U.domStakeAmountCoinsTicker.innerText=l.current.TICKER,U.domUnstakeAmountValueCurrency.innerText=p.toUpperCase(),U.domUnstakeAmountCoinsTicker.innerText=l.current.TICKER}async function C(e,t=!1){const r=await h.getPrice(p);if(r){const n=(t?_():N())/c*r,{nValue:a,cLocale:o}=function(e){let t=e;const r=Intl.supportedValuesOf("currency").includes(p.toUpperCase())?{style:"currency",currency:p,currencyDisplay:"narrowSymbol"}:{maximumFractionDigits:8,minimumFractionDigits:8};return{nValue:t,cLocale:r}}(n);e.innerText=a.toLocaleString("en-gb",o)}}function N(e=!1){const t=I.getBalance();if(e){const e=(t/c).toFixed(m),r=e.length;U.domGuiBalance.innerHTML=v(e,r>=10?"17px":"25px"),U.domAvailToDelegate.innerHTML=v(e)+" "+l.current.TICKER,D(),C(U.domGuiBalanceValue)}return t}function _(e=!1){const t=I.getDelegatedBalance();if(e){const e=(t/c).toFixed(m),r=e.length;U.domGuiBalanceStaking.innerHTML=v(e,r>=10?"17px":"25px"),U.domAvailToUndelegate.innerHTML=v(e)+" "+l.current.TICKER,D(),C(U.domGuiStakingValue,!0)}return t}function L(e){const t=`${g.unhandledException} <br> ${function(e){const t=document.createElement("div");return t.innerText=e,t.innerHTML}(e.message||e.reason)}`;try{S("warning",t)}catch(e){alert(t)}}l.current.isTestnet;try{window.addEventListener("error",L),window.addEventListener("unhandledrejection",L)}catch(e){}function x({pkBytes:e,publicKey:t,output:r="ENCODED"}){if(!e&&!t)return null;const c="UNCOMPRESSED_HEX"!==r;let u=t?(d=t,n.Buffer.from(d,"hex")):s.$3(e,c);var d;if("UNCOMPRESSED_HEX"===r){if(65!==u.length)throw new Error("Can't uncompress an already compressed key");return o(u)}if(65===u.length&&(u=function(e){if(65!=e.length)throw new Error("Attempting to compress an invalid uncompressed key");const t=e.slice(1,33);return[e.slice(33)[31]%2==0?2:3,...t]}(u)),33!=u.length)throw new Error("Invalid public key");if("COMPRESSED_HEX"===r)return o(u);const p=(0,a.J)(new Uint8Array(u)),h=(0,i.b)(p),m=new Uint8Array(21);var E;m[0]=l.current.PUBKEY_ADDRESS,b(m,h,1);const y=(E=m,(0,a.J)((0,a.J)(new Uint8Array(E)))).slice(0,4),f=new Uint8Array(25);return b(f,m,0),b(f,y,21),T().encode(f)}r(49840),r(2099),r(27578),r(34611),r(19755),r(25108),new Map([[25870,"Open the PIVX app on your device"],[25873,"Open the PIVX app on your device"],[57408,"Navigate to the PIVX app on your device"],[27157,"Wrong app! Open the PIVX app on your device"],[27266,"Wrong app! Open the PIVX app on your device"],[27904,"Wrong app! Open the PIVX app on your device"],[27010,"Unlock your Ledger, then try again!"],[27404,"Unlock your Ledger, then try again!"]]),onmessage=function(e){for(;;){const e={};e.priv=O(),e.pub=x({pkBytes:e.priv}),postMessage(e)}}},95856:()=>{},48777:()=>{},46601:()=>{},89214:()=>{},52361:()=>{},94616:()=>{}},o={};function s(e){var t=o[e];if(void 0!==t)return t.exports;var r=o[e]={id:e,loaded:!1,exports:{}};return a[e].call(r.exports,r,r.exports,s),r.loaded=!0,r.exports}s.m=a,s.x=()=>{var e=s.O(void 0,[621,369],(()=>s(56691)));return s.O(e)},e=[],s.O=(t,r,n,a)=>{if(!r){var o=1/0;for(u=0;u<e.length;u++){for(var[r,n,a]=e[u],i=!0,c=0;c<r.length;c++)(!1&a||o>=a)&&Object.keys(s.O).every((e=>s.O[e](r[c])))?r.splice(c--,1):(i=!1,a<o&&(o=a));if(i){e.splice(u--,1);var l=n();void 0!==l&&(t=l)}}return t}a=a||0;for(var u=e.length;u>0&&e[u-1][2]>a;u--)e[u]=e[u-1];e[u]=[r,n,a]},s.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return s.d(t,{a:t}),t},r=Object.getPrototypeOf?e=>Object.getPrototypeOf(e):e=>e.__proto__,s.t=function(e,n){if(1&n&&(e=this(e)),8&n)return e;if("object"==typeof e&&e){if(4&n&&e.__esModule)return e;if(16&n&&"function"==typeof e.then)return e}var a=Object.create(null);s.r(a);var o={};t=t||[null,r({}),r([]),r(r)];for(var i=2&n&&e;"object"==typeof i&&!~t.indexOf(i);i=r(i))Object.getOwnPropertyNames(i).forEach((t=>o[t]=()=>e[t]));return o.default=()=>e,s.d(a,o),a},s.d=(e,t)=>{for(var r in t)s.o(t,r)&&!s.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},s.f={},s.e=e=>Promise.all(Object.keys(s.f).reduce(((t,r)=>(s.f[r](e,t),t)),[])),s.u=e=>"./"+e+".mpw.js",s.miniCssF=e=>{},s.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}(),s.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),s.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},s.nmd=e=>(e.paths=[],e.children||(e.children=[]),e),(()=>{var e;s.g.importScripts&&(e=s.g.location+"");var t=s.g.document;if(!e&&t&&(t.currentScript&&(e=t.currentScript.src),!e)){var r=t.getElementsByTagName("script");r.length&&(e=r[r.length-1].src)}if(!e)throw new Error("Automatic publicPath is not supported in this browser");e=e.replace(/#.*$/,"").replace(/\?.*$/,"").replace(/\/[^\/]+$/,"/"),s.p=e})(),(()=>{s.b=self.location+"";var e={56:1};s.f.i=(t,r)=>{e[t]||importScripts(s.p+s.u(t))};var t=self.webpackChunkMPW=self.webpackChunkMPW||[],r=t.push.bind(t);t.push=t=>{var[n,a,o]=t;for(var i in a)s.o(a,i)&&(s.m[i]=a[i]);for(o&&o(s);n.length;)e[n.pop()]=1;r(t)}})(),n=s.x,s.x=()=>Promise.all([s.e(621),s.e(369)]).then(n);var i=s.x();MPW=i})();
//# sourceMappingURL=56.mpw.js.map