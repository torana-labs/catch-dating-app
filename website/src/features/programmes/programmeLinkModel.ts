const TOKEN_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/**
 * A programme link's credential: the signed token from the path, never from a
 * query parameter, so it cannot leak through analytics or a referrer.
 */
export interface ProgrammeLinkCredential {
  token: string;
}

export function programmeLinkCredential(token: string | undefined): ProgrammeLinkCredential | null {
  if (!token || token.length < 20 || token.length > 1024 || !TOKEN_PATTERN.test(token)) return null;
  return {token};
}

/** Why a link did not open: a bad or withdrawn link, an expired one, or the network. */
export type ProgrammeLinkUnavailable = "invalid" | "expired" | "network";

export type ProgrammeLinkScreen<T> =
  | {kind: "loading"}
  | {kind: "unavailable"; reason: ProgrammeLinkUnavailable}
  | {kind: "ready"; view: T};

const invalidCodes = new Set([
  "functions/not-found", "functions/unauthenticated", "functions/permission-denied", "functions/invalid-argument",
]);

/** Sorts a failed read into what the page can say about it. */
export function programmeLinkFailure(error: unknown): ProgrammeLinkUnavailable {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (code === "functions/deadline-exceeded") return "expired";
  if (invalidCodes.has(code)) return "invalid";
  return "network";
}

export function programmeLinkScreen<T>({
  credential, view, pending, error,
}: {credential: ProgrammeLinkCredential | null; view: T | undefined; pending: boolean; error: unknown}): ProgrammeLinkScreen<T> {
  if (!credential) return {kind: "unavailable", reason: "invalid"};
  if (view !== undefined) return {kind: "ready", view};
  if (error) return {kind: "unavailable", reason: programmeLinkFailure(error)};
  if (pending) return {kind: "loading"};
  return {kind: "unavailable", reason: "network"};
}

/** A request id the commands accept: a letter or digit, then 8 to 128 safe characters. */
export function programmeRequestId(): string {
  return `web${crypto.randomUUID().replaceAll("-", "")}`;
}

export const PROGRAMME_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export type ProgrammeUploadType = (typeof PROGRAMME_UPLOAD_TYPES)[number];
export const PROGRAMME_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

/** Whether a chosen file can be uploaded as a programme file. */
export function programmeUploadProblem(file: File, accept: readonly string[] = PROGRAMME_UPLOAD_TYPES):
  "wrongType" | "tooLarge" | null {
  if (!accept.includes(file.type)) return "wrongType";
  if (file.size < 1 || file.size > PROGRAMME_UPLOAD_MAX_BYTES) return "tooLarge";
  return null;
}

/** "Sat 12 Dec" in the given zone, or the viewer's when there is none. */
export function programmeDay(millis: number, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-IN", {timeZone, weekday: "short", day: "numeric", month: "short"})
    .format(new Date(millis));
}

/** "Saturday 12 December": a timeline's day heading. */
export function programmeLongDay(millis: number, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-IN", {timeZone, weekday: "long", day: "numeric", month: "long"})
    .format(new Date(millis));
}

/** "4:00 pm". */
export function programmeTime(millis: number, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-IN", {timeZone, hour: "numeric", minute: "2-digit"}).format(new Date(millis));
}

/** "Sat 12 Dec · 4:00 pm". */
export function programmeDayTime(millis: number, timeZone?: string): string {
  return `${programmeDay(millis, timeZone)} · ${programmeTime(millis, timeZone)}`;
}

/** Whole local days from one moment to another ("45 days to go"), or null for a bad zone. */
export function programmeDaysToGo(fromMillis: number, toMillis: number, timeZone?: string): number | null {
  try {
    const dayOf = (millis: number) => Date.parse(`${new Intl.DateTimeFormat("en-CA", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date(millis))}T00:00:00Z`);
    const days = Math.round((dayOf(toMillis) - dayOf(fromMillis)) / 86_400_000);
    return Number.isFinite(days) ? days : null;
  } catch {
    return null;
  }
}

/** Items grouped by their local day, in time order. */
export function programmeDays<T>(items: readonly T[], millisOf: (item: T) => number, timeZone?: string):
  {day: string; items: T[]}[] {
  const days = new Map<string, T[]>();
  for (const item of [...items].sort((a, b) => millisOf(a) - millisOf(b))) {
    const day = programmeLongDay(millisOf(item), timeZone);
    days.set(day, [...(days.get(day) ?? []), item]);
  }
  return [...days.entries()].map(([day, list]) => ({day, items: list}));
}
