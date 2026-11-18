/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONSUMER_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
