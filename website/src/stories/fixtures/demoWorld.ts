import worldJson from "../../../../tool/demo/demo_seed/scenarios/host-marketing-india.json";
import personaJson from "../../../../tool/demo/demo_seed/personas/india_core_sales_personas.draft.json";

// Reader for the Mumbai demo world and the India persona catalog, so Storybook
// guest pages show the same people and event as the app captures. Guest state
// is derived from the timestamped attendance records with the rule in
// eventStateAt of tool/demo/lib/demo_world.mjs.
// See docs/plans/demo_world_scenarios_spec.md.
// Web captures import this file, so it reads only the world and personas; the
// website listing projection of the world is in demoWorldListing.ts.

interface DemoWorld {
  id: string;
  locale: string;
  timeZone: string;
  currency: string;
  moments: Record<DemoMoment, string>;
  host: {personaId: string; displayName: string; firstName: string};
  organizer: {id: string; name: string; description: string; city: string; area: string; tags: string[]};
  venues: {id: string; name: string; area: string; lat: number; lng: number; directions: string}[];
  people: {id: string; personaId: string}[];
  events: DemoWorldEvent[];
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
  capacity: number;
  priceInPaise: number;
  guestPerspective?: {viewer: string};
  attendance: {personId: string; bookedAt: string; checkedInAt?: string; cancelledAt?: string}[];
  waitlist?: {personId: string; joinedAt: string}[];
}
interface DemoPersona {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  cityLabel: string;
}
export type DemoMoment = "planning" | "today" | "live" | "followUp";
export interface DemoGuest {
  personId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  checkedIn: boolean;
}

export const world: DemoWorld = worldJson;
const personas: readonly DemoPersona[] = personaJson.personas;

/** The world's one event: Saturday Trivia Social. */
export const demoEventId = world.events[0].id;
export const demoEventName = world.events[0].name;
export const demoOrganizerName = world.organizer.name;
export const demoHost = {displayName: world.host.displayName, firstName: world.host.firstName};

/** Guest counts and phase for an event at a named moment. */
export function eventStateAt(eventId: string, moment: DemoMoment) {
  const event = requireEvent(eventId);
  const at = world.moments[moment];
  const active = activeAttendance(event, at);
  const start = `${event.civilDate}T${event.startTime}:00`;
  const end = `${event.civilDate}T${event.endTime}:00`;
  return {
    booked: active.length,
    checkedIn: active.filter((record) => record.checkedInAt && record.checkedInAt <= at).length,
    waitlisted: (event.waitlist ?? []).filter((record) => record.joinedAt <= at).length,
    capacity: event.capacity,
    phase: at < start ? "upcoming" : at < end ? "live" : "ended",
  };
}

/** Guests booked on an event at a named moment, in booking order. */
export function guestsAt(eventId: string, moment: DemoMoment): DemoGuest[] {
  const at = world.moments[moment];
  return activeAttendance(requireEvent(eventId), at).map((record) => ({
    ...guest(record.personId),
    checkedIn: Boolean(record.checkedInAt && record.checkedInAt <= at),
  }));
}

/** The guest whose point of view the app's guest captures show. */
export function viewerGuest(eventId: string): Omit<DemoGuest, "checkedIn"> {
  const viewer = requireEvent(eventId).guestPerspective?.viewer;
  if (!viewer) throw new Error(`${world.id} event ${eventId} has no guest perspective.`);
  return guest(viewer);
}

export function eventTimesMillis(eventId: string) {
  const event = requireEvent(eventId);
  return {
    startMillis: civilMillis(`${event.civilDate}T${event.startTime}:00`),
    endMillis: civilMillis(`${event.civilDate}T${event.endTime}:00`),
  };
}

export function momentMillis(moment: DemoMoment) {
  return civilMillis(world.moments[moment]);
}

/** "Harbour Room, Bandra West" */
export function venueLabel(eventId: string) {
  const venue = requireVenue(requireEvent(eventId));
  return `${venue.name}, ${venue.area}`;
}

function activeAttendance(event: DemoWorldEvent, at: string) {
  return event.attendance.filter((record) =>
    record.bookedAt <= at && !(record.cancelledAt && record.cancelledAt <= at));
}

function guest(personId: string): Omit<DemoGuest, "checkedIn"> {
  const person = world.people.find((candidate) => candidate.id === personId);
  const persona = personas.find((candidate) => candidate.id === person?.personaId);
  if (!persona) throw new Error(`${world.id} person ${personId} has no persona.`);
  const {firstName, lastName, displayName} = persona;
  return {personId, firstName, lastName, displayName};
}

export function cityLabel() {
  const host = personas.find((persona) => persona.id === world.host.personaId);
  if (!host) throw new Error(`${world.id} host has no persona.`);
  return host.cityLabel;
}

function requireEvent(eventId: string) {
  const event = world.events.find((candidate) => candidate.id === eventId);
  if (!event) throw new Error(`${world.id} has no event ${eventId}.`);
  return event;
}

export function requireVenue(event: DemoWorldEvent) {
  const venue = world.venues.find((candidate) => candidate.id === event.venueId);
  if (!venue) throw new Error(`${world.id} has no venue ${event.venueId}.`);
  return venue;
}

/** A civil date-time in the world's time zone as epoch milliseconds. */
function civilMillis(civil: string) {
  const asUtc = Date.parse(`${civil}Z`);
  const parts = new Intl.DateTimeFormat("en-US", {timeZone: world.timeZone, hourCycle: "h23",
    year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric"})
    .formatToParts(asUtc);
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  const zoned = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
  return asUtc - (zoned - asUtc);
}
