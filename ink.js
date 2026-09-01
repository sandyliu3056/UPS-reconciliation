/*!ui-pack:ink.js:start*/
/* ══════════════════════════════════════════════════════════════════════
   手寫感 / 繪畫感 —— 開關
   整段貼在 index.html 最後那個 script 結束標籤之前。
   四段:關 / 手寫標題 / 手寫全部 / 手繪。選擇存在這台瀏覽器,
   和 Colour、Scene、Display size 同一個做法。
   applyFonts 與 applyBrand 是用行內樣式寫 --bodyfam、--wob 這些變數的,
   CSS 蓋不過去,所以這裡把那兩支包起來,原本的先跑,再蓋上去。
   整段刪掉,連同樣式那一段,程式就回到原樣。
   ══════════════════════════════════════════════════════════════════════ */
(function(){
"use strict";

var CJK='var(--hand-cjk)';
var HAND_BODY='"Patrick Hand",'+CJK+',sans-serif';
var HAND_DISP='"Caveat Hand",'+CJK+',sans-serif';

var INK_KEY="ups_recon_ink";
var LEVELS=["off","title","all","full","paint"];
var INK="paint";                      /* 預設最滿 —— 要收就在選單上往回調 */

function label(v){
  var zh={off:"不用手寫",title:"手寫標題",all:"手寫全部",full:"手繪",paint:"水彩"};
  var en={off:"No ink",title:"Hand title",all:"Hand all",full:"Sketch",paint:"Painted"};
  return (typeof LANG!=="undefined"&&LANG)?en[v]:zh[v];
}

/* 把字體與筆觸寫上去。applyFonts 每次跑完都會再呼叫一次這裡,
   所以換配色、換場景都不會把手寫體洗掉。 */
function paint(){
  var r=document.documentElement;
  r.classList.toggle("ink",     INK!=="off");
  r.classList.toggle("ink-full", INK==="full"||INK==="paint");
  r.classList.toggle("ink-paint",INK==="paint");
  var s=r.style;
  if(INK==="off") return;             /* 交還給 applyFonts 原本設的值 */
  /* 標題給 Caveat,側欄與內文給 Patrick Hand —— 側欄是一直要讀的,
     手寫的印刷體小字才站得住。 */
  s.setProperty("--titlefam",HAND_DISP);
  s.setProperty("--dispfam", HAND_BODY);
  if(INK!=="title") s.setProperty("--bodyfam",HAND_BODY);
}
/* 只有「手寫全部」和「手繪」才動內文;「手寫標題」時 body 要留原樣,
   但 html.ink 那組字級補償是為手寫內文寫的,這裡把它關掉。 */
function paintSize(){
  document.documentElement.classList.toggle("ink-body",
    INK==="all"||INK==="full"||INK==="paint");
}

/* 抖線塗層。.sketch / .sketch-soft 早就寫好了,是 applyBrand 把
   --wob 設成 none 關掉的。手繪這一段把它開回來,57 個面板、
   16 條細框一次都回來,不必改任何一行 markup。 */
function paintBrush(){
  var s=document.documentElement.style;
  if(INK!=="full"&&INK!=="paint") return;   /* 其餘等級交還給 applyBrand */
  /* 水彩用沾了水的筆:位移大一級再糊一點,乾筆的線就化開了。 */
  s.setProperty("--wob",  INK==="paint"?"url(#wobble-wet)" :"url(#wobble)");
  s.setProperty("--wob2", INK==="paint"?"url(#wobble-damp)":"url(#wobble-soft)");
}

/* 兩支比原本更濕的濾鏡。掛進頁面本來就有的那個 defs —— 不改 markup,
   關掉水彩它們就只是沒人用的定義。濾鏡範圍要放大,不然位移出去的
   邊會被裁掉,線看起來像被切平的。 */
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

function apply(v){
  INK = LEVELS.indexOf(v)>=0 ? v : "full";
  paint(); paintSize(); paintBrush();
  try{ localStorage.setItem(INK_KEY,INK); }catch(e){}
}

/* ── 包住原本那兩支 ────────────────────────────────────────────────
   兩支都是最外層的 function 宣告,所以就是 window 上的同一個名字;
   換掉之後,程式裡原本的呼叫也會走到這裡來。 */
var _fonts=window.applyFonts, _brand=window.applyBrand;
if(typeof _fonts==="function"){
  window.applyFonts=function(){
    var out=_fonts.apply(this,arguments);
    paint(); paintSize();
    return out;
  };
}
if(typeof _brand==="function"){
  window.applyBrand=function(){
    var out=_brand.apply(this,arguments);
    paintBrush();
    return out;
  };
}

/* ── 標題列上的選單 ────────────────────────────────────────────────
   放在 Colour 後面。原本那五顆的樣式吃 .titlebar select,不用另外寫。 */
function mount(){
  var ctrls=document.querySelector(".titlebar .ctrls");
  if(!ctrls||document.getElementById("inkSel")) return;
  var sel=document.createElement("select");
  sel.id="inkSel"; sel.title="Ink";
  ctrls.appendChild(sel);
  fill();
  sel.onchange=function(e){ apply(e.target.value); fill(); };
}
function fill(){
  var sel=document.getElementById("inkSel");
  if(!sel) return;
  sel.innerHTML=LEVELS.map(function(v){
    return '<option value="'+v+'"'+(v===INK?' selected':'')+'>'+label(v)+'</option>';
  }).join("");
}
/* 換語言時 fillSelects 會重畫其他選單,順手把這一顆也換掉。 */
var _fill=window.fillSelects;
if(typeof _fill==="function"){
  window.fillSelects=function(){ var o=_fill.apply(this,arguments); fill(); return o; };
}

try{ var v=localStorage.getItem(INK_KEY); if(v) INK=v; }catch(e){}
function boot(){ mountFilters(); mountPaper(); mount(); apply(INK); }
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
else boot();
})();
/*!ui-pack:ink.js:end*/
