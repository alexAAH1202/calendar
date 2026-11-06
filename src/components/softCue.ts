let ctx: AudioContext | undefined;

/**
 * A short, quiet two-note chime for a ticked step. Only played for a child whose
 * profile has sound turned on (off by default). Fails silently if audio is unavailable.
 */
export function playSoftCue(notes: number[] = [523.25, 659.25]): void {
  try {
    ctx ??= new AudioContext();
    const now = ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.06, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch {
    /* no audio: stay silent */
  }
}

/** A slightly brighter three-note chime for finishing a whole list. Same quiet volume. */
export const playAllDoneCue = () => playSoftCue([523.25, 659.25, 783.99]);
