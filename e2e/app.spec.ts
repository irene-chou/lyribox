import { test, expect } from '@playwright/test'

test.describe('App loads', () => {
  test('renders header with app title', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Lyribox')
  })

  test('renders FAB button', async ({ page }) => {
    await page.goto('/')
    const fab = page.locator('button[title="新增歌曲"]')
    await expect(fab).toBeVisible()
  })

  test('renders header action buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('button[title="切換主題"]')).toBeVisible()
    await expect(page.locator('button[title="歌曲庫"]')).toBeVisible()
    await expect(page.locator('button[title="複製 OBS 瀏覽器來源 URL"]')).toBeVisible()
  })
})

test.describe('Theme toggle', () => {
  test('toggles between dark and light theme', async ({ page }) => {
    await page.goto('/')
    const themeBtn = page.locator('button[title="切換主題"]')

    // Get initial theme class on <html>
    const initialClass = await page.locator('html').getAttribute('class')

    // Click to toggle theme
    await themeBtn.click()
    await page.waitForTimeout(300)

    const newClass = await page.locator('html').getAttribute('class')
    expect(newClass).not.toBe(initialClass)
  })
})

test.describe('Song drawer', () => {
  test('opens song drawer via header button', async ({ page }) => {
    await page.goto('/')
    const drawerBtn = page.locator('button[title="歌曲庫"]')
    await drawerBtn.click()

    // Drawer should show title "歌曲庫"
    await expect(page.getByRole('heading', { name: '歌曲庫' })).toBeVisible()
  })

  test('shows empty state when no songs', async ({ page }) => {
    await page.goto('/')
    await page.locator('button[title="歌曲庫"]').click()

    await expect(page.getByText('尚無歌曲')).toBeVisible()
  })

  test('closes drawer via close button', async ({ page }) => {
    await page.goto('/')
    await page.locator('button[title="歌曲庫"]').click()

    // Wait for drawer to appear
    await expect(page.getByRole('heading', { name: '歌曲庫' })).toBeVisible()

    // Click close button
    await page.locator('button[title="關閉"]').click()

    // Drawer heading should disappear
    await expect(page.getByRole('heading', { name: '歌曲庫' })).not.toBeVisible()
  })
})

test.describe('Song modal', () => {
  test('opens new song modal via FAB', async ({ page }) => {
    await page.goto('/')
    await page.locator('button[title="新增歌曲"]').click()

    // Modal should show "新增歌曲" title
    await expect(page.getByRole('heading', { name: '新增歌曲' })).toBeVisible()
  })

  test('modal has song name input and save button', async ({ page }) => {
    await page.goto('/')
    await page.locator('button[title="新增歌曲"]').click()

    // Song name input
    await expect(page.getByPlaceholder('輸入歌曲名稱')).toBeVisible()

    // Save and cancel buttons
    await expect(page.getByRole('button', { name: '儲存並載入' })).toBeVisible()
    await expect(page.getByRole('button', { name: '取消' })).toBeVisible()
  })

  test('closes modal via cancel button', async ({ page }) => {
    await page.goto('/')
    await page.locator('button[title="新增歌曲"]').click()

    await expect(page.getByRole('heading', { name: '新增歌曲' })).toBeVisible()

    await page.getByRole('button', { name: '取消' }).click()

    await expect(page.getByRole('heading', { name: '新增歌曲' })).not.toBeVisible()
  })

  test('shows inline error when saving without LRC', async ({ page }) => {
    await page.goto('/')
    await page.locator('button[title="新增歌曲"]').click()

    // Fill name but leave LRC empty
    await page.getByPlaceholder('輸入歌曲名稱').fill('Test Song')
    await page.getByRole('button', { name: '儲存並載入' }).click()

    // Modal stays open and shows the error next to the field (no native alert)
    await expect(page.getByRole('alert')).toContainText('LRC')
    await expect(page.getByRole('heading', { name: '新增歌曲' })).toBeVisible()
  })
})

test.describe('Playback controls & shortcuts', () => {
  async function createSong(page: import('@playwright/test').Page, name: string) {
    await page.locator('button[title="新增歌曲"]').click()
    await page.getByPlaceholder('輸入歌曲名稱').fill(name)
    await page.locator('textarea').first().fill('[00:01.00]Line one\n[00:03.00]Line two\n[00:05.00]Line three')
    await page.getByRole('button', { name: '儲存並載入' }).click()
    await expect(page.getByRole('heading', { name: '新增歌曲' })).not.toBeVisible()
  }

  test('transport bar appears once a song is loaded and Space toggles play', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: '播放' })).toHaveCount(0)
    await createSong(page, 'Transport Song')
    await expect(page.getByRole('button', { name: '播放' })).toBeVisible()
    await page.keyboard.press('Space')
    await expect(page.getByRole('button', { name: '暫停' })).toBeVisible()
    await page.keyboard.press('Space')
    await expect(page.getByRole('button', { name: '播放' })).toBeVisible()
  })

  test('? opens the shortcuts dialog', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Shift+/')
    await expect(page.getByRole('heading', { name: '鍵盤快捷鍵' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: '鍵盤快捷鍵' })).not.toBeVisible()
  })

  test('Cmd+K opens the drawer with search focused and Enter loads the first match', async ({ page }) => {
    await page.goto('/')
    await createSong(page, 'Quick Switch Song')
    await page.keyboard.press('Meta+k')
    await expect(page.getByLabel('搜尋歌曲')).toBeFocused()
    await page.keyboard.type('quick')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: '歌曲庫' })).not.toBeVisible()
    await expect(page.getByText('Line one')).toBeVisible()
  })

  test('deleting a song shows an undo toast instead of a native confirm', async ({ page }) => {
    await page.goto('/')
    await createSong(page, 'Undo Song')
    await page.locator('button[title="歌曲庫"]').click()
    const row = page.getByLabel('歌曲庫').getByText('Undo Song')
    await row.hover()
    await page.locator('button[title="刪除"]').first().click({ force: true })
    await expect(page.getByRole('status').filter({ hasText: '已刪除「Undo Song」' })).toBeVisible()
    await page.getByRole('button', { name: '復原' }).click()
    await expect(page.getByLabel('歌曲庫').getByText('Undo Song')).toBeVisible()
  })
})

test.describe('Create and load song', () => {
  test('creates a song with LRC and loads it', async ({ page }) => {
    await page.goto('/')
    await page.locator('button[title="新增歌曲"]').click()

    // Fill song name
    await page.getByPlaceholder('輸入歌曲名稱').fill('E2E Test Song')

    // Fill LRC text — find the textarea for LRC input
    const lrcTextarea = page.locator('textarea').first()
    await lrcTextarea.fill(
      '[00:05.00]First line of lyrics\n[00:10.00]Second line of lyrics\n[00:15.00]Third line',
    )

    // Save
    await page.getByRole('button', { name: '儲存並載入' }).click()

    // Modal should close
    await expect(page.getByRole('heading', { name: '新增歌曲' })).not.toBeVisible()

    // Lyrics should appear on screen
    await expect(page.getByText('First line of lyrics')).toBeVisible()
    await expect(page.getByText('Second line of lyrics')).toBeVisible()
    await expect(page.getByText('Third line')).toBeVisible()
  })

  test('created song appears in song drawer', async ({ page }) => {
    await page.goto('/')

    // Create a song first
    await page.locator('button[title="新增歌曲"]').click()
    await page.getByPlaceholder('輸入歌曲名稱').fill('Drawer Test Song')
    const lrcTextarea = page.locator('textarea').first()
    await lrcTextarea.fill('[00:01.00]Hello')
    await page.getByRole('button', { name: '儲存並載入' }).click()

    // Open drawer
    await page.locator('button[title="歌曲庫"]').click()

    // Song should be listed in the drawer
    await expect(page.getByLabel('歌曲庫').getByText('Drawer Test Song')).toBeVisible()
  })
})

test.describe('OBS sync connection', () => {
  test('opens no PieSocket socket until the OBS URL is copied', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const sockets: string[] = []
    page.on('websocket', (ws) => sockets.push(ws.url()))

    await page.goto('/')
    await page.locator('button[title="新增歌曲"]').click()
    await page.getByPlaceholder('輸入歌曲名稱').fill('No Socket Song')
    await page.locator('textarea').first().fill('[00:01.00]Hello')
    await page.getByRole('button', { name: '儲存並載入' }).click()
    await page.waitForTimeout(1500)
    expect(sockets.filter((u) => u.includes('piesocket'))).toEqual([])

    await page.locator('button[title="複製 OBS 瀏覽器來源 URL"]').click()
    await expect.poll(() => sockets.filter((u) => u.includes('piesocket')).length, { timeout: 5000 }).toBeGreaterThan(0)

    // Opt-in persists across reloads
    await page.reload()
    await expect.poll(() => sockets.filter((u) => u.includes('piesocket')).length, { timeout: 5000 }).toBeGreaterThan(1)
  })
})

/** 2-second mono 16-bit PCM WAV of a 440 Hz tone, generated in memory. */
function makeToneWav(): Buffer {
  const sampleRate = 44100
  const samples = sampleRate * 2
  const buf = Buffer.alloc(44 + samples * 2)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + samples * 2, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(sampleRate * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(samples * 2, 40)
  for (let i = 0; i < samples; i++) {
    buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 12000), 44 + i * 2)
  }
  return buf
}

test.describe('Local audio playback', () => {
  test('stretch worklet keeps running and produces signal', async ({ page }) => {
    // Observe every AudioWorkletNode: processor crashes are otherwise silent.
    await page.addInitScript(() => {
      const w = window as unknown as { __worklets: AudioWorkletNode[]; __procErrors: string[] }
      w.__worklets = []
      w.__procErrors = []
      const Orig = window.AudioWorkletNode
      window.AudioWorkletNode = class extends Orig {
        constructor(...args: ConstructorParameters<typeof AudioWorkletNode>) {
          super(...args)
          w.__worklets.push(this)
          this.onprocessorerror = () => w.__procErrors.push('processorerror')
        }
      }
    })

    await page.goto('/')
    await page.locator('button[title="新增歌曲"]').click()
    await page.getByPlaceholder('輸入歌曲名稱').fill('Tone Song')
    await page.locator('textarea').first().fill('[00:00.50]Tone')
    await page.getByRole('tab', { name: '本地音檔' }).click()
    await page.locator('input[type="file"]').first().setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: makeToneWav() })
    await page.getByRole('button', { name: '儲存並載入' }).click()

    // Like a real user: the file sits loaded for a moment before play is pressed.
    await page.waitForTimeout(1500)
    await page.keyboard.press('Space')
    await page.waitForTimeout(1000)

    const result = await page.evaluate(async () => {
      const w = window as unknown as { __worklets: (AudioWorkletNode & { inputTime?: number })[]; __procErrors: string[] }
      const node = w.__worklets[0]
      if (!node) return { procErrors: w.__procErrors, inputTime: -1, rms: -1 }
      const ctx = node.context as AudioContext
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      node.connect(analyser)
      const data = new Float32Array(analyser.fftSize)
      let rms = 0
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 100))
        analyser.getFloatTimeDomainData(data)
        let sum = 0
        for (const v of data) sum += v * v
        rms = Math.max(rms, Math.sqrt(sum / data.length))
      }
      return { procErrors: w.__procErrors, inputTime: node.inputTime ?? -1, rms }
    })

    expect(result.procErrors).toEqual([])
    expect(result.inputTime).toBeGreaterThan(0)
    expect(result.rms).toBeGreaterThan(0.01)
  })
})

test.describe('LRC timing editor (打軸)', () => {
  test('converts plain lines, accepts a typed timestamp and writes LRC back', async ({ page }) => {
    await page.goto('/')
    await page.locator('button[title="新增歌曲"]').click()
    await page.locator('textarea').first().fill('第一句\n第二句')

    await page.getByRole('button', { name: '打軸' }).click()
    // New song is not the loaded one, so stamping is disabled and explained
    await expect(page.getByText('打軸需要播放這首歌的音源')).toBeVisible()
    await expect(page.getByLabel('第 2 行歌詞')).toHaveValue('第二句')

    // Manual timestamp entry still works
    const t1 = page.getByLabel('第 1 行時間')
    await t1.fill('00:12.5')
    await t1.press('Enter')
    await expect(t1).toHaveValue('00:12.50')

    // +0.1 nudges the stamped line
    await page.getByTitle('此行 +0.1s').first().click()
    await expect(t1).toHaveValue('00:12.60')

    // Back to the textarea: LRC is serialised, unstamped line kept as text
    await page.getByRole('button', { name: '打軸' }).click()
    await expect(page.locator('textarea').first()).toHaveValue('[00:12.60]第一句\n第二句')
  })

  test('stamps the current playback time with Enter when editing the loaded song', async ({ page }) => {
    await page.goto('/')
    await page.locator('button[title="新增歌曲"]').click()
    await page.getByPlaceholder('輸入歌曲名稱').fill('Timing Song')
    await page.locator('textarea').first().fill('[00:01.00]舊的\n新的一句')
    await page.getByRole('button', { name: '儲存並載入' }).click()
    await expect(page.getByRole('heading', { name: '新增歌曲' })).not.toBeVisible()

    // Manual timer: play, let it run, then open the editor for the loaded song
    await page.getByRole('button', { name: '播放' }).click()
    await page.waitForTimeout(700)
    await page.locator('button[title="編輯歌曲"]').click()
    await expect(page.getByRole('heading', { name: '編輯歌曲' })).toBeVisible()
    await page.getByRole('button', { name: '打軸' }).click()

    const t2 = page.getByLabel('第 2 行時間')
    await expect(t2).toHaveValue('')
    await page.getByLabel('第 2 行歌詞').press('Enter')
    const value = await t2.inputValue()
    expect(value).toMatch(/^00:0[0-9]\.\d\d$/)
    expect(value).not.toBe('00:00.00')
  })
})
