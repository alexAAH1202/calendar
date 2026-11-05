import { createContext, useContext, type ReactNode } from 'react';
import { useStore } from '../data/StoreContext';
import { useCalendar, type CalendarData } from './useCalendar';

const CalendarContext = createContext<CalendarData | null>(null);

/** One calendar fetcher for the whole app (wall and parent mode share it). */
export function CalendarProvider({ children }: { children: ReactNode }) {
  const data = useCalendar(useStore());
  return <CalendarContext.Provider value={data}>{children}</CalendarContext.Provider>;
}

export function useCalendarData(): CalendarData {
  const data = useContext(CalendarContext);
  if (!data) throw new Error('useCalendarData must be used inside CalendarProvider');
  return data;
}
