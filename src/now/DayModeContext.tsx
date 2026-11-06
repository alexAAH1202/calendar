import { createContext, useContext } from 'react';
import type { DayMode } from './dayMode';

export const DayModeContext = createContext<DayMode>('normal');
export const useMode = () => useContext(DayModeContext);
