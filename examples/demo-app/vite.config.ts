import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Point directly to source for instant HMR and debugging
      // Note: We map specific exports to their source entry points
      '@grid-engine/core': path.resolve(__dirname, '../../src/core/index.ts'),
      // For React components, we need to be careful.
      // If the library doesn't export components via core/index.ts, we alias to react/index.ts
      // Let's check src/react/index.ts content later. Assuming it exists or we point to components.
      '@grid-engine/react': path.resolve(__dirname, '../../src/react/index.ts'),
    }
  },
  server: {
    port: 3000
  }
})

