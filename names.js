/*!ui-pack:names.js:start*/
/* ══════════════════════════════════════════════════════════════════════
   改名
   整段貼在 index.html 最後那個 script 結束標籤之前(接在 trim.js 後面)。

   01 那一頁裝的是費率層級、費用代碼、系統設定 —— 「General Setting」
   說的是別的東西。這三樣合起來就是定價的架構,用業界的字:
   Pricing Configuration。

   改字典不改 markup:按鈕靠 data-i18n 取字,字典改了、applyLang 跑一次,
   每一處都跟著換。之後要再改名,改下面那張表就好。
   ══════════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
var RENAME={
  "tab.general":["定價設定","Pricing Configuration"]
};
function boot(){
  if(typeof I18N==="undefined") return;
  Object.keys(RENAME).forEach(function(k){
    if(I18N[k]) I18N[k]=RENAME[k].slice();
  });
  if(typeof applyLang==="function"){ try{ applyLang(); }catch(e){} }
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
else boot();
})();
/*!ui-pack:names.js:end*/
