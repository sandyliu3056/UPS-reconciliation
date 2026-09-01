/*!ui-pack:tabs.js:start*/
/* ══════════════════════════════════════════════════════════════════════
   04 渠道與附加費費率 —— 分層
   整段貼在 index.html 最後那個 script 結束標籤之前(接在 fm.js 後面)。

   這一頁本來是七張面板疊成一條長捲軸:運費表、燃油、附加費、DIM 除數、
   尺寸門檻、Demand 費率。要改燃油得先捲過運費表,要看門檻得捲到最底。
   拆成四個子頁:

     1. Base Rates   運費表 + 燃油
     2. Surcharges   附加費費率
     3. Size Rules   DIM 除數 + 尺寸門檻
     4. Demand       Demand 費率

   用的是頁面本來就有的那條編號列(01 有三個子頁、03 有三個)—— 不是另外
   做一套。SET_GROUPS / RATE_PAGE / RATE_TABS / RATE_PER_LEVEL / SET_LAST
   都是同一個 script 的最外層變數,直接補進去就好,showSetTab 和那條列的
   點擊處理是通用的,一個字都不用改。

   面板本身不搬家 —— 只是把該露的露出來。認面板靠 h3 底下的 data-i18n
   key,不是靠第幾個 —— 之後在中間插一張卡也不會錯位。

   順帶修一件事:「Demand 費率」和「尺寸門檻」原本是包在「DIM 除數」那張
   卡裡面的(markup 少了一個結束標籤)。Demand 跟 DIM 除數沒有關係,
   搬出來成為 p-ratefill 的直接子層。
   ══════════════════════════════════════════════════════════════════════ */
(function(){
"use strict";

/* 四個子頁各自涵蓋哪幾張卡。key 是 h3 底下的 data-i18n。 */
var SECT=[
  {r:"ratefill", n:["1. Base Rates","1. 運費與燃油"],   cards:["hd.baserate","hd.fuel"]},
  {r:"rfacc",    n:["2. Surcharges","2. 附加費"],       cards:["hd.acc"]},
  {r:"rfsize",   n:["3. Size Rules","3. 尺寸規則"],     cards:["hd.dimf","hd.rulesforce"]},
  {r:"rfdem",    n:["4. Demand","4. Demand"],           cards:["hd.demrate"]}
];
/* 這一張是頁首 —— 說明這一頁屬於右上角選的那一層,還帶著預覽鈕。
   四個子頁都要看得到,不歸任何一組。 */
var HEAD="hd.ratefill";

function keyOf(lf){
  var h=lf.querySelector(":scope > h3"); if(!h) return "";
  var e=h.querySelector("[data-i18n]");
  return e?e.getAttribute("data-i18n"):"";
}
function cards(){
  var p=document.getElementById("p-ratefill"); if(!p) return {};
  var out={};
  Array.prototype.slice.call(p.querySelectorAll(".lf")).forEach(function(lf){
    var k=keyOf(lf); if(k) out[k]=lf;
  });
  return out;
}

/* Demand 與尺寸門檻本來被包在 DIM 除數那張卡裡面。搬到跟它同層 ——
   不然藏 DIM 除數會連著把它們一起藏掉。 */
function unnest(){
  var p=document.getElementById("p-ratefill"); if(!p) return;
  var c=cards(), dim=c["hd.dimf"];
  if(!dim) return;
  ["hd.rulesforce","hd.demrate"].forEach(function(k){
    var el=c[k];
    if(el&&el.parentNode===dim) p.appendChild(el);
  });
}

function mountTabs(){
  var row=document.querySelector('#rateSide .setnav-tabs[data-g="fill"]');
  if(!row||row.dataset.split) return;
  row.dataset.split="1";
  var en=(typeof LANG!=="undefined")&&LANG;
  row.innerHTML=SECT.map(function(s){
    return '<button data-r="'+s.r+'" data-rf="1">'+(en?s.n[0]:s.n[1])+'</button>';
  }).join("");
}
/* 換語言時整條列會被別的地方重畫嗎?不會 —— 那幾顆原本靠 data-i18n,
   我這幾顆沒有,所以自己補一次。 */
function relabel(){
  var en=(typeof LANG!=="undefined")&&LANG;
  SECT.forEach(function(s){
    var b=document.querySelector('#rateSide button[data-r="'+s.r+'"]');
    if(b) b.textContent=en?s.n[0]:s.n[1];
  });
}

/* 露該露的。which 是現在停的子頁;不是這一組的就全部露出來 ——
   之後若有人直接跳進 p-ratefill 而沒經過編號列,不會看到一片空白。 */
function paint(which){
  var c=cards();
  var mine=SECT.filter(function(s){ return s.r===which; })[0];
  Object.keys(c).forEach(function(k){
    if(k===HEAD){ c[k].hidden=false; return; }
    c[k].hidden = mine ? mine.cards.indexOf(k)<0 : false;
  });
}

function boot(){
  if(typeof SET_GROUPS==="undefined"||typeof RATE_TABS==="undefined") return;
  unnest();
  mountTabs();

  /* 補進她原本那幾張表。SET_GROUPS 是 const,但物件本身可以改;
     RATE_TABS 是 const 陣列,push 也沒問題。 */
  SECT.forEach(function(s){
    if(SET_GROUPS.fill.indexOf(s.r)<0) SET_GROUPS.fill.push(s.r);
    if(RATE_TABS.indexOf(s.r)<0) RATE_TABS.push(s.r);
    RATE_PAGE[s.r]="ratefill";                 /* 四個子頁同一個 section */
    if(typeof RATE_PER_LEVEL!=="undefined") RATE_PER_LEVEL.add(s.r);
  });

  /* showSetCards 是最外層的 function 宣告,換掉之後她原本的呼叫也會走過來。 */
  var _cards=window.showSetCards;
  if(typeof _cards==="function"){
    window.showSetCards=function(which){
      var out=_cards.apply(this,arguments);
      try{ paint(which); }catch(e){}
      return out;
    };
  }
  /* 語言切換之後,那條列上別人的按鈕會換字,我這幾顆自己補。 */
  var _lang=window.applyLang;
  if(typeof _lang==="function"){
    window.applyLang=function(){ var o=_lang.apply(this,arguments); relabel(); return o; };
  }
  /* 補強掛上來的時候可能已經停在 04 了。 */
  if(typeof SET_TAB!=="undefined") paint(SET_TAB);
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
else boot();
})();
/*!ui-pack:tabs.js:end*/
