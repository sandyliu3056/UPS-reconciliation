/* api/track.js:用假的 fetch 走一遍 —— 拿 token、逐號查詢、挑欄位、錯誤各自回在那一列。 */
const path=require('path');
const h=require(path.resolve(__dirname,'..','api','track.js'));
let pass=0,fail=0;
const ok=(c,m)=>{ c?(pass++,console.log('  ✓ '+m)):(fail++,console.log('  ✗ '+m)); };
const res=()=>{ const r={code:0,body:null,headers:{}}; r.setHeader=(k,v)=>{ r.headers[k]=v; }; r.status=c=>{ r.code=c; return r; }; r.json=b=>{ r.body=b; return r; }; return r; };
(async()=>{
  console.log('[1] 沒有憑證');
  delete process.env.UPS_CLIENT_ID; delete process.env.UPS_CLIENT_SECRET;
  let r=res(); await h({method:'POST',body:{numbers:['1ZTESTA1']}},r);
  ok(r.code===503&&r.body.error==='not_configured','503 not_configured');
  r=res(); await h({method:'GET'},r); ok(r.code===405,'GET 405');

  console.log('[2] 正常查詢');
  process.env.UPS_CLIENT_ID='id'; process.env.UPS_CLIENT_SECRET='secret'; process.env.UPS_ACCOUNT='ACCT';
  h._reset();
  const calls=[];
  h._fetch=async(url,opt)=>{
    calls.push({url,opt});
    if(/oauth\/token/.test(url)){
      ok(opt.method==='POST'&&/^Basic /.test(opt.headers.Authorization)&&opt.headers['x-merchant-id']==='ACCT'&&opt.body==='grant_type=client_credentials','token 請求:Basic auth、x-merchant-id、client_credentials');
      return {ok:true,status:200,json:async()=>({access_token:'tok',expires_in:14399})};
    }
    const num=decodeURIComponent(url.split('/details/')[1].split('?')[0]);
    ok(opt.headers.Authorization==='Bearer tok'&&opt.headers.transId&&opt.headers.transactionSrc,'追蹤請求帶 Bearer、transId、transactionSrc ('+num+')');
    if(num==='1ZTESTB2') return {ok:false,status:404,json:async()=>({response:{errors:[{code:'TW0001',message:'Tracking Information Not Found'}]}})};
    return {ok:true,status:200,json:async()=>({trackResponse:{shipment:[{package:[{currentStatus:{description:'Delivered',code:'011',statusCode:'D'},
      activity:[{date:'20260901',time:'141500',location:{address:{city:'LOS ANGELES',stateProvince:'CA',countryCode:'US'}}}],deliveryDate:[{type:'DEL',date:'20260901'}]}]}]}})};
  };
  r=res(); await h({method:'POST',body:{numbers:['1ztesta1',' 1ZTESTB2 ','1ZTESTA1','short']}},r);
  ok(r.code===200&&r.body.results.length===2,'兩個號碼(重複與太短的剔掉)→ 兩列');
  const a=r.body.results[0], b=r.body.results[1];
  ok(a.tracking==='1ZTESTA1'&&a.status==='Delivered'&&a.code==='011'&&a.date==='20260901'&&a.time==='141500'&&a.location==='LOS ANGELES, CA, US'&&a.delivered==='20260901'&&a.error==='','第一列:狀態、動態、地點、送達日');
  ok(b.tracking==='1ZTESTB2'&&b.status===''&&/Not Found/.test(b.error)&&b.errorCode==='TW0001','第二列:查不到,只有這一列帶 error');
  const tokenCalls=calls.filter(c=>/oauth/.test(c.url)).length;
  r=res(); await h({method:'POST',body:JSON.stringify({numbers:['1ZTESTA1']})},r);
  ok(r.code===200&&calls.filter(c=>/oauth/.test(c.url)).length===tokenCalls,'第二次查詢重用 token;body 是字串也吃');

  console.log('[3] token 失敗');
  h._reset(); h._fetch=async(url)=>({ok:false,status:401,json:async()=>({response:{errors:[{code:'10401',message:'Invalid credentials'}]}})});
  r=res(); await h({method:'POST',body:{numbers:['1ZTESTA1']}},r);
  ok(r.code===502&&/token 401/.test(r.body.error),'502,錯誤訊息帶狀態碼');
  console.log('\n── '+pass+' pass / '+fail+' fail ──');
  process.exit(fail?1:0);
})();
