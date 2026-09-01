/*!ui-pack:fm.js:start*/
/* ══════════════════════════════════════════════════════════════════════
   首頁流程圖 —— 精修
   整段貼在 index.html 最後那個 script 結束標籤之前(接在 ink.js 後面)。

   四件事:

   一、十個站的插畫重畫。原本每個站各用各的線寬 —— 1.1 / 1.2 / 1.3 /
       1.4 / 1.5 / 1.6 / 1.8 / 2 / 2.2 / 2.4,十個圖擺在一起像十套圖示。
       收成三階:外輪廓 2.2、內部結構 1.5、細節 1.05。全部給同一個光源,
       右下一律同濃度的陰影面。「運送中」原本那個形狀認不出來是什麼,
       改成側面的飛機。

   二、分組標題加涵蓋範圍的細線,兩端各一個小豎槓 —— 哪幾站屬於哪一段
       用看的就知道,不必數。

   三、打勾從浮在半空的 ✓ 改成有底的圓形徽章。原本那個勾沒有邊界,
       落在別站的插畫旁邊會分不清是誰的。

   四、路面加一條淺色路肩,細線變成路。

   一、二是換掉 fmArt / fmGrpHeader 兩支函式;三、四是等 fmBuild 畫完之後
   就地改 DOM —— 不複製她那一百行 markup,她之後改了那邊也不會打架。
   ══════════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
if(typeof window.fmArt!=="function") return;   /* 沒有流程圖就什麼都不做 */

var NS="http://www.w3.org/2000/svg";
var ESC=(typeof esc==="function")?esc:function(s){
  return String(s).replace(/[&<>"]/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); };

/* ── 一、站點插畫 ────────────────────────────────────────────────── */
window.fmArt=function(k,x,y){
  var S1='stroke="var(--fm-ink)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
  var S2='stroke="var(--fm-ink)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
  var S3='stroke="var(--fm-ink)" stroke-width="1.05" stroke-linecap="round" opacity=".62" fill="none"';
  /* 右下的陰影面。同一個濃度、同一個方向,十個站才像同一隻手畫的。 */
  var SH='fill="var(--fm-ink)" opacity=".12" stroke="none"';
  var ok=function(w){ return 'fill="none" stroke="var(--fm-run2)" stroke-width="'+w+
    '" stroke-linecap="round" stroke-linejoin="round"'; };
  var OK=ok(2.1);
  /* 地上的影子。寬度跟著圖示走 —— 倉庫和圖釘本來就不一樣寬。 */
  var gnd=function(w,dx){ return '<ellipse class="fm-sh" cx="'+(x+(dx||0))+'" cy="'+(y+2.5)+
    '" rx="'+w+'" ry="3.4"/>'; };

  switch(k){

  /* 01 下單:寫字板。夾子、三行字、勾。 */
  case "order": return gnd(18)+`
    <rect x="${x-14}" y="${y-32}" width="26" height="32" rx="3.2" fill="var(--fm-panel)" ${S1}/>
    <path d="M${x+5} ${y-32} h7 a3.2 3.2 0 0 1 3.2 3.2 v28.8 h-10.2 z" ${SH}/>
    <rect x="${x-6.5}" y="${y-35.6}" width="11" height="7" rx="2.4" fill="var(--fm-select)" ${S2}/>
    <path d="M${x-9.5} ${y-22.5} h15 M${x-9.5} ${y-17} h15 M${x-9.5} ${y-11.5} h8.5" ${S3}/>
    <path d="M${x+1.5} ${y-8.5} l2.8 3 l5.8 -7" ${OK}/>`;

  /* 02 ERP:辦公樓。兩排窗、門、屋簷。 */
  case "erp": return gnd(17)+`
    <path d="M${x-14} ${y} v-29 h28 v29 z" fill="var(--fm-stripe)" ${S1}/>
    <path d="M${x+6} ${y-29} h8 v29 h-8 z" ${SH}/>
    <path d="M${x-16.5} ${y-29} h33 l-3.5 -6 h-26 z" fill="var(--fm-gold)" ${S1}/>
    ${[-8,0,8].map(function(dx){ return `<rect x="${x+dx-3}" y="${y-24}" width="6" height="6"
        rx="1.2" fill="var(--fm-select)" ${S2}/>`; }).join("")}
    ${[-8,8].map(function(dx){ return `<rect x="${x+dx-3}" y="${y-15}" width="6" height="6"
        rx="1.2" fill="var(--fm-select)" ${S2}/>`; }).join("")}
    <path d="M${x-4} ${y} v-9 a4 4 0 0 1 8 0 v9 z" fill="var(--fm-run2)" ${S2}/>`;

  /* 03 倉庫:山形屋頂、捲門(有橫板)、兩箱貨。 */
  case "wms": return gnd(20)+`
    <path d="M${x-17} ${y} v-16 l17 -10 l17 10 v16 z" fill="var(--fm-stripe)" ${S1}/>
    <path d="M${x+4} ${y-23.5} l13 7.5 v16 h-13 z" ${SH}/>
    <path d="M${x-19.5} ${y-15.5} l19.5 -11.5 l19.5 11.5" fill="none" ${S1}/>
    <path d="M${x-7} ${y} v-12 h14 v12 z" fill="var(--fm-select)" ${S2}/>
    <path d="M${x-7} ${y-8} h14 M${x-7} ${y-4} h14" ${S3}/>
    <rect x="${x-15}" y="${y-7}" width="7" height="7" rx="1" fill="var(--fm-gold)" ${S2}/>
    <rect x="${x+8}" y="${y-7}" width="7" height="7" rx="1" fill="var(--fm-gold)" ${S2}/>
    <path d="M${x-11.5} ${y-7} v7 M${x+11.5} ${y-7} v7" ${S3}/>`;

  /* 04 TMS 派送:路線虛線走進圖釘。起點一個小圓,終點是釘。 */
  case "tms": return gnd(12,3)+`
    <path d="M${x-15} ${y-2} q-3 -13 9 -15 q12 -2 9 -13" fill="none"
          stroke="var(--fm-run2)" stroke-width="2.1" stroke-dasharray="2.6 4.2" stroke-linecap="round"/>
    <path d="M${x+3} ${y-37} a8 8 0 0 1 8 8 q0 5.5 -8 14.5 q-8 -9 -8 -14.5 a8 8 0 0 1 8 -8 z"
          fill="var(--fm-gold)" ${S1}/>
    <path d="M${x+3} ${y-37} a8 8 0 0 1 8 8 q0 5.5 -8 14.5 z" ${SH}/>
    <circle cx="${x+3}" cy="${y-29}" r="3" fill="var(--fm-panel)" ${S2}/>
    <circle cx="${x-15}" cy="${y-2}" r="3.2" fill="var(--fm-run2)" ${S2}/>`;

  /* 05 交運:手推車推一箱。車架、輪子、箱上膠帶。 */
  case "tender": return gnd(17)+`
    <path d="M${x+9} ${y-2} v-30" fill="none" ${S1}/>
    <path d="M${x+9} ${y-2} h-17" fill="none" ${S1}/>
    <path d="M${x+9} ${y-32} q4.5 0 4.5 4" fill="none" ${S2}/>
    <rect x="${x-11}" y="${y-25}" width="19" height="17" rx="2" fill="var(--fm-gold)" ${S1}/>
    <path d="M${x+2} ${y-25} h6 v17 h-6 z" ${SH}/>
    <path d="M${x-1.5} ${y-25} v17" stroke="var(--fm-stripe)" stroke-width="3.4"/>
    <path d="M${x-1.5} ${y-25} v17" ${S3}/>
    <circle cx="${x-3}" cy="${y-1}" r="4.6" fill="var(--fm-panel)" ${S1}/>
    <circle cx="${x-3}" cy="${y-1}" r="1.5" fill="var(--fm-ink)" stroke="none"/>`;

  /* 06 運送中:側面的飛機。原本那個形狀誰都認不出來。 */
  case "transit": return gnd(19)+`
    <path d="M${x-19} ${y-16} h22 q7 0 12 5 q3.5 3.5 3.5 5.5 q0 2 -3.5 2 h-34
             q-3.5 0 -3.5 -5 z" fill="var(--fm-panel)" ${S1}/>
    <path d="M${x+3} ${y-16} q7 0 12 5 q3.5 3.5 3.5 5.5 q0 2 -3.5 2 h-9 z" ${SH}/>
    <path d="M${x-8} ${y-16} l-3 -13 h6.5 l9 13 z" fill="var(--fm-select)" ${S2}/>
    <path d="M${x-14.5} ${y-3.5} l-3.5 8 h6 l7.5 -8 z" fill="var(--fm-select)" ${S2}/>
    ${[-14,-9.5,-5,-0.5].map(function(dx){ return `<circle cx="${x+dx}" cy="${y-11}" r="1.35"
        fill="var(--fm-ink)" opacity=".55" stroke="none"/>`; }).join("")}
    <path d="M${x-30} ${y-14} h7 M${x-33} ${y-9} h9 M${x-29} ${y-4} h6"
          stroke="var(--fm-line)" stroke-width="1.5" stroke-linecap="round" fill="none"/>`;

  /* 07 送達:房子加一枚打勾徽章。 */
  case "dlv": return gnd(18)+`
    <path d="M${x-15} ${y} v-13 l15 -11 l15 11 v13 z" fill="var(--fm-panel)" ${S1}/>
    <path d="M${x+3} ${y-22.7} l12 8.7 v14 h-12 z" ${SH}/>
    <path d="M${x-18} ${y-13} l18 -13 l18 13" fill="none" ${S1}/>
    <path d="M${x-5} ${y} v-9 a5 5 0 0 1 10 0 v9 z" fill="var(--fm-run2)" ${S2}/>
    <rect x="${x+6.5}" y="${y-10.5}" width="6" height="6" rx="1" fill="var(--fm-select)" ${S2}/>
    <circle cx="${x+15}" cy="${y-25}" r="6.6" fill="var(--fm-select)" ${S1}/>
    <path d="M${x+12} ${y-25.2} l2.2 2.4 l3.8 -4.4" ${OK}/>`;

  /* 08 UPS 帳單:單據。摺角、$、明細行,下緣鋸齒 —— 一眼看得出是帳單。 */
  case "bill": return gnd(17)+`
    <path d="M${x-13.5} ${y-34} h17 l10 10 v20
             l-3.4 2.2 l-3.4 -2.2 l-3.4 2.2 l-3.4 -2.2 l-3.4 2.2 l-3.4 -2.2 l-3.4 2.2 l-3.4 -2.2 z"
          fill="var(--fm-panel)" ${S1}/>
    <path d="M${x+3.5} ${y-34} l10 10 v20 l-3.4 2.2 l-3.4 -2.2 l-3.4 2.2 z" ${SH}/>
    <path d="M${x+3.5} ${y-34} v10 h10" fill="var(--fm-stripe)" ${S2}/>
    <path d="M${x-9} ${y-21} h9 M${x-9} ${y-16.5} h14.5 M${x-9} ${y-12} h5.5" ${S3}/>
    <text x="${x+6}" y="${y-8.5}" text-anchor="middle" font-size="14" font-weight="800"
          fill="var(--fm-run2)">$</text>`;

  /* 09 對帳:天平。橫樑、兩個秤盤、底座。 */
  case "recon": return gnd(18)+`
    <path d="M${x-5} ${y} h10 l2.5 -4 h-15 z" fill="var(--fm-stripe)" ${S1}/>
    <path d="M${x} ${y-4} v-30" fill="none" ${S1}/>
    <path d="M${x-16} ${y-30} h32" fill="none" ${S1}/>
    <path d="M${x-16} ${y-30} v4 M${x+16} ${y-30} v4" ${S3}/>
    <circle cx="${x}" cy="${y-33}" r="2.6" fill="var(--fm-gold)" ${S2}/>
    <path d="M${x-16} ${y-26} l-5.5 8.5 a7.5 7.5 0 0 0 11 0 z" fill="var(--fm-select)" ${S2}/>
    <path d="M${x+16} ${y-26} l-5.5 8.5 a7.5 7.5 0 0 0 11 0 z" fill="var(--fm-select)" ${S2}/>
    <path d="M${x+16} ${y-26} l5.5 8.5 a7.5 7.5 0 0 1 -5.5 2.4 z" ${SH}/>`;

  /* 10 財務請款:硬幣疊加對帳單。硬幣側面有刻痕。 */
  case "fin": return gnd(19)+`
    <rect x="${x+2}" y="${y-27}" width="17" height="24" rx="2" fill="var(--fm-panel)" ${S1}/>
    <path d="M${x+13} ${y-27} h6 v24 h-6 z" ${SH}/>
    <path d="M${x+5.5} ${y-21} h10 M${x+5.5} ${y-16.5} h10 M${x+5.5} ${y-12} h6" ${S3}/>
    <path d="M${x+5.5} ${y-7} l2.2 2.4 l4 -4.6" ${OK}/>
    ${[0,1,2].map(function(i){ return `<ellipse cx="${x-9}" cy="${y-4-4.8*i}" rx="8.5" ry="3.6"
        fill="var(--fm-gold)" ${S2}/>`; }).join("")}
    <path d="M${x-13} ${y-13.2} v-1.6 M${x-9} ${y-12.4} v-1.6 M${x-5} ${y-13.2} v-1.6" ${S3}/>`;
  }
  return "";
};

/* ── 二、分組標題加涵蓋範圍 ──────────────────────────────────────
   細線兩端各一個小豎槓,標題兩側留白。x0/x1 是那一段第一站與最後一站
   往外各留半格,對照 FM_ST 的座標。 */
var EXT={"ORDER & FULFILLMENT":[70,510],"CARRIER DELIVERY":[556,900],
         "BILLING & SETTLEMENT":[930,1152],
         "訂單與出貨":[70,510],"承運":[556,900],"帳務":[930,1152]};
window.fmGrpHeader=function(x,label){
  var e=EXT[label], pad=String(label).length*3.6+9;
  var rule=e ? `<path d="M${e[0]} 41 v7 M${e[1]} 41 v7 M${e[0]} 44.5 H${x-pad}
      M${x+pad} 44.5 H${e[1]}" fill="none" stroke="var(--fm-line)" stroke-width="1.1"
      opacity=".55" stroke-linecap="round"/>` : "";
  return `<g class="fm-grph">${rule}<text x="${x}" y="48" text-anchor="middle">${
    ESC(label)}</text></g>`;
};

/* ── 三、四、畫完之後就地改 DOM ─────────────────────────────────
   不複製 fmBuild 那一百行 markup —— 她之後改了那邊,這裡也不會打架。 */
function polish(svg){
  if(!svg) return;

  /* 打勾:浮在半空的 ✓ 換成有底的圓徽章。位置照原本那個 text 的座標,
     所以 .fm-st.done .fm-tick 那條開關照樣管得到。 */
  Array.prototype.slice.call(svg.querySelectorAll("text.fm-tick")).forEach(function(t){
    var x=+t.getAttribute("x"), y=+t.getAttribute("y");
    var g=document.createElementNS(NS,"g");
    g.setAttribute("class","fm-tick");
    var c=document.createElementNS(NS,"circle");
    c.setAttribute("cx",x-3); c.setAttribute("cy",y+1); c.setAttribute("r","7.4");
    var p=document.createElementNS(NS,"path");
    p.setAttribute("d","M"+(x-6.4)+" "+(y+0.8)+" l2.4 2.6 l4.2 -4.8");
    g.appendChild(c); g.appendChild(p);
    t.parentNode.replaceChild(g,t);
  });

  /* 路肩:每一條路面底下墊一條更寬更淡的線,細線就變成路。
     用 cloneNode,線形永遠跟著原本那條走,不會有第二份 d 要維護。 */
  Array.prototype.slice.call(svg.querySelectorAll("path.fm-rail")).forEach(function(r){
    if(r.previousSibling&&r.previousSibling.getAttribute&&
       r.previousSibling.getAttribute("class")==="fm-shoulder") return;
    var s=r.cloneNode(false);
    s.setAttribute("class","fm-shoulder"); s.removeAttribute("id");
    r.parentNode.insertBefore(s,r);
  });
}

var _build=window.fmBuild;
if(typeof _build==="function"){
  window.fmBuild=function(){
    var out=_build.apply(this,arguments);
    try{ polish(document.getElementById("fmMap")); }catch(e){}
    return out;
  };
}
/* 補強掛上來的時候圖可能已經畫好了 —— 那就重畫一次。 */
function boot(){
  if(typeof FM_BUILT!=="undefined"&&FM_BUILT&&typeof window.fmBuild==="function"){
    try{ window.fmBuild(); }catch(e){}
  }
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
else boot();
})();
/*!ui-pack:fm.js:end*/
