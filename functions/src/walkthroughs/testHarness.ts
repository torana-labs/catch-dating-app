/* eslint-disable max-len */
import assert from "node:assert/strict";
import type {CallableRequest} from "firebase-functions/v2/https";
import {contractValidator} from "../shared/contractTestValidators";
import {schemaErrorMessages} from "../shared/generated/schemaValidationRuntime";
import {FakeFirestore} from "../shared/testing/fakeFirestore";
import type {WalkthroughAvailabilityDocument} from "../shared/generated/firestoreAdminTypes";
import type {AvailabilitySettings} from "./calendar";
import type {WalkthroughAdminDeps} from "./adminCallables";
import type {WalkthroughDeps} from "./publicCallables";

// Shared by the walkthrough tests: a fake Firestore with a saved calendar, a
// fixed clock, recorded rate limits and callable requests.

/** Monday 16 November 2026, 09:30 in India. */
export const NOW = "2026-11-16T04:00:00.000Z";
export const PHONE = "+919000000001";
export const OTHER_PHONE = "+919000000002";
export const TOKEN = "t".repeat(43);
export const STAFF_UID = "staff-riya";

/** Weekdays 10:00 to 12:00 India time in 30-minute slots, 90 minutes' lead, two weeks ahead. */
export const SETTINGS: AvailabilitySettings = {
  enabled: true,
  slotMinutes: 30,
  leadTimeMinutes: 90,
  horizonDays: 14,
  weeklyWindows: [1, 2, 3, 4, 5].map((weekday) => ({weekday, start: "10:00", end: "12:00"})),
  closedDates: [],
};

/** Mon 16 Nov 11:00 IST: the first slot past the 90-minute lead at 09:30. */
export const FIRST_OPEN = "2026-11-16T05:30:00.000Z";
/** Tue 17 Nov 10:00 IST. */
export const TUESDAY_10 = "2026-11-17T04:30:00.000Z";
/** Mon 16 Nov 10:00 IST: inside the lead time at 09:30. */
export const INSIDE_LEAD = "2026-11-16T04:30:00.000Z";

export function availabilityDoc(settings: AvailabilitySettings = SETTINGS, revision = 1): WalkthroughAvailabilityDocument {
  return {schemaVersion: 1, calendarId: "default", timeZone: "Asia/Kolkata", utcOffsetMinutes: 330, settings, revision,
    updatedAt: "2026-11-15T10:00:00.000Z", updatedByUid: STAFF_UID};
}

export function verified(phone = PHONE, uid = `uid-${phone.slice(-4)}`) {
  return {uid, token: {phone_number: phone, firebase: {sign_in_provider: "phone"}}};
}

export function staff(role = "admin") {
  return {uid: STAFF_UID, token: {[role]: true}};
}

export function harness(options: {settings?: AvailabilitySettings | null; now?: string} = {}) {
  const settings = options.settings === undefined ? SETTINGS : options.settings;
  const db = new FakeFirestore(settings ? {"walkthroughAvailability/default": availabilityDoc(settings) as never} : {});
  let now = new Date(options.now ?? NOW);
  const limits: Array<{key: string; action: string; maxRequests: number; windowMs: number}> = [];
  let beforeLimit: ((action: string) => Promise<void>) | null = null;
  const checkRateLimit = (async (_db: unknown, key: string, action: string, limit: {maxRequests: number; windowMs: number}) => {
    limits.push({key, action, maxRequests: limit.maxRequests, windowMs: limit.windowMs});
    if (beforeLimit) await beforeLimit(action);
  }) as never;
  const deps: WalkthroughDeps & WalkthroughAdminDeps = {
    firestore: () => db.asFirestore(),
    now: () => now,
    serverTimestamp: () => "server-time" as unknown as FirebaseFirestore.FieldValue,
    checkRateLimit,
  };
  const call = (data: unknown, auth: unknown = null, ip = "198.51.100.7") =>
    ({auth, data, rawRequest: {headers: {"x-forwarded-for": ip}, ip}}) as unknown as CallableRequest<unknown>;
  return {
    db, deps, limits, call,
    setNow: (value: string) => {
      now = new Date(value);
    },
    /** Runs once, inside the next rate-limit check, to interleave another caller. */
    onRateLimit: (hook: ((action: string) => Promise<void>) | null) => {
      beforeLimit = hook;
    },
  };
}

export function bookPayload(overrides: Record<string, unknown> = {}) {
  return {
    requestId: "web-0f3c2a9e-5b1d-4c7e", slotStartAt: FIRST_OPEN, manageToken: TOKEN,
    consent: {purpose: "leadFollowUp", version: "walkthrough-v1"},
    name: "Asha", details: {organisation: "Run Club Bandra"}, cityId: "in-mh-mumbai",
    sourcePage: "/start/walkthrough", entry: "start_walkthrough", ...overrides,
  };
}

/** Asserts a value satisfies the named schema contract. */
export function assertContract(name: string, value: unknown, label = name): void {
  const validate = contractValidator(name);
  assert.equal(validate(value), true, `${label}: ${schemaErrorMessages(validate as never).join("; ")}`);
}

/** Asserts a promise rejects with an HttpsError of this code and details.reason. */
export async function assertRefused(promise: Promise<unknown>, code: string, reason: string | null): Promise<Record<string, unknown>> {
  try {
    await promise;
  } catch (error) {
    const failure = error as {code?: string; details?: Record<string, unknown>};
    assert.equal(failure.code, code, String(error));
    if (reason !== null) assert.equal(failure.details?.reason, reason, String(error));
    return failure.details ?? {};
  }
  assert.fail(`Expected ${code} ${reason ?? ""}`);
}
