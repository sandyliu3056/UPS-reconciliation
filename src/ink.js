/*!ui-pack:ink.js:start*/
/* ══════════════════════════════════════════════════════════════════════
   手寫感 / 繪畫感
   整段貼在 index.html 最後那個 script 結束標籤之前。
   一個外觀,沒有開關 —— 掛上 html.ink,樣式那一段就全部生效。
   applyFonts 與 applyBrand 是用行內樣式寫 --bodyfam、--wob 這些變數的,
   CSS 蓋不過去,所以這裡把那兩支包起來:原本的先跑,再蓋上去。
   要拿掉就把這一段和樣式那一段一起刪掉,程式回到原樣。
   ══════════════════════════════════════════════════════════════════════ */
(function(){
"use strict";

/* 介面是全英文,堆疊只留英文。萬一出現中文,落回系統無襯線,版面不會壞。 */
var HAND_BODY='"Patrick Hand","Segoe UI",sans-serif';
var HAND_DISP='"Caveat Hand","Segoe UI",sans-serif';

/* 標題給 Caveat,側欄與內文給 Patrick Hand —— 側欄是一直要讀的,
   手寫的印刷體小字才站得住。 */
function paintFonts(){
  var s=document.documentElement.style;
  s.setProperty("--titlefam",HAND_DISP);
  s.setProperty("--dispfam", HAND_BODY);
  s.setProperty("--bodyfam", HAND_BODY);
  /* 標題字跟側欄同一階提亮的墨色。這個變數是 applyBrand 設的,
     所以它每次跑完都要再蓋一次。 */
  s.setProperty("--titlefill","var(--chrome-ink)");
  s.setProperty("--titlestroke","0");
}

/* 抖線塗層。.sketch / .sketch-soft 早就寫好了,是 applyBrand 把 --wob
   設成 none 關掉的。這裡開回來,57 個面板、16 條細框一次都回來,
   不必改任何一行 markup。用的是沾了水的筆:位移大一級再糊一點。 */
function paintBrush(){
  var s=document.documentElement.style;
  s.setProperty("--wob",  "url(#wobble-wet)");
  s.setProperty("--wob2", "url(#wobble-damp)");
}

/* 比原本更濕的兩支濾鏡。掛進頁面本來就有的那個 defs —— 不改 markup。
   濾鏡範圍要放大,不然位移出去的邊會被裁掉,線看起來像被切平的。 */
function mountFilters(){
  var defs=document.querySelector("svg.defs");
  if(!defs||document.getElementById("wobble-wet")) return;
  var NS="http://www.w3.org/2000/svg";
  function mk(id,freq,oct,seed,scale,blur){
    var f=document.createElementNS(NS,"filter");
    f.setAttribute("id",id);
    f.setAttribute("x","-14%"); f.setAttribute("y","-14%");
    f.setAttribute("width","128%"); f.setAttribute("height","128%");
    var t=document.createElementNS(NS,"feTurbulence");
    t.setAttribute("type","fractalNoise"); t.setAttribute("baseFrequency",freq);
    t.setAttribute("numOctaves",oct); t.setAttribute("seed",seed); t.setAttribute("result","n");
    var d=document.createElementNS(NS,"feDisplacementMap");
    d.setAttribute("in","SourceGraphic"); d.setAttribute("in2","n");
    d.setAttribute("scale",scale);
    d.setAttribute("xChannelSelector","R"); d.setAttribute("yChannelSelector","G");
    d.setAttribute("result","d");
    var g=document.createElementNS(NS,"feGaussianBlur");
    g.setAttribute("in","d"); g.setAttribute("stdDeviation",blur);
    f.appendChild(t); f.appendChild(d); f.appendChild(g);
    defs.appendChild(f);
  }
  mk("wobble-wet", "0.022", "4", "21", "3.2", "0.4");
  mk("wobble-damp","0.028", "3", "31", "1.6", "0.25");
}

/* 罩在整個畫面上的那一層紙。掛在 html 底下不是 body —— body 有 zoom,
   position:fixed 會跟著縮,90% 的時候右下角就會空一條。 */
function mountPaper(){
  if(document.getElementById("inkPaper")) return;
  var d=document.createElement("div");
  d.id="inkPaper"; d.setAttribute("aria-hidden","true");
  document.documentElement.appendChild(d);
}

/* ── 包住原本那兩支 ────────────────────────────────────────────────
   兩支都是最外層的 function 宣告,就是 window 上的同一個名字;
   換掉之後,程式裡原本的呼叫也會走到這裡來。換配色、換場景都不會
   把手寫體和筆觸洗掉。 */
var _fonts=window.applyFonts, _brand=window.applyBrand;
if(typeof _fonts==="function"){
  window.applyFonts=function(){
    var out=_fonts.apply(this,arguments); paintFonts(); return out;
  };
}
if(typeof _brand==="function"){
  window.applyBrand=function(){
    var out=_brand.apply(this,arguments); paintBrush(); paintFonts(); return out;
  };
}

function boot(){
  mountFilters(); mountPaper();
  document.documentElement.classList.add("ink");
  paintFonts(); paintBrush();
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
else boot();
})();
/*!ui-pack:ink.js:end*/
