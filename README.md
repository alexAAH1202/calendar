# Family Wall Calendar

A calm family wall calendar PWA for a 15.6" Android tablet (landscape) plus two parents' phones.
Built one phase at a time from the tech spec. **Current state: Phase 1 (ordering core), local storage only.**

## Run it

```bash
npm install
npm run dev        # serves on your LAN (--host) so the tablet can open it
npm test           # ordering, undo, save-retry, date-key and completion tests
npm run build
```

To try it on the tablet: run `npm run dev`, then open `http://<your-computer-ip>:5173` in Chrome on the tablet.

## Phase 1: what is built

- One child ("Ava") with one Morning routine of 8 steps (`src/data/seed.ts`). Emoji are placeholders
  until a symbol library is chosen and its licence checked.
- **Child view**: tap a step to tick it (tick mark + faded, struck-through text, so it reads without colour).
  Un-ticking needs a second, deliberate tap on a "Not done" button that hides itself after 4 s.
- **Parent edit mode**: press and hold "Parent" (top right) for about 1 s. The PIN comes in a later phase;
  this hold is only a guard against passing taps. Edit mode has a different background tint and auto-exits
  after 2 minutes without a touch.
  - Press and hold a step about 250 ms, then drag. Moving more than 8 px before that counts as a scroll,
    so a scroll or tap never lifts an item.
  - Large ▲ ▼ arrows do the same move; ✕ deletes; Undo goes back up to 10 changes; add a step at the bottom.
  - Keyboard: focus a step, Space to lift, arrows to move, Space to drop.
- Every change shows at once, then the whole steps array is saved. A failed save keeps the order on screen,
  shows a calm "Not saved yet" notice with "Retry now", and retries in the background. The order never snaps back.
- Completion is stored per date (`days/{yyyy-mm-dd}_{pid}`), and the date key is re-checked every minute and
  on focus, so at midnight the screen reads a fresh, empty day with no writes. (Groundwork for phase 3.)
- No pinch zoom, pull-to-refresh, text selection or long-press menu on the child view.

## Layout

| Path | Concern |
| --- | --- |
| `src/ordering/` | Pure reorder helpers and the 10-step undo stack (tested) |
| `src/date/` | Local date key and the midnight-swap hook (tested) |
| `src/data/` | The data layer: types, storage (localStorage now, Firestore in phase 2), save queue with retry, hooks |
| `src/components/` | Child step, edit step, drag list (dnd-kit), hold button, idle exit |
| `src/screens/` | The routine screen |

Screens never touch storage directly; they use the hooks in `src/data/`. Phase 2 swaps `storage.ts` for Firestore.

## Phase 1 acceptance test (do this on the real tablet)

1. Hold "Parent", then reorder the 8 steps by press-and-hold drag and by the arrows.
2. Reload the page: the order is the same.
3. Swipe and tap across steps quickly in edit mode: nothing lifts.

## Not tested yet

- **Not run on the real tablet or a real phone.** Checked in desktop Chromium with emulated touch at
  1920 × 1080 and 390 px wide: hold-drag moves a step, a quick swipe does not lift one, arrows and undo work,
  order and ticks survive a reload, and no horizontal scroll at phone width.
- Real finger feel of the 250 ms hold and 8 px tolerance; these may need tuning on the tablet.
- Page scrolling while in edit mode on a list longer than the screen (8 steps fit on the tablet).
- Screen reader announcements for drag and drop (dnd-kit defaults, English only).
- What happens when localStorage is full or blocked (private mode): the retry notice should appear; not forced.
- Midnight swap with the real clock (only the date maths and the hook's day change are tested).
