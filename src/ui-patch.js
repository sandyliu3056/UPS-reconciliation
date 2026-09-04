/*!ui-pack:ui-patch.js:start*/
/* ══════════════════════════════════════════════════════════════════════
   介面補強 —— ESC 關窗、搜尋延後、表頭排序、首欄凍結
   整段貼在 index.html 最後那個 script 結束標籤之前。
   既有的繫結一行都不改;整段刪掉就回到原樣。
   ══════════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
var qs =function(s,r){ return (r||document).querySelector(s); };
var qsa=function(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };

/* ── 1. ESC 關掉最上層的視窗 ───────────────────────────────────────────
   二十五個視窗裡只有兩個吃 ESC。按下去等於按那個視窗自己的 ✕,
   所以每個視窗原本的收尾照舊會跑,不是把它藏起來而已。
   疊在一起時只關最上面那一層 —— 用打開的先後判斷,不是 DOM 順序,
   因為子視窗未必寫在父視窗後面。 */
var seq=0;
qsa(".modalbg").forEach(function(bg){
  new MutationObserver(function(){
    if(bg.classList.contains("on")) bg.dataset.openSeq=(++seq);
  }).observe(bg,{attributes:true,attributeFilter:["class"]});
});
function topModal(){
  var on=qsa(".modalbg.on");
  if(!on.length) return null;
  return on.sort(function(a,b){
    return (+a.dataset.openSeq||0)-(+b.dataset.openSeq||0); }).pop();
}
/* 記住是誰打開的,關掉之後焦點還給它 —— 不然 Tab 會從整頁最上面重來。 */
var opener=null;
document.addEventListener("mousedown",function(e){
  var b=e.target&&e.target.closest?e.target.closest("button"):null;
  if(b&&!b.closest(".modalbg")) opener=b;
},true);
document.addEventListener("keydown",function(e){
  if(e.key!=="Escape") return;
  var bg=topModal(); if(!bg) return;
  var x=qs(".modalhd .mx",bg); if(!x) return;
  e.preventDefault(); e.stopPropagation();
  x.click();
  if(opener&&document.contains(opener)&&!opener.closest(".modalbg")){
    try{ opener.focus(); }catch(_){}
  }
},false);

/* ── 2. 搜尋延後 ───────────────────────────────────────────────────────
   十個搜尋框都是每敲一個字整張表重畫一次。歷史那張六千列,
   打一組追蹤號要重畫十八次。改成停手之後才畫。
   做法是在捕捉階段擋住原本的 input,延後再補送一次同樣的事件 ——
   原本的 oninput 一行都不用碰,重新繫結也不會把這層蓋掉。 */
var DEB_MS=180;
var DEB_IDS=["accMgrSearch","cusSearch","chanSearch","accSearch","demSearch",
             "trkSearch","lvlSearch","sysSearch","codeSearch","chgSearch"];
var pend={};
document.addEventListener("input",function(e){
  var el=e.target;
  if(!el||!el.id||DEB_IDS.indexOf(el.id)<0) return;
  if(e.__thru) return;                       /* 這一發是延後之後自己補的 */
  e.stopImmediatePropagation();
  clearTimeout(pend[el.id]);
  pend[el.id]=setTimeout(function(){
    var ev=new Event("input",{bubbles:true});
    ev.__thru=1;
    el.dispatchEvent(ev);
  },DEB_MS);
},true);
/* Enter 不等 —— 打完直接按就馬上查。 */
document.addEventListener("keydown",function(e){
  var el=e.target;
  if(e.key!=="Enter"||!el||!el.id||DEB_IDS.indexOf(el.id)<0) return;
  clearTimeout(pend[el.id]);
  var ev=new Event("input",{bubbles:true}); ev.__thru=1;
  el.dispatchEvent(ev);
},true);

/* ── 3. 表頭排序 ───────────────────────────────────────────────────────
   只給看數字的那幾張:誰的毛利最低、哪一筆差最多,現在得自己一列一列找。
   排序只動畫面上的列,不碰任何金額;重畫之後回到原本的順序。 */
var SORT_IDS=["tRecon","tReconChg","tAnaCus","tAnaLvl",
              "tChan","tAccMgr","tHist","tRate"];
/* 缺值(—、not set、空白)不參與比大小:不管往哪個方向排,永遠沉底。 */
var MISS_RE=/^(—|–|-|not set|not loaded|未設定|未載入|n\/a)?$/i;
function cellVal(td){
  var t=(td.textContent||"").trim();
  if(MISS_RE.test(t)) return {n:null,s:"",miss:1};
  /* 日期欄照時間排,不照字串:2026-08-22 與 08/29/2026 都認得。 */
  var d=/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/.exec(t);
  if(d) return {n:Date.UTC(+d[1],+d[2]-1,+d[3]),s:t};
  if((d=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t)))
    return {n:Date.UTC(+d[3],+d[1]-1,+d[2]),s:t};
  var neg=/^\(.*\)$/.test(t)||/^-|^\$-/.test(t);
  var m=t.replace(/[()]/g,"").replace(/[$,%\s]/g,"").replace(/^-/,"");
  if(m!==""&&/^\d+(\.\d+)?$/.test(m)) return {n:neg?-parseFloat(m):parseFloat(m),s:t};
  return {n:null,s:t.toLowerCase()};
}
function sortTable(tb,idx,dir){
  var all=Array.prototype.slice.call(tb.rows)
           .filter(function(r){ return !r.querySelector("td.empty")&&r.cells.length>idx; });
  /* 子列(class=sub)跟著它上面那一列主列走:排序只看主列,子列原封跟過去。 */
  var units=[];
  all.forEach(function(r){
    if(r.classList.contains("sub")&&units.length) units[units.length-1].push(r);
    else units.push([r]);
  });
  if(units.length<2) return;
  units.forEach(function(u,i){ if(u[0].__ord===undefined) u[0].__ord=i; });
  if(dir===0){ units.sort(function(a,b){ return a[0].__ord-b[0].__ord; }); }
  else units.sort(function(a,b){
    var x=cellVal(a[0].cells[idx]), y=cellVal(b[0].cells[idx]), c;
    if(x.miss||y.miss) return (x.miss?1:0)-(y.miss?1:0);
    if(x.n!==null&&y.n!==null) c=x.n-y.n;
    else if(x.n!==null) c=-1;
    else if(y.n!==null) c=1;
    else c=x.s<y.s?-1:x.s>y.s?1:0;
    return dir<0?-c:c;
  });
  units.forEach(function(u){ u.forEach(function(r){ tb.appendChild(r); }); });
}
/* 重畫之後排序不歸零:tbody 被重畫、表頭上還掛著方向時,照原方向再排
   一次;表頭整列被換掉(tRate 每次 render 都重寫)就重新掛一次排序。 */
function keepSorted(t){
  if(!t||t.__sortWatch||typeof MutationObserver==="undefined") return;
  t.__sortWatch=1;
  var mo=new MutationObserver(function(){
    if(t.__sorting) return;
    var hr=t.tHead&&t.tHead.rows[t.tHead.rows.length-1];
    if(hr&&!hr.isConnected){ t.__sortArmed=0; }
    if(!t.__sortArmed) armSort(t);
    hr=t.tHead&&t.tHead.rows[t.tHead.rows.length-1];
    if(!hr) return;
    var cells=Array.prototype.slice.call(hr.cells), th=null, idx=-1;
    for(var i=0;i<cells.length;i++) if(cells[i].dataset.dir){ th=cells[i]; idx=i; break; }
    if(!th) return;
    t.__sorting=1;
    try{ if(t.tBodies[0]) sortTable(t.tBodies[0], idx, +th.dataset.dir); }
    finally{ setTimeout(function(){ t.__sorting=0; },0); }
  });
  mo.observe(t,{childList:true,subtree:true});
}
function armSort(t){
  if(!t||!t.tHead||!t.tHead.rows.length||t.__sortArmed) return;
  t.__sortArmed=1; t.classList.add("sortable");
  var hr=t.tHead.rows[t.tHead.rows.length-1];
  Array.prototype.slice.call(hr.cells).forEach(function(th,i){
    if(!(th.textContent||"").trim()) return;     /* 勾選欄、操作欄不排 */
    th.tabIndex=0;
    /* 這一欄是數字還是文字,看第一列有值的儲存格。數字先給大的
       ——「誰的毛利最低」問的是排頭那幾筆;文字先 A 到 Z。 */
    var firstDir=function(){
      var body=t.tBodies[0]; if(!body) return -1;
      for(var r=0;r<body.rows.length;r++){
        var c=body.rows[r].cells[i]; if(!c) continue;
        var v=cellVal(c); if(v.n!==null) return -1; if(v.s) return 1;
      }
      return -1;
    };
    var hit=function(){
      var f=firstDir(), d=(+th.dataset.dir||0);
      d = d===0 ? f : d===f ? -f : 0;            /* 首選 → 反向 → 原順序 */
      Array.prototype.slice.call(hr.cells).forEach(function(o){
        if(o!==th) delete o.dataset.dir; });
      if(d===0) delete th.dataset.dir; else th.dataset.dir=d;
      if(t.tBodies[0]) sortTable(t.tBodies[0],i,d);
    };
    th.addEventListener("click",hit);
    th.addEventListener("keydown",function(e){
      if(e.key==="Enter"||e.key===" "){ e.preventDefault(); hit(); } });
  });
}

/* ── 4. 首欄凍結 ───────────────────────────────────────────────────────
   十一到十三欄的表往右捲之後,看到一排數字卻不知道是誰的。
   第一欄釘住,身分就一直在。 */
var PIN_IDS=["tRecon","tReconChg","tSize","tAnaCus","tAnaLvl"];

function arm(){
  SORT_IDS.forEach(function(id){ var t=document.getElementById(id);
    armSort(t); keepSorted(t); });
  PIN_IDS.forEach(function(id){
    var t=document.getElementById(id); if(t) t.classList.add("pinfirst"); });
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",arm);
else arm();
})();
/*!ui-pack:ui-patch.js:end*/
