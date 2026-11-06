import type { CSSProperties } from 'react';

/** A round badge in the person's colour with their initial (or their symbol, if they have one). */
export function Avatar({ name, colour, image, size = 48 }: { name: string; colour: string; image?: string; size?: number }) {
  const emoji = image?.startsWith('emoji:') ? image.slice(6) : undefined;
  return (
    <span className={`avatar ${emoji ? 'avatar--emoji' : ''}`} aria-hidden="true"
      style={{ '--avatar': colour, width: size, height: size, fontSize: size * (emoji ? 0.6 : 0.46) } as CSSProperties}>
      {emoji ?? name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
