import { useFamilyInfo } from '../data/FamilyInfo';
import { useStore } from '../data/StoreContext';
import { dayKey } from '../date/dayKey';
import { nextStep, pickedToday, type DumpItem } from './braindump';
import { useItemList } from './useItemList';

/** On the phone's Day list: "Your three today", from the brain dump, each with its next small step. */
export function TodaysThree() {
  const { me } = useFamilyInfo();
  const list = useItemList<DumpItem>(useStore(), ['braindump', me.id]);
  const picks = pickedToday(list.items, dayKey(new Date()));
  if (!list.loaded || picks.length === 0) return null;
  return (
    <section className="todays-three" aria-label="Your three today">
      <h2 className="agenda-heading">Your three today</h2>
      <ol className="steps">
        {picks.map((i) => (
          <li key={i.id} className="step step--edit dump-item">
            <button type="button" className="tick-btn" aria-label={`Done: ${i.text}`}
              onClick={() => list.commit(list.current().map((x) => (x.id === i.id ? { ...x, done: true, touched: Date.now() } : x)))} />
            <span className="step-title">
              {i.text}
              {nextStep(i) && <span className="step-meta">Next: {nextStep(i)!.text}</span>}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
