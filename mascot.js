/*!ui-pack:mascot.js:start*/
/* ══════════════════════════════════════════════════════════════════════
   每一頁一隻:布偶貓或柯基從標題那條線後面探出頭,手上拿著這一頁的東西
   整段貼在 index.html 最後那個 script 結束標籤之前(接在 names.js 後面)。

   畫法跟她首頁流程圖那兩隻一樣:2px 墨線、同一組毛色,布偶貓有海豹色的
   耳朵和面罩、面罩中間留一個倒 V、藍眼睛;柯基一耳立一耳垂、白口鼻、
   紅項圈。放在每一段第一張卡的標題右端,爪子搭在標題底線上。

   動的只有:眨眼、頭輕輕晃、柯基的垂耳擺、道具浮一下。
   prefers-reduced-motion 全關。
   ══════════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
/* 每一頁一隻:布偶貓或柯基,從標題那條線後面探出頭來,手上拿著這一頁的東西。
   viewBox 0 0 64 40。線一律 2 / 1.5,墨色跟她流程圖那兩隻一樣。 */
var INK="#4a3226";
function catPeek(prop){
  return `<svg class="mz mz-cat" viewBox="0 0 64 40" aria-hidden="true">
  <g class="mz-body">
    <!-- 兩隻前掌搭在線上 -->
    <path class="fur" d="M14 36 q0 -5 5 -5 q5 0 5 5 z"/>
    <path class="fur" d="M28 36 q0 -5 5 -5 q5 0 5 5 z"/>
    <path class="ln" d="M17 34 v2 M19.5 33.5 v2.5 M31 34 v2 M33.5 33.5 v2.5" stroke-width="1.1"/>
    <!-- 頭 -->
    <g class="mz-head">
      <path class="fur" d="M9 26 q-1 -12 10 -15 q7 -2 14 0 q11 3 10 15 q-1 8 -17 8 q-16 0 -17 -8 z"/>
      <!-- 重點色的耳朵:布偶貓的海豹色 -->
      <path class="pt" d="M12 18 l-2.5 -10 l8.5 5 z"/>
      <path class="pt" d="M40 18 l2.5 -10 l-8.5 5 z"/>
      <path class="innr" d="M12.6 16.4 l-1.4 -5.6 l4.6 2.8 z M39.4 16.4 l1.4 -5.6 l-4.6 2.8 z"/>
      <!-- 臉上的重點色面罩,中間留一個倒 V -->
      <path class="pt" d="M17 20 q9 -6 18 0 q-2 5 -6 6 l-3 -4 l-3 4 q-4 -1 -6 -6 z" opacity=".55"/>
      <!-- 藍眼睛 -->
      <g class="mz-eyes">
        <ellipse cx="20" cy="23" rx="2.4" ry="2.9" fill="#4f86c6" stroke="${INK}" stroke-width="1.2"/>
        <ellipse cx="32" cy="23" rx="2.4" ry="2.9" fill="#4f86c6" stroke="${INK}" stroke-width="1.2"/>
        <circle cx="20.8" cy="22" r=".8" fill="#fff"/><circle cx="32.8" cy="22" r=".8" fill="#fff"/>
      </g>
      <path class="mz-lid" d="M17.4 23 q2.6 -2.6 5.2 0 M29.4 23 q2.6 -2.6 5.2 0"/>
      <!-- 鼻子、嘴、鬍鬚 -->
      <path class="innr" d="M24.6 27 h2.8 l-1.4 1.6 z"/>
      <path class="ln" d="M26 28.6 q-1.5 1.8 -3 .4 M26 28.6 q1.5 1.8 3 .4" stroke-width="1.1"/>
      <path class="ln" d="M13 26 h-5 M13.5 28.5 h-4.5 M39 26 h5 M38.5 28.5 h4.5" stroke-width="1" opacity=".7"/>
    </g>
  </g>
  ${prop||""}
</svg>`;
}
function dogPeek(prop){
  return `<svg class="mz mz-dog" viewBox="0 0 64 40" aria-hidden="true">
  <g class="mz-body">
    <path class="fur" d="M14 36 q0 -5 5 -5 q5 0 5 5 z"/>
    <path class="fur" d="M28 36 q0 -5 5 -5 q5 0 5 5 z"/>
    <path class="ln" d="M17 34 v2 M19.5 33.5 v2.5 M31 34 v2 M33.5 33.5 v2.5" stroke-width="1.1"/>
    <g class="mz-head">
      <path class="fur" d="M9 27 q-1 -12 10 -15 q7 -2 14 0 q11 3 10 15 q-1 7 -17 7 q-16 0 -17 -7 z"/>
      <!-- 一耳立一耳垂 -->
      <path class="fur" d="M12 17 q-5 -8 -2 -13 q6 2 8 9 z"/>
      <path class="flop mz-flop" d="M37 15 q8 -6 10 0 q1 6 -8 8 q-3 0 -2 -8 z"/>
      <!-- 白色的臉譜與口鼻 -->
      <path class="snout" d="M19 24 q7 -5 14 0 q4 6 -1 9 q-6 2 -12 0 q-5 -3 -1 -9 z"/>
      <g class="mz-eyes">
        <circle cx="20" cy="22.5" r="1.8" fill="${INK}"/><circle cx="32" cy="22.5" r="1.8" fill="${INK}"/>
        <circle cx="20.6" cy="21.8" r=".6" fill="#fff"/><circle cx="32.6" cy="21.8" r=".6" fill="#fff"/>
      </g>
      <path class="mz-lid" d="M17.8 22.5 q2.2 -2 4.4 0 M29.8 22.5 q2.2 -2 4.4 0"/>
      <circle cx="26" cy="27.5" r="2.1" fill="${INK}"/>
      <path class="ln" d="M26 29.4 v1.6 M26 31 q-1.8 1.6 -3.4 0 M26 31 q1.8 1.6 3.4 0" stroke-width="1.1"/>
      <!-- 項圈露一點 -->
      <path class="collar" d="M15 34.5 q11 4 22 0" stroke-width="2.4"/>
    </g>
  </g>
  ${prop||""}
</svg>`;
}
/* 道具都畫在右下角 44–62 × 18–38 這一格。 */
var PROP={
 ledger:`<g class="mz-prop"><rect x="45" y="22" width="15" height="12" rx="1.6" fill="#fffdf7" stroke="${INK}" stroke-width="1.6"/>
   <rect x="45" y="19" width="15" height="12" rx="1.6" fill="#ffdd8f" stroke="${INK}" stroke-width="1.6"/>
   <path d="M48 23 h9 M48 26 h6" stroke="${INK}" stroke-width="1" opacity=".7"/></g>`,
 tag:`<g class="mz-prop"><path d="M47 22 l9 -4 l6 6 l-9 9 l-6 -6 z" fill="#ffdd8f" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
   <circle cx="56" cy="22.5" r="1.4" fill="#fffdf7" stroke="${INK}" stroke-width="1"/>
   <path d="M49.5 25.5 l4 4" stroke="${INK}" stroke-width="1.2"/></g>`,
 nametag:`<g class="mz-prop"><rect x="45" y="22" width="16" height="10" rx="2" fill="#fffdf7" stroke="${INK}" stroke-width="1.6"/>
   <path d="M48 26 h10 M48 29 h6" stroke="${INK}" stroke-width="1.1" opacity=".7"/>
   <path d="M49 22 v-3 h8 v3" fill="none" stroke="${INK}" stroke-width="1.2"/></g>`,
 box:`<g class="mz-prop"><rect x="45" y="22" width="16" height="13" rx="1.5" fill="#ffb500" stroke="${INK}" stroke-width="1.6"/>
   <path d="M53 22 v13" stroke="#fffdf7" stroke-width="2.4"/><path d="M53 22 v13" stroke="${INK}" stroke-width=".9" opacity=".6"/>
   <path d="M45 26.5 H61" stroke="${INK}" stroke-width="1.1"/></g>`,
 plus:`<g class="mz-prop"><circle cx="53" cy="27" r="8" fill="#ffdd8f" stroke="${INK}" stroke-width="1.6"/>
   <path d="M53 22.5 v9 M48.5 27 h9" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/></g>`,
 bolt:`<g class="mz-prop"><path d="M55 18 l-7 10 h5 l-2 9 l8 -11 h-5 l3 -8 z" fill="#ffb500" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/></g>`,
 price:`<g class="mz-prop"><path d="M46 24 l10 -6 l6 4 l-3 12 l-12 -2 z" fill="#ffdd8f" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
   <text x="53" y="30.5" text-anchor="middle" font-size="8" font-weight="800" fill="#8a6104" font-family="Consolas,monospace">$</text></g>`,
 invoice:`<g class="mz-prop"><path d="M46 19 h10 l5 5 v12 l-2 1.5 l-2 -1.5 l-2 1.5 l-2 -1.5 l-2 1.5 l-2 -1.5 l-2 1.5 l-1 -1 z" fill="#fffdf7" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
   <path d="M56 19 v5 h5" fill="#f7f1e4" stroke="${INK}" stroke-width="1.2"/>
   <path d="M49 27 h8 M49 30 h5" stroke="${INK}" stroke-width="1" opacity=".7"/></g>`,
 lens:`<g class="mz-prop"><circle cx="52" cy="25" r="6.5" fill="#e8f2fd" stroke="${INK}" stroke-width="1.8"/>
   <path d="M56.8 29.8 l5 5" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
   <path d="M49 22.5 q1.5 -1.5 3 -1" stroke="#fff" stroke-width="1.4" stroke-linecap="round" fill="none"/></g>`,
 chart:`<g class="mz-prop"><path d="M45 35 h17" stroke="${INK}" stroke-width="1.4"/>
   <rect x="46.5" y="29" width="3.5" height="6" fill="#ffdd8f" stroke="${INK}" stroke-width="1.2"/>
   <rect x="51.5" y="24" width="3.5" height="11" fill="#ffb500" stroke="${INK}" stroke-width="1.2"/>
   <rect x="56.5" y="19" width="3.5" height="16" fill="#8a6104" stroke="${INK}" stroke-width="1.2"/></g>`,
 calendar:`<g class="mz-prop"><rect x="45" y="20" width="16" height="15" rx="2" fill="#fffdf7" stroke="${INK}" stroke-width="1.6"/>
   <rect x="45" y="20" width="16" height="4.5" fill="#ffb500" stroke="${INK}" stroke-width="1.6"/>
   <path d="M48.5 18.5 v3 M57.5 18.5 v3" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>
   <path d="M48 28.5 h3 M52.5 28.5 h3 M48 32 h3 M52.5 32 h3" stroke="${INK}" stroke-width="1.6" opacity=".7"/></g>`,
 key:`<g class="mz-prop"><circle cx="49.5" cy="24" r="4.5" fill="#ffdd8f" stroke="${INK}" stroke-width="1.6"/>
   <circle cx="49.5" cy="24" r="1.4" fill="#fffdf7" stroke="${INK}" stroke-width="1"/>
   <path d="M53.5 26 l8 8 M58.5 31 l2 -2 M60.5 33 l2 -2" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/></g>`,
 sheet:`<g class="mz-prop"><rect x="45" y="20" width="16" height="15" rx="1.5" fill="#fffdf7" stroke="${INK}" stroke-width="1.6"/>
   <path d="M45 24.5 h16 M45 29 h16 M45 33.5 h16 M50.5 20 v15 M55.5 20 v15" stroke="${INK}" stroke-width=".9" opacity=".55"/>
   <rect x="45" y="20" width="16" height="4.5" fill="#ffdd8f" stroke="${INK}" stroke-width="1.2"/></g>`
};
/* 哪一頁哪一隻拿什麼 */
var PAGE_MASCOT={
  "p-setting": ["cat","ledger"],   "p-code":  ["cat","tag"],
  "p-cus":     ["dog","nametag"],  "p-chan":  ["cat","box"],
  "p-rules":   ["dog","plus"],     "p-demand":["cat","bolt"],
  "p-ratefill":["dog","price"],    "p-files": ["cat","invoice"],
  "recon":     ["dog","lens"],     "p-analysis":["cat","chart"],
  "p-hist":    ["dog","calendar"], "p-admin": ["cat","key"],
  "p-home":    ["dog","sheet"]
};
function mascot(key){
  var m=PAGE_MASCOT[key]; if(!m) return "";
  return (m[0]==="cat"?catPeek:dogPeek)(PROP[m[1]]);
}

/* 哪一段掛在哪個標題上。p-cus 兩個 pane 各一隻。 */
function hosts(){
  var out=[];
  var byId=function(id){ return document.getElementById(id); };
  var firstHead=function(root){ if(!root) return null;
    var lf=root.querySelector(".lf"); if(!lf) return null;
    return lf.querySelector(":scope > h3")||lf.querySelector("h3")||lf.querySelector(".subhd"); };
  Object.keys(PAGE_MASCOT).forEach(function(k){
    if(k==="recon"){ var rp=byId("reconPane"); var h=firstHead(rp); if(h) out.push([k,h]); return; }
    if(k==="p-cus"){ var cp=byId("cusPane"); var h2=firstHead(cp); if(h2) out.push([k,h2]); return; }
    if(k==="p-files"){ var fc=document.querySelector("#p-files .filesCard h3"); if(fc) out.push([k,fc]); return; }
    var h3=firstHead(byId(k)); if(h3) out.push([k,h3]);
  });
  return out;
}
function mount(){
  hosts().forEach(function(pair){
    var k=pair[0], h=pair[1];
    if(h.querySelector(".mz")) return;
    var wrap=document.createElement("span");
    wrap.className="mzwrap"; wrap.innerHTML=mascot(k);
    h.appendChild(wrap);
  });
}
window.mascot=mascot; window.PAGE_MASCOT=PAGE_MASCOT;
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",mount);
else mount();
})();
/*!ui-pack:mascot.js:end*/
