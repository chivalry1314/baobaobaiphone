/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ONLINE_THEME_SOURCE_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare const __APP_VERSION__: string;
