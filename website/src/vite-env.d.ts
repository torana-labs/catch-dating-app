/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONSUMER_APP_URL?: string;
  readonly VITE_GTM_ID?: string;
  readonly VITE_STORE_LINKS_MODE?: "prelaunch" | "live";
  readonly VITE_APP_STORE_URL?: string;
  readonly VITE_PLAY_STORE_URL?: string;
  readonly VITE_HOST_APP_STORE_URL?: string;
  readonly VITE_HOST_PLAY_STORE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
