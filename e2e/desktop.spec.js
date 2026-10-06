// End-to-end test of the packaged desktop app: the real Electron shell, the
// PyInstaller backend it spawns (with its per-launch API token) and Tesseract.
//
// Build first (see docs/RELEASING.md), then:
//   npx playwright test            (Linux CI: xvfb-run -a npx playwright test)
// LIBRADIGIT_APP overrides the path of the packaged executable.
import { _electron as electron, expect, test } from '@playwright/test'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const DEFAULT_APP = {
    win32: path.join(ROOT, 'release', 'win-unpacked', 'LibraDigit AI.exe'),
    linux: path.join(ROOT, 'release', 'linux-unpacked', 'libradigit-ai'),
}[process.platform]
const APP = process.env.LIBRADIGIT_APP || DEFAULT_APP
const SCAN = path.join(ROOT, 'e2e', 'fixtures', 'sample-scan.png')
const PASSWORD = 'e2e-archivist-pass'

const findFiles = (dir, ext) => fs.readdirSync(dir, { recursive: true })
    .filter(name => name.toLowerCase().endsWith(ext))
    .map(name => path.join(dir, name))

const portOpen = (port) => new Promise(resolve => {
    const socket = net.connect(port, '127.0.0.1')
    socket.once('connect', () => { socket.destroy(); resolve(true) })
    socket.once('error', () => resolve(false))
})

test.describe.configure({ mode: 'serial' })

let app
let win
let dataDir
let archiveDir

test.beforeAll(async () => {
    expect(fs.existsSync(APP), `packaged app not found at ${APP}`).toBe(true)
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'libradigit-e2e-'))
    dataDir = path.join(tmp, 'userdata')
    archiveDir = path.join(tmp, 'Archive')
    app = await electron.launch({
        executablePath: APP,
        args: process.platform === 'linux' ? ['--no-sandbox'] : [],
        env: { ...process.env, LIBRADIGIT_USER_DATA_DIR: dataDir, LIBRADIGIT_ARCHIVE_FOLDER: archiveDir },
        timeout: 60_000,
    })
    win = await app.firstWindow()
    // The first-run cookie banner can cover buttons; answer it whenever it shows.
    await win.addLocatorHandler(
        win.getByRole('region', { name: 'Privacy & Cookie Preferences' }),
        () => win.getByRole('button', { name: 'Reject Non-Essential' }).click(),
    )
})

test.afterAll(async () => {
    if (app) await app.close().catch(() => {})
})

test('first launch: account setup opens on Register and signs in', async () => {
    // The splash stays until the bundled backend answers /api/health.
    const setup = win.getByRole('button', { name: 'Setup & Login' })
    await expect(setup).toBeVisible({ timeout: 90_000 })
    await setup.click()

    await win.getByPlaceholder('Create Master Password (min. 6 chars)').fill(PASSWORD)
    await win.getByPlaceholder('Confirm Master Password').fill(PASSWORD)
    await win.getByRole('button', { name: /Create Account & Initialize/ }).click()

    await expect(win.getByText('Digitize your first document')).toBeVisible({ timeout: 30_000 })
})

test('the app survives a window reload', async () => {
    await win.reload()
    await expect(win.getByText('Digitize your first document')).toBeVisible({ timeout: 30_000 })
})

test('scan -> OCR -> review -> metadata -> PDF/A archive', async () => {
    test.setTimeout(240_000)
    await win.getByRole('button', { name: /New Ingest & OCR|Ingest Single Document/ }).first().click()

    await win.setInputFiles('input[type=file]', SCAN)
    await win.getByText('Ingest Document to Sovereign Repository').click()
    await win.getByText('Execute Neural OCR Recognition').click({ timeout: 30_000 })
    await win.getByText('Continue to Cleanup Studio').click({ timeout: 120_000 })

    // The OCR text reaches the editor.
    await expect(win.locator('.ql-editor')).toContainText('Annual Report', { timeout: 30_000 })
    await win.getByRole('button', { name: /Continue to Metadata/ }).click()

    await win.locator('input[name=title]').fill('Library Board Annual Report')
    await win.locator('input[name=author]').fill('Jane Doe')
    await win.locator('input[name=year]').fill('1954')
    await win.locator('input[name=subject]').fill('History')
    await win.getByRole('button', { name: /Continue to Archive/ }).click()

    await win.getByRole('button', { name: /Generate Archive File/ }).click()
    await expect(win.getByText('Archive Generated Successfully!')).toBeVisible({ timeout: 60_000 })
    await expect(win.getByText('PDF/A-2b')).toBeVisible()

    const pdfs = findFiles(archiveDir, '.pdf')
    expect(pdfs).toHaveLength(1)
    expect(fs.readFileSync(pdfs[0]).subarray(0, 5).toString()).toBe('%PDF-')
    expect(findFiles(archiveDir, 'dublin-core.xml')).toHaveLength(1)
})

test('archived document is searchable', async () => {
    await win.getByRole('button', { name: 'Archive Search' }).click()
    await win.locator('input.search-input').fill('Library')
    await expect(win.getByText('Library Board Annual Report').first()).toBeVisible({ timeout: 15_000 })
})

test('closing the app stops the backend', async () => {
    await app.close()
    app = null
    await expect.poll(() => portOpen(5001), { timeout: 20_000 }).toBe(false)
})
