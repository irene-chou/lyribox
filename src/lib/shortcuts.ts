export type ShortcutId =
  | 'play-pause'
  | 'seek-back'
  | 'seek-forward'
  | 'seek-back-large'
  | 'seek-forward-large'
  | 'offset-back'
  | 'offset-forward'
  | 'offset-back-large'
  | 'offset-forward-large'
  | 'font-up'
  | 'font-down'
  | 'save'
  | 'search-songs'
  | 'prev-song'
  | 'next-song'
  | 'show-shortcuts'
  | 'close'

export type ShortcutGroup = '播放' | '歌曲' | '顯示' | '其他'

export interface ShortcutDef {
  id: ShortcutId
  /** Keys as rendered to the user. 'Mod' becomes ⌘ on macOS, Ctrl elsewhere. */
  keys: string[]
  label: string
  group: ShortcutGroup
}

export const SHORTCUTS: ShortcutDef[] = [
  { id: 'play-pause', keys: ['Space'], label: '播放／暫停', group: '播放' },
  { id: 'seek-back', keys: ['↑'], label: '倒退 5 秒', group: '播放' },
  { id: 'seek-forward', keys: ['↓'], label: '快轉 5 秒', group: '播放' },
  { id: 'seek-back-large', keys: ['Shift', '↑'], label: '倒退 15 秒', group: '播放' },
  { id: 'seek-forward-large', keys: ['Shift', '↓'], label: '快轉 15 秒', group: '播放' },
  { id: 'offset-back', keys: ['←'], label: '歌詞偏移 -0.1 秒', group: '播放' },
  { id: 'offset-forward', keys: ['→'], label: '歌詞偏移 +0.1 秒', group: '播放' },
  { id: 'offset-back-large', keys: ['Shift', '←'], label: '歌詞偏移 -0.5 秒', group: '播放' },
  { id: 'offset-forward-large', keys: ['Shift', '→'], label: '歌詞偏移 +0.5 秒', group: '播放' },
  { id: 'search-songs', keys: ['Mod', 'K'], label: '搜尋／切換歌曲', group: '歌曲' },
  { id: 'prev-song', keys: ['Mod', '['], label: '上一首', group: '歌曲' },
  { id: 'next-song', keys: ['Mod', ']'], label: '下一首', group: '歌曲' },
  { id: 'save', keys: ['Mod', 'S'], label: '儲存目前歌曲', group: '歌曲' },
  { id: 'font-up', keys: ['Mod', '↑'], label: '當前行字級 +2', group: '顯示' },
  { id: 'font-down', keys: ['Mod', '↓'], label: '當前行字級 -2', group: '顯示' },
  { id: 'show-shortcuts', keys: ['?'], label: '快捷鍵一覽', group: '其他' },
  { id: 'close', keys: ['Esc'], label: '關閉抽屜／對話框', group: '其他' },
]

export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)
}

/** Render a key list for display, e.g. ['Mod','K'] → '⌘K' on Mac, 'Ctrl+K' elsewhere. */
export function formatKeys(keys: string[], mac: boolean = isMacPlatform()): string {
  const mapped = keys.map((k) => {
    if (k === 'Mod') return mac ? '⌘' : 'Ctrl'
    if (k === 'Shift') return mac ? '⇧' : 'Shift'
    return k
  })
  return mac ? mapped.join('') : mapped.join('+')
}

/** Parenthesised hint for button titles, e.g. '(Space)'. Empty string if unknown. */
export function shortcutHint(id: ShortcutId, mac?: boolean): string {
  const def = SHORTCUTS.find((s) => s.id === id)
  return def ? `(${formatKeys(def.keys, mac)})` : ''
}

export function shortcutsByGroup(): Array<{ group: ShortcutGroup; items: ShortcutDef[] }> {
  const order: ShortcutGroup[] = ['播放', '歌曲', '顯示', '其他']
  return order.map((group) => ({ group, items: SHORTCUTS.filter((s) => s.group === group) }))
}
