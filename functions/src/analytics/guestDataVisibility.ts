import {logger} from "firebase-functions";

type Firestore = FirebaseFirestore.Firestore;

/**
 * The platform's group-size floor for dating counts (FIX-21, owner rule of
 * 23 Nov 2026: organisers see consolidated outcomes only, never below 10).
 * An organiser sees an event's catch, match or chat counts only when at least
 * this many guests came; below it the counts read as zero and do not add to
 * any total or trend. It lives in the server-only `config/guestDataVisibility`
 * document, which client rules deny through `match /config/{docId}`:
 *
 *   {groupSizeFloor: 10, reason: "Launch default", updatedAt: <timestamp>}
 *
 * The owner sets it in the Firebase console. With no document the floor is
 * the default. A document in any other shape also reads as the default: a
 * privacy floor that cannot be read fails closed rather than open.
 */
export const guestDataVisibilityConfig = {
  collection: "config",
  document: "guestDataVisibility",
} as const;

export const DEFAULT_GROUP_SIZE_FLOOR = 10;
export const MIN_GROUP_SIZE_FLOOR = 2;
export const MAX_GROUP_SIZE_FLOOR = 500;

export type GroupSizeFloor = {
  floor: number;
  source: "absent" | "set" | "invalid";
};

const allowedFields = new Set(["groupSizeFloor", "reason", "updatedAt",
  "updatedBy"]);

/**
 * The floor a stored config document asks for. Pure.
 * @param {unknown} data Stored document data, or undefined when absent.
 * @return {GroupSizeFloor} The floor and where it came from.
 */
export function parseGuestDataVisibilityConfig(data: unknown): GroupSizeFloor {
  if (data === undefined) {
    return {floor: DEFAULT_GROUP_SIZE_FLOOR, source: "absent"};
  }
  const floor = data !== null && typeof data === "object" &&
    !Array.isArray(data) ?
    (data as {groupSizeFloor?: unknown}).groupSizeFloor :
    undefined;
  const valid = typeof floor === "number" && Number.isInteger(floor) &&
    floor >= MIN_GROUP_SIZE_FLOOR && floor <= MAX_GROUP_SIZE_FLOOR &&
    Object.keys(data as object).every((key) => allowedFields.has(key));
  if (!valid) return {floor: DEFAULT_GROUP_SIZE_FLOOR, source: "invalid"};
  return {floor, source: "set"};
}

/**
 * Reads the platform's group-size floor for dating counts.
 * @param {Firestore} db Firestore instance.
 * @return {Promise<number>} The floor to apply.
 */
export async function readGroupSizeFloor(db: Firestore): Promise<number> {
  const snapshot = await db.collection(guestDataVisibilityConfig.collection)
    .doc(guestDataVisibilityConfig.document).get();
  const parsed = parseGuestDataVisibilityConfig(
    snapshot.exists ? snapshot.data() : undefined);
  if (parsed.source === "invalid") {
    logger.error("config/guestDataVisibility is malformed; the group-size " +
      `floor stays at the default of ${DEFAULT_GROUP_SIZE_FLOOR}.`);
  }
  return parsed.floor;
}
