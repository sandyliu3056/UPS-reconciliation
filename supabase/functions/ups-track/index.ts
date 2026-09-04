// UPS 貨況查詢代理(Tracking API)。
// 瀏覽器不能直接問 UPS —— 要 OAuth 憑證,而且跨網域會被擋 —— 所以憑證放這裡,
// 由 Supabase 代管,前端只丟追蹤號進來,拿回目前狀態、最後一筆動態、送達日。
//
// 這一支和 api/track.js(Vercel 版)回同一個形狀,前端因此不必知道自己接的是誰:
//   POST { numbers: ["1Z…", …] }        最多 200 個
//   -> { results: [{ tracking, status, code, statusCode, date, time, location,
//                    delivered, deliveryType, deliveryDate, warning, error, errorCode }] }
//   POST { ping: true }
//   -> { ok: true, configured: true|false, base }      只驗證設定,不花查詢額度
//
// 需要的環境變數(supabase secrets set ...):
//   UPS_CLIENT_ID       UPS 開發者應用程式的 Client ID
//   UPS_CLIENT_SECRET   同一個應用程式的 Client Secret
//   UPS_ACCOUNT         選填,出貨帳號(x-merchant-id)
//   UPS_BASE            選填,預設正式環境 https://onlinetools.ups.com
//                       測試環境填 https://wwwcie.ups.com
// SUPABASE_URL / SUPABASE_ANON_KEY 由平台自動提供。
//
// 部署:
//   supabase functions deploy ups-track
//   supabase secrets set UPS_CLIENT_ID=... UPS_CLIENT_SECRET=...
// 部署後把函式網址填進「01 General Setting → 3. 系統設定 → 追蹤 API」:
//   https://<專案>.supabase.co/functions/v1/ups-track
//
// 憑證還沒有也可以先部署:那時候查詢會回 503 not_configured,畫面會照實說
// 「函式在、憑證還沒設」,而不是含糊地說查詢失敗。設定的步驟因此可以分兩天做。

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const UPS_ID = Deno.env.get("UPS_CLIENT_ID") || "";
const UPS_SECRET = Deno.env.get("UPS_CLIENT_SECRET") || "";
const UPS_ACCOUNT = Deno.env.get("UPS_ACCOUNT") || "";
const UPS_BASE = (Deno.env.get("UPS_BASE") || "https://onlinetools.ups.com").replace(/\/+$/, "");

const MAX = 200;      // 一次最多幾個號碼:再多就該分批,免得撞函式的執行時間上限
const PARALLEL = 4;   // 同時打幾個:UPS 有速率限制,四條併行是安全又不慢的折衷

const CORS = {
  "Access-Control-Allow-Origin": "*",
  // 前端會連 apikey 一起送,預檢就必須明著允許 —— 少列一個,瀏覽器會擋在
  // preflight,而且只回「Failed to fetch」,看不出是哪個標頭被拒。
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// UPS OAuth token 存在模組層,重複用到快過期為止 —— Edge Function 常常是熱的,
// 每一個號碼都重新換 token 會很慢,也容易撞 UPS 的速率限制。
let TOKEN = "";
let TOKEN_EXP = 0;
async function upsToken(): Promise<string> {
  const now = Date.now();
  if (TOKEN && now < TOKEN_EXP - 60_000) return TOKEN;
  const headers: Record<string, string> = {
    "Authorization": `Basic ${btoa(`${UPS_ID}:${UPS_SECRET}`)}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (UPS_ACCOUNT) headers["x-merchant-id"] = UPS_ACCOUNT;
  const res = await fetch(`${UPS_BASE}/security/v1/oauth/token`, {
    method: "POST",
    headers,
    body: "grant_type=client_credentials",
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token) {
    throw new Error(`token ${res.status}: ${JSON.stringify(j).slice(0, 200)}`);
  }
  TOKEN = String(j.access_token);
  TOKEN_EXP = now + Math.max(60, Number(j.expires_in || 14000)) * 1000;
  return TOKEN;
}

// 從 UPS 的回應挑出畫面要的那幾格。找不到的鍵一律回空字串,不回 undefined ——
// 前端那張表每一欄都要印得出東西,空字串印得出來,undefined 會印成 "undefined"。
function pick(j: any) {
  const sh = ((j && j.trackResponse && j.trackResponse.shipment) || [])[0] || {};
  const pk = (sh.package || [])[0] || {};
  const cs = pk.currentStatus || {};
  const act = (pk.activity || [])[0] || {};
  const loc = (act.location && act.location.address) || {};
  const dd = (pk.deliveryDate || [])[0] || {};
  const warn = (sh.warnings || pk.warnings || [])[0] || {};
  return {
    status: cs.description || "",
    code: cs.code || "",
    statusCode: cs.statusCode || "",
    date: act.date || "",
    time: act.time || "",
    location: [loc.city, loc.stateProvince, loc.countryCode].filter(Boolean).join(", "),
    delivered: dd.type === "DEL" ? (dd.date || "") : "",
    deliveryType: dd.type || "",
    deliveryDate: dd.date || "",
    warning: warn.message || "",
  };
}

// 只留看起來像追蹤號的,去掉重複,最多 MAX 個。順序照傳入的順序。
function clean(numbers: unknown): string[] {
  const out: string[] = [], seen = new Set<string>();
  for (const n of (Array.isArray(numbers) ? numbers : [])) {
    const v = String(n ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (v.length < 8 || seen.has(v)) continue;
    seen.add(v); out.push(v);
    if (out.length >= MAX) break;
  }
  return out;
}

async function trackOne(token: string, num: string) {
  const url = `${UPS_BASE}/api/track/v1/details/${encodeURIComponent(num)}`
    + "?locale=en_US&returnSignature=false&returnMilestones=false";
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${token}`,
    "transId": crypto.randomUUID(),
    "transactionSrc": "ups-reconciliation",
  };
  // 429 只重試一次:UPS 的速率限制是以分鐘計的,重試到底只會把整批拖垮。
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await fetch(url, { method: "GET", headers });
    if (r.status === 429 && attempt === 0) {
      await new Promise((x) => setTimeout(x, 1200));
      continue;
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      // 一個號碼查不到,只在那一列說 —— 不讓它拖垮整批。
      const err = (j?.response?.errors || [])[0] || {};
      return { tracking: num, ...pick(null), error: err.message || `HTTP ${r.status}`,
               errorCode: err.code || String(r.status) };
    }
    return { tracking: num, ...pick(j), error: "", errorCode: "" };
  }
  return { tracking: num, ...pick(null), error: "rate limited", errorCode: "429" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ error: "POST only" }, 405);

  // ---- 只讓登入的人用,別把 UPS 額度開給全世界 ----
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer /i, "");
  if (!token) return reply({ error: "not signed in" }, 401);
  const asCaller = createClient(SUPA_URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: who, error: whoErr } = await asCaller.auth.getUser();
  if (whoErr || !who?.user) return reply({ error: "not signed in" }, 401);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return reply({ error: "bad request body" }, 400);
  }

  // 「測試連線」:證明函式在、認得呼叫者、憑證設了沒有 —— 不查任何號碼,
  // 所以還沒有憑證的時候也可以先把這條路接起來。
  if (body.ping === true) {
    const configured = !!(UPS_ID && UPS_SECRET);
    if (!configured) return reply({ ok: true, configured: false, base: UPS_BASE });
    try {
      await upsToken();
      return reply({ ok: true, configured: true, auth: true, base: UPS_BASE });
    } catch (e) {
      return reply({ ok: true, configured: true, auth: false, base: UPS_BASE,
                     error: (e as Error).message || "token failed" });
    }
  }

  if (!UPS_ID || !UPS_SECRET) return reply({ error: "not_configured" }, 503);

  const list = clean(body.numbers);
  if (!list.length) return reply({ error: "no_numbers" }, 400);

  try {
    const tok = await upsToken();
    const out: unknown[] = new Array(list.length);
    let next = 0;
    const worker = async () => {
      while (next < list.length) {
        const i = next++;
        out[i] = await trackOne(tok, list[i]);
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, list.length) }, worker));
    return reply({ results: out });
  } catch (e) {
    const msg = String((e as Error).message || e);
    return reply({ error: msg.slice(0, 300) }, /^token/.test(msg) ? 502 : 500);
  }
});
