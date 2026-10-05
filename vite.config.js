import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// Large third-party libraries get their own long-lived chunks so they are
// cached across deploys and only fetched by the pages that use them.
const vendorChunks = {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-charts': ['recharts'],
  'vendor-pdf': ['react-pdf', 'pdfjs-dist'],
  'vendor-editor': ['react-quill'],
  'vendor-icons': ['lucide-react'],
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  base: process.env.ELECTRON_BUILD ? './' : '/',
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          for (const [chunk, packages] of Object.entries(vendorChunks)) {
            if (packages.some(pkg => id.includes(`/node_modules/${pkg}/`))) return chunk
          }
          return undefined
        }
      }
    }
  }
})
