/* 六組配色 × 側欄與表頭的對比驗算。
   ink.css 裡的 color-mix 比例改了就重跑這一支 —— 這幾個數字是配色能不能用的
   底線,不是好看不好看的問題。WCAG AA 正文 4.5:1。

   做法:底色一個字都不動(= --accent),字用 --tab 摻白 62%,
   並拿掉 .nav button 的 opacity:.82 —— 那一層是隱形的殺手,
   草綠名目上 3.03,乘完只剩 2.54。 */
const INK_WHITE = 0.38;   /* color-mix(in srgb, var(--tab) 38%, #fff) */
const OLD_OPACITY = 0.82; /* 原本 .nav button 的 opacity,拿掉了 */

const THEMES = {
  "Milk Tea":  { accent:"#855822", tab:"#dcc49a" },
  "Slate":     { accent:"#41586e", tab:"#b3bec9" },
  "Sage":      { accent:"#4f6b48", tab:"#adbea4" },
  "Brown Gold":{ accent:"#351c15", tab:"#ffb500" },
  "Wisteria":  { accent:"#6a4a92", tab:"#ddc9f2" },
  "Sky":       { accent:"#1b5390", tab:"#a9d1f7" },
};

const hx = h => [1,3,5].map(i => parseInt(h.substr(i,2),16)/255);
const mix = (a,b,p) => a.map((v,i) => v*p + b[i]*(1-p));
const lum = c => { const f=v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);
  const [r,g,b]=c.map(f); return .2126*r+.7152*g+.0722*b; };
const cr = (a,b) => { const x=lum(a),y=lum(b),hi=Math.max(x,y),lo=Math.min(x,y);
  return (hi+.05)/(lo+.05); };
const hex = c => "#"+c.map(v=>Math.round(v*255).toString(16).padStart(2,"0")).join("");
const W = [1,1,1];

let pass=0, fail=0;
const AA = 4.5;
console.log("\n配色          側欄底     字         現在     原本(含 opacity)");
for (const [name,t] of Object.entries(THEMES)) {
  const a=hx(t.accent), tab=hx(t.tab);
  const ink=mix(tab,W,INK_WHITE);
  const now=cr(a,ink);
  const before=cr(a, mix(tab,a,OLD_OPACITY));   /* 舊的:--tab 疊 .82 在主色上 */
  const ok = now>=AA;
  ok ? pass++ : fail++;
  console.log(`${ok?"  ✓":"  ✗"} ${name.padEnd(11)}${t.accent}  ${hex(ink)}  ${now.toFixed(2).padStart(6)}   ${before.toFixed(2).padStart(6)}`);
}
console.log(`\n── ${pass} pass / ${fail} fail ──  (WCAG AA 正文 ${AA}:1)`);
process.exit(fail?1:0);
