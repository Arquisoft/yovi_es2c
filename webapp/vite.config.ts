import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTest.ts',
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
})
