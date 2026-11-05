# Calendar bridge (Google Apps Script)

The wall calendar reads and adds Google Calendar events through this small script, which runs in **one parent's
Google account**. A web page on its own only gets about an hour of Calendar access after a sign-in; the script has
no such limit, so the wall keeps showing new events without anyone touching it. It is free.

## Before you start

- Use the account that can see all three calendars (yours, the other parent's, the shared family one).
- Ask the other parent to share their calendar with this account: Google Calendar > their calendar >
  **Settings and sharing > Share with specific people** > add your address with **See all event details**
  (or **Make changes to events** if you want to add events to it from the wall).

## Setup (about 5 minutes)

1. Go to https://script.google.com and click **New project**. Name it "Wall calendar bridge".
2. Delete the sample code, then paste the whole of [`Code.gs`](./Code.gs). Click **Save** (💾).
3. In the function menu next to **Run**, choose **setup**, then click **Run**.
   - Google asks for permission. Choose your account. You will see **"Google hasn't verified this app"**: this is
     your own script, so click **Advanced > Go to Wall calendar bridge (unsafe)** and **Allow**.
   - Open **Execution log**: it shows `Bridge key: …`. Copy the key (64 letters and numbers).
4. Click **Deploy > New deployment**. Gear icon > **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone** (not "Anyone with Google account" or "Only myself": with those, Google answers
     the wall with a sign-in page and the connection fails). Check: the web app URL opened in a private window
     shows `{"ok":true,…}`.
   - Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
5. On the wall tablet or a parent's phone: **Parent > Calendar**, paste the URL and the key, **Connect**.
   Tick the calendars to show, give each a short name (for example your first names and "Family"),
   and tick **Shared family calendar** on the shared one so events say who added them.

## Updating the script later

Use **Deploy > Manage deployments > ✏️ (edit) > Version: New version > Deploy**. That keeps the same URL.
A *new deployment* makes a new URL, which you would then have to paste into the wall again.

## What it can do, and the key

- It only answers requests that carry the key. Without it, every request is refused.
- With the key, anyone could read events on, and add events to, calendars this account can see.
  The key is stored in Script properties and in your family's Firestore data, which only the two parents' accounts
  can read. It is never in the app's code or this repository.
- To change the key: run **resetKey** in the script, copy the new key from the log, and reconnect on the wall.
- To stop it completely: **Deploy > Manage deployments > Archive**.

## Limits

- Changes made in Google (including events Gmail adds by itself) show on the wall at the next refresh:
  every 10 minutes, and whenever the screen is woken.
- It reads up to 10 calendars and up to about four months at a time.
- Apps Script has daily quotas for free accounts. The wall uses roughly 150 requests a day, far below them.
