import {HttpsError} from "firebase-functions/v2/https";
import {marketForIdOrAlias} from "../../locations/marketConfig";
import {
  EventCity,
  OrganizerSetupDefaults,
  ResolvedSetupDefaults,
  resolveProgressiveSetupDefaults,
  SetupDecision,
} from "./defaults";

export interface PrivateEventBasicsInput {
  name: string;
  city: SetupDecision<EventCity>;
  localDate: string;
  localStartTime: string;
  timezone: SetupDecision<string>;
  reviewedDefaultsHash?: string;
}

export interface NormalizedPrivateEventBasics {
  name: string;
  eventCityId: string;
  eventMarketId: string;
  eventLocalDate: string;
  eventLocalStartTime: string;
  eventTimezone: string;
  startTimeMillis: number;
  setupDefaults: ResolvedSetupDefaults;
}

/** Validates the only five basics needed for private canonical persistence. */
export function normalizePrivateEventBasics(input: {
  basics: PrivateEventBasicsInput;
  defaults: OrganizerSetupDefaults;
}): NormalizedPrivateEventBasics {
  const {basics} = input;
  const name = basics.name?.trim();
  if (!name || name.length > 120) {
    throw new HttpsError("invalid-argument", "Enter an event name.");
  }
  const resolved = resolveProgressiveSetupDefaults({
    city: basics.city,
    timezone: basics.timezone,
    organizer: input.defaults,
  });
  if ((basics.city.mode === "inherit" ||
      basics.timezone.mode === "inherit") &&
      !basics.reviewedDefaultsHash) {
    throw new HttpsError(
      "failed-precondition", "Review organizer defaults before saving."
    );
  }
  if (basics.reviewedDefaultsHash !== undefined &&
      basics.reviewedDefaultsHash !== resolved.organizerDefaultsHash) {
    throw new HttpsError(
      "aborted", "Organizer defaults changed. Review them before saving."
    );
  }
  const city = resolved.city.value;
  const timezone = resolved.timezone.value;
  if (!city || !timezone) {
    throw new HttpsError("failed-precondition",
      "City and timezone are required.");
  }
  const idPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;
  if (!idPattern.test(city.cityId) || !idPattern.test(city.marketId)) {
    throw new HttpsError("invalid-argument", "Invalid structured event city.");
  }
  const market = marketForIdOrAlias(city.marketId);
  if (!market || !market.eventCreatable || market.marketId !== city.marketId ||
      market.cityId !== city.cityId) {
    throw new HttpsError("failed-precondition", "Event city is unavailable.");
  }
  const startTimeMillis = localStartMillis(
    basics.localDate, basics.localStartTime, timezone
  );
  return {
    name,
    eventCityId: city.cityId,
    eventMarketId: city.marketId,
    eventLocalDate: basics.localDate,
    eventLocalStartTime: basics.localStartTime,
    eventTimezone: timezone,
    startTimeMillis,
    setupDefaults: resolved,
  };
}

/** Rejects invalid, nonexistent and ambiguous local civil times. */
export function localStartMillis(
  localDate: string,
  localTime: string,
  timezone: string
): number {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(localTime);
  if (!dateMatch || !timeMatch) {
    throw new HttpsError("invalid-argument", "Invalid local date or time.");
  }
  const [, yearText, monthText, dayText] = dateMatch;
  const [, hourText, minuteText] = timeMatch;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const wallMillis = Date.UTC(year, month - 1, day, hour, minute);
  const wall = new Date(wallMillis);
  if (year < 2000 || year > 2100 ||
      wall.getUTCFullYear() !== year || wall.getUTCMonth() !== month - 1 ||
      wall.getUTCDate() !== day || wall.getUTCHours() !== hour ||
      wall.getUTCMinutes() !== minute) {
    throw new HttpsError("invalid-argument", "Invalid local date or time.");
  }
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      calendar: "gregory",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    throw new HttpsError("invalid-argument", "Invalid IANA timezone.");
  }
  const partsAt = (instant: number): Record<string, number> =>
    Object.fromEntries(formatter.formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]));
  const offsets = new Set<number>();
  for (let hours = -48; hours <= 48; hours += 6) {
    const sample = wallMillis + hours * 3_600_000;
    const parts = partsAt(sample);
    const rendered = Date.UTC(
      parts.year, parts.month - 1, parts.day,
      parts.hour, parts.minute, parts.second
    );
    offsets.add(rendered - sample);
  }
  const matching = [...offsets]
    .map((offset) => wallMillis - offset)
    .filter((instant) => {
      const p = partsAt(instant);
      return p.year === year && p.month === month && p.day === day &&
        p.hour === hour && p.minute === minute;
    });
  if (matching.length !== 1) {
    throw new HttpsError(
      "invalid-argument",
      matching.length === 0 ?
        "That local time does not exist in this timezone." :
        "That local time occurs twice; choose another time."
    );
  }
  return matching[0];
}

/**
 * The civil date and whole-minute time of an instant in a timezone. An
 * instant that is not a whole minute, or that names an ambiguous or missing
 * local time, is rejected so the private editor can reopen it unchanged.
 */
export function localDateTimeAt(
  startTimeMillis: number,
  timezone: string
): {localDate: string; localStartTime: string} {
  let parts: Record<string, string>;
  try {
    parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone, calendar: "gregory", hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(startTimeMillis).map((part) => [part.type, part.value]));
  } catch {
    throw new HttpsError("failed-precondition", "Invalid event timezone.");
  }
  const localDate = `${parts.year}-${parts.month}-${parts.day}`;
  const localStartTime = `${parts.hour}:${parts.minute}`;
  if (localStartMillis(localDate, localStartTime, timezone) !==
      startTimeMillis) {
    throw new HttpsError("invalid-argument",
      "Choose a whole-minute start time.");
  }
  return {localDate, localStartTime};
}

/**
 * The basics of an event created already published, from its name, its start
 * and its organizer's setup defaults: the organizer's city and market, the
 * organizer's timezone when one is saved (else the organizer market's), and
 * the local start in that timezone. The defaults resolve through the same
 * resolver as the private first save, so `setupDefaults` reads the same.
 */
export function publishedEventBasics(input: {
  name: string;
  startTimeMillis: number;
  defaults: OrganizerSetupDefaults;
}): NormalizedPrivateEventBasics {
  const name = input.name?.trim();
  if (!name || name.length > 120) {
    throw new HttpsError("invalid-argument", "Enter an event name.");
  }
  const city = input.defaults.city;
  const market = city ? marketForIdOrAlias(city.marketId) : null;
  if (!city || !market) {
    throw new HttpsError("failed-precondition",
      "The organizer's city is unavailable.");
  }
  const resolved = resolveProgressiveSetupDefaults({
    city: {mode: "inherit"},
    timezone: input.defaults.timezone ? {mode: "inherit"} :
      {mode: "set", value: market.timeZone},
    organizer: input.defaults,
  });
  const timezone = resolved.timezone.value as string;
  const {localDate, localStartTime} =
    localDateTimeAt(input.startTimeMillis, timezone);
  return {
    name,
    eventCityId: city.cityId,
    eventMarketId: city.marketId,
    eventLocalDate: localDate,
    eventLocalStartTime: localStartTime,
    eventTimezone: timezone,
    startTimeMillis: input.startTimeMillis,
    setupDefaults: resolved,
  };
}
