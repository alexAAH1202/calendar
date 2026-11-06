import { registerSW } from 'virtual:pwa-register';

/** The service worker: caches the app so the wall opens offline, and says when a new version is ready. */
let needRefresh = false;
const listeners = new Set<() => void>();
let update: (reload?: boolean) => Promise<void> = async () => window.location.reload();

export function startPwa(): void {
  if (!('serviceWorker' in navigator)) return;
  update = registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh = true;
      listeners.forEach((l) => l());
    },
  });
}

export const updateReady = () => needRefresh;
export const onUpdateReady = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));
/** Loads the new version if one is waiting, else just reloads. */
export const reloadApp = () => (needRefresh ? update(true) : Promise.resolve(window.location.reload()));
