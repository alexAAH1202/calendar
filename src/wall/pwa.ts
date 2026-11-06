import { registerSW } from 'virtual:pwa-register';

/**
 * The service worker: caches the app so the wall opens offline, and says when a new version is ready.
 * A new version found while the app is just opening (or after a reload) is loaded straight away, since
 * nobody is in the middle of anything yet. One that arrives while the app is in use waits: the wall loads
 * it at the nightly reload, phones show "Update ready", Parent → Wall has a button.
 */
const JUST_OPENED_MS = 20_000;
let needRefresh = false;
const listeners = new Set<() => void>();
let update: (reload?: boolean) => Promise<void> = async () => window.location.reload();

export function startPwa(): void {
  if (!('serviceWorker' in navigator)) return;
  update = registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh = true;
      if (performance.now() < JUST_OPENED_MS) {
        void update(true);
        return;
      }
      listeners.forEach((l) => l());
    },
  });
}

export const updateReady = () => needRefresh;
export const onUpdateReady = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));
/** Loads the new version if one is waiting, else just reloads. */
export const reloadApp = () => (needRefresh ? update(true) : Promise.resolve(window.location.reload()));
