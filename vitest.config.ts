import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**', '.claude/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      // Entry points, type declarations, test scaffolding and vendored shadcn
      // primitives carry no app logic worth measuring.
      exclude: ['src/main.tsx', 'src/App.tsx', 'src/types/**', 'src/test/**', 'src/**/__tests__/**', 'src/components/ui/**'],
    },
  },
})
