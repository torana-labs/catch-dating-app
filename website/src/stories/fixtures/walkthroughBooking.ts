import type {
  WalkthroughBooking,
  WalkthroughClient,
  WalkthroughManaged,
  WalkthroughSlots,
} from "../../features/walkthroughs/walkthroughModel";

// Walkthrough booking fixtures for the slot picker's stories and tests: two
// India-time days of open slots, a booking, a managed booking and a client
// that answers each call from a script. Times are fictional; the number is a
// reserved test number.

export const walkthroughFixturePhone = "+919800000001";
export const walkthroughFixtureBookingId = `wt-${"a1".repeat(20)}`;
export const walkthroughFixtureToken = "T".repeat(43);

const followUp = {channel: "whatsapp", mode: "staff_reply"} as const;
const slot = (startAt: string, endAt: string, label: string) => ({startAt, endAt, label});

/** Mon 23 Nov: 10:00, 10:30 and 16:00 IST; Tue 24 Nov: 11:00 IST. */
export const walkthroughOpenSlots: WalkthroughSlots = {
  timeZone: "Asia/Kolkata",
  utcOffset: "+05:30",
  bookingOpen: true,
  slotMinutes: 30,
  generatedAt: "2026-11-22T06:00:00.000Z",
  days: [
    {date: "2026-11-23", weekday: 1, label: "Mon 23 Nov", slots: [
      slot("2026-11-23T04:30:00.000Z", "2026-11-23T05:00:00.000Z", "Mon 23 Nov, 10:00 IST"),
      slot("2026-11-23T05:00:00.000Z", "2026-11-23T05:30:00.000Z", "Mon 23 Nov, 10:30 IST"),
      slot("2026-11-23T10:30:00.000Z", "2026-11-23T11:00:00.000Z", "Mon 23 Nov, 16:00 IST"),
    ]},
    {date: "2026-11-24", weekday: 2, label: "Tue 24 Nov", slots: [
      slot("2026-11-24T05:30:00.000Z", "2026-11-24T06:00:00.000Z", "Tue 24 Nov, 11:00 IST"),
    ]},
  ],
  followUp,
};

/** The same calendar after Mon 23 Nov, 10:00 IST was taken by someone else. */
export const walkthroughSlotsAfterTaken: WalkthroughSlots = {
  ...walkthroughOpenSlots,
  days: [{...walkthroughOpenSlots.days[0], slots: walkthroughOpenSlots.days[0].slots.slice(1)}, walkthroughOpenSlots.days[1]],
};

export const walkthroughNoSlots: WalkthroughSlots = {...walkthroughOpenSlots, days: []};
export const walkthroughBookingClosed: WalkthroughSlots = {...walkthroughOpenSlots, bookingOpen: false, slotMinutes: null, days: []};

export function walkthroughBookingFor(startAt: string): WalkthroughBooking {
  const found = walkthroughOpenSlots.days.flatMap((day) => day.slots).find((entry) => entry.startAt === startAt) ??
    walkthroughOpenSlots.days[0].slots[0];
  return {bookingId: walkthroughFixtureBookingId, status: "booked", slot: found, timeZone: "Asia/Kolkata", followUp,
    managePath: `/start/walkthrough/manage?booking=${walkthroughFixtureBookingId}`, idempotentReplay: false};
}

export function walkthroughManagedFor(overrides: Partial<WalkthroughManaged> = {}): WalkthroughManaged {
  return {bookingId: walkthroughFixtureBookingId, status: "booked", slot: walkthroughOpenSlots.days[0].slots[2], timeZone: "Asia/Kolkata",
    confirmed: false, canChange: true, followUp, changed: false, ...overrides};
}

/** A callable refusal as the Functions SDK throws it: a code and details.reason. */
export function walkthroughRefusal(code: string, reason?: string, extra: Record<string, string> = {}): Error {
  return Object.assign(new Error(reason ?? code), {code: `functions/${code}`, details: reason ? {reason, ...extra} : undefined});
}

type Answer<T> = T | Error | (() => T | Error | Promise<T>);

/** The nth scripted answer, repeating the last; the fallback when the script is empty. */
async function answer<T>(queue: readonly Answer<T>[] | undefined, index: number, fallback: Answer<T>): Promise<T> {
  const next = queue?.length ? queue[Math.min(index, queue.length - 1)] : fallback;
  const value = typeof next === "function" ? await (next as () => T | Error | Promise<T>)() : next;
  if (value instanceof Error) throw value;
  return value;
}

/**
 * A client that answers each call from its script, in order, repeating the
 * last answer. `calls` records what was sent. The caller is the fixture's
 * verified number unless `caller` says otherwise; `signIn` changes it, as
 * the sign-in sheet would.
 */
export function scriptedWalkthroughClient(script: {
  slots?: Answer<WalkthroughSlots>[];
  book?: Answer<WalkthroughBooking>[];
  manage?: Answer<WalkthroughManaged>[];
  caller?: {uid: string; phoneNumber: string | null} | null;
} = {}) {
  const calls = {slots: 0, book: [] as Parameters<WalkthroughClient["book"]>[0][], manage: [] as Parameters<WalkthroughClient["manage"]>[0][]};
  let caller = script.caller === undefined ? {uid: "fixture-uid", phoneNumber: walkthroughFixturePhone} : script.caller;
  const client: WalkthroughClient = {
    getSlots: async () => answer(script.slots, calls.slots++, walkthroughOpenSlots),
    book: async (payload) => {
      calls.book.push(payload);
      return answer(script.book, calls.book.length - 1, () => walkthroughBookingFor(payload.slotStartAt));
    },
    manage: async (payload) => {
      calls.manage.push(payload);
      return answer(script.manage, calls.manage.length - 1, walkthroughManagedFor());
    },
    readCaller: async () => caller,
  };
  return {client, calls, signIn: (phoneNumber = walkthroughFixturePhone) => {caller = {uid: "fixture-uid", phoneNumber};}};
}
