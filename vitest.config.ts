import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/unit/*.test.{ts,tsx}'],
    testTimeout: 15000,
    // Running test files in parallel starves each jsdom + drizzle test
    // environment of CPU on this machine, causing sporadic worker-startup
    // and query timeouts in different, unrelated files on every run.
    // Serial execution is slower but deterministic.
    fileParallelism: false,
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './tests/empty-module.ts'),
    },
  },
})
