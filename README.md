# Family Wall Calendar

A calm family wall calendar PWA for a 15.6" Android tablet (landscape) plus two parents' phones.
Built one phase at a time from the tech spec. **Current state: Phase 6 (calm polish) deployed to https://calendar-c8022.web.app: all six phases built.
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

## Meals (from the family's meal_planner.html)

A 🍽 Meals tab with the family's own planner, now shared by every device (Firestore `meals/recipes`,
`meals/shopping`, `meals/plan`, `meals/pantry`) instead of one browser's storage:

- **Plan:** the fortnight as before (8 family nights, then 6 couples nights), now anchored to a start Monday so the
  wall and the phone's Day list show **🍽 Dinner tonight**. Library or free text per night, cooked tick, clear,
  🎲 Plan my week (how many, who for, only empty nights), Reset fortnight. Picking a meal adds its ingredients.
- **Recipes:** the 36 built-in gluten-free recipes (kept exactly), filters (Kids, Couples, Quick, Batch, ★ Yours)
  and search; add, change or delete your own; **import from a recipe website** through the Apps Script (version 3:
  it reads the schema.org Recipe that most sites publish; aisles are guessed and can be changed; no AI, so GF swaps
  go in the notes). The original's import called the Claude API from the page, which only works inside Claude's
  own preview and would need a key in a public page; it was replaced.
- **Shopping:** by aisle, add items, merge duplicates, tick all / untick all / remove ticked, print, 🛒 Coles, undo.
- **Pantry:** the original check lists; send what is missing to the shopping list; GF brand reminders.

## Executive-function helpers

- **Up next / leave by:** any timed event can have a travel time (kept in `eventExtras/{eventId}`, our data, not
  Google's, so it works on repeating events and read-only calendars too). Today on the wall and the phone's Day list
  start with "Up next: Swimming · 4:00 pm · 20 min travel · leave 3:40 pm · leave in 25 min" and a bar that shrinks
  over the last hour. At 15, 5 and 1 minute the border and words get stronger; nothing flashes.
- **Finish by:** each routine list can have a finish time (Routines tab). Each child's column shows
  "Finish by 8:20 · 12 min left · 3 steps to go", stronger at 15 and 5 minutes, calm once passed.
- **Low-energy day / Running late** (pill on the main screen, family-wide, back to normal by itself the next day):
  only steps and chores marked "Essential on low-energy days" (⋯) show, and finishing those counts as all done
  (with the usual cheer and stars). If nothing in a list is marked essential, the list shows as usual. The brain dump
  shows just today's picks, with "Show everything".
- **Brain dump:** ☆ picks up to three things for today ("Today's 3", also on the phone's Day list as "Your three
  today"); ⋯ → Break it down into small steps (the item shows "Next: …"); ⋯ → Remind me on a date (hidden under
  "Waiting for a date" until then, then shown under ⏰ Reminders); Low items untouched for three weeks move to
  "Archived" (nothing deleted, "Bring back"). 🎤 to speak where the browser offers speech recognition.
- **Quick capture:** long-press the installed app's icon on Android: "Add to brain dump" opens it ready to type;
  also Chores and Week. (`?view=…&capture=1`.)

## Celebrations

- Each child's column shows "3 of 8 done" with a bar that fills as they tick.
- Per child (Parent → Children → Celebrate ticks): **Off**, **Gentle cheer** (default) or **Cheer + confetti**.
  Gentle: each tick shows a short word ("Nice one!", "Great job!" …) with the stars earned, rising and fading
  over 1.8 s, and the tick box gives a small bounce (only the one just ticked, never on load). Finishing the list
  says "All done, Astrid!" and leaves "🎉 All done, Astrid!" under the list. Cheer + confetti adds a 2.6 s burst
  of confetti over that child's column, which clears itself.
- Nothing flashes. If the device asks for reduced motion, the cheer appears and fades in place and there is no
  confetti or bounce. Sound stays off unless the child's sound is on (a brighter three-note chime for finishing).
- This loosens the spec's "no motion by default" for these moments, at the family's request; Off restores it.

## Groceries pop-up

"🛒 Coles groceries" opens Coles as a pop-up window. In the installed app (Add to home screen), Android shows
it as an overlay with a ✕ that returns to the app. It cannot be shown inside the app's own page: shops like Coles
forbid their site being framed by another site, and their sign-in would not work there.

## Duplicate a routine for another child

Routines tab: "⧉ Duplicate for Ethan" copies the list being edited (child and time of day) to the other child's
same time of day, with timers, stars and symbols. If theirs already has steps it asks: Add after them, Replace
them, or Cancel. A single step can be duplicated from its ⋯ menu. Copies get new ids, so ticks never carry over
between children; Undo reverses it (the Routines tab now loads every child's lists together, so one undo covers both).

## Phase 6: what is built

- **Timers:** removed at the family's request (steps no longer show a ▶ timer).
- **First – Then:** per child (Parent → Children → Show the routine as). The next step is a big tickable card,
  the one after it is shown beside it; after the last step, "Then" shows the reward.
- **Stars and rewards** (`rewards/{childId}`): each step earns 0–3 stars (default 1) the first time it is ticked
  that day; un-ticking that day takes them back; the midnight swap never touches the bank. The tick, the day's
  star marker and the bank change in one batch. Each child's column shows "⭐ 12 / 20 · Movie night" with a bar.
  Parent → Children sets the reward and target and has "Reward given" (takes the target off the bank).
- **Wall tablet** (Parent → Wall): sleep screen on a schedule (default 7:30 pm–6:30 am; black with a small dim
  clock; a touch wakes it; it sleeps again after two quiet minutes); the screen is kept on with the Screen Wake
  Lock API, asked again whenever the app comes back to the front; a nightly reload between 3 and 5 am, once,
  only after five minutes without a touch and with nothing waiting to sync (checked with Firestore).
- **Installable app (PWA):** manifest (full screen, plain blue icon) and a service worker that caches the app and
  its font, so the wall opens with no connection (after its first load). Firebase's `/__/` sign-in pages are never
  served from the cache. New versions wait: the wall loads them at the nightly reload, a phone shows
  "Update ready", and Parent → Wall has a button. Orientation is "any", not the spec's "landscape", because parents
  install it on phones too; the tablet stays landscape by itself.
- **Groceries:** "🛒 Coles groceries" on the Brain dump tab opens coles.com.au (the Coles app if Android hands the
  link to it).

## Phase 6 acceptance test

Leave the tablet running a full day: the screen stays on, sleeps and wakes at the set times, wakes on a touch,
and is fresh the next morning.

## Phase 6: not tested yet

- **The full unattended day on the real tablet.** Simulated in a browser with a controlled clock: asleep at
  6:00, woken by a touch, asleep again after two quiet minutes, awake at 6:31, asleep at 7:32 pm, clean lists and
  kept stars after midnight, no reload at 3 am while offline with an unsynced tick, one reload once back online.
- Whether the tablet honours the wake lock, and its own battery and screen settings (see the spec's tablet notes).
- Installing to the home screen on Android, app pinning, and whether Coles' link opens their app.
- The wake lock in the test was a stand-in; the real API was not exercised.
- Timer sound on the tablet speaker.

## Main screen and Parent (after Phase 5)

- **Everything used day to day is on the main screen**, as tabs: Today (Day on phones), Routines, Chores,
  Brain dump, Week, Month. Ticking, adding, changing and deleting happen there. Editing areas have a lavender
  background so it is clear when you are changing things; deletes need a second tap and most lists have Undo.
  The wall goes back to Today after five quiet minutes on any other tab.
- **Parent** (hold on the wall, ⚙️ on a phone) is only for setting the app up: Children (add, remove, name,
  colour, sensory settings), Calendar (the Apps Script connection, which calendars), Family (invite, sign out).
- This changes the spec's "child view shows no editing controls": the wall's tabs can be tapped by anyone.
  Today stays a tick-only view.
- **Calendar events can be added, changed and deleted**: Week tab (+ Event, tap an event), Month tab (tap a date
  to add), and the phone's Day list. Changing title, place, date, times, all day or several days, or moving it to
  another calendar. Repeating events and calendars not marked "Parents can add events here" open read-only, with
  the reason. Needs the Apps Script at version 2 (see `apps-script/README.md`); an older script gets a message
  saying to update it.

## Look and feel (after Phase 5)

- Soft gradient header, rounded Nunito font (bundled in the app, OFL licence, works offline), pill buttons,
  tabs with symbols, a week strip with the chosen day in a filled capsule.
- Cards are tinted with their person's colour and carry an initial badge; events are tinted with their calendar's
  colour with a darker bar. Brighter person colours; the earlier muted defaults show as their brighter equivalents.
  Text on every tinted card meets WCAG AA (tested for every palette and colour); done still shows as a tick plus
  faded, struck-through text, never colour alone. Edit mode keeps a different (lavender) background.
- **Phones open on the family's Day list** (a change from the spec, which had phones open in edit mode): a week
  strip, then Calendar, To do (everyone's routine steps and chores, tickable with the same guard) and Completed.
  The round **+** button opens parent mode. The wall's Today panel also has a week strip to look at another day's
  events; it goes back to today after five quiet minutes.

## Phase 5: what is built

- **Chores and to-dos** (`chores/{personId}`, one document per person, items in display order): for each child and
  each parent, with a symbol and a repeat rule: once, every day, school days (Mon–Fri), every week, every two
  weeks, every month. Ticking a repeating chore moves it to its next date on its own schedule (a Monday chore
  done on Wednesday is next due the following Monday) and it still shows as done for the rest of today; an
  accidental tick is undone exactly. A one-off without a date is a to-do for any day; finished ones collect under
  "Finished" until cleared. Overdue chores say "From Tuesday".
- **Wall:** a Chores tab with a column per person showing what is due today. Same tick guard as routines.
- **Parent mode > Chores:** per person, add / reorder (hold-drag or arrows) / change symbol, repeat and date / delete.
- **Parent mode > Brain dump** (`braindump/{parentUid}`): the signed-in parent's own list in High, Medium and Low.
  Press-and-hold drag within and **between** groups (including into an empty group), arrows within a group,
  "Move to …" from the ⋯ menu, done and clear done, 10-step undo. One array per parent, so moving an item to High
  is one write. The screen says plainly that it is hidden in the app, not locked: both parents' accounts can read it.
- One shared list hook (`src/lists/useItemList.ts`) for both: instant changes, background save with retry, undo,
  "Updated on another device".
- Tests: repeat rules (weekends, month ends, late completion, exact untick), brain dump moves, the list hook; and
  a browser test with two devices on one account and the other parent on a third: drag from Low into an empty
  High on the tablet reached the phone in under 0.1 s, a "Move to High" on the phone reached the tablet, both kept
  the order after reloading, and the other parent saw only their own (empty) brain dump.

## Phase 5 acceptance test

Move a brain dump item to High on the phone; it shows in High on the tablet (signed in as the same parent),
and stays there after reloading both.

## Phase 5: not tested yet

- On the real tablet and phones.
- A reload within a few milliseconds of a change can lose that change on that device (the browser had not stored
  it yet). Changes reached the other device in about 0.1 s in tests; a person cannot reload that fast, but the
  Phase 6 nightly reload should check nothing was changed in the last few seconds.
- Dragging a routine step between times of day (still by the ⋯ menu only).
- Chores with a due date far in the past on a monthly rule across years; time-zone changes.
- The brain dump on the wall tablet: it is parent-mode only, and the tablet is signed in as one parent, so the
  other parent sees theirs on their own phone.

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

- Connecting to the real Apps Script works on the family's tablet (once the deployment was open to "Anyone").
  Adding an event and seeing a Google-side event on the wall within 15 minutes still need checking on real Google;
  the automated tests use fake Google services because this workspace cannot reach Google.
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
| `src/lists/` | Chores (repeat rules, wall board, editor), brain dump (groups, moves, drag between groups), list hook |
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
