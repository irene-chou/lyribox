import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

/**
 * Replace __VITE_*__ placeholders in public HTML files at build time.
 * Public files are copied after Rollup bundle, so we use writeBundle
 * to post-process them on disk.
 */
function replaceEnvPlaceholders(html: string, env: Record<string, string>): string {
  return html
    .replace(/__VITE_PIESOCKET_API_KEY__/g, env.VITE_PIESOCKET_API_KEY ?? '')
    .replace(/__VITE_PIESOCKET_CLUSTER_ID__/g, env.VITE_PIESOCKET_CLUSTER_ID ?? 'demo')
}

function envReplacementPlugin(env: Record<string, string>): Plugin {
  let outDir = 'dist'
  return {
    name: 'env-replacement',
    enforce: 'post',
    configResolved(config) {
      outDir = config.build.outDir
    },
    // Dev: intercept public HTML files served by Vite dev server
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const urlPath = (req.url || '').split('?')[0]
        if (urlPath.endsWith('.html') && urlPath !== '/') {
          // Strip base path (e.g. /lyribox/) to get the filename
          const base = server.config.base || '/'
          const relative = urlPath.startsWith(base) ? urlPath.slice(base.length) : urlPath.replace(/^\//, '')
          const filePath = path.resolve('public', relative)
          if (fs.existsSync(filePath)) {
            let html = fs.readFileSync(filePath, 'utf-8')
            html = replaceEnvPlaceholders(html, env)
            res.setHeader('Content-Type', 'text/html')
            res.end(html)
            return
          }
        }
        next()
      })
    },
    // Build: post-process HTML files in dist/
    writeBundle() {
      const htmlFiles = fs.readdirSync(outDir).filter((f) => f.endsWith('.html'))
      for (const file of htmlFiles) {
        const filePath = path.resolve(outDir, file)
        let content = fs.readFileSync(filePath, 'utf-8')
        content = replaceEnvPlaceholders(content, env)
        fs.writeFileSync(filePath, content, 'utf-8')
      }
    },
  }
}

/**
 * Inject Cloudflare Web Analytics into index.html when VITE_CF_BEACON_TOKEN is set.
 * Cookie-less, no personal data collected. Only applied on `build`, so the dev
 * server never reports. obs.html is intentionally left out — an idle OBS
 * browser source is not a visit.
 */
function cloudflareAnalyticsPlugin(env: Record<string, string>): Plugin {
  const token = (env.VITE_CF_BEACON_TOKEN ?? '').trim()
  return {
    name: 'cloudflare-web-analytics',
    apply: 'build',
    transformIndexHtml() {
      if (!/^[a-f0-9]{32}$/i.test(token)) return []
      return [
        {
          tag: 'script',
          attrs: {
            type: 'module',
            src: 'https://static.cloudflareinsights.com/beacon.min.js',
            'data-cf-beacon': JSON.stringify({ token }),
          },
          injectTo: 'body',
        },
      ]
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    base: '/',
    plugins: [react(), tailwindcss(), envReplacementPlugin(env), cloudflareAnalyticsPlugin(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          // Long-lived vendor chunks so app changes don't invalidate their cache
          manualChunks(id) {
            if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react'
            if (/node_modules[\\/](dexie|dexie-react-hooks)[\\/]/.test(id)) return 'dexie'
          },
        },
      },
    },
  }
})
