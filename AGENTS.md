# workshop-registration 專案卡

## 事實
- brain 頁：`brain/projects/labs/n8n-cloudflare-migration.md`（後端搬家進度）；業務背景 `brain/projects/client-work/ai-workshop-reed.md`
- 整合分支：`master`；沒有另外的正式分支（合併到 `master` 即由 GitHub Pages 自動發布）
- 部署：GitHub Pages `https://jimbo90015.github.io/workshop-registration/`（純靜態 HTML／JS，沒有 build）；資料層：沒有自己的，後端網址集中在 `endpoints.js`，全部由 Cloudflare Worker `hooks.breakshell.com` 提供（repo `jimbo90015/breakshell-workflows`；2026-10-17 報名端點搬完，舊的 n8n `darrenaitool.zeabur.app` 已不再使用）
- codegraph：無（用 Grep/Read）
- 併行工作台 Issue：無（需要排他鎖時再建）

## 指令
- dev：`python3 -m http.server <port>`（靜態檔；注意 Worker 只允許 `https://jimbo90015.github.io` 跨域，本機開頁面打 Worker 會被 CORS 擋）　typecheck：無　lint：無
- test：`node --test`　e2e：無（合併後在正式網址用瀏覽器實走）　build：無

## 本專案鐵律
- **後端網址只寫在 `endpoints.js`**，頁面一律用 `ENDPOINTS.<名稱>`；`endpoints.test.js` 會掃所有 `*.html`，擋寫死的後端主機（`zeabur.app`、`breakshell.com`、`workers.dev`、`/webhook/`）。某個端點搬到 Worker 時改 `endpoints.js` 那一行，**同時改 `endpoints.test.js` 對該端點的期望網址**（測試刻意寫完整網址，當獨立的對照），並在 Worker 那邊確認 CORS 與回應格式一致。
- 邀請、報名管理、Discord 領取的 token 放在網址 `#` 片段，不放 query（避免進伺服器 log）。既有例外：`index.html` 讀出席者邀請時也接受 `?t=`（舊連結相容，commit `7c77a0b`），新功能不要再加 query token。

## 下結論前的查證規則（必填）
回答資料／狀態／bug 問題前，**先跑完下列查證，只讀 code 不准下結論**：
- 端點有沒有通：`curl -H "Origin: https://jimbo90015.github.io" <ENDPOINTS 裡的網址>` 看 status 與 `access-control-allow-origin`
- 實際畫面：在正式網址用瀏覽器開，看 console 與 network
- 後端行為以 `breakshell-workflows` 的專案卡與 n8n 線上 export 為準，不憑前端猜

## 流程
動程式碼一律先載入 `dev-task` skill，照 vault `brain/ops/dev-playbook.md` 七步流程；本專案差異：合併即上線，沒有 staging。
