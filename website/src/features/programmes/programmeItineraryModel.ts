import type {ProgramHouseholdRsvpViewCallableResponse as View} from "../../firebase";

type MemberFunction = View["members"][number]["functions"][number];

export interface ItineraryFunction {
  functionId: string;
  name: string;
  startsAtMillis: number;
  venueName: string | null;
  dressCode: string | null;
  /** The function's own instructions, or who of the household is going when not everyone is. */
  meta: string | null;
  /** Nobody said yes yet, someone said maybe. */
  maybe: boolean;
}

export interface ItineraryLeg {
  key: string;
  flight: string;
  atMillis: number | null;
  names: string;
  passengers: number;
}

export interface ItineraryHotel {
  key: string;
  name: string;
  names: string;
}

/** "Neha", "Neha and Rohan", "Neha, Rohan and Kiara". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/**
 * The household's weekend from its own RSVP view: the functions someone said
 * yes or maybe to, the journeys the household sent, and the hotels those
 * journeys go to. Nothing here comes from the planner's side.
 */
export function itineraryOf(view: View) {
  const functions = new Map<string, {fn: MemberFunction; going: string[]; maybe: string[]}>();
  for (const member of view.members) {
    for (const fn of member.functions) {
      if (fn.rsvpStatus !== "attending" && fn.rsvpStatus !== "maybe") continue;
      const entry = functions.get(fn.functionId) ?? {fn, going: [], maybe: []};
      (fn.rsvpStatus === "attending" ? entry.going : entry.maybe).push(member.displayName);
      functions.set(fn.functionId, entry);
    }
  }
  const invited = view.members.length;
  const days: ItineraryFunction[] = [...functions.values()].map(({fn, going, maybe}) => ({
    functionId: fn.functionId,
    name: fn.name,
    startsAtMillis: fn.startsAtMillis,
    venueName: fn.venueName ?? null,
    dressCode: fn.dressCode ?? null,
    meta: fn.instructions ?? (going.length + maybe.length < invited ? joinNames([...going, ...maybe]) : null),
    maybe: going.length === 0,
  })).sort((a, b) => a.startsAtMillis - b.startsAtMillis);

  const legs = (kind: "inbound" | "outbound") => {
    const byJourney = new Map<string, {flight: string; atMillis: number | null; names: string[]; passengers: number}>();
    for (const member of view.members) {
      for (const leg of member.travel) {
        if (leg.kind !== kind) continue;
        const flight = leg.flightNumber?.trim() ||
          [leg.originIata, leg.destinationIata].filter(Boolean).join(" to ");
        const key = `${flight}|${leg.scheduledArrivalAtMillis ?? ""}`;
        const entry = byJourney.get(key) ?? {flight, atMillis: leg.scheduledArrivalAtMillis, names: [], passengers: 0};
        entry.names.push(member.displayName);
        entry.passengers = Math.max(entry.passengers, leg.passengers, entry.names.length);
        byJourney.set(key, entry);
      }
    }
    return [...byJourney.entries()]
      .map(([key, entry]) => ({key, flight: entry.flight, atMillis: entry.atMillis, names: joinNames(entry.names), passengers: entry.passengers}))
      .sort((a, b) => (a.atMillis ?? Number.MAX_SAFE_INTEGER) - (b.atMillis ?? Number.MAX_SAFE_INTEGER));
  };

  const hotelNames = new Map(view.hotels.map((hotel) => [hotel.hotelId, hotel.name]));
  const stays = new Map<string, string[]>();
  for (const member of view.members) {
    const inbound = member.travel.find((leg) => leg.kind === "inbound");
    const name = inbound?.destinationHotelId ? hotelNames.get(inbound.destinationHotelId) : inbound?.destinationLabel?.trim();
    if (!name) continue;
    stays.set(name, [...(stays.get(name) ?? []), member.displayName]);
  }
  const hotels: ItineraryHotel[] = [...stays.entries()].map(([name, names]) => ({key: name, name, names: joinNames(names)}));

  return {functions: days, arrivals: legs("inbound"), departures: legs("outbound"), hotels};
}
