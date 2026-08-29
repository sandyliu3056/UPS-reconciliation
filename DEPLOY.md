# 部署說明

## 內容

| 檔案 | 用途 |
| --- | --- |
| `index.html` | 工具本體。所有程式、樣式、圖示都在這一份裡面 |
| `favicon.svg` | 分頁圖示。`index.html` 內另有一份同步的 base64,不會產生額外請求 |
| `auth-config.js` | 登入模式與 Supabase 連線設定,部署後可單獨修改 |
| `supabase-js-2.112.3.js` | Supabase 用戶端,鎖版本 |
| `xlsx-0.18.5.full.min.js` | 試算表讀寫,鎖版本 |
| `vercel.json` | Vercel 的快取規則 |
| `_headers` | Netlify / Cloudflare Pages 的快取規則 |
| `.nojekyll` | GitHub Pages 必備,否則底線開頭的檔案會被略過 |
| `.githooks/pre-commit` | 阻擋客戶資料與金鑰進版本庫 |
| `sql/` | Supabase 資料表與 RLS。只在啟用 Supabase 登入時需要 |

## 部署

三個平台都是把這個資料夾的內容放到站台根目錄。

**Vercel**：連結 GitHub 倉庫後直接部署，`vercel.json` 會生效。框架選 Other，build command 留空，output directory 填 `.`。

**GitHub Pages**：推到分支後在 Settings → Pages 指定分支與根目錄。`.nojekyll` 一定要在。

**Netlify / Cloudflare Pages**：拖曳整個資料夾即可，`_headers` 會生效。

## 部署後檢查

1. 開站台首頁，確認左上角圖示是柯基與布偶貓
2. 右上 **Scene** 下拉切換 Recon 與 Audit，兩個場景都要正常動
3. **Colour** 下拉切換五組配色，場景要跟著換色
4. 用無痕視窗再開一次，確認拿到的是新版而不是快取

## 更新既有站台

直接覆蓋根目錄的 `index.html`，不要新增檔名不同的版本。`.gitignore` 會忽略 `index - *.html` 和 `download (*)` 這類瀏覽器下載的檔名，`git add` 會靜靜地沒有反應。

## 登入設定

`auth-config.js` 的 `authMode`：

- `open` — 不設密碼，開站就進入
- `local` — 用內建帳號名單登入（目前設定）
- `supabase` — 用 Supabase 帳號登入，需要先套用 `sql/` 裡的結構

`anonKey` 是瀏覽器端的公開金鑰。`service_role` 金鑰不可以放進這個檔案。

## 啟用 pre-commit 檢查

複製到新倉庫後執行一次：

```
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
```

檢查的是暫存區內容，`git add -f` 一樣擋得住。認的是資料形狀，不是把帳號寫進腳本裡。
