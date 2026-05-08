import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// Stable per-build ID. Prefer git short SHA so deploys at the same commit
// produce the same ID; fall back to a timestamp if git isn't available
// (e.g. Docker builds without .git).
function resolveBuildId(): string {
  if (process.env.BUILD_ID) return process.env.BUILD_ID
  if (process.env.RAILWAY_GIT_COMMIT_SHA) {
    return process.env.RAILWAY_GIT_COMMIT_SHA.slice(0, 7)
  }
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return `t${Date.now()}`
  }
}

const BUILD_ID = resolveBuildId()

// After every build, drop a tiny `version.json` next to `index.html`. The
// frontend polls this file at runtime to detect when a new bundle has been
// deployed and prompts the student to reload.
function writeVersionJsonPlugin() {
  return {
    name: 'lexical-republic-version-json',
    apply: 'build' as const,
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist')
      try {
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
        fs.writeFileSync(
          path.join(outDir, 'version.json'),
          JSON.stringify({ buildId: BUILD_ID, builtAt: new Date().toISOString() }) + '\n',
        )
      } catch (err) {
        console.warn('[vite] failed to write version.json:', err)
      }
    },
  }
}

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [react(), writeVersionJsonPlugin()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
