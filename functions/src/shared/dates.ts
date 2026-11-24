import {differenceInYears} from "date-fns";

/**
 * Computes age in full years from a date of birth.
 * @param {Date} dob The user's date of birth.
 * @return {number} Age in whole years.
 */
export function computeAge(dob: Date): number {
  return differenceInYears(new Date(), dob);
}

/** A Firestore timestamp, Date or ISO string as an ISO string, or null. */
export function timestampIso(value: unknown): string | null {
  const millis = timestampMillis(value);
  return millis === null ? null : new Date(millis).toISOString();
}

/** Milliseconds of a Firestore timestamp, Date or ISO string. */
export function timestampMillis(value: unknown): number | null {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const timestamp = value as {
    toMillis?: () => number;
    _seconds?: number;
    _nanoseconds?: number;
  };
  if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
  if (typeof timestamp._seconds === "number") {
    return timestamp._seconds * 1000 +
      Math.floor((timestamp._nanoseconds ?? 0) / 1e6);
  }
  return null;
}
