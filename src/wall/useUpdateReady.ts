import { useEffect, useState } from 'react';
import { onUpdateReady, updateReady } from './pwa';

export function useUpdateReady(): boolean {
  const [ready, setReady] = useState(updateReady());
  useEffect(() => onUpdateReady(() => setReady(true)), []);
  return ready;
}
