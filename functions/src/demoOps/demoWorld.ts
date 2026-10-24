// Demo world scenarios (schemaVersion 2) as Functions reads them. The worlds
// themselves are validated and bundled by functions/scripts/
// generate-suvbot-worlds.mjs; this module ports the derivation rule from
// tool/demo/lib/demo_world.mjs so a world can be started at any moment.
// See docs/plans/demo_world_scenarios_spec.md.

import type {Gender} from "../shared/generated/firestoreAdminTypes";

export interface DemoWorldAttendance {
  personId: string;
  bookedAt: string;
  checkedInAt?: string;
  cancelledAt?: string;
}

export interface DemoWorldEvent {
  id: string;
  name: string;
  description: string;
  venueId: string;
  civilDate: string;
  startTime: string;
  endTime: string;
  activityKind: string;
  customActivityLabel?: string;
  format: {
    interactionModel: string;
    admissionPreset: string;
    playbookId: string;
    selectedModuleIds: string[];
    hostGoal: string;
  };
  capacity: number;
  priceInPaise: number;
  guestPerspective?: {viewer: string; wingmanTarget: string};
  attendance: DemoWorldAttendance[];
}

export interface DemoWorld {
  schemaVersion: 2;
  id: string;
  label: string;
  description: string;
  uses: string[];
  locale: string;
  timeZone: string;
  currency: string;
  moments: Record<string, string>;
  host: {
    uid: string;
    personaId: string;
    displayName: string;
    firstName: string;
    phoneNumber: string;
    email: string;
  };
  organizer: {
    id: string;
    name: string;
    description: string;
    city: string;
    area: string;
    tags: string[];
    memberCount: number;
    rating: number;
    reviewCount: number;
  };
  venues: Array<{
    id: string;
    name: string;
    area: string;
    lat: number;
    lng: number;
    directions: string;
  }>;
  people: Array<{id: string; personaId: string}>;
  events: DemoWorldEvent[];
}

export interface DemoWorldPersona {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  gender: Gender;
  dateOfBirth: string;
  heightCm: number | null;
  occupation: string | null;
  company: string | null;
  profilePrompts: Array<{promptId: string; answer: string}>;
  photos: Array<{
    id: string;
    position: number;
    promptId: string;
    url: string;
    thumbnailUrl: string;
    storagePath: string;
    thumbnailStoragePath: string;
  }>;
}

export interface SuvbotWorldBundle {
  worlds: DemoWorld[];
  personas: DemoWorldPersona[];
}

export interface DemoWorldEventState {
  booked: number;
  checkedIn: number;
  capacity: number;
  phase: "upcoming" | "live" | "ended";
}

/**
 * Guest state for one event at one named moment, derived from attendance.
 * Mirrors eventStateAt in tool/demo/lib/demo_world.mjs; a parity test runs
 * both over every bundled world.
 * @param {DemoWorld} world World.
 * @param {string} eventId Event id within the world.
 * @param {string} moment Moment name within the world.
 * @return {DemoWorldEventState} Derived state.
 */
export function eventStateAt(
  world: DemoWorld,
  eventId: string,
  moment: string
): DemoWorldEventState {
  const event = requireWorldEvent(world, eventId);
  const at = world.moments[moment];
  if (!at) throw new Error(`${world.id} has no moment ${moment}.`);
  const active = activeAttendanceAt(event, at);
  const start = `${event.civilDate}T${event.startTime}:00`;
  const end = `${event.civilDate}T${event.endTime}:00`;
  return {
    booked: active.length,
    checkedIn: active.filter((record) => isCheckedInAt(record, at)).length,
    capacity: event.capacity,
    phase: at < start ? "upcoming" : at < end ? "live" : "ended",
  };
}

/**
 * Attendance records booked and not cancelled at a civil time.
 * @param {DemoWorldEvent} event Event.
 * @param {string} at Civil date-time in the world's time zone.
 * @return {DemoWorldAttendance[]} Active records.
 */
export function activeAttendanceAt(
  event: DemoWorldEvent,
  at: string
): DemoWorldAttendance[] {
  return event.attendance.filter((record) =>
    record.bookedAt <= at &&
    !(record.cancelledAt && record.cancelledAt <= at));
}

/**
 * Whether a record has checked in by a civil time.
 * @param {DemoWorldAttendance} record Attendance record.
 * @param {string} at Civil date-time.
 * @return {boolean} True once checked in.
 */
export function isCheckedInAt(
  record: DemoWorldAttendance,
  at: string
): boolean {
  return record.checkedInAt !== undefined && record.checkedInAt <= at;
}

/**
 * Returns a world event by id or throws.
 * @param {DemoWorld} world World.
 * @param {string} eventId Event id.
 * @return {DemoWorldEvent} Event.
 */
export function requireWorldEvent(
  world: DemoWorld,
  eventId: string
): DemoWorldEvent {
  const event = world.events.find((item) => item.id === eventId);
  if (!event) throw new Error(`${world.id} has no event ${eventId}.`);
  return event;
}

/**
 * A world clock shifted so one civil moment in the world's time zone falls on
 * a real instant. Every civil time in the world moves by the same offset, so
 * derived state at the moment is unchanged.
 */
export class WorldClock {
  readonly offsetMs: number;

  /**
   * @param {DemoWorld} world World whose civil times this clock maps.
   * @param {string} civilMoment Civil date-time that should become `now`.
   * @param {Date} now Real instant.
   */
  constructor(readonly world: DemoWorld, civilMoment: string, now: Date) {
    const momentMs = civilToInstantMs(civilMoment, world.timeZone);
    // Whole minutes keep shifted times readable; the moment lands at most a
    // minute before now, never after it.
    this.offsetMs = Math.floor((now.getTime() - momentMs) / 60_000) * 60_000;
  }

  /**
   * @param {string} civil Civil date-time (YYYY-MM-DDTHH:mm:ss).
   * @return {Date} Shifted real instant.
   */
  at(civil: string): Date {
    return new Date(
      civilToInstantMs(civil, this.world.timeZone) + this.offsetMs
    );
  }

  /**
   * @param {string} civilDate Civil date (YYYY-MM-DD).
   * @param {string} civilTime Civil time (HH:mm).
   * @return {Date} Shifted real instant.
   */
  atDateTime(civilDate: string, civilTime: string): Date {
    return this.at(`${civilDate}T${civilTime}:00`);
  }

  /**
   * Shifted local date and time in the world's zone, for event labels.
   * @param {Date} instant Shifted instant.
   * @return {{date: string, time: string}} Local date and HH:mm.
   */
  local(instant: Date): {date: string; time: string} {
    const parts = zonedParts(instant.getTime(), this.world.timeZone);
    return {
      date: `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
      time: `${pad(parts.hour)}:${pad(parts.minute)}`,
    };
  }
}

/**
 * Converts a civil date-time in an IANA time zone to epoch milliseconds.
 * @param {string} civil Civil date-time (YYYY-MM-DDTHH:mm[:ss]).
 * @param {string} timeZone IANA zone.
 * @return {number} Epoch milliseconds.
 */
export function civilToInstantMs(civil: string, timeZone: string): number {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/u.exec(civil);
  if (!match) throw new Error(`Invalid civil date-time: ${civil}`);
  const [, year, month, day, hour, minute, second] = match;
  const asUtc = Date.UTC(Number(year), Number(month) - 1, Number(day),
    Number(hour), Number(minute), Number(second ?? 0));
  const firstGuess = asUtc - zoneOffsetMs(asUtc, timeZone);
  const offset = zoneOffsetMs(firstGuess, timeZone);
  return asUtc - offset;
}

/**
 * Offset of an IANA zone from UTC at an instant.
 * @param {number} instantMs Epoch milliseconds.
 * @param {string} timeZone IANA zone.
 * @return {number} Offset in milliseconds (local minus UTC).
 */
function zoneOffsetMs(instantMs: number, timeZone: string): number {
  const parts = zonedParts(instantMs, timeZone);
  const local = Date.UTC(parts.year, parts.month - 1, parts.day,
    parts.hour, parts.minute, parts.second);
  return local - Math.floor(instantMs / 1000) * 1000;
}

/**
 * Wall-clock parts of an instant in an IANA zone.
 * @param {number} instantMs Epoch milliseconds.
 * @param {string} timeZone IANA zone.
 * @return {object} Year, month, day, hour, minute and second.
 */
function zonedParts(instantMs: number, timeZone: string): {
  year: number; month: number; day: number;
  hour: number; minute: number; second: number;
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const values: Record<string, number> = {};
  for (const part of formatter.formatToParts(new Date(instantMs))) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

/**
 * @param {number} value Number.
 * @return {string} Two-digit string.
 */
function pad(value: number): string {
  return String(value).padStart(2, "0");
}
