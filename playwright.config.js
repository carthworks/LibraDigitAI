import { defineConfig } from '@playwright/test'

// Desktop end-to-end tests (e2e/). They drive the packaged Electron app, so
// build it first; see the header of e2e/desktop.spec.js.
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  outputDir: 'test-results',
})
