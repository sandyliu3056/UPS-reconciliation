/*!ui-pack:trim.js:start*/
/* ══════════════════════════════════════════════════════════════════════
   拿掉「🔌 Enable / Disable」那張卡
   整段貼在 index.html 最後那個 script 結束標籤之前(接在 tabs.js 後面)。

   那張卡兩張表:渠道停用只影響畫面,計價從來沒讀過它;附加費停用會讓
   那一項附加費一律收 0。兩個都不需要 —— 卡收起來,連帶把 03 新增渠道
   表單上那顆「Enable this channel」也收掉,不然它勾掉時會把新渠道寫進
   一個再也看不到的停用清單。

   資料不動。設定檔裡已經有的停用項目照舊生效 —— 那是碰到金額的東西,
   不能因為收了一張卡就自己清掉。但也不能讓它躲起來:設定檔裡若還有
   停用中的項目,3. System 那一頁會出現一行提示與一顆「清除」鈕,
   按了才清,清了才重算。設定檔乾淨的話那一行根本不會出現。
   ══════════════════════════════════════════════════════════════════════ */
(function(){
"use strict";

/* 讀出目前還在停用中的東西。三個來源:渠道、內建附加費、自訂附加費。 */
function leftovers(){
  if(typeof CFG==="undefined"||!CFG||!CFG.raw) return null;
  var raw=CFG.raw;
  var chan=(raw.builtin_service_disabled||[]).slice();
  var acc=(raw.accessorial_disabled||[]).slice();
  var dyn=Object.entries(raw.dynamic_surcharge_mapping||{})
    .filter(function(kv){ return kv[1]&&kv[1].enabled===false; })
    .map(function(kv){ return String((kv[1]&&kv[1].name)||kv[0]); });
  return {chan:chan, acc:acc, dyn:dyn, n:chan.length+acc.length+dyn.length};
}

function L2(zh,en){ return (typeof L==="function")?L(zh,en):en; }

function paint(){
  var host=document.getElementById("cardFuelElig"); if(!host) return;
  var box=document.getElementById("trimLeft");
  var lo=leftovers();
  if(!lo||!lo.n){ if(box) box.remove(); return; }
  if(!box){
    box=document.createElement("div");
    box.id="trimLeft"; box.className="note warn";
    host.parentNode.insertBefore(box,host);
  }
  var parts=[];
  if(lo.chan.length) parts.push(L2("渠道 "+lo.chan.length+" 條","channel"+(lo.chan.length>1?"s":"")+" ×"+lo.chan.length));
  if(lo.acc.length)  parts.push(L2("附加費 "+lo.acc.length+" 項","fee type"+(lo.acc.length>1?"s":"")+" ×"+lo.acc.length));
  if(lo.dyn.length)  parts.push(L2("自訂附加費 "+lo.dyn.length+" 項","custom surcharge"+(lo.dyn.length>1?"s":"")+" ×"+lo.dyn.length));
  var names=[].concat(lo.chan,lo.acc,lo.dyn);
  box.innerHTML=
    "<b>"+L2("設定檔裡還有停用中的項目:","Still disabled in this configuration: ")+
    parts.join(L2("、",", "))+"</b> — "+
    (typeof esc==="function"?esc(names.join(", ")):names.join(", "))+". "+
    L2("停用的附加費會一律收 0。停用功能已經收起來,要把它們全部恢復:",
       "Disabled fee types are priced at zero. The switch is gone; to re-enable all of them: ")+
    ' <button class="act ghost sm" id="trimClear">'+L2("全部恢復","Re-enable all")+"</button>";
  var b=document.getElementById("trimClear");
  if(b) b.onclick=clear;
}

/* 清掉三個清單。順序照 bindOnOff 原本那一串:同步共用區、重讀設定、
   標髒、存檔、重畫、重算 —— 一個都不能少,少了重算,畫面上是恢復了,
   報表上還是 0。 */
async function clear(){
  var lo=leftovers(); if(!lo||!lo.n) return;
  if(typeof uiConfirm==="function"){
    var okk=await uiConfirm({title:L2("恢復停用的項目","Re-enable disabled items"),
      body:L2("會把 "+lo.n+" 個項目全部恢復,並重算目前載入的帳單。",
              "Re-enables all "+lo.n+" item(s) and reprices the loaded invoice."),
      okText:L2("恢復","Re-enable")});
    if(!okk) return;
  }
  var raw=CFG.raw;
  raw.builtin_service_disabled=[];
  raw.accessorial_disabled=[];
  Object.values(raw.dynamic_surcharge_mapping||{}).forEach(function(d){
    if(d&&d.enabled===false) d.enabled=true; });
  if(typeof rlSyncShared==="function") rlSyncShared();
  if(typeof readConfig==="function") CFG=readConfig(CFG.raw);
  if(typeof DIRTY!=="undefined") DIRTY=true;
  if(typeof saveSettings==="function") saveSettings();
  if(typeof renderConfigTabs==="function") renderConfigTabs();
  if(typeof RATED!=="undefined"&&RATED&&typeof SHIPS!=="undefined"&&SHIPS&&
     typeof priceShipment==="function"&&typeof renderRate==="function"){
    RATED=SHIPS.map(function(x){ return priceShipment(CFG,x); }); renderRate();
  }
  if(typeof toast==="function") toast(L2("已恢復 "+lo.n+" 個項目。","Re-enabled "+lo.n+" item(s)."),true);
  paint();
}

/* 設定每次重畫都跟著看一次 —— 載了新的設定檔,那一行要跟著換。 */
var _rct=window.renderConfigTabs;
if(typeof _rct==="function"){
  window.renderConfigTabs=function(){ var o=_rct.apply(this,arguments); try{ paint(); }catch(e){} return o; };
}
function boot(){ try{ paint(); }catch(e){} }
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
else boot();
})();
/*!ui-pack:trim.js:end*/
