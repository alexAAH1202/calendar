const COLES = 'https://www.coles.com.au/';

/**
 * Opens Coles as a pop-up over the app. In the installed app (Add to home screen) Android shows it as an
 * overlay with a ✕ that comes straight back here; in a plain browser tab it may open a new tab. Coles cannot
 * be shown inside the app's own page: shops forbid that, and sign-in would not work there.
 */
export function ColesButton() {
  const open = () => {
    const w = Math.min(1100, window.screen.availWidth);
    const h = Math.min(900, window.screen.availHeight);
    const features = `popup,width=${w},height=${h},left=${(window.screen.availWidth - w) / 2},top=${(window.screen.availHeight - h) / 2}`;
    const win = window.open(COLES, 'coles', features);
    if (!win) window.location.assign(COLES); // pop-ups blocked: go there and use Back to return
  };
  return (
    <button type="button" className="btn" onClick={open}>🛒 Coles groceries</button>
  );
}
