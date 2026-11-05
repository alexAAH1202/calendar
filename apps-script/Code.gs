/**
 * Family Wall Calendar – calendar bridge.
 *
 * A Google Apps Script web app that lets the wall calendar read and add events
 * on your Google calendars without the one-hour sign-in limit of a web page.
 * It runs as you, so it can see every calendar your account can see.
 *
 * Every request must carry the secret key from Script properties (BRIDGE_KEY).
 * Requests are POSTs with a plain-text JSON body, so the key never appears in a URL.
 *
 * Setup (see apps-script/README.md):
 *   1. Paste this file into a new Apps Script project.
 *   2. Run setup() once and copy the key it logs.
 *   3. Deploy > New deployment > Web app; Execute as: Me; Who has access: Anyone.
 *   4. In the wall calendar: Parent > Calendar, paste the web app URL and the key.
 */

var MAX_RANGE_DAYS = 120;
var MAX_TITLE = 200;

/** Run once from the editor: creates the secret key and logs it. */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('BRIDGE_KEY');
  if (!key) {
    key = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    props.setProperty('BRIDGE_KEY', key);
  }
  Logger.log('Bridge key: ' + key);
  // Touch CalendarApp so the authorisation prompt asks for calendar access now.
  CalendarApp.getDefaultCalendar();
  return key;
}

/** Run from the editor to replace the key (the wall then needs the new one). */
function resetKey() {
  PropertiesService.getScriptProperties().deleteProperty('BRIDGE_KEY');
  return setup();
}

function doGet() {
  return json_({ ok: true, service: 'family-wall-calendar-bridge' });
}

function doPost(e) {
  var req;
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'bad_request' });
  }
  if (!keyMatches_(req.key)) return json_({ ok: false, error: 'unauthorised' });
  try {
    if (req.action === 'calendars') return json_({ ok: true, calendars: listCalendars_() });
    if (req.action === 'events') return json_({ ok: true, events: listEvents_(req) });
    if (req.action === 'create') return json_({ ok: true, event: createEvent_(req) });
    return json_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err).slice(0, 200) });
  }
}

/** Compares the whole key every time, so timing does not reveal how much matched. */
function keyMatches_(given) {
  var key = PropertiesService.getScriptProperties().getProperty('BRIDGE_KEY');
  if (!key || typeof given !== 'string' || given.length !== key.length) return false;
  var diff = 0;
  for (var i = 0; i < key.length; i++) diff |= key.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

function listCalendars_() {
  return CalendarApp.getAllCalendars().map(function (c) {
    return {
      id: c.getId(),
      name: c.getName(),
      colour: c.getColor(),
      // Apps Script cannot tell whether a calendar shared with you allows changes;
      // Google refuses the write if it does not.
      owned: c.isOwnedByMe(),
      primary: c.isMyPrimaryCalendar(),
      timeZone: c.getTimeZone(),
    };
  });
}

function calendar_(id) {
  if (typeof id !== 'string' || !id) throw new Error('calendar_missing');
  var cal = CalendarApp.getCalendarById(id);
  if (!cal) throw new Error('calendar_not_found');
  return cal;
}

/** Events between `from` and `to` (epoch ms) on the given calendars. */
function listEvents_(req) {
  var from = Number(req.from);
  var to = Number(req.to);
  if (!isFinite(from) || !isFinite(to) || to <= from) throw new Error('bad_range');
  if (to - from > MAX_RANGE_DAYS * 86400000) throw new Error('range_too_long');
  var ids = Array.isArray(req.calendarIds) ? req.calendarIds.slice(0, 10) : [];
  var out = [];
  ids.forEach(function (id) {
    var cal = CalendarApp.getCalendarById(id);
    if (!cal) return;
    var tz = cal.getTimeZone();
    cal.getEvents(new Date(from), new Date(to)).forEach(function (ev) {
      out.push(eventJson_(ev, id, tz));
    });
  });
  return out;
}

function eventJson_(ev, calendarId, tz) {
  var allDay = ev.isAllDayEvent();
  var creators = ev.getCreators ? ev.getCreators() : [];
  var e = {
    id: ev.getId() + '|' + (allDay ? ymd_(ev.getAllDayStartDate(), tz) : ev.getStartTime().getTime()),
    calendarId: calendarId,
    title: ev.getTitle() || '(No title)',
    location: ev.getLocation() || '',
    creator: creators && creators.length ? String(creators[0]).toLowerCase() : '',
    allDay: allDay,
  };
  if (allDay) {
    e.startDate = ymd_(ev.getAllDayStartDate(), tz);
    e.endDate = ymd_(ev.getAllDayEndDate(), tz); // exclusive
  } else {
    e.start = ev.getStartTime().getTime();
    e.end = ev.getEndTime().getTime();
  }
  return e;
}

function ymd_(date, tz) {
  return Utilities.formatDate(date, tz, 'yyyy-MM-dd');
}

/** Adds one event. All-day events take yyyy-MM-dd dates (end exclusive); timed ones take epoch ms. */
function createEvent_(req) {
  var cal = calendar_(req.calendarId);
  var title = String(req.title || '').trim().slice(0, MAX_TITLE);
  if (!title) throw new Error('title_missing');
  var options = {};
  if (req.location) options.location = String(req.location).slice(0, 300);
  var ev;
  if (req.allDay) {
    var tz = cal.getTimeZone();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(req.startDate || '')) throw new Error('bad_date');
    var start = Utilities.parseDate(req.startDate, tz, 'yyyy-MM-dd');
    if (req.endDate && req.endDate > req.startDate) {
      ev = cal.createAllDayEvent(title, start, Utilities.parseDate(req.endDate, tz, 'yyyy-MM-dd'), options);
    } else {
      ev = cal.createAllDayEvent(title, start, options);
    }
    return eventJson_(ev, req.calendarId, tz);
  }
  var s = Number(req.start);
  var en = Number(req.end);
  if (!isFinite(s) || !isFinite(en) || en <= s) throw new Error('bad_time');
  ev = cal.createEvent(title, new Date(s), new Date(en), options);
  return eventJson_(ev, req.calendarId, cal.getTimeZone());
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
