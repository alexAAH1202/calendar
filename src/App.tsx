import { SEED_CHILD, SEED_ROUTINE } from './data/seed';
import { RoutineScreen } from './screens/RoutineScreen';

export function App() {
  return <RoutineScreen person={SEED_CHILD} seed={SEED_ROUTINE} />;
}
