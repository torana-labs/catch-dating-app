import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const businessRules = JSON.parse(
  fs.readFileSync(
    path.resolve(toolDir, "../contracts/business_rules.json"),
    "utf8"
  )
);

const MINUTE_MS = 60 * 1000;
const USER_SCHEDULE_STATUSES = new Set(["signedUp", "waitlisted", "attended"]);
const ORGANIZER_LOCK_COLLECTION = "organizerScheduleLocks";
const USER_EVENT_LOCK_COLLECTION = "userEventScheduleLocks";

export const EVENT_MAX_DURATION_MINUTES =
  businessRules.eventScheduling.maxDurationMinutes;
export const EVENT_SCHEDULE_LOCK_SLOT_MINUTES =
  businessRules.eventScheduling.scheduleLockSlotMinutes;

export function scheduleComplianceIssues({
  events,
  participations = [],
  organizerScheduleLocks = [],
  userEventScheduleLocks = [],
  checkLocks = false,
}) {
  const issues = [];
  const eventWindows = new Map();
  for (const event of events) {
    try {
      const window = eventWindow(event);
      eventWindows.set(window.eventId, window);
      validateEventWindow(window, issues);
    } catch (error) {
      issues.push({
        code: "invalid-event-schedule-shape",
        path: event.path ?? `events/${event.id ?? "unknown"}`,
        message: error.message,
      });
    }
  }

  const activeEventsByOrganizer = groupBy(
    [...eventWindows.values()].filter((event) => event.status !== "cancelled"),
    (event) => event.organizerId
  );
  for (const organizerEvents of activeEventsByOrganizer.values()) {
    forEachOverlappingPair(organizerEvents, (first, second) => {
      issues.push({
        code: "club-schedule-overlap",
        path: `events/${second.eventId}`,
        message:
          `Club ${second.organizerId} has overlapping events ` +
          `${first.eventId} and ${second.eventId}.`,
      });
    });
  }

  const scheduledParticipations = [];
  for (const participation of participations) {
    const data = participation.data ?? participation.doc ?? participation;
    if (!USER_SCHEDULE_STATUSES.has(data.status)) continue;
    const event = eventWindows.get(data.eventId);
    if (!event) {
      issues.push({
        code: "missing-participation-event",
        path: participation.path ?? `eventParticipations/${participation.id ?? "unknown"}`,
        message: `Participation references missing events/${data.eventId}.`,
      });
      continue;
    }
    if (event.status === "cancelled") {
      issues.push({
        code: "scheduled-participation-cancelled-event",
        path: participation.path ?? `eventParticipations/${participation.id ?? "unknown"}`,
        message: `Scheduled participation references cancelled events/${event.eventId}.`,
      });
      continue;
    }
    scheduledParticipations.push({
      uid: data.uid,
      eventId: data.eventId,
      organizerId: data.organizerId ?? event.organizerId,
      startTimeMillis: event.startTimeMillis,
      endTimeMillis: event.endTimeMillis,
      path: participation.path ?? `eventParticipations/${participation.id ?? `${data.eventId}_${data.uid}`}`,
    });
  }

  const participationsByUser = groupBy(scheduledParticipations, (item) => item.uid);
  for (const userParticipations of participationsByUser.values()) {
    forEachOverlappingPair(userParticipations, (first, second) => {
      issues.push({
        code: "user-event-schedule-overlap",
        path: second.path,
        message:
          `User ${second.uid} has overlapping event participations ` +
          `${first.eventId} and ${second.eventId}.`,
      });
    });
  }

  if (checkLocks) {
    issues.push(...scheduleLockIssues({
      eventWindows,
      scheduledParticipations,
      organizerScheduleLocks,
      userEventScheduleLocks,
    }));
  }

  return issues;
}

export function assertScheduleCompliance(params) {
  const issues = scheduleComplianceIssues(params);
  if (issues.length > 0) {
    throw new Error(
      "Demo schedule data violates event schedule policy:\n" +
      issues.map((issue) => `- ${issue.code}: ${issue.message}`).join("\n")
    );
  }
}

export function buildOrganizerScheduleLockDocs({event}) {
  const window = eventWindow(event);
  if (window.status === "cancelled") return [];
  validateEventWindow(window);
  return scheduleSlots(window).map((slot) => ({
    path: `${ORGANIZER_LOCK_COLLECTION}/${window.organizerId}_${slot}`,
    data: {
      ...demoMarkerFor(window.data),
      ownerType: "club",
      ownerId: window.organizerId,
      slot,
      eventId: window.eventId,
      organizerId: window.organizerId,
      startTimeMillis: window.startTimeMillis,
      endTimeMillis: window.endTimeMillis,
    },
  }));
}

export function buildUserEventScheduleLockDocs({event, participation}) {
  const data = participation.data ?? participation.doc ?? participation;
  if (!USER_SCHEDULE_STATUSES.has(data.status)) return [];
  const window = eventWindow(event);
  if (window.status === "cancelled") return [];
  validateEventWindow(window);
  return scheduleSlots(window).map((slot) => ({
    path: `${USER_EVENT_LOCK_COLLECTION}/${data.uid}_${slot}`,
    data: {
      ...demoMarkerFor(data),
      ownerType: "user",
      ownerId: data.uid,
      slot,
      eventId: window.eventId,
      organizerId: data.organizerId ?? window.organizerId,
      uid: data.uid,
      startTimeMillis: window.startTimeMillis,
      endTimeMillis: window.endTimeMillis,
    },
  }));
}

export function buildScheduleLockDocs({events, participations}) {
  const eventById = new Map(events.map((event) => [event.id, event]));
  const docs = [];
  for (const event of events) {
    docs.push(...buildOrganizerScheduleLockDocs({event}));
  }
  for (const participation of participations) {
    const data = participation.data ?? participation.doc ?? participation;
    const event = eventById.get(data.eventId);
    if (event) docs.push(...buildUserEventScheduleLockDocs({event, participation}));
  }
  return assertUniqueScheduleLockDocs(docs);
}

export async function assertNoUserEventScheduleConflictInFirestore({
  db,
  uid,
  event,
}) {
  const next = eventWindow(event);
  const participationSnap = await db.collection("eventParticipations")
    .where("uid", "==", uid)
    .get();
  for (const doc of participationSnap.docs) {
    const data = doc.data();
    if (!USER_SCHEDULE_STATUSES.has(data.status) || data.eventId === next.eventId) {
      continue;
    }
    const eventSnap = await db.collection("events").doc(data.eventId).get();
    if (!eventSnap.exists) continue;
    const existing = eventWindow({
      id: eventSnap.id,
      path: eventSnap.ref?.path ?? `events/${eventSnap.id}`,
      data: eventSnap.data(),
    });
    if (existing.status !== "cancelled" && intervalsOverlap(
      next.startTimeMillis,
      next.endTimeMillis,
      existing.startTimeMillis,
      existing.endTimeMillis
    )) {
      throw new Error(
        `User ${uid} already has a scheduled participation for ` +
        `${existing.eventId} during events/${next.eventId}.`
      );
    }
  }
}

function scheduleLockIssues({
  eventWindows,
  scheduledParticipations,
  organizerScheduleLocks,
  userEventScheduleLocks,
}) {
  const issues = [];
  const expected = new Map();
  for (const event of eventWindows.values()) {
    if (event.status === "cancelled") continue;
    for (const slot of scheduleSlots(event)) {
      expected.set(`${ORGANIZER_LOCK_COLLECTION}/${event.organizerId}_${slot}`, {
        ownerType: "club",
        ownerId: event.organizerId,
        slot,
        eventId: event.eventId,
      });
    }
  }
  for (const participation of scheduledParticipations) {
    for (const slot of scheduleSlots(participation)) {
      expected.set(`${USER_EVENT_LOCK_COLLECTION}/${participation.uid}_${slot}`, {
        ownerType: "user",
        ownerId: participation.uid,
        slot,
        eventId: participation.eventId,
      });
    }
  }

  const actual = new Map([
    ...organizerScheduleLocks.map((doc) => [doc.path, doc]),
    ...userEventScheduleLocks.map((doc) => [doc.path, doc]),
  ]);
  for (const [pathValue, expectedData] of expected.entries()) {
    const doc = actual.get(pathValue);
    if (!doc) {
      issues.push({
        code: "missing-schedule-lock",
        path: pathValue,
        message: `${pathValue} is missing for events/${expectedData.eventId}.`,
      });
      continue;
    }
    for (const field of ["ownerType", "ownerId", "slot", "eventId"]) {
      if (doc.data?.[field] !== expectedData[field]) {
        issues.push({
          code: "schedule-lock-field-mismatch",
          path: pathValue,
          message: `${field} does not match the expected schedule lock value.`,
        });
      }
    }
  }
  for (const pathValue of actual.keys()) {
    if (!expected.has(pathValue)) {
      issues.push({
        code: "stale-schedule-lock",
        path: pathValue,
        message: `${pathValue} does not correspond to an active event schedule.`,
      });
    }
  }
  return issues;
}

function eventWindow(event) {
  const data = event.data ?? event.doc ?? event;
  const eventId = event.id ?? data.id;
  const organizerId = event.organizerId ?? data.organizerId;
  if (typeof eventId !== "string") throw new Error("event id must be a string.");
  if (typeof organizerId !== "string") {
    throw new Error(`events/${eventId} organizerId must be a string.`);
  }
  return {
    eventId,
    organizerId,
    status: data.status ?? "active",
    data,
    path: event.path ?? `events/${eventId}`,
    startTimeMillis: timestampMillis(data.startTime),
    endTimeMillis: timestampMillis(data.endTime),
  };
}

function validateEventWindow(window, issues = null) {
  const add = (code, message) => {
    const issue = {code, path: window.path, message};
    if (issues) issues.push(issue);
    else throw new Error(message);
  };
  if (window.endTimeMillis <= window.startTimeMillis) {
    add("invalid-event-time", `${window.path} endTime must be after startTime.`);
  }
  const durationMinutes = (window.endTimeMillis - window.startTimeMillis) / MINUTE_MS;
  if (durationMinutes > EVENT_MAX_DURATION_MINUTES) {
    add(
      "event-duration-too-long",
      `${window.path} lasts ${durationMinutes} minutes; max is ` +
        `${EVENT_MAX_DURATION_MINUTES}.`
    );
  }
}

function scheduleSlots({startTimeMillis, endTimeMillis}) {
  const slotMs = EVENT_SCHEDULE_LOCK_SLOT_MINUTES * MINUTE_MS;
  const firstSlot = Math.floor(startTimeMillis / slotMs);
  const lastSlot = Math.floor((endTimeMillis - 1) / slotMs);
  const slots = [];
  for (let slot = firstSlot; slot <= lastSlot; slot += 1) slots.push(slot);
  return slots;
}

function timestampMillis(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (value && typeof value.toMillis === "function") return value.toMillis();
  throw new Error("startTime and endTime must be timestamps, dates, or millis.");
}

function forEachOverlappingPair(items, callback) {
  const sorted = [...items].sort((a, b) =>
    a.startTimeMillis - b.startTimeMillis || a.endTimeMillis - b.endTimeMillis
  );
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      if (sorted[j].startTimeMillis >= sorted[i].endTimeMillis) break;
      if (intervalsOverlap(
        sorted[i].startTimeMillis,
        sorted[i].endTimeMillis,
        sorted[j].startTimeMillis,
        sorted[j].endTimeMillis
      )) {
        callback(sorted[i], sorted[j]);
      }
    }
  }
}

function intervalsOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function groupBy(values, keyFn) {
  const result = new Map();
  for (const value of values) {
    const key = keyFn(value);
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(value);
  }
  return result;
}

function demoMarkerFor(data) {
  const marker = {};
  for (const key of [
    "synthetic",
    "seedPrefix",
    "scenario",
    "demoOps",
    "demoOpsCommand",
    "demoOpsId",
  ]) {
    if (data?.[key] !== undefined) marker[key] = data[key];
  }
  return marker;
}

function assertUniqueScheduleLockDocs(docs) {
  const byPath = new Map();
  for (const doc of docs) {
    const existing = byPath.get(doc.path);
    if (existing && existing.data.eventId !== doc.data.eventId) {
      throw new Error(
        `Schedule lock collision at ${doc.path}: ` +
        `${existing.data.eventId} conflicts with ${doc.data.eventId}.`
      );
    }
    byPath.set(doc.path, doc);
  }
  return [...byPath.values()];
}
