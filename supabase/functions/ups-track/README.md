# 追蹤 API(UPS 貨況)· Tracking API

「4. 追蹤查詢」那一頁按下「查 UPS 貨況」時,號碼會送到這一支函式,由它拿憑證去問 UPS。
憑證只放在 Supabase 的 secrets 裡 —— 不在網頁裡、不在設定檔裡、不在這個 repo 裡。

The Tracking page's *Check UPS status* button posts the numbers to this function, which
holds the credentials and asks UPS. The credentials live only in Supabase secrets — never
in the page, the configuration file, or this repository.

---

## 誰做什麼 · Who does what

| 角色 Role | 做的事 What they do | 需要的東西 What they need |
|---|---|---|
| 架站的人 Installer | 部署函式、設定憑證 Deploy the function, set the secrets | Supabase 專案權限、UPS 憑證 |
| 一般同事 Everyone else | 在設定頁貼上網址、按「測試連線」 Paste the URL in settings, press Test connection | 只要一個登入帳號 A sign-in, nothing else |

設定存在帳號的設定檔裡(`global_rules.track_api_url`),所以一個人設好,
其他人登入就有 —— 不必每台電腦各設一次。

The endpoint is stored in the account's configuration (`global_rules.track_api_url`), so
one person sets it and everyone else gets it at sign-in — not once per machine.

---

## 步驟 · Steps

前兩步**不需要 UPS 憑證**。今天就能把路接起來,憑證哪天到再補第 3 步。
The first two steps need **no UPS credentials**. Lay the pipe today, add the credentials
the day they arrive.

### 1. 部署函式 Deploy

```bash
npm i -g supabase
supabase login
supabase link --project-ref <project-ref>      # 專案網址 https://<project-ref>.supabase.co
supabase functions deploy ups-track
```

### 2. 在畫面上填網址 Point the app at it

`01 General Setting → 3. 系統設定 → 🔎 追蹤 API` 貼上:

```
https://<project-ref>.supabase.co/functions/v1/ups-track
```

按「儲存設定」,再按「測試連線」。這時它會說**端點通了、UPS 憑證還沒設** —— 那是對的。

Press *Save settings*, then *Test connection*. It will say **endpoint reachable, UPS
credentials not set yet** — that is the correct answer at this stage.

### 3. 憑證到手那天 The day the credentials arrive

UPS Developer Portal(<https://developer.ups.com>)開一個應用程式,勾 **Tracking**,
拿到 Client ID / Client Secret,然後:

```bash
supabase secrets set UPS_CLIENT_ID=xxx UPS_CLIENT_SECRET=yyy
# 選填 optional
supabase secrets set UPS_ACCOUNT=<出貨帳號 shipper account>
supabase secrets set UPS_BASE=https://wwwcie.ups.com   # 測試環境 test environment
```

改完 secrets 要重新部署一次(`supabase functions deploy ups-track`)才會生效。
再按一次「測試連線」,應該說**都通了**。

Secrets take effect after a redeploy. Press *Test connection* again; it should say
**All good**.

---

## 「測試連線」在講什麼 · What Test connection is telling you

一句話對一個原因,不用猜。One sentence per cause, so nobody has to guess.

| 畫面上的話 What it says | 意思 What it means | 怎麼修 Fix |
|---|---|---|
| 沒有填 Edge Function | 這一格是空的,走站台自己的 `/api/track` | 想用 Supabase 就把網址填上 |
| 連不上這個端點 | 網址錯、函式沒部署,或 CORS 沒放行 | 對一次網址;`supabase functions deploy ups-track` |
| 這個網址上沒有函式(404) | 專案對、函式名錯或沒部署 | 函式名就是 `ups-track` |
| 不認得這個呼叫者(401) | 沒登入,或 anon 金鑰不對 | 重新登入;檢查 `auth-config.js` 的 `anonKey` |
| 端點通了,UPS 憑證還沒設 | 函式在,secrets 是空的 | 第 3 步 |
| 憑證設了,但 UPS 不接受 | Client ID/Secret 錯,或環境選錯 | 對一次憑證;`UPS_BASE` 是正式還是測試 |
| 都通了 | 可以查了 | — |

---

## 介面 · Interface

```
POST  { "numbers": ["1Z…", …] }        最多 200 個 · at most 200
 →    { "results": [ { tracking, status, code, statusCode, date, time, location,
                       delivered, deliveryType, deliveryDate, warning, error, errorCode } ] }

POST  { "ping": true }                  只驗設定,不花查詢額度 · checks setup, spends no lookup
 →    { ok, configured, auth, base }
```

* 回傳順序照傳入順序;單一個號碼查不到只在那一列的 `error` 說,不整批失敗。
  Results keep the input order; a number that fails only fails its own row.
* 只有**登入的人**能呼叫 —— 函式會用呼叫者的 token 去 Supabase 驗身分,
  免得 UPS 的查詢額度變成公開資源。
  Only **signed-in** callers get through: the function validates the caller's token
  against Supabase, so the UPS quota is not a public resource.
* 這一支和 Vercel 版的 `api/track.js` 回一模一樣的形狀,兩邊可以並存;
  畫面上填了網址就走這一支,留白就走站台自己的那一支。
  It returns exactly the same shape as the Vercel `api/track.js`, so both can coexist:
  the app uses this one when the URL is set, and the site's own one when it is empty.

---

## 環境變數 · Environment variables

| 名稱 Name | 必要 Required | 說明 |
|---|---|---|
| `UPS_CLIENT_ID` | ✓ | UPS 應用程式的 Client ID |
| `UPS_CLIENT_SECRET` | ✓ | 同一個應用程式的 Client Secret |
| `UPS_ACCOUNT` | | 出貨帳號,送 `x-merchant-id` |
| `UPS_BASE` | | 預設 `https://onlinetools.ups.com`;測試環境 `https://wwwcie.ups.com` |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | | 平台自動提供,不必自己設 |

`service_role` 金鑰**不要**放進來 —— 這一支不需要它。
Never put the `service_role` key here; this function does not need it.
