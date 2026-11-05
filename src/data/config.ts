import type { FirebaseOptions } from 'firebase/app';

/**
 * Firebase web config from environment variables (see .env.example).
 * These values are not secret, but they stay out of the repo by rule.
 * Returns undefined when they are not set, and the app runs on this device only.
 */
export function firebaseConfig(env: Record<string, string | undefined> = import.meta.env): FirebaseOptions | undefined {
  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
  return Object.values(config).every(Boolean) ? config : undefined;
}
