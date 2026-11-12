/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONSUMER_APP_URL?: string;
  readonly VITE_GTM_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
