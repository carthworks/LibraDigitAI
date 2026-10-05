import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
  base: process.env.ELECTRON_BUILD ? './' : '/',
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
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
