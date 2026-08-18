import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const appUrl = env.APP_URL || `http://localhost:${env.PORT || 3000}`;
  const appHost = (() => {
    try {
      return new URL(appUrl).hostname;
    } catch {
      return 'localhost';
    }
  })();
  const allowedHosts = Array.from(new Set([
    appHost,
    'doukeyi.aeyeot.co',
    'localhost',
    '127.0.0.1',
  ]));
  const isHmrDisabled = env.DISABLE_HMR === 'true';
  const devPort = Number(env.PORT || 3000);
  const previewPort = Number(env.PREVIEW_PORT || 4173);
  const hmrClientPort = env.HMR_CLIENT_PORT ? Number(env.HMR_CLIENT_PORT) : undefined;
  const hmrPath = env.HMR_PATH || '';
  const hmrConfig =
    isHmrDisabled
      ? false
      : env.HMR_HOST || env.HMR_PROTOCOL || hmrClientPort || hmrPath
        ? {
            ...(env.HMR_HOST ? {host: env.HMR_HOST} : {}),
            ...(env.HMR_PROTOCOL ? {protocol: env.HMR_PROTOCOL} : {}),
            ...(hmrClientPort ? {clientPort: hmrClientPort} : {}),
            ...(hmrPath ? {path: hmrPath} : {}),
          }
        : true;

  return {
    plugins: [react(), tailwindcss()],
    base: '/',
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.APP_URL': JSON.stringify(appUrl),
    },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: devPort,
      allowedHosts,
      origin: appUrl,
      proxy: {
        '/app-api': {
          target: env.BFF_URL || 'http://127.0.0.1:8787',
          changeOrigin: true,
        },
      },
      hmr: hmrConfig,
      watch: isHmrDisabled ? null : {},
    },
    preview: {
      host: '0.0.0.0',
      port: previewPort,
      allowedHosts,
    },
  };
});
