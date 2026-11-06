import { useRef, useState } from 'react';

type Recognition = {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
};

/**
 * 🎤: speak instead of typing, where the browser offers speech recognition (Chrome on Android does,
 * using Google's speech service). Hidden where it is not available; the keyboard's own mic works too.
 */
export function VoiceButton({ onText }: { onText: (text: string) => void }) {
  const Ctor = (window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition })
    .SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  if (!Ctor) return null;

  const toggle = () => {
    if (listening) return rec.current?.stop();
    const r = new Ctor();
    r.lang = navigator.language || 'en-AU';
    r.interimResults = false;
    r.onresult = (e) => onText(Array.from(e.results).map((res) => res[0].transcript).join(' ').trim());
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  };

  return (
    <button type="button" className={`icon-btn ${listening ? 'icon-btn--on' : ''}`} onClick={toggle} aria-pressed={listening}
      aria-label={listening ? 'Stop listening' : 'Speak instead of typing'}>
      🎤
    </button>
  );
}
