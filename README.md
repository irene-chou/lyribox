# Lyribox

即時歌詞同步顯示工具，支援 YouTube / 本地音檔播放，並可透過 OBS 瀏覽器來源進行直播歌詞投影。

## 功能

- LRC 歌詞解析與即時同步顯示
- YouTube 影片 / 本地音檔雙音源播放
- 手動計時模式（無音檔時可手動控制進度）
- OBS 瀏覽器來源即時同步（透過 PieSocket WebSocket）
- 歌詞偏移微調（鍵盤快捷鍵支援）
- 自訂字型大小、行高、歌詞顏色
- 深色 / 淺色主題切換
- 歌曲庫管理（IndexedDB 本地儲存）
- 歌曲匯入 / 匯出（JSON 格式）

## 快速開始

```bash
# 安裝相依套件
npm install

# 設定環境變數
cp .env.example .env
# 編輯 .env 填入 PieSocket API Key

# 啟動開發伺服器
npm run dev
```

## 環境變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `VITE_PIESOCKET_API_KEY` | PieSocket API Key（OBS 同步用） | — |
| `VITE_PIESOCKET_CLUSTER_ID` | PieSocket Cluster ID | `demo` |

## 指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 啟動開發伺服器 |
| `npm run build` | TypeScript 檢查 + 建置 |
| `npm run test` | 執行單元測試（watch 模式） |
| `npm run test:run` | 單次執行測試 |
| `npm run preview` | 預覽建置結果 |

## OBS 設定

1. 啟動應用程式後，點擊右上角的連結圖示複製 OBS URL
2. 在 OBS 中新增「瀏覽器」來源
3. 貼上複製的 URL
4. 建議解析度：寬 1920 x 高 1080（或依需求調整）
5. 歌詞顯示會透過 WebSocket 即時同步

## 鍵盤快捷鍵

| 按鍵 | 功能 |
|------|------|
| `Space` | 播放 / 暫停 |
| `←` / `→` | 倒退 / 快轉 5 秒（Shift：15 秒） |
| `↑` / `↓` | 歌詞偏移 +0.1s / -0.1s（Shift：±0.5s） |
| `Cmd/Ctrl+K` | 搜尋／切換歌曲 |
| `?` | 快捷鍵一覽 |
| `Ctrl+S` | 儲存歌曲 |

## 技術棧

- React 19 + TypeScript 5.9
- Vite 7
- Tailwind CSS 4
- Zustand 5（狀態管理）
- Dexie（IndexedDB 封裝）
- PieSocket（WebSocket 同步）
- Vitest（單元測試）
- shadcn/ui + Radix UI + Lucide Icons

## 部署

透過 GitHub Actions 自動部署至 GitHub Pages。推送至 `main` 分支即觸發部署。

需在 GitHub Repository Settings > Secrets 設定：
- `VITE_PIESOCKET_API_KEY`
- `VITE_PIESOCKET_CLUSTER_ID`（選填）

## 授權

MIT
