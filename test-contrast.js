/* 六組配色 × 淺色 chrome 的對比驗算。
   ink.css 裡的 color-mix 比例改了就重跑這一支 —— 這幾個數字是配色能不能用的
   底線,不是好看不好看的問題。WCAG AA 正文 4.5:1。 */
const TINT_NAV = 0.30, TINT_TH = 0.42, INK = 0.50, INK_TH = 0.28;  /* 與 ink.css 的 color-mix 相同 */

const THEMES = {
  "Milk Tea":  { accent:"#855822", panel:"#fbf4e8", text:"#3b2f23" },
  "Slate":     { accent:"#41586e", panel:"#e3e8ee", text:"#22303c" },
  "Sage":      { accent:"#4f6b48", panel:"#e0e8da", text:"#263323" },
  "Brown Gold":{ accent:"#351c15", panel:"#fffdf7", text:"#2b1a10" },
  "Wisteria":  { accent:"#6a4a92", panel:"#fbf8ff", text:"#33284a" },
  "Sky":       { accent:"#1b5390", panel:"#f4faff", text:"#152a40" },
};

const hx = h => [1,3,5].map(i => parseInt(h.substr(i,2),16)/255);
const mix = (a,b,p) => a.map((v,i) => v*p + b[i]*(1-p));
const lum = c => { const f=v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);
  const [r,g,b]=c.map(f); return .2126*r+.7152*g+.0722*b; };
const cr = (a,b) => { const x=lum(a),y=lum(b),hi=Math.max(x,y),lo=Math.min(x,y);
  return (hi+.05)/(lo+.05); };
const hex = c => "#"+c.map(v=>Math.round(v*255).toString(16).padStart(2,"0")).join("");

let pass=0, fail=0;
const AA = 4.5;
console.log("\n配色          側欄底      字         比   表頭底      字         比");
for (const [name,t] of Object.entries(THEMES)) {
  const a=hx(t.accent), p=hx(t.panel), x=hx(t.text);
  const nav=mix(a,p,TINT_NAV), th=mix(a,p,TINT_TH);
  const ink=mix(a,x,INK), ink2=mix(a,x,INK_TH);
  const cNav=cr(nav,ink), cTh=cr(th,ink2);
  const ok = cNav>=AA && cTh>=AA;
  ok ? pass++ : fail++;
  console.log(`${ok?"  ✓":"  ✗"} ${name.padEnd(11)}${hex(nav)}  ${hex(ink)}  ${cNav.toFixed(2).padStart(5)}   ${hex(th)}  ${hex(ink2)}  ${cTh.toFixed(2).padStart(5)}`);
}
console.log(`\n── ${pass} pass / ${fail} fail ──  (WCAG AA 正文 ${AA}:1)`);
process.exit(fail?1:0);
