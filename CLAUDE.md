# Lyribox

A real-time lyric display app with OBS sync, built for karaoke/singing workflows. UI is in Traditional Chinese (zh-TW).

## Quick Reference

- **Dev:** `npm run dev`
- **Build:** `npm run build` (runs `tsc -b && vite build`)
- **Lint:** `npm run lint`
- **Test:** `npm run test` (Vitest, watch mode) / `npm run test:run` (single run)
- **Test coverage:** `npm run test:coverage`
- **E2E:** `npm run test:e2e` (Playwright, requires `npm run preview` or runs it automatically)
- **Preview:** `npm run preview` (serves built `dist/` on port 4173)
- **Node:** v22 (see `.nvmrc`)

## Tech Stack

React 19 + TypeScript 5.9 + Vite 7 + Tailwind CSS 4 + Zustand 5 + Dexie (IndexedDB) + Radix UI + Vaul + shadcn/ui (new-york style)

## Architecture

```
src/
  App.tsx                 # Root: ThemeProvider (next-themes) + AppLayout
  main.tsx                # ReactDOM entry
  index.css               # Global CSS, theme tokens, shadcn overrides
  components/
    layout/               # AppLayout (sidebar resize, mobile overlay), Header, ControlPanel, SaveStatusIndicator, ShortcutsDialog
    lyrics/               # LyricsDisplay (lyrics + TransportBar), LyricsContainer (auto-scroll, 回到目前行), LyricLine (memo), NowSinging, EmptyState
    playback/             # TransportBar (docked play/seek/progress/offset/volume), AudioPlayer (source panel in sidebar), YouTubePlayer, VolumeControl, OffsetControls, PitchControls
    settings/             # DisplaySettings (collapsible), FontSizeControl, LyricsGapControl, ColorPicker, VisibleRangeControl
    song-library/         # SongDrawer (vaul), SongDrawerMenu (export/import), SongListItem, SongSearchInput, FolderSection
    song-modal/           # SongModal (dialog), AudioSourceTabs, LrcInputTabs, LyricsSearchTab
    ui/                   # shadcn components + toaster (toast stack), dialog-host (confirm/prompt)
  hooks/
    usePlaybackEngine.ts  # Unified facade routing to youtube/local/manual player
    useSyncEngine.ts      # Web Worker (80ms tick) for lyric line index computation
    useSyncBroadcast.ts   # Broadcasts store changes to OBS via PieSocket
    useOBSSync.ts         # PieSocket channel connection + full state broadcast
    useYouTubePlayer.ts   # YouTube IFrame API integration
    useLocalAudioPlayer.ts # HTMLAudioElement wrapper
    useManualTimer.ts     # Manual timer (performance.now()-based, polled by sync engine)
    useSongLibrary.ts     # Dexie live query + re-exports song-service functions
    useKeyboardShortcuts.ts # Global keyboard shortcuts (table lives in lib/shortcuts.ts)
    useIsMobile.ts        # matchMedia breakpoint (768px)
  stores/
    useSongStore.ts       # Current song data, lyrics, offset, dirty tracking
    usePlaybackStore.ts   # Playback status, time, volume, audio file blob URL
    useUISettingsStore.ts # Display settings, persisted to localStorage
    useSyncStore.ts       # Current lyric line index, syncing flag
    useToastStore.ts      # toast() helper + stack rendered by components/ui/toaster
    useDialogStore.ts     # confirmDialog() / promptDialog() promises, rendered by components/ui/dialog-host
    useSaveStatusStore.ts # idle | pending | saving | saved, driven by song-service
  lib/
    db.ts                 # Dexie instance ('lyribox-db', songs table)
    song-service.ts       # CRUD, export/import, validation for songs
    lrc-parser.ts         # LRC format parser (multi-timestamp, metadata extraction)
    format.ts             # formatTime(), extractVideoId()
    piesocket.ts          # Session ID, channel name, OBS URL helpers
    constants.ts          # DEFAULT_UI_SETTINGS, button style constants (CONTROL_BTN_*, ICON_BTN_*)
    shortcuts.ts          # Shortcut table (SHORTCUTS), formatKeys(), shortcutHint() for button titles
    analytics.ts          # track(event, data) → Umami custom events; no-op unless Umami is injected. Sends song title / youtube id, never lyrics or local file names
    playback-actions.ts   # adjustOffset/setPitch/toggleVocalRemoval/etc. — store update + active-line resync + debounced save
    vocal-removal.ts      # removeCenterChannel(): (L−R)/2 side signal for 去人聲, pure Float32Array math
    song-selection.ts     # selectSong() (handles local-file prompt), navigateSong(±1), pickLocalAudioFile()
    song-order.ts         # orderSongs() (folders A→Z then uncategorized), adjacentSong()
    utils.ts              # cn() (clsx + tailwind-merge)
    __tests__/            # Unit tests for lrc-parser, format, song-service
  types/
    index.ts              # Shared interfaces: LyricLine, Song, UISettings, PlaybackStatus, SyncMessage, etc.
    youtube.d.ts          # YT namespace (IFrame API) type declarations
    piesocket.d.ts        # PieSocket type declarations
  test/
    setup.ts              # @testing-library/jest-dom/vitest setup
e2e/
  app.spec.ts             # Playwright E2E tests
public/
  obs.html                # Standalone OBS browser source (vanilla JS + PieSocket)
```

## Key Patterns

### Zustand Usage
- **In components:** Always use selectors `useSongStore((s) => s.lyrics)` — one field per selector to minimize re-renders
- **Multiple fields:** Use `useShallow` when selecting multiple fields (see `DisplaySettings.tsx`)
- **In event handlers / non-React contexts:** `useStore.getState()` for reading latest state without subscribing
- **Persist middleware:** `useUISettingsStore` persists to `localStorage['lb-ui-settings']`

### State Flow
- `useSongStore` — current song data, lyrics (parsed from lrcText), offset, audio source, dirty tracking via `lastSavedState`
- `usePlaybackStore` — playback status (`IDLE | PLAYING | PAUSED | ENDED`), currentTime, duration, volume, muted, audioFileObjectUrl
- `useUISettingsStore` — font sizes, colors (active / other / passed / bg), gaps, visible range, sidebar width, `displaySettingsOpen` (all persisted)
- `useSyncStore` — currentLineIndex (-1 = before first line), isSyncing flag

### Component Patterns
- `memo` + `forwardRef` on performance-critical components (`LyricLine`, `NowSinging`, `ManualTimerPanel`, `SongListItem`)
- `LyricsContainer` pre-computes `statuses` array and stores per-line refs/handlers in `useRef` arrays to avoid re-renders
- Auto-scroll uses `scrollIntoView({ behavior: 'smooth', block: 'center' })`
- New song IDs use `Date.now()` as integer primary key

### Web Workers
No standalone worker files — all are inline Blob Workers created at runtime:
- **Sync Worker** (80ms tick) in `useSyncEngine.ts` — drives lyric line computation
- Cleaned up via `URL.revokeObjectURL` + `worker.terminate()`

### Audio Sources
- **YouTube:** IFrame API loaded lazily (singleton pattern), managed by `useYouTubePlayer`
- **Local files:** decoded to an `AudioBuffer` and played through a Signalsmith Stretch AudioWorklet (`lib/stretch-player.ts`, wraps the `signalsmith-stretch` WASM package) via `useLocalAudioPlayer`; pitch (升降 Key) is applied in real time, no reprocessing. The library is imported with `?url` + dynamic import so the bundler never minifies its self-stringifying worklet code.
- **去人聲 (vocal removal):** per-song `Song.vocalRemoval` flag (local audio only, toggle in `PitchControls`). `lib/vocal-removal.ts` computes the `(L−R)/2` side signal from the decoded channels; `useLocalAudioPlayer` caches both variants and swaps the worklet buffers in place, preserving position and play state. Mono files are unaffected.
- **Stored local files:** picked files are optionally persisted as Blobs in the `audioFiles` Dexie table (`lib/audio-file-store.ts`, keyed by songId, separate from `songs` so list queries stay light); `useLocalAudioRestore` reloads them when a song is selected. Preference lives in `useUISettingsStore.persistLocalAudio`.
- **Manual timer:** Fallback when lyrics exist but no audio source is configured
- All three sources share the docked `TransportBar` under the lyrics (play/pause, ±5s, progress, offset ±0.1, volume; 歸零 for manual). The sidebar `AudioPlayer` only shows the YouTube iframe / local file picker / manual hint.

### OBS Sync
- PieSocket WebSocket for real-time sync to `public/obs.html` (standalone OBS browser source)
- Channel: `lyribox-{sessionId}` where sessionId is stored in `localStorage['lb-session-id']`
- `useSyncBroadcast` watches all relevant store fields and broadcasts typed `SyncMessage` on change
- `useOBSSync` manages PieSocket connection, responds to `REQUEST_STATE`, broadcasts `FULL_STATE` on connect/reconnect
- **Lazy connect:** the app opens no PieSocket connection until `useUISettingsStore.obsSyncEnabled` is true, which `Header.copyOBSUrl` sets the first time the OBS URL is copied (persisted; browsers that never copy the URL never connect)
- OBS page requests state once per (re)connect (plus bounded retries at 5s/20s if nothing arrived) — no polling while idle. piesocket-js 5.x emits no 'open' event, so reconnects are observed by overriding `channel.onOpen` (`lib/piesocket.ts` `observeReconnects`, same trick inline in `obs.html`)

### Keyboard Shortcuts
Defined once in `lib/shortcuts.ts`; `useKeyboardShortcuts` implements them and `ShortcutsDialog` (`?`) lists them. Button `title`s include the hint via `shortcutHint(id)`.
- `Space` — toggle play/pause
- `←/→` — seek -5s / +5s (Shift: ±15s)
- `↑/↓` — offset +0.1s / -0.1s (Shift: ±0.5s)
- `Cmd/Ctrl+↑/↓` — active font size ±2 (clamped 14–60)
- `Cmd/Ctrl+K` — open song drawer with search focused (Enter loads first match)
- `Cmd/Ctrl+[` / `]` — previous / next song in library order
- `Cmd/Ctrl+S` — save current song
- `?` — shortcuts dialog, `Escape` — close drawer
- Skipped when focus is on input/textarea/select/contentEditable or inside an open dialog/drawer

### Dialogs & Toasts
- Never use native `alert` / `confirm` / `prompt`. Use `confirmDialog()` / `promptDialog()` from `stores/useDialogStore` (promise-based) and `toast()` from `stores/useToastStore`.
- Destructive actions (delete song / folder) execute immediately and show a toast with 「復原」; `deleteFolder` returns the moved song ids for `restoreFolder`.
- Offset / pitch / 去人聲 changes go through `lib/playback-actions.ts`, which recomputes the active line immediately (no `setCurrentLineIndex(-1)` flash) and schedules `debouncedSaveSong`; `SaveStatusIndicator` reflects `useSaveStatusStore`.

## Styling

### Theme System
- CSS custom properties prefixed `--lb-` (Lyribox Branding)
- Dark theme is `:root` default; `.light` class overrides (managed by `next-themes`)
- Key tokens: `--lb-bg-primary`, `--lb-bg-secondary`, `--lb-bg-card`, `--lb-accent` (#7c6aef), `--lb-text-primary`, `--lb-border`, etc.
- Tailwind utilities available via `--color-lb-*` mappings: `bg-lb-bg-primary`, `text-lb-accent`, `border-lb-border`

### Fonts
- UI: `Noto Sans TC` (sans-serif)
- Code: `JetBrains Mono`
- Lyrics: `GenSenRoundedTW` (loaded from `font.emtech.cc`), falls back to `Noto Sans TC`

### shadcn/ui Customization
- Style: `new-york`, base color: neutral
- Components overridden in `index.css` via `[data-slot="..."]` selectors to match `--lb-*` palette
- Most app code uses custom inline `<button>` elements rather than shadcn `Button`

### Mobile
- Breakpoint: 768px (`useIsMobile` hook)
- Mobile panel renders as full-screen overlay at `z-50`
- Inputs use `font-size: 16px` to prevent iOS zoom

## Database

Dexie v4 (IndexedDB wrapper):
- Database name: `lyribox-db`
- Single table: `songs` with `id` as integer primary key
- `Song` schema: `{ id, name, lrcText, offset, pitch, vocalRemoval, audioSource, youtubeId, audioFileName, folderId, createdAt, updatedAt }` (v5 upgrade backfills `vocalRemoval: false`)
- Import validation via `isValidSong()`: checks id > 0, name 1-500 chars, valid audioSource enum, strips unknown properties

## Testing

### Unit Tests (Vitest + jsdom)
- Located in `src/lib/__tests__/`
- Tests: `lrc-parser.test.ts` (14 tests), `format.test.ts` (17 tests), `song-service.test.ts` (5 tests)
- Setup: `src/test/setup.ts` (imports `@testing-library/jest-dom/vitest`)
- Run: `npm run test` (watch) or `npm run test:run` (CI)

### E2E Tests (Playwright)
- Located in `e2e/app.spec.ts`
- Targets: Chromium (Desktop Chrome)
- Base URL: `http://localhost:4173` (Vite preview server)
- Tests: app loading, theme toggle, song drawer, song modal, create-and-load flow
- Run: `npm run test:e2e` or `npm run test:e2e:ui`

## Environment Variables

Copy `.env.example` to `.env`:
- `VITE_PIESOCKET_API_KEY` — PieSocket API key for OBS sync
- `VITE_PIESOCKET_CLUSTER_ID` — PieSocket cluster (default: `demo`)
- `VITE_CF_BEACON_TOKEN` / `VITE_UMAMI_WEBSITE_ID` — optional Cloudflare Web Analytics token / Umami Cloud website id; when set, `analyticsPlugin` in `vite.config.ts` injects the cookie-less scripts into `index.html` only (build only, not `obs.html`). Set as GitHub Actions repository **variables** for deploys.

These are also injected into `public/obs.html` via a custom Vite plugin (`envReplacementPlugin` in `vite.config.ts`) that replaces `__VITE_PIESOCKET_API_KEY__` and `__VITE_PIESOCKET_CLUSTER_ID__` placeholders.

## Deployment

GitHub Pages via `.github/workflows/deploy.yml`:
1. Triggers on push to `main` or manual dispatch
2. Steps: `npm ci` → `npm run test:run` → `npm run build` (with secrets) → upload `dist/` → deploy
3. Base path: `/lyribox/` (configured in `vite.config.ts`)
4. Secrets required in repo settings: `VITE_PIESOCKET_API_KEY`, `VITE_PIESOCKET_CLUSTER_ID`

## Path Aliases

`@/*` → `./src/*` (configured in `tsconfig.json` and `vite.config.ts`)

## Conventions

- UI text is in **Traditional Chinese (zh-TW)**
- Component files use PascalCase, hooks use camelCase with `use` prefix
- Stores use camelCase with `use` prefix + `Store` suffix
- All exports from `types/index.ts` — no per-file type exports
- Icon library: `lucide-react`
- Color values in stores use CSS string format (`#hex`, `rgba(...)`, `transparent`)
