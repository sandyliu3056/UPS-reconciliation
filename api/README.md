# UPS 貨況查詢:`api/track.js` 的設定與修改

`api/track.js` 是 Vercel 的無伺服器函式。網頁「追蹤查詢」分頁的「查 UPS 貨況」把追蹤號送到站台自己的 `/api/track`,由這一支拿憑證向 UPS Tracking API 查詢,再把結果回給網頁。憑證只存在 Vercel 的環境變數,不在程式碼、不在網頁。

## 一、啟用(只要設三個環境變數)

1. 到 UPS Developer Portal(developer.ups.com)建立應用程式,產品勾 **Tracking**,取得 Client ID 與 Client Secret。
2. Vercel → 該專案 → **Settings → Environment Variables**,新增:

   | 變數 | 內容 |
   | --- | --- |
   | `UPS_CLIENT_ID` | 應用程式的 Client ID |
   | `UPS_CLIENT_SECRET` | 應用程式的 Client Secret |
   | `UPS_ACCOUNT` | 出貨帳號(x-merchant-id),選填 |

3. **Deployments → 最新一筆 → ⋯ → Redeploy**。環境變數是部署時讀的,改完一定要重新部署。
4. 驗證:瀏覽器開 `https://<站台網址>/api/track`,看到 `{"error":"method"}` 表示函式已部署;到「追蹤查詢」貼一個追蹤號按「查 UPS 貨況」,有狀態回來就完成。沒設變數時按鈕會回「尚未啟用」。

只有 Vercel 部署有這一支。GitHub Pages、Netlify 靜態站沒有 `/api/track`,按鈕會說尚未啟用;其餘功能不受影響。

## 二、要改 API 時改哪裡

全部在 `api/track.js`,改完 commit 到 `main`,Vercel 會自動重新部署。

| 要改的事 | 位置 |
| --- | --- |
| UPS 端點(正式 / 測試) | 檔頭 `TOKEN_URL`、`TRACK_URL`。測試環境把 `onlinetools.ups.com` 換成 `wwwcie.ups.com` |
| 回給網頁的欄位 | `pick()`:從 UPS 回應挑 `currentStatus`、最後一筆 `activity`、`deliveryDate` |
| 一次最多幾個號碼、同時幾條連線 | `MAX`(預設 200)、`PARALLEL`(預設 4) |
| 每一列的錯誤處理、429 重試 | `trackOne()` |
| token 快取 | `getToken()`,快到期前一分鐘換新 |

網頁那一端在 `index.html` 的 `trackUps()`:送 `POST /api/track`,body `{numbers:[…]}`;回應 `{results:[{tracking, status, code, date, time, location, delivered, error}]}`,照送入順序。改了回應欄位,`trackRender()` 與 `trackXlsx()` 要跟著改。

## 三、本機測試

```
npm test                      # 含 test/test-track-api.js,用假的 UPS 走完整流程,不需要憑證
node test/test-track-api.js   # 只跑這一支
```

要打真的 UPS 可以在本機裝 Vercel CLI 後 `vercel dev`,環境變數放在 `.env.local`(這個檔不要進 git)。

## 四、不能做的事

- 憑證不進 repo、不寫進 `index.html`、不貼進任何 issue 或訊息;`.githooks/pre-commit` 會擋常見的金鑰樣式,但擋不住的也一樣不能放。
- 不要在網頁端直接呼叫 UPS:瀏覽器會被跨網域擋下,而且那等於把憑證公開。
