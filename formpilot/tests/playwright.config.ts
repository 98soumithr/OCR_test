import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Load extension
        launchOptions: {
          args: [
            `--disable-extensions-except=${process.cwd()}/../extension/dist`,
            `--load-extension=${process.cwd()}/../extension/dist`
          ]
        }
      },
    },
  ],

  webServer: [
    {
      command: 'cd ../backend && uvicorn main:app --port 8000',
      port: 8000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'cd ../extension && npm run dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
    }
  ],
});