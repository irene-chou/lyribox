import { test, expect, type Page } from '@playwright/test'

async function createSong(page: Page, name: string, lrc: string) {
  await page.locator('button[title="新增歌曲"]').click()
  await page.getByPlaceholder('輸入歌曲名稱').fill(name)
  await page.locator('textarea').first().fill(lrc)
  await page.getByRole('button', { name: '儲存並載入' }).click()
  await expect(page.getByRole('heading', { name: '新增歌曲' })).not.toBeVisible()
}

test.describe('Song navigation shortcuts', () => {
  test('Cmd+[ / Cmd+] step through the library in display order', async ({ page }) => {
    await page.goto('/')
    await createSong(page, 'A Song', '[00:01.00]Alpha line')
    await createSong(page, 'B Song', '[00:01.00]Beta line')
    await expect(page.getByText('Beta line')).toBeVisible()

    await page.keyboard.press('ControlOrMeta+BracketLeft')
    await expect(page.getByText('Alpha line')).toBeVisible()
    await expect(page.getByText('Beta line')).toHaveCount(0)

    await page.keyboard.press('ControlOrMeta+BracketRight')
    await expect(page.getByText('Beta line')).toBeVisible()

    // Wraps around at the end
    await page.keyboard.press('ControlOrMeta+BracketRight')
    await expect(page.getByText('Alpha line')).toBeVisible()
  })

  test('transport bar prev/next buttons switch songs', async ({ page }) => {
    await page.goto('/')
    await createSong(page, 'A Song', '[00:01.00]Alpha line')
    await createSong(page, 'B Song', '[00:01.00]Beta line')

    await page.getByRole('button', { name: '上一首' }).click()
    await expect(page.getByText('Alpha line')).toBeVisible()
    await page.getByRole('button', { name: '下一首' }).click()
    await expect(page.getByText('Beta line')).toBeVisible()
  })
})

test.describe('Offset shortcuts', () => {
  test('↑ / ↓ adjust the offset shown in the transport bar and mark the song unsaved', async ({ page }) => {
    await page.goto('/')
    await createSong(page, 'Offset Song', '[00:01.00]One\n[00:03.00]Two')
    // The offset is shown both in the sidebar and in the transport bar; assert on the latter.
    const offset = page.getByTitle('歌詞偏移')
    await expect(offset).toHaveText('+0.0s')

    await page.keyboard.press('ArrowUp')
    await expect(offset).toHaveText('+0.1s')
    await page.keyboard.press('Shift+ArrowDown')
    await expect(offset).toHaveText('-0.4s')

    // Auto-save kicks in shortly after
    await expect(page.getByRole('status').filter({ hasText: '已儲存' })).toBeVisible()
  })

  test('↑ / ↓ are ignored while typing in a text field', async ({ page }) => {
    await page.goto('/')
    await createSong(page, 'Typing Song', '[00:01.00]One')
    await page.locator('button[title="歌曲庫"]').click()
    const search = page.getByLabel('搜尋歌曲')
    await search.focus()
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('Escape')
    await expect(page.getByTitle('歌詞偏移')).toHaveText('+0.0s')
  })
})

test.describe('Library export & OBS URL', () => {
  test('exporting downloads a JSON file with the songs', async ({ page }) => {
    await page.goto('/')
    await createSong(page, 'Export Me', '[00:01.00]Exported line')
    await page.locator('button[title="歌曲庫"]').click()
    await page.getByRole('button', { name: '更多選項' }).click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('menuitem', { name: '匯出歌曲庫' }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/^lyribox-songs-\d{4}-\d{2}-\d{2}\.json$/)
    const path = await download.path()
    const { readFile } = await import('node:fs/promises')
    const parsed = JSON.parse(await readFile(path!, 'utf8'))
    expect(parsed.songs).toHaveLength(1)
    expect(parsed.songs[0].name).toBe('Export Me')
    expect(parsed.songs[0].lrcText).toContain('Exported line')
    await expect(page.getByRole('status').filter({ hasText: '已匯出歌曲庫' })).toBeVisible()
  })

  test('copying the OBS URL writes it to the clipboard and confirms with a toast', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/')
    await page.locator('button[title="複製 OBS 瀏覽器來源 URL"]').click()

    await expect(page.getByRole('status').filter({ hasText: '已複製 OBS 瀏覽器來源 URL' })).toBeVisible()
    const text = await page.evaluate(() => navigator.clipboard.readText())
    expect(text).toMatch(/\/obs\.html\?s=[0-9a-f-]+$/)
  })

  test('shortcuts dialog lists the song shortcuts and closes on Escape', async ({ page }) => {
    await page.goto('/')
    await page.locator('button[title^="快捷鍵一覽"]').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: '鍵盤快捷鍵' })).toBeVisible()
    await expect(dialog.getByText('搜尋／切換歌曲')).toBeVisible()
    await expect(dialog.getByText('上一首')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
  })
})
