var MPW;(()=>{var e,r,t={46601:()=>{},89214:()=>{},52361:()=>{},94616:()=>{},8651:(e,r,t)=>{"use strict";var o=t(14498);onmessage=async function(e){const r=new o.Fn(e.data);r.progressEmitter.on("deriveProgress",(e=>{postMessage({type:"progress",res:e})}));const t=await r.derivePrivateKey();postMessage({type:"key",res:t})}}},o={};function s(e){var r=o[e];if(void 0!==r)return r.exports;var i=o[e]={id:e,loaded:!1,exports:{}};return t[e].call(i.exports,i,i.exports,s),i.loaded=!0,i.exports}s.m=t,s.x=()=>{var e=s.O(void 0,[621,498],(()=>s(8651)));return s.O(e)},e=[],s.O=(r,t,o,i)=>{if(!t){var n=1/0;for(l=0;l<e.length;l++){for(var[t,o,i]=e[l],a=!0,p=0;p<t.length;p++)(!1&i||n>=i)&&Object.keys(s.O).every((e=>s.O[e](t[p])))?t.splice(p--,1):(a=!1,i<n&&(n=i));if(a){e.splice(l--,1);var c=o();void 0!==c&&(r=c)}}return r}i=i||0;for(var l=e.length;l>0&&e[l-1][2]>i;l--)e[l]=e[l-1];e[l]=[t,o,i]},s.d=(e,r)=>{for(var t in r)s.o(r,t)&&!s.o(e,t)&&Object.defineProperty(e,t,{enumerable:!0,get:r[t]})},s.f={},s.e=e=>Promise.all(Object.keys(s.f).reduce(((r,t)=>(s.f[t](e,r),r)),[])),s.u=e=>"./"+e+".mpw.js",s.miniCssF=e=>{},s.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}(),s.o=(e,r)=>Object.prototype.hasOwnProperty.call(e,r),s.nmd=e=>(e.paths=[],e.children||(e.children=[]),e),(()=>{var e;s.g.importScripts&&(e=s.g.location+"");var r=s.g.document;if(!e&&r&&(r.currentScript&&(e=r.currentScript.src),!e)){var t=r.getElementsByTagName("script");if(t.length)for(var o=t.length-1;o>-1&&!e;)e=t[o--].src}if(!e)throw new Error("Automatic publicPath is not supported in this browser");e=e.replace(/#.*$/,"").replace(/\?.*$/,"").replace(/\/[^\/]+$/,"/"),s.p=e})(),(()=>{var e={123:1,492:1};s.f.i=(r,t)=>{e[r]||importScripts(s.p+s.u(r))};var r=self.webpackChunkMPW=self.webpackChunkMPW||[],t=r.push.bind(r);r.push=r=>{var[o,i,n]=r;for(var a in i)s.o(i,a)&&(s.m[a]=i[a]);for(n&&n(s);o.length;)e[o.pop()]=1;t(r)}})(),r=s.x,s.x=()=>Promise.all([s.e(621),s.e(498)]).then(r);var i=s.x();MPW=i})();
//# sourceMappingURL=123.mpw.js.map