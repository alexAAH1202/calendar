import { dayNotes, publicHoliday, schoolHolidayOn } from './vic';

/** Small chips for a day: public holiday, term start/end, or school holidays (shown on the first day of each run only by the caller). */
export function DayNote({ day, holidays = false }: { day: string; holidays?: boolean }) {
  const notes = dayNotes(day);
  if (holidays && schoolHolidayOn(day) && !notes.length) notes.push('School holidays');
  if (!notes.length) return null;
  return (
    <>
      {notes.map((n) => (
        <span key={n} className={`day-note ${publicHoliday(day) === n ? 'day-note--holiday' : ''}`}>{n}</span>
      ))}
    </>
  );
}
