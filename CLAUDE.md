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
    layout/               # AppLayout (sidebar resize, mobile overlay), Header, ControlPanel
    lyrics/               # LyricsDisplay, LyricsContainer (auto-scroll), LyricLine (memo), NowSinging, EmptyState
    playback/             # AudioPlayer, YouTubePlayer, ManualTimerPanel, PlaybackInfo, VolumeControl, OffsetControls
    settings/             # DisplaySettings, FontSizeControl, LyricsGapControl, ColorPicker, VisibleRangeControl
    song-library/         # SongDrawer (vaul), SongDrawerMenu (export/import), SongListItem, SongSearchInput
    song-modal/           # SongModal (dialog), AudioSourceTabs, LrcInputTabs
    ui/                   # shadcn components: button, dialog, drawer, dropdown-menu, input, slider, tabs, textarea
  hooks/
    usePlaybackEngine.ts  # Unified facade routing to youtube/local/manual player
    useSyncEngine.ts      # Web Worker (80ms tick) for lyric line index computation
    useSyncBroadcast.ts   # Broadcasts store changes to OBS via PieSocket
    useOBSSync.ts         # PieSocket channel connection + full state broadcast
    useYouTubePlayer.ts   # YouTube IFrame API integration
    useLocalAudioPlayer.ts # HTMLAudioElement wrapper
    useManualTimer.ts     # Manual timer (performance.now()-based, polled by sync engine)
    useSongLibrary.ts     # Dexie live query + re-exports song-service functions
    useKeyboardShortcuts.ts # Global keyboard shortcuts (space, arrows, cmd+s)
    useIsMobile.ts        # matchMedia breakpoint (768px)
  stores/
    useSongStore.ts       # Current song data, lyrics, offset, dirty tracking
    usePlaybackStore.ts   # Playback status, time, volume, audio file blob URL
    useUISettingsStore.ts # Display settings, persisted to localStorage
    useSyncStore.ts       # Current lyric line index, syncing flag
  lib/
    db.ts                 # Dexie instance ('lyribox-db', songs table)
    song-service.ts       # CRUD, export/import, validation for songs
    lrc-parser.ts         # LRC format parser (multi-timestamp, metadata extraction)
    format.ts             # formatTime(), extractVideoId()
    piesocket.ts          # Session ID, channel name, OBS URL helpers
    constants.ts          # DEFAULT_UI_SETTINGS, button style constants
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
- `useUISettingsStore` — font sizes, colors, gaps, visible range, sidebar width (all persisted)
- `useSyncStore` — currentLineIndex (-1 = before first line), isSyncing flag

### Component Patterns
- `memo` + `forwardRef` on performance-critical components (`LyricLine`, `NowSinging`, `ManualTimerPanel`, `SongListItem`)
- `LyricsContainer` pre-computes `statuses` array and stores per-line refs/handlers in `useRef` arrays to avoid re-renders
- Auto-scroll uses `scrollIntoView({ behavior: 'smooth', block: 'center' })`
- New song IDs use `Date.now()` as integer primary key

### Web Workers
No standalone worker files — all are inline Blob Workers created at runtime:
- **Sync Worker** (80ms tick) in `useSyncEngine.ts` — drives lyric line computation
- **Pitch Workers** in `lib/pitch-shift.ts` — one per channel; source built from `pitchShiftChannel.toString()`, so that function must stay self-contained
- Cleaned up via `URL.revokeObjectURL` + `worker.terminate()`

### Audio Sources
- **YouTube:** IFrame API loaded lazily (singleton pattern), managed by `useYouTubePlayer`
- **Local files:** `HTMLAudioElement` via `useLocalAudioPlayer`, blob URLs managed by `usePlaybackStore`
- **Manual timer:** Fallback when lyrics exist but no audio source is configured

### OBS Sync
- PieSocket WebSocket for real-time sync to `public/obs.html` (standalone OBS browser source)
- Channel: `lyribox-{sessionId}` where sessionId is stored in `localStorage['lb-session-id']`
- `useSyncBroadcast` watches all relevant store fields and broadcasts typed `SyncMessage` on change
- `useOBSSync` manages PieSocket connection, responds to `REQUEST_STATE`, broadcasts `FULL_STATE`
- OBS page auto-reconnects and re-requests state every 10s if no messages received

### Keyboard Shortcuts
- `Space` — toggle play/pause
- `Escape` — close drawer
- `←/→` — offset ±0.1s (with Shift: ±0.5s)
- `↑/↓` — active font size ±2 (clamped 14–60)
- `Cmd/Ctrl+S` — save current song
- All shortcuts skip when focus is on input/textarea/select/contentEditable

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
- `Song` schema: `{ id, name, lrcText, offset, audioSource, youtubeId, audioFileName, createdAt, updatedAt }`
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
