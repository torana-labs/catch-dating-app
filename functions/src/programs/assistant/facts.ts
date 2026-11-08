/* eslint-disable max-len */
// The wedding assistant's fact pack: everything it may say about one
// household, built deterministically from that household's own records.
// Pure: the Firestore reader is factsSource.ts. Nothing here ever carries
// another household's guests, phones, rooms or notes, nor this
// household's phone numbers, emails or internal staff notes.

import {groupFunctionsByDay} from "../../programSchedule/programTimeline";
import {resolveItineraryStatus, type ItineraryEntryStatus, type ProgramRsvpStatus} from
  "../../programSchedule/guestItinerary";

export const FACT_PACK_VERSION = "program-assistant-facts-v1";

/** Caps keep the prompt bounded on a very large programme. */
const MAX_FUNCTIONS = 40;
const MAX_MEMBERS = 30;
const MAX_TEXT = 400;

export interface FactProgramInput {
  programId: string;
  title: string;
  timezone: string;
  startsAtMillis: number | null;
  endsAtMillis: number | null;
}

export interface FactFunctionInput {
  functionId: string;
  name: string;
  startsAtMillis: number;
  endsAtMillis: number;
  venueName: string | null;
  status: "scheduled" | "completed" | "cancelled";
  /** Guest-facing only: dress code and instructions are shown on invitations. */
  dressCode: string | null;
  instructions: string | null;
  /** allGuests (default) or selectedGuests: then only invited rows count. */
  invitationMode: "allGuests" | "selectedGuests";
}

export interface FactMemberInput {
  guestId: string;
  displayName: string;
  /** notInvited keeps a member off every function. */
  invitationStatus: "notInvited" | "invited" | "delivered" | "responded";
  rsvpStatus: ProgramRsvpStatus;
}

export interface FactFunctionGuestInput {
  functionId: string;
  guestId: string;
  invited: boolean;
  rsvpStatus: ProgramRsvpStatus;
  partySize: number | null;
}

export interface FactStayInput {
  guestId: string;
  hotelId: string;
  roomLabel: string | null;
  startsAtMillis: number | null;
  endsAtMillis: number | null;
  status: "held" | "confirmed" | "checkedIn" | "checkedOut" | "cancelled";
}

export interface FactHotelInput {
  hotelId: string;
  name: string;
  address: string | null;
  active: boolean;
}

export interface FactTravelLegInput {
  legId: string;
  guestId: string;
  kind: string;
  flightNumber: string | null;
  originIata: string | null;
  destinationIata: string | null;
  scheduledArrivalAtMillis: number | null;
  estimatedArrivalAtMillis: number | null;
  flightStatus: string | null;
  pickupPointId: string | null;
  destinationHotelId: string | null;
  destinationLabel: string | null;
}

export interface FactPickupPointInput {
  pickupPointId: string;
  label: string;
  terminal: string | null;
  meetingZone: string | null;
  instructions: string | null;
  active: boolean;
}

export interface FactPackInput {
  program: FactProgramInput;
  /** Null for the settings screen's "Try it" without a household. */
  household: {householdId: string; label: string; memberGuestIds: string[]} | null;
  members: FactMemberInput[];
  functions: FactFunctionInput[];
  functionGuests: FactFunctionGuestInput[];
  stays: FactStayInput[];
  hotels: FactHotelInput[];
  travelLegs: FactTravelLegInput[];
  pickupPoints: FactPickupPointInput[];
}

export interface FactPack {
  version: typeof FACT_PACK_VERSION;
  wedding: {title: string; timezone: string; dates: string | null};
  household: {label: string; members: string[]} | null;
  itinerary: Array<{
    name: string; day: string; time: string; venue: string | null;
    dressCode: string | null; instructions: string | null;
    /** Per member: their own status for this function. */
    guests: Array<{name: string; status: ItineraryEntryStatus; partySize: number | null}>;
  }>;
  rsvp: Array<{name: string; status: ProgramRsvpStatus}>;
  stays: Array<{name: string; hotel: string; address: string | null;
    room: string | null; checkIn: string | null; checkOut: string | null;
    status: string}>;
  travel: Array<{name: string; kind: string; flight: string | null;
    route: string | null; arrives: string | null; flightStatus: string | null;
    pickup: string | null; pickupInstructions: string | null;
    goesTo: string | null}>;
}

function clip(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/gu, " ").trim();
  if (!text) return null;
  return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}…` : text;
}

function safeZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", {timeZone}).format(0);
    return timeZone;
  } catch {
    return "UTC";
  }
}

function formatTime(millis: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {timeZone, hour: "numeric",
    minute: "2-digit"}).format(millis);
}

function formatDateTime(millis: number | null, timeZone: string): string | null {
  if (millis === null || !Number.isFinite(millis)) return null;
  return new Intl.DateTimeFormat("en-US", {timeZone, weekday: "short",
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit"})
    .format(millis);
}

function formatDate(millis: number | null, timeZone: string): string | null {
  if (millis === null || !Number.isFinite(millis)) return null;
  return new Intl.DateTimeFormat("en-US", {timeZone, weekday: "short",
    day: "numeric", month: "short"}).format(millis);
}

/** Whether [member] is invited to [fn], honouring per-function invitations. */
function invitedTo(fn: FactFunctionInput, member: FactMemberInput,
  rows: ReadonlyArray<FactFunctionGuestInput>): boolean {
  if (member.invitationStatus === "notInvited") return false;
  if (fn.invitationMode !== "selectedGuests") return true;
  return rows.some((row) => row.functionId === fn.functionId &&
    row.guestId === member.guestId && row.invited);
}

/**
 * Builds one household's fact pack. Every record is filtered to the
 * household's own member ids and to the programme; records of other
 * guests passed in by mistake are dropped, never rendered.
 */
export function buildFactPack(input: FactPackInput): FactPack {
  const zone = safeZone(input.program.timezone);
  const memberIds = new Set(input.household?.memberGuestIds ?? []);
  const members = input.household === null ? [] : input.members
    .filter((member) => memberIds.has(member.guestId))
    .slice(0, MAX_MEMBERS);
  const nameOf = new Map(members.map((member) =>
    [member.guestId, clip(member.displayName) ?? "Guest"]));
  const ownRows = input.functionGuests.filter((row) => nameOf.has(row.guestId));

  const ordered = input.functions.filter((fn) => fn.status !== "cancelled").sort((a, b) => a.startsAtMillis - b.startsAtMillis ||
    a.functionId.localeCompare(b.functionId));
  const dayLabels = new Map<string, string>();
  for (const group of groupFunctionsByDay(ordered.map((fn) => ({
    functionId: fn.functionId, name: fn.name, startsAt: fn.startsAtMillis,
    endsAt: fn.endsAtMillis, venueName: fn.venueName, status: fn.status,
    revision: 0})), zone)) {
    for (const fn of group.functions) dayLabels.set(fn.functionId, group.label);
  }
  const itinerary: FactPack["itinerary"] = [];
  for (const fn of ordered) {
    const guests = members.filter((member) => invitedTo(fn, member, ownRows))
      .map((member) => {
        const row = ownRows.find((entry) => entry.functionId === fn.functionId &&
          entry.guestId === member.guestId);
        return {name: nameOf.get(member.guestId) ?? "Guest",
          status: resolveItineraryStatus(row?.rsvpStatus ?? member.rsvpStatus),
          partySize: row?.partySize ?? null};
      });
    // A household sees only functions at least one member is invited to;
    // the programme-only pack (no household) shows every function.
    if (input.household !== null && guests.length === 0) continue;
    itinerary.push({
      name: clip(fn.name) ?? "Function",
      day: dayLabels.get(fn.functionId) ?? "",
      time: `${formatTime(fn.startsAtMillis, zone)} to ${formatTime(fn.endsAtMillis, zone)}`,
      venue: clip(fn.venueName),
      dressCode: clip(fn.dressCode),
      instructions: clip(fn.instructions),
      guests,
    });
    if (itinerary.length >= MAX_FUNCTIONS) break;
  }

  const hotels = new Map(input.hotels.map((hotel) => [hotel.hotelId, hotel]));
  const stays: FactPack["stays"] = input.stays
    .filter((stay) => nameOf.has(stay.guestId) && stay.status !== "cancelled" &&
      hotels.has(stay.hotelId))
    .sort((a, b) => (a.startsAtMillis ?? 0) - (b.startsAtMillis ?? 0) ||
      a.guestId.localeCompare(b.guestId))
    .map((stay) => {
      const hotel = hotels.get(stay.hotelId)!;
      return {name: nameOf.get(stay.guestId)!, hotel: clip(hotel.name) ?? "Hotel",
        address: clip(hotel.address), room: clip(stay.roomLabel),
        checkIn: formatDate(stay.startsAtMillis, zone),
        checkOut: formatDate(stay.endsAtMillis, zone), status: stay.status};
    });

  const pickups = new Map(input.pickupPoints.filter((point) => point.active)
    .map((point) => [point.pickupPointId, point]));
  const travel: FactPack["travel"] = input.travelLegs
    .filter((leg) => nameOf.has(leg.guestId))
    .sort((a, b) => (a.scheduledArrivalAtMillis ?? 0) -
      (b.scheduledArrivalAtMillis ?? 0) || a.legId.localeCompare(b.legId))
    .map((leg) => {
      const pickup = leg.pickupPointId ? pickups.get(leg.pickupPointId) : undefined;
      const hotel = leg.destinationHotelId ? hotels.get(leg.destinationHotelId) : undefined;
      const pickupLabel = pickup ? [pickup.label, pickup.terminal, pickup.meetingZone]
        .map(clip).filter(Boolean).join(", ") : null;
      return {
        name: nameOf.get(leg.guestId)!,
        kind: leg.kind,
        flight: clip(leg.flightNumber),
        route: leg.originIata && leg.destinationIata ?
          `${leg.originIata} to ${leg.destinationIata}` : null,
        arrives: formatDateTime(leg.estimatedArrivalAtMillis ??
          leg.scheduledArrivalAtMillis, zone),
        flightStatus: clip(leg.flightStatus),
        pickup: pickupLabel || null,
        pickupInstructions: clip(pickup?.instructions),
        goesTo: clip(hotel?.name) ?? clip(leg.destinationLabel),
      };
    });

  const start = formatDate(input.program.startsAtMillis, zone);
  const end = formatDate(input.program.endsAtMillis, zone);
  return {
    version: FACT_PACK_VERSION,
    wedding: {title: clip(input.program.title) ?? "The wedding", timezone: zone,
      dates: start && end ? (start === end ? start : `${start} to ${end}`) : start},
    household: input.household === null ? null : {
      label: clip(input.household.label) ?? "Your family",
      members: members.map((member) => nameOf.get(member.guestId)!),
    },
    itinerary,
    rsvp: members.map((member) => ({name: nameOf.get(member.guestId)!,
      status: member.rsvpStatus})),
    stays,
    travel,
  };
}

/** The fact pack as the plain text block the model reads. */
export function renderFactPack(pack: FactPack): string {
  const lines: string[] = [];
  lines.push(`Wedding: ${pack.wedding.title}`);
  if (pack.wedding.dates) lines.push(`Dates: ${pack.wedding.dates}`);
  lines.push(`Times are local (${pack.wedding.timezone}).`);
  if (pack.household) {
    lines.push("", `Household: ${pack.household.label}`);
    lines.push(`Members: ${pack.household.members.join(", ") || "none listed"}`);
  } else {
    lines.push("", "Household: none (a planner trying the assistant). " +
      "Only programme-wide facts are known.");
  }
  lines.push("", "Itinerary:");
  if (pack.itinerary.length === 0) lines.push("- nothing scheduled yet");
  for (const entry of pack.itinerary) {
    const parts = [`- ${entry.name}: ${entry.day}, ${entry.time}`];
    if (entry.venue) parts.push(`at ${entry.venue}`);
    lines.push(parts.join(" "));
    if (entry.dressCode) lines.push(`  Dress code: ${entry.dressCode}`);
    if (entry.instructions) lines.push(`  Instructions: ${entry.instructions}`);
    for (const guest of entry.guests) {
      lines.push(`  ${guest.name}: ${guest.status}` +
        (guest.partySize && guest.partySize > 1 ? ` (party of ${guest.partySize})` : ""));
    }
  }
  if (pack.household) {
    lines.push("", "RSVP:");
    for (const row of pack.rsvp) lines.push(`- ${row.name}: ${row.status}`);
    lines.push("", "Stay:");
    if (pack.stays.length === 0) lines.push("- no hotel stay on record");
    for (const stay of pack.stays) {
      lines.push(`- ${stay.name}: ${stay.hotel}` +
        (stay.address ? ` (${stay.address})` : "") +
        `, room ${stay.room ?? "not assigned yet"}` +
        (stay.checkIn ? `, check-in ${stay.checkIn}` : "") +
        (stay.checkOut ? `, check-out ${stay.checkOut}` : "") +
        `, ${stay.status}`);
    }
    lines.push("", "Travel and pickups:");
    if (pack.travel.length === 0) lines.push("- no travel on record");
    for (const leg of pack.travel) {
      lines.push(`- ${leg.name}: ${leg.kind}` +
        (leg.flight ? ` flight ${leg.flight}` : "") +
        (leg.route ? ` (${leg.route})` : "") +
        (leg.arrives ? `, arrives ${leg.arrives}` : "") +
        (leg.flightStatus && leg.flightStatus !== "unknown" ?
          `, flight status ${leg.flightStatus}` : "") +
        (leg.pickup ? `, pickup at ${leg.pickup}` : ", no pickup arranged") +
        (leg.goesTo ? `, then to ${leg.goesTo}` : ""));
      if (leg.pickupInstructions) lines.push(`  Pickup instructions: ${leg.pickupInstructions}`);
    }
  }
  return lines.join("\n");
}
