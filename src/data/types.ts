/** Shapes match the Firestore model in the spec, so phase 2 can store them unchanged. */
export interface Step {
  id: string;
  title: string;
  /** "emoji:👕" for now; "arasaac:<id>" or a small data URL later. */
  image?: string;
  timerSeconds?: number;
  stars: number;
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export interface Routine {
  id: string;
  personId: string;
  timeOfDay: TimeOfDay;
  steps: Step[];
  updatedAt: number;
}

export interface Person {
  id: string;
  name: string;
  role: 'child' | 'parent';
  colour: string;
}

export interface DayRecord {
  doneStepIds: string[];
}
