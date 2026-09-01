/* 收掉 Enable/Disable 之後的回歸。重點在資料:卡收了,設定檔裡已有的
   停用項目不能被偷偷清掉,也不能躲起來。 */
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const {JSDOM}=require('jsdom');
const TARGET=process.argv[2]||path.join(ROOT,'deploy/index.html');
let pass=0,fail=0;
const ok=(c,m)=>{ c?(pass++,console.log('  \u2713 '+m)):(fail++,console.log('  \u2717 '+m)); };

const dom=new JSDOM(fs.readFileSync(TARGET,'utf8'),{runScripts:'outside-only',pretendToBeVisual:true});
const W=dom.window, D=W.document;
W.L=(zh,en)=>en; W.esc=s=>String(s);
W.uiConfirm=async()=>true;
let synced=0, reread=0, saved=0, rendered=0, repriced=0, toasted='';
W.rlSyncShared=()=>synced++;
W.readConfig=raw=>{ reread++; return {raw}; };
W.saveSettings=()=>saved++;
W.toast=m=>toasted=m;
W.priceShipment=()=>({}); W.renderRate=()=>repriced++;
W.DIRTY=false; W.SHIPS=[1,2,3]; W.RATED=[];
W.renderConfigTabs=function(){ rendered++; };
W.CFG={raw:{
  builtin_service_disabled:["2nd Day Air AM"],
  accessorial_disabled:["Reroute","Reschedule Delivery"],
  dynamic_surcharge_mapping:{"ABC":{name:"My Custom",enabled:false},"DEF":{name:"Other",enabled:true}}
}};

W.eval(fs.readFileSync(path.join(ROOT,'src/trim.js'),'utf8'));

(async()=>{
await new Promise(r=>{ if(D.readyState!=='loading') return r();
  D.addEventListener('DOMContentLoaded',()=>r()); W.setTimeout(r,500); });

console.log('\n[1] \u5361\u6536\u4e86\uff0c\u8cc7\u6599\u6c92\u52d5');
const css=[...D.querySelectorAll('style')].map(s=>s.textContent).join('');
ok(/#cardOnOff\{display:none !important\}/.test(css), 'cardOnOff \u7528 display \u84cb\u6389\uff08showSetCards \u6703\u62ff\u6389 hidden\uff09');
ok(/label:has\(#newChanOn\)\{display:none/.test(css), '03 \u90a3\u9846\u300cEnable this channel\u300d\u4e5f\u6536\u4e86');
ok(D.getElementById('newChanOn').checked, '\u90a3\u9846\u9810\u8a2d\u662f\u52fe\u7684 \u2014\u2014 \u65b0\u6e20\u9053\u4e00\u5f8b\u555f\u7528');
ok(W.CFG.raw.accessorial_disabled.length===2&&W.CFG.raw.builtin_service_disabled.length===1,
   '\u8a2d\u5b9a\u6a94\u88e1\u7684\u505c\u7528\u9805\u76ee\u4e00\u500b\u90fd\u6c92\u88ab\u52d5');

console.log('\n[2] \u9084\u5728\u505c\u7528\u4e2d\u7684\u6771\u897f\u6709\u88ab\u8b1b\u51fa\u4f86');
const box=D.getElementById('trimLeft');
ok(!!box, '3. System \u90a3\u4e00\u9801\u591a\u4e86\u4e00\u884c\u63d0\u793a');
ok(box&&box.nextElementSibling&&box.nextElementSibling.id==='cardFuelElig', '\u653e\u5728\u71c3\u6cb9\u9069\u7528\u90a3\u5f35\u5361\u4e0a\u9762');
ok(box&&/channel.*×1/.test(box.textContent)&&/fee types.*×2/.test(box.textContent)&&/custom surcharge.*×1/.test(box.textContent),
   '\u4e09\u985e\u5404\u5e7e\u500b\u90fd\u5beb\u4e86\uff1a'+box.textContent.replace(/\s+/g,' ').slice(0,80));
ok(box&&/Reroute/.test(box.textContent)&&/My Custom/.test(box.textContent), '\u540d\u5b57\u4e5f\u5217\u51fa\u4f86');
ok(box&&/priced at zero/.test(box.textContent), '\u8b1b\u660e\u767d\u505c\u7528\u7684\u9644\u52a0\u8cbb\u6703\u6536 0');
ok(!!D.getElementById('trimClear'), '\u6709\u4e00\u9846\u300c\u5168\u90e8\u6062\u5fa9\u300d');

console.log('\n[3] \u6309\u4e0b\u53bb\u624d\u6e05\uff0c\u6e05\u4e86\u624d\u91cd\u7b97');
D.getElementById('trimClear').click();
await new Promise(r=>W.setTimeout(r,30));
ok(W.CFG.raw.builtin_service_disabled.length===0&&W.CFG.raw.accessorial_disabled.length===0,
   '\u5169\u500b\u6e05\u55ae\u6e05\u7a7a');
ok(W.CFG.raw.dynamic_surcharge_mapping.ABC.enabled===true, '\u81ea\u8a02\u9644\u52a0\u8cbb\u4e5f\u6062\u5fa9');
ok(W.CFG.raw.dynamic_surcharge_mapping.DEF.enabled===true, '\u672c\u4f86\u5c31\u958b\u8457\u7684\u6c92\u88ab\u52d5');
ok(synced===1&&reread===1&&W.DIRTY===true&&saved===1, 'rlSyncShared \u2192 readConfig \u2192 DIRTY \u2192 saveSettings\uff0c\u7167 bindOnOff \u90a3\u4e00\u4e32');
ok(rendered>=1, '\u91cd\u756b');
ok(repriced===1&&W.RATED.length===3, '\u91cd\u7b97\u4e86\u4e09\u7b46');
ok(/Re-enabled 4/.test(toasted), 'toast\uff1a'+toasted);
ok(!D.getElementById('trimLeft'), '\u6e05\u5b8c\u63d0\u793a\u5c31\u62ff\u6389');

console.log('\n[4] \u8a2d\u5b9a\u6a94\u4e7e\u6de8\u6642\u4ec0\u9ebc\u90fd\u4e0d\u51fa\u73fe');
W.CFG={raw:{}}; W.renderConfigTabs();
ok(!D.getElementById('trimLeft'), '\u6c92\u6709\u505c\u7528\u9805\u76ee\u5c31\u6c92\u6709\u90a3\u4e00\u884c');
ok(rendered>=2, '\u5305\u4f4f\u4e86 renderConfigTabs\uff0c\u539f\u672c\u7684\u7167\u8dd1');

console.log(`\n\u2500\u2500 ${pass} pass / ${fail} fail \u2500\u2500`);
process.exit(fail?1:0);
})();
