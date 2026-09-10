import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { localAiPlugin } from './vite-local-ai.ts'

export default defineConfig({
  plugins: [react(), ...(process.env.VITEST ? [] : [localAiPlugin()])],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    restoreMocks: true,
    pool: 'threads',
    fileParallelism: false,
    maxWorkers: 1,
  },
})
