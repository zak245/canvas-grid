/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string
  readonly VITE_GRID_ID: string
  readonly VITE_USE_BACKEND: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}



