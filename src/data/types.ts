/** Shapes match the Firestore model in the spec. */
export interface Step {
  id: string;
  title: string;
  /** "emoji:👕"; a symbol-library id or small data URL may follow later. */
  image?: string;
  stars: number;
  /** Still shown on a low-energy or running-late day. */
  essential?: boolean;
  /** Only on school days ('school') or only on days with no school ('off'). Unset: every day. */
  when?: 'school' | 'off';
}

export const TIMES_OF_DAY = ['morning', 'afternoon', 'evening'] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

export interface Routine {
  id: string;
  personId: string;
  timeOfDay: TimeOfDay;
  steps: Step[];
  updatedAt: number;
  /** "HH:mm": the time this list should be finished by (e.g. leaving for school). */
  finishBy?: string;
}

export type SymbolMode = 'symbols' | 'symbolsText' | 'text';
/** What a done step does on the child view. The stored order never changes. */
export type CompletedBehaviour = 'stay' | 'moveToBottom' | 'hide';
export type TextSize = 'normal' | 'large' | 'larger' | 'largest';
export type PaletteName = 'calm' | 'warm' | 'cool' | 'contrast';

export interface SensoryProfile {
  /** Soft cue on tick. Off by default. */
  sound: boolean;
  /** 'none' by default: no motion at all. 'soft' allows a 200 ms fade. */
  animation: 'none' | 'soft';
  textSize: TextSize;
  symbolMode: SymbolMode;
  completedBehaviour: CompletedBehaviour;
  palette: PaletteName;
  /** 0.6 (dim) to 1 (full). */
  brightness: number;
  /** The whole list, or one step at a time as "First … Then …". */
  layout: 'checklist' | 'firstThen';
  /** A small cheer on each tick ('gentle'), plus confetti when the list is finished ('big'). */
  celebration: 'off' | 'gentle' | 'big';
}

export interface Person {
  id: string;
  name: string;
  role: 'child' | 'parent';
  colour: string;
  /** "emoji:🦊" shown beside the name. */
  avatar?: string;
  /** Present on children; missing fields fall back to the defaults. */
  sensory?: Partial<SensoryProfile>;
  /** Display order of children on the wall. */
  order?: number;
}

export interface Template {
  id: string;
  name: string;
  timeOfDay: TimeOfDay;
  steps: Step[];
  /** Built-in templates come with the app and cannot be deleted. */
  builtIn?: boolean;
}

export interface DayRecord {
  doneStepIds: string[];
  /** Steps that have earned their stars today (see lists/stars.ts). */
  starredStepIds?: string[];
}
