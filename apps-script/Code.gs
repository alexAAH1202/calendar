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

/** Bumped when actions are added, so the wall can tell an out-of-date script. */
var VERSION = 3;
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
    if (req.action === 'update') return json_({ ok: true, event: updateEvent_(req) });
    if (req.action === 'delete') return json_({ ok: true, deleted: deleteEvent_(req) });
    if (req.action === 'version') return json_({ ok: true, version: VERSION });
    if (req.action === 'recipe') return json_({ ok: true, recipe: readRecipe_(req.url) });
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
    eventId: ev.getId(),
    recurring: ev.isRecurringEvent ? ev.isRecurringEvent() : false,
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

/**
 * The single event `eventId` that starts at `occurrence` (epoch ms, or yyyy-MM-dd for all-day).
 * Looked up through getEvents on that day, so it is always one occurrence, never a whole series.
 */
function findEvent_(cal, eventId, occurrence) {
  if (typeof eventId !== 'string' || !eventId) throw new Error('event_missing');
  var tz = cal.getTimeZone();
  var allDay = typeof occurrence === 'string';
  var at = allDay ? Utilities.parseDate(occurrence, tz, 'yyyy-MM-dd').getTime() : Number(occurrence);
  if (!isFinite(at)) throw new Error('bad_occurrence');
  var found = cal.getEvents(new Date(at - 86400000), new Date(at + 2 * 86400000)).filter(function (ev) {
    if (ev.getId() !== eventId) return false;
    return allDay ? ev.isAllDayEvent() && ymd_(ev.getAllDayStartDate(), tz) === occurrence : ev.getStartTime().getTime() === at;
  });
  if (!found.length) throw new Error('event_not_found');
  return found[0];
}

/** Repeating events are changed in Google Calendar, where the choice "this one or all" is clear. */
function refuseRecurring_(ev) {
  if (ev.isRecurringEvent && ev.isRecurringEvent()) throw new Error('recurring_event');
}

/** Changes title, place and time of one event; moving it to another calendar re-creates it there. */
function updateEvent_(req) {
  var cal = calendar_(req.fromCalendarId || req.calendarId);
  var ev = findEvent_(cal, req.eventId, req.occurrence);
  refuseRecurring_(ev);
  if (req.calendarId && req.fromCalendarId && req.calendarId !== req.fromCalendarId) {
    var created = createEvent_(req);
    ev.deleteEvent();
    return created;
  }
  var title = String(req.title || '').trim().slice(0, MAX_TITLE);
  if (!title) throw new Error('title_missing');
  var tz = cal.getTimeZone();
  if (req.allDay) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(req.startDate || '')) throw new Error('bad_date');
    var start = Utilities.parseDate(req.startDate, tz, 'yyyy-MM-dd');
    if (req.endDate && req.endDate > req.startDate) ev.setAllDayDates(start, Utilities.parseDate(req.endDate, tz, 'yyyy-MM-dd'));
    else ev.setAllDayDate(start);
  } else {
    var s = Number(req.start);
    var en = Number(req.end);
    if (!isFinite(s) || !isFinite(en) || en <= s) throw new Error('bad_time');
    ev.setTime(new Date(s), new Date(en));
  }
  ev.setTitle(title);
  ev.setLocation(req.location ? String(req.location).slice(0, 300) : '');
  return eventJson_(ev, req.calendarId || req.fromCalendarId, tz);
}

function deleteEvent_(req) {
  var cal = calendar_(req.calendarId);
  var ev = findEvent_(cal, req.eventId, req.occurrence);
  refuseRecurring_(ev);
  ev.deleteEvent();
  return true;
}

/**
 * Reads a recipe page (version 3). Most recipe sites publish a schema.org "Recipe" block for
 * search engines; this returns its name, time, description and ingredient lines. Only http(s)
 * pages, at most 2 MB; nothing is stored.
 */
function readRecipe_(url) {
  if (typeof url !== 'string' || !/^https?:\/\/[^\s]+$/i.test(url)) throw new Error('bad_url');
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true, headers: { 'User-Agent': 'Mozilla/5.0 (family wall calendar recipe import)' } });
  if (res.getResponseCode() >= 400) throw new Error('page_' + res.getResponseCode());
  var html = res.getContentText();
  if (html.length > 2000000) throw new Error('page_too_big');
  var blocks = html.match(/<script[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi) || [];
  for (var i = 0; i < blocks.length; i++) {
    var text = blocks[i].replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '');
    var data;
    try { data = JSON.parse(text); } catch (e) { continue; }
    var r = findRecipe_(data);
    if (r) {
      return {
        name: clean_(r.name),
        time: durationText_(r.totalTime || r.cookTime || ''),
        note: clean_(r.description).slice(0, 150),
        url: url,
        ingredients: (r.recipeIngredient || r.ingredients || []).map(clean_).filter(function (x) { return x; }).slice(0, 60),
      };
    }
  }
  throw new Error('no_recipe_found');
}

function findRecipe_(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (var i = 0; i < node.length; i++) { var f = findRecipe_(node[i]); if (f) return f; }
    return null;
  }
  var type = node['@type'];
  if (type === 'Recipe' || (Array.isArray(type) && type.indexOf('Recipe') >= 0)) return node;
  return findRecipe_(node['@graph']);
}

/** "PT1H20M" -> "1 hr 20 min"; anything else as it is. */
function durationText_(iso) {
  var m = /^P(?:T)?(?:(\d+)H)?(?:(\d+)M)?/.exec(String(iso));
  if (!m || (!m[1] && !m[2])) return '';
  var h = Number(m[1] || 0), min = Number(m[2] || 0);
  h += Math.floor(min / 60); min = min % 60;
  return (h ? h + ' hr' : '') + (h && min ? ' ' : '') + (min ? min + ' min' : '');
}

/** Plain text: no tags, entities decoded, spaces tidied. */
function clean_(s) {
  return String(s || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&frac12;/g, '½').replace(/&frac14;/g, '¼').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
