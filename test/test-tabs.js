/* 04 分層的回歸。用真的頁面跑 —— 那七張面板的巢狀結構、data-i18n key
   都是從 index.html 讀出來的,不是我假造的。 */
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const {JSDOM}=require('jsdom');
const TARGET=process.argv[2]||path.join(ROOT,'deploy/index.html');

let pass=0,fail=0;
const ok=(c,m)=>{ c?(pass++,console.log('  \u2713 '+m)):(fail++,console.log('  \u2717 '+m)); };

const dom=new JSDOM(fs.readFileSync(TARGET,'utf8'),
  {runScripts:'outside-only',pretendToBeVisual:true});
const W=dom.window, D=W.document;

/* 重建她那幾個最外層變數,行為與原檔相同 */
W.SET_GROUPS={general:["setting","code2","sys"],rate:["cus"],
              cat:["chan","rules","demand"],fill:["ratefill"]};
W.RATE_TABS=[].concat(...Object.values(W.SET_GROUPS));
W.RATE_PAGE={setting:"setting",sys:"setting",code2:"code",cus:"cus",
             chan:"chan",rules:"rules",demand:"demand",ratefill:"ratefill"};
W.RATE_PER_LEVEL=new W.Set(["ratefill"]);
W.SET_TAB="ratefill";
W.LANG=1;
let cardsRan=0;
W.showSetCards=function(){ cardsRan++; };
let langRan=0;
W.applyLang=function(){ langRan++; };

const KEYS=["hd.ratefill","hd.baserate","hd.fuel","hd.acc","hd.dimf","hd.rulesforce","hd.demrate"];
const P=()=>D.getElementById("p-ratefill");
const keyOf=lf=>{ const h=lf.querySelector(":scope > h3"); if(!h) return "";
  const e=h.querySelector("[data-i18n]"); return e?e.getAttribute("data-i18n"):""; };
const card=k=>[...P().querySelectorAll(".lf")].find(lf=>keyOf(lf)===k);
const shown=()=>KEYS.filter(k=>{ const c=card(k); return c&&!c.hidden; });

console.log('\n[0] \u5957\u4e4b\u524d');
ok(!!P(), '\u627e\u5230 p-ratefill');
ok(KEYS.every(k=>!!card(k)), '\u4e03\u5f35\u9762\u677f\u90fd\u5728');
ok(card("hd.demrate").parentNode===card("hd.dimf"),
   'Demand \u672c\u4f86\u5305\u5728 DIM \u9664\u6578\u90a3\u5f35\u5361\u88e1\uff08markup \u5c11\u4e86\u4e00\u500b\u7d50\u675f\u6a19\u7c64\uff09');

W.eval(fs.readFileSync(path.join(ROOT,'src/tabs.js'),'utf8'));

(async()=>{
await new Promise(r=>{ if(D.readyState!=='loading') return r();
  D.addEventListener('DOMContentLoaded',()=>r()); W.setTimeout(r,500); });

console.log('\n[1] \u642c\u51fa\u4f86');
ok(card("hd.demrate").parentNode===P(), 'Demand \u642c\u5230\u8ddf DIM \u540c\u5c64');
ok(card("hd.rulesforce").parentNode===P(), '\u5c3a\u5bf8\u9580\u6abb\u4e5f\u642c\u51fa\u4f86');
ok(KEYS.every(k=>!!card(k)), '\u4e03\u5f35\u4e00\u5f35\u4e5f\u6c92\u5f04\u4e0d\u898b');

console.log('\n[2] \u7de8\u865f\u5217');
const row=D.querySelector('#rateSide .setnav-tabs[data-g="fill"]');
ok(!!row&&row.querySelectorAll("button[data-r]").length===4, '\u56db\u9846\u5b50\u9801\u6309\u9215');
ok([...row.querySelectorAll("button")].map(b=>b.dataset.r).join()==="ratefill,rfacc,rfsize,rfdem",
   '\u9806\u5e8f\uff1a\u904b\u8cbb \u2192 \u9644\u52a0\u8cbb \u2192 \u5c3a\u5bf8 \u2192 Demand');
ok(row.querySelector("button").textContent.indexOf("1.")===0, '\u5e36\u7de8\u865f\uff0c\u8ddf 01\u300103 \u4e00\u81f4');

console.log('\n[3] \u63a5\u9032\u5979\u539f\u672c\u90a3\u5e7e\u5f35\u8868');
ok(W.SET_GROUPS.fill.length===4, 'SET_GROUPS.fill \u56db\u500b');
ok(["rfacc","rfsize","rfdem"].every(k=>W.RATE_TABS.includes(k)),
   'RATE_TABS \u90fd\u8a8d\u5f97 \u2014\u2014 showSetTab \u624d\u4e0d\u6703\u628a\u5b83\u5011\u9000\u56de\u9996\u9801');
ok(["rfacc","rfsize","rfdem"].every(k=>W.RATE_PAGE[k]==="ratefill"),
   '\u56db\u500b\u5b50\u9801\u540c\u4e00\u500b section');
ok(["rfacc","rfsize","rfdem"].every(k=>W.RATE_PER_LEVEL.has(k)),
   '\u56db\u500b\u90fd\u662f\u6309\u5c64\u7684 \u2014\u2014 \u53f3\u4e0a\u89d2\u300c\u6b63\u5728\u7de8\u8f2f\u54ea\u4e00\u5c64\u300d\u4e0d\u6703\u6d88\u5931');

console.log('\n[4] \u9732\u5c0d\u7684\u5361');
const before=cardsRan;
W.showSetCards("ratefill");
ok(cardsRan===before+1, '\u5305\u4f4f\u4e86 showSetCards\uff0c\u539f\u672c\u90a3\u652f\u7167\u8dd1');
ok(shown().join()==="hd.ratefill,hd.baserate,hd.fuel", '1. \u904b\u8cbb\uff1a\u9801\u9996 + \u904b\u8cbb\u8868 + \u71c3\u6cb9');
W.showSetCards("rfacc");
ok(shown().join()==="hd.ratefill,hd.acc", '2. \u9644\u52a0\u8cbb');
W.showSetCards("rfsize");
ok(shown().join()==="hd.ratefill,hd.dimf,hd.rulesforce", '3. \u5c3a\u5bf8\uff1aDIM + \u9580\u6abb');
W.showSetCards("rfdem");
ok(shown().join()==="hd.ratefill,hd.demrate", '4. Demand');
ok(KEYS.every(k=>!card(k).hidden||k!=="hd.ratefill"), '\u9801\u9996\u90a3\u5f35\u56db\u500b\u5b50\u9801\u90fd\u5728');
W.showSetCards("");
ok(shown().length===7, '\u4e0d\u662f\u9019\u4e00\u7d44\u7684\u5c31\u5168\u9732 \u2014\u2014 \u4e0d\u6703\u51fa\u73fe\u4e00\u7247\u7a7a\u767d');

console.log('\n[5] \u63db\u8a9e\u8a00');
W.LANG=0; const lr=langRan; W.applyLang();
ok(langRan===lr+1, '\u539f\u672c\u7684 applyLang \u7167\u8dd1');
ok(row.querySelector("button").textContent.indexOf("\u904b\u8cbb")>0, '\u6309\u9215\u63db\u6210\u4e2d\u6587');
W.LANG=1; W.applyLang();
ok(row.querySelector("button").textContent.indexOf("Base")>0, '\u63db\u56de\u82f1\u6587');

console.log('\n[6] \u91cd\u8de1\u4e0d\u6703\u758a');
W.eval(fs.readFileSync(path.join(ROOT,'src/tabs.js'),'utf8'));
await new Promise(r=>W.setTimeout(r,20));
ok(row.querySelectorAll("button[data-r]").length===4, '\u518d\u8dd1\u4e00\u6b21\u9084\u662f\u56db\u9846');
ok(W.SET_GROUPS.fill.length===4, 'SET_GROUPS.fill \u4e5f\u6c92\u758a');

console.log(`\n\u2500\u2500 ${pass} pass / ${fail} fail \u2500\u2500`);
process.exit(fail?1:0);
})();
