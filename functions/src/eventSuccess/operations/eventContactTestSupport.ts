import {Timestamp} from "firebase-admin/firestore";

/**
 * Test support for event-day consent (issue #2494): the send gates read the
 * guest's users/{uid}/contactPermissions/event_{eventId} document, so a test
 * that alters or removes consent alters that document's grant.
 */
type Io = {
  read: (path: string) => Promise<Record<string, unknown> | undefined>;
  write: (path: string, value: object) => Promise<unknown>;
};
type Grant = Record<string, unknown>;

export const eventContactPath = (uid: string, eventId: string) =>
  `users/${uid}/contactPermissions/event_${eventId}`;

/** Rewrites one grant; returning null removes it. */
export async function editEventGrant(io: Io, uid: string, eventId: string,
  key: string, edit: (grant: Grant) => Grant | null): Promise<void> {
  const path = eventContactPath(uid, eventId);
  const document = await io.read(path);
  if (!document) throw new Error(`No event consent document at ${path}`);
  const grants = {...document.grants as Record<string, Grant>};
  const next = grants[key] ? edit(grants[key]) : null;
  if (next) grants[key] = next;
  else delete grants[key];
  await io.write(path, {...document, grants});
}

/** A grant's withdrawal, as the store writes it, without a new receipt. */
export const withdrawnGrant = (grant: Grant): Grant =>
  ({...grant, status: "optedOut"});

/** A grant that expired at `millis`. */
export const expiredGrant = (millis: number) => (grant: Grant): Grant =>
  ({...grant, expiresAt: Timestamp.fromMillis(millis)});
