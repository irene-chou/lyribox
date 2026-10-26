# Lyribox

即時歌詞同步顯示工具，支援 YouTube / 本地音檔播放，並可透過 OBS 瀏覽器來源進行直播歌詞投影。

## 功能

- LRC 歌詞解析與即時同步顯示（同時間戳的翻譯／羅馬拼音行自動顯示為副標）
- Enhanced LRC 逐字歌詞：`<mm:ss.xx>` 標記的行在主畫面與 OBS 端逐字填色高亮
- LRC 歌詞解析與即時同步顯示（同時間戳的翻譯／羅馬拼音行自動顯示為副標；可貼入第二份翻譯 LRC 依時間戳自動合併）
- YouTube 影片 / 本地音檔雙音源播放
- 手動計時模式（無音檔時可手動控制進度）
- OBS 瀏覽器來源即時同步（透過 PieSocket WebSocket），側欄可展開 OBS 預覽即時查看投影效果
- 歌詞偏移微調（鍵盤快捷鍵支援）
- 自訂字型大小、行高、歌詞顏色
- 深色 / 淺色主題切換
- 歌曲庫管理（IndexedDB 本地儲存）
- 歌單：排定今晚順序、拖曳排序、歌單模式下依序切歌、播完自動下一首，OBS 顯示「下一首」
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

### URL 參數（覆蓋單一來源的外觀）

在 OBS URL 後面加上參數可讓同一個 session 的不同瀏覽器來源長得不一樣，參數優先於控制頁同步過來的設定；無效值會被忽略。

| 參數 | 值 | 說明 |
|------|----|------|
| `align` | `left` / `center` / `right` | 歌詞水平對齊（預設 `left`） |
| `shadow` | `0` / `1` | 文字加深色陰影（預設 `0`） |
| `anim` | `0` / `1` | 換行時的字級／顏色過渡動畫（預設 `1`） |
| `before` / `after` | `0`–`50` | 目前行前／後顯示的行數 |
| `size` / `otherSize` | `8`–`300` | 目前行／其他行字級（px） |
| `title` | `0` / `1` | 是否顯示「Now singing」歌名 |
| `bg` | CSS 顏色 | 頁面背景色，例如 `transparent`、`%23000000`（`#` 需編碼為 `%23`） |

範例：底部單行字幕 → `obs.html?s=<session>&before=0&after=0&size=56&align=center&title=0`

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
