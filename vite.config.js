import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const appUrl = env.APP_URL || 'https://doukeyi.aeyeot.co';
  const appHost = (() => {
    try {
      return new URL(appUrl).hostname;
    } catch {
      return 'doukeyi.aeyeot.co';
    }
  })();
  const isHmrDisabled = env.DISABLE_HMR === 'true';
  const devPort = Number(env.PORT || 3000);
  const previewPort = Number(env.PREVIEW_PORT || 4173);

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
      allowedHosts: [appHost],
      origin: appUrl,
      hmr: isHmrDisabled
        ? false
        : {
            host: appHost,
            protocol: appUrl.startsWith('https://') ? 'wss' : 'ws',
            clientPort: appUrl.startsWith('https://') ? 443 : 80,
          },
      watch: isHmrDisabled ? null : {},
    },
    preview: {
      host: '0.0.0.0',
      port: previewPort,
      allowedHosts: [appHost],
    },
  };
});
