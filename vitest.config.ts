import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/unit/*.test.{ts,tsx}'],
    testTimeout: 15000,
    // Capped below the machine's core count: running one worker per core
    // starves each jsdom + drizzle test environment of CPU, causing
    // sporadic worker-startup and query timeouts across unrelated files.
    maxWorkers: 4,
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './tests/empty-module.ts'),
    },
  },
})
