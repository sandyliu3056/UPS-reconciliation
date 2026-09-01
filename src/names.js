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
/* 左欄十頁與每一頁底下的編號子頁。原則:名詞片語、講清楚裝的是什麼、
   03 是「有哪些」(目錄)、04 是「收多少」(費率),兩者用字分開。 */
var RENAME={
  /* 左欄 */
  "tab.general":["定價設定",           "Pricing Configuration"],
  "tab.rate":   ["客戶管理",           "Customer Management"],
  "tab.cat":    ["渠道與附加費目錄",   "Channel & Surcharge Catalog"],
  "tab.fill":   ["渠道與附加費費率",   "Channel & Surcharge Rates"],
  "tab.wmsdata":["WMS / TMS 匯入",     "WMS / TMS Import"],
  "tab.files":  ["UPS 帳單匯入",       "UPS Invoice Import"],
  /* 01 */
  "rt.levels":  ["1. 費率層級",        "1. Rate Levels"],
  "rt.chgcode": ["2. 費用代碼對照",    "2. Charge Code Mapping"],
  "rt.sys":     ["3. 系統設定",        "3. System Settings"],
  /* 02 */
  "rt.customers":["1. 客戶名錄",       "1. Customer Directory"],
  /* 03 */
  "rt.chan":    ["1. 渠道",            "1. Channels"],
  "rt.rules":   ["2. 附加費目錄",      "2. Surcharge Catalog"],
  "rt.demand":  ["3. Demand 期間",     "3. Demand Periods"]
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
