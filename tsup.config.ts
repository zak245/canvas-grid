import { defineConfig } from 'tsup';

export default defineConfig([
  // Main entry (core + react)
  {
    entry: {
      index: 'src/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
    external: ['react', 'react-dom', 'zustand'],
    esbuildOptions(options) {
      options.banner = {
        js: '"use client";', // For Next.js app router compatibility
      };
    },
  },
  // React-only entry (tree-shakeable)
  {
    entry: {
      react: 'src/react/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    outDir: 'dist',
    external: ['react', 'react-dom', 'zustand'],
    esbuildOptions(options) {
      options.banner = {
        js: '"use client";',
      };
    },
  },
  // Core-only entry (no React)
  {
    entry: {
      core: 'src/core/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    outDir: 'dist',
    external: ['zustand'],
  },
]);


