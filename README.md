# Family Wall Calendar

A calm family wall calendar PWA for a 15.6" Android tablet (landscape) plus two parents' phones.
Built one phase at a time from the tech spec. **Current state: Phase 4 (calendar) deployed to https://calendar-c8022.web.app.
The calendar needs the one-time Apps Script setup in [`apps-script/README.md`](./apps-script/README.md).**

Without Firebase settings the app runs on one device only, using local storage (as in Phase 1).

## Run it

```bash
npm install
npm run dev        # serves on your LAN (--host) so the tablet can open it
npm test           # ordering, undo, save-retry, date-key, completion and emoji tests
npm run test:rules # Firestore security rules, against the emulator (needs Java)
npm run build
npm run deploy     # build, then deploy Hosting and the security rules (needs `firebase login`)
```

## Phase 2: Firebase setup (one time, in a browser)

1. Go to https://console.firebase.google.com, **Create a project** (Analytics off). It stays on the free Spark plan.
2. **Build > Authentication > Get started > Google**: enable, choose a support email, save.
3. **Build > Firestore Database > Create database**: production mode, location `australia-southeast1` (Sydney)
   or the region nearest you. The location cannot be changed later.
4. **Project settings > Your apps > Web (`</>`)**: register an app (Hosting box not needed). Copy the
   `apiKey`, `projectId` and `appId` values into `.env.local` (see `.env.example`). Set
   `VITE_FIREBASE_AUTH_DOMAIN` to `<projectId>.firebaseapp.com` (using `.web.app` gives Google's
   `redirect_uri_mismatch` error unless you add it to the OAuth client's redirect URIs).
5. `npm run deploy` publishes the app to `https://<projectId>.web.app` and uploads `firestore.rules`.

After the first deploy, in Google Cloud console > APIs & Services > Credentials, restrict the browser API key
to the `<projectId>.web.app` and `<projectId>.firebaseapp.com` websites.

## Joining the family

- The first parent signs in on the tablet and taps **Create**. This adds the starter child and morning routine.
- In Parent mode, **Family** > enter the other parent's Google email > **Invite**.
- The other parent opens the same address on their phone, signs in, and taps **Join**.
- Phones open straight into edit mode. The tablet opens in the child view and stays signed in.
- Both parents can read everything in the family. The Parent hold is a child lock, not security.

To try it on the tablet: run `npm run dev`, then open `http://<your-computer-ip>:5173` in Chrome on the tablet.

## Phase 4: what is built

- **Why a bridge:** a web page cannot read Google's private iCal addresses (browsers block it), and browser-only
  Google sign-in gives about an hour of Calendar access, so an untouched wall would stop updating. Instead a small,
  free Google Apps Script ([`apps-script/Code.gs`](./apps-script/Code.gs)) runs in one parent's account and the
  app talks to it with a secret key kept in the family's Firestore data. This departs from the spec's "no server
  code" but stays free and needs no Cloud Functions.
- **Wall:** a Today panel (today's events, then tomorrow's) beside the children's routines, and Week and Month
  views. Each event shows its calendar's colour **and** name; shared-calendar events say who added them. The wall
  goes back to Today after five quiet minutes on Week or Month. Events are read-only on the wall.
- **Parent mode > Calendar:** add an event (title, calendar, date, all day or times, place), browse weeks,
  refresh, and the calendar connection (address, key, which calendars, their names, which accept new events).
- Events refresh every 10 minutes and when the screen wakes. The last events are kept on each device, so the wall
  still shows them with no Wi-Fi, with a small "Calendar last updated …" line when they are over an hour old.
  Events use no Firestore reads or writes.
- Tests: the script against fake Google services (key checks, listing, creating, all-day dates), date logic
  (multi-day, midnight, Monday weeks), the client (it never sends the key anywhere but `script.google.com`), and a
  browser test against a fake bridge that answers like Apps Script (POST then redirect): connect with a wrong
  then right key, choose calendars, add an event, an event added "in Google" appearing at the 10-minute refresh,
  Week and Month, back to Today, and events still shown with the bridge unreachable.

## Phase 4 acceptance test

1. Do the Apps Script setup, connect it in Parent > Calendar, tick the three calendars.
2. Add an event on the tablet: it appears in Google Calendar.
3. Add an event in Google Calendar (or let Gmail add one): it shows on the wall within 15 minutes.

## Phase 4: not tested yet

- **Against real Google.** Everything above ran against fake Google services; this workspace cannot reach
  `calendar.google.com` or `script.google.com`. The redirect behaviour was copied from how Apps Script web apps
  are known to answer.
- That Google's iCal address really is blocked in the tablet's browser (assumed, not checked).
- Events in other time zones, recurring events (Apps Script returns each occurrence, untested), and calendars
  with hundreds of events.
- Editing or deleting events from the wall: only adding is built.
- "Added by" depends on Google reporting the event's creator; for events Gmail adds it may be blank.

## Phase 3: what is built

- **Several children.** The wall shows one column per child with the routine for the current time of day:
  morning until 12:00, afternoon until 17:00, then evening (`src/data/timeOfDay.ts`).
- **Parent mode** (hold Parent): pick a child, pick Morning / Afternoon / Evening, edit that list. "+ Add child".
  "⋯" on a step offers **Move to** another time of day and **Delete** (needs a second tap). One **Undo** covers the
  last 10 changes across all three lists of that child, including moves between them.
- **Sensory profile per child** (*child's settings*): symbols / symbols and words / words; four text sizes
  (smallest 28 px); done steps **stay in place** (default), **move to bottom** or **hide**; Calm / Warm / Cool /
  High contrast colours (all tested for WCAG AA contrast); brightness; motion none (default) or a soft 200 ms fade;
  sound off (default) or a quiet chime on ticking. Also name, colour and a symbol for the child.
  How done steps show is a display rule only: the saved order never changes.
- **Templates**: School morning, After school and Bedtime come with the app; save any list as your own template.
  "Add steps" appends copies, "Replace list" (second tap) swaps the list; both can be undone. Copies get new ids,
  so ticks never carry over between lists.
- **Midnight**: ticks are stored per date, so at midnight the wall reads a new, empty day. Tested with a fake clock
  against the emulator: the swap wrote or changed **no documents**, and yesterday's ticks are kept.

## Phase 2: what is built

- Google sign-in; one family document listing the parents' accounts; invite-by-email for the second parent.
- Firestore with its offline cache on the device: changes apply at once, work with no Wi-Fi, and sync later.
- Routines are one document each with the steps in an array, so a reorder is a single write.
  Ticks are per-date documents (`days/{yyyy-mm-dd}_{pid}`) updated with add/remove, so two devices ticking at once both count.
- A change from the other device shows straight away; in edit mode a calm "Updated on another device" note appears
  and undo is cleared (last write wins).
- Parent-mode-only notes for offline, slow sync, and a change the server refused. The child view never shows them.
- The child view waits until the saved order and today's ticks are known before showing the list, so it never jumps.
- **Emoji for steps**: pick from common routine symbols or type any emoji from the keyboard when adding a step;
  tap a step's symbol in edit mode to change it.
- Security rules (`firestore.rules`): only family members can read or write family data; anyone can start a family
  containing only themselves; an invited Google account can add only itself; nobody can delete a family.

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
| `src/data/` | The data layer: `store.ts` contract, `localStore`, `firestoreStore`, family setup, save queue, hooks |
| `src/auth/` | Google sign-in and finding or joining the family |
| `firestore.rules`, `tests/rules.test.ts` | Security rules and their emulator tests |
| `src/calendar/` | Calendar bridge client, event dates, Today / Week / Month, setup and add-event forms |
| `apps-script/` | The calendar bridge script and its setup guide; tested by `tests/code-gs.test.ts` |
| `src/components/` | Child step, edit step, drag list (dnd-kit), hold button, idle exit |
| `src/screens/` | The routine screen |

Screens never touch storage directly; they use the hooks in `src/data/`, which talk to a `FamilyStore`.

## Phase 1 acceptance test (do this on the real tablet)

1. Hold "Parent", then reorder the 8 steps by press-and-hold drag and by the arrows.
2. Reload the page: the order is the same.
3. Swipe and tap across steps quickly in edit mode: nothing lifts.

## Phase 3 acceptance test (on the tablet)

1. Give two children a list for the current time of day, set one to "Move to bottom", tick a step on each.
2. Leave the tablet on past midnight (or check in the morning): both lists are clean.

## Phase 3: not tested yet

- Not yet tried on the real tablet or phones; tested in Chromium at 1920 × 1080 and 390 px wide.
- The soft chime has not been listened to on the tablet's speaker, and the brightness setting only dims that
  child's column (the screen backlight is not changed).
- Three or more children side by side on the 15.6" screen (two are tested).
- Changing the morning / afternoon / evening times: fixed at 12:00 and 17:00 for now.
- Moving a step between times of day is by the "⋯" menu, not by dragging between lists (that comes with the
  brain dump in Phase 5).
- A routine left on screen exactly as the time of day changes (for example at 12:00) switches to the next list
  without warning; the child's view of the old list is not kept.

## Phase 2 acceptance test (do this on the real tablet and a phone)

1. Reorder on the phone: the tablet shows it within seconds.
2. Turn the phone's Wi-Fi and data off, reorder, turn them back on: the tablet catches up.

## Phase 2: not tested yet

- **Nothing has run against a real Firebase project yet**, only the local emulators. Tested there with two
  browser windows (tablet size and phone size): sign-in, create, invite, join, phone reorder reaching the tablet
  in about 0.1 s, a new emoji step reaching the tablet, offline reorder catching up after reconnecting, an offline
  change made before closing the app syncing when reopened, ticks and sign-in kept across a reload, the
  "Updated on another device" note, and that a reload shows the list once with no jump.
- Real Google sign-in (the emulator uses a fake Google account). The popup on Android Chrome and in an installed
  app is untested; it falls back to a full-page redirect if the popup is blocked.
- Opening the app with no connection at all: this needs the service worker from Phase 6. Until then the page
  must load online once; after that, changes made while offline are kept and sync later.
- Free-tier usage. Each open screen keeps two listeners (routine and today's ticks). Check usage in the Firebase console after a week.
- Removing a parent from the family, or a parent's account being deleted: there is no button for it yet.
- Typed emoji are limited to one emoji each; how each phone's keyboard inserts emoji is untested.

## Phase 1: not tested yet

- **Not run on the real tablet or a real phone.** Checked in desktop Chromium with emulated touch at
  1920 × 1080 and 390 px wide: hold-drag moves a step, a quick swipe does not lift one, arrows and undo work,
  order and ticks survive a reload, and no horizontal scroll at phone width.
- Real finger feel of the 250 ms hold and 8 px tolerance; these may need tuning on the tablet.
- Page scrolling while in edit mode on a list longer than the screen (8 steps fit on the tablet).
- Screen reader announcements for drag and drop (dnd-kit defaults, English only).
- What happens when localStorage is full or blocked (private mode): the retry notice should appear; not forced.
- Midnight swap with the real clock (only the date maths and the hook's day change are tested).
