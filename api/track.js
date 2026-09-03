/* Vercel 無伺服器函式:UPS Tracking API 的代理。
   瀏覽器不能直接問 UPS(跨網域擋住,而且憑證不能放在網頁裡),所以由這一支拿憑證去問,
   網頁只跟自己的站台講話。憑證只從環境變數來,程式碼裡沒有、也不能有:
     UPS_CLIENT_ID      UPS Developer Portal 應用程式的 Client ID
     UPS_CLIENT_SECRET  同一個應用程式的 Client Secret
     UPS_ACCOUNT        出貨帳號(x-merchant-id),選填
   Vercel → 專案 → Settings → Environment Variables 設好三個值,重新部署即生效。

   POST /api/track   body {numbers:["1Z…", …]}(最多 200 個)
   → {results:[{tracking, status, code, date, time, location, delivered, error}]},照傳入順序。
   503 = 憑證沒設;502 = 拿不到 token。單一個號碼查不到只在那一列的 error 說,不整批失敗。 */
"use strict";
const TOKEN_URL="https://onlinetools.ups.com/security/v1/oauth/token";
const TRACK_URL="https://onlinetools.ups.com/api/track/v1/details/";
const MAX=200, PARALLEL=4;
/* token 大約四小時有效;同一個執行個體活著的期間重複用,快到期前一分鐘換新。 */
let TOKEN={value:"",exp:0};
async function getToken(fetchFn){
  if(TOKEN.value && Date.now()<TOKEN.exp-60000) return TOKEN.value;
  const id=process.env.UPS_CLIENT_ID||"", secret=process.env.UPS_CLIENT_SECRET||"", acct=process.env.UPS_ACCOUNT||"";
  const headers={"Content-Type":"application/x-www-form-urlencoded",
    "Authorization":"Basic "+Buffer.from(id+":"+secret).toString("base64")};
  if(acct) headers["x-merchant-id"]=acct;
  const r=await fetchFn(TOKEN_URL,{method:"POST",headers,body:"grant_type=client_credentials"});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||!j.access_token) throw new Error("token "+r.status+(j.response&&j.response.errors?" "+JSON.stringify(j.response.errors).slice(0,200):""));
  TOKEN={value:j.access_token, exp:Date.now()+Math.max(60,(+j.expires_in||14000))*1000};
  return TOKEN.value;
}
/* 從 UPS 的回應挑出畫面要的:目前狀態、最後一筆動態、送達日。 */
function pick(j){
  const sh=((j&&j.trackResponse&&j.trackResponse.shipment)||[])[0]||{};
  const pk=(sh.package||[])[0]||{};
  const cs=pk.currentStatus||{};
  const act=(pk.activity||[])[0]||{};
  const loc=(act.location&&act.location.address)||{};
  const dd=(pk.deliveryDate||[])[0]||{};
  const warn=(sh.warnings||pk.warnings||[])[0]||{};
  return {status:cs.description||"", code:cs.code||"", statusCode:cs.statusCode||"",
    date:act.date||"", time:act.time||"",
    location:[loc.city,loc.stateProvince,loc.countryCode].filter(Boolean).join(", "),
    delivered:dd.type==="DEL"?(dd.date||""):"", deliveryType:dd.type||"", deliveryDate:dd.date||"",
    warning:warn.message||""};
}
function clean(numbers){
  const out=[], seen=new Set();
  for(const n of (Array.isArray(numbers)?numbers:[])){
    const v=String(n==null?"":n).toUpperCase().replace(/[^A-Z0-9]/g,"");
    if(v.length<8||seen.has(v)) continue;
    seen.add(v); out.push(v);
    if(out.length>=MAX) break;
  }
  return out;
}
async function trackOne(fetchFn, token, num){
  const url=TRACK_URL+encodeURIComponent(num)+"?locale=en_US&returnSignature=false&returnMilestones=false";
  const headers={"Authorization":"Bearer "+token, "transId":require("crypto").randomUUID(), "transactionSrc":"ups-reconciliation"};
  for(let attempt=0;attempt<2;attempt++){
    const r=await fetchFn(url,{method:"GET",headers});
    if(r.status===429 && attempt===0){ await new Promise(x=>setTimeout(x,1200)); continue; }
    const j=await r.json().catch(()=>({}));
    if(!r.ok){
      const err=(j.response&&j.response.errors&&j.response.errors[0])||{};
      return Object.assign({tracking:num}, pick(null), {error:(err.message||("HTTP "+r.status)), errorCode:err.code||String(r.status)});
    }
    return Object.assign({tracking:num}, pick(j), {error:""});
  }
  return Object.assign({tracking:num}, pick(null), {error:"rate limited", errorCode:"429"});
}
async function track(numbers, fetchFn){
  const list=clean(numbers);
  const token=await getToken(fetchFn);
  const out=new Array(list.length);
  let next=0;
  const worker=async()=>{ while(next<list.length){ const i=next++; out[i]=await trackOne(fetchFn, token, list[i]); } };
  await Promise.all(Array.from({length:Math.min(PARALLEL,list.length)},worker));
  return out;
}
function readBody(req){
  if(req.body && typeof req.body==="object") return Promise.resolve(req.body);
  if(typeof req.body==="string"){ try{ return Promise.resolve(JSON.parse(req.body)); }catch(e){ return Promise.resolve({}); } }
  return new Promise(res=>{ let s=""; req.on("data",c=>s+=c); req.on("end",()=>{ try{ res(JSON.parse(s||"{}")); }catch(e){ res({}); } }); req.on("error",()=>res({})); });
}
module.exports=async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="POST"){ res.status(405).json({error:"method"}); return; }
  if(!process.env.UPS_CLIENT_ID||!process.env.UPS_CLIENT_SECRET){ res.status(503).json({error:"not_configured"}); return; }
  const body=await readBody(req);
  const list=clean(body.numbers);
  if(!list.length){ res.status(400).json({error:"no_numbers"}); return; }
  const fetchFn=module.exports._fetch||globalThis.fetch;
  try{
    const results=await track(list, fetchFn);
    res.status(200).json({results});
  }catch(e){
    const msg=String((e&&e.message)||e);
    res.status(/^token/.test(msg)?502:500).json({error:msg.slice(0,300)});
  }
};
module.exports._fetch=null;      /* 測試時換成假的 fetch */
module.exports._reset=()=>{ TOKEN={value:"",exp:0}; };
module.exports.pick=pick; module.exports.clean=clean;
