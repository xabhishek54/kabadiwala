import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Kabadiwala Connect — Capacitor Mobile App Configuration
 *
 * The server.url is used when running `npx cap run android` during development.
 * For production APK builds, remove server.url so the app uses the bundled
 * dist/ assets instead of a remote server.
 *
 * Set VITE_API_BASE_URL in .env (or Vercel/Render env vars) to your Render backend URL.
 */
const RENDER_API_URL = 'https://kabadiwala-api.onrender.com';

const config: CapacitorConfig = {
  appId: 'com.kabadiwala.connect',
  appName: 'Kabadiwala Connect',
  webDir: 'dist',

  // Production: app loads its own bundled dist/ — API calls go to Render
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
  // Android-specific settings
  android: {
    allowMixedContent: false,  // enforce HTTPS in production
    captureInput: true,
    webContentsDebuggingEnabled: false,  // set true only for dev
  },
  // Pass the API URL into the WebView via server metadata
  // The apiClient.ts reads VITE_API_BASE_URL which is baked into the bundle at build time
};

export default config;
