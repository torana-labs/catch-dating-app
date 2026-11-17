/**
 * Classifies stored profile decisions as either retired swipe-deck records or
 * current Stay in touch picks.
 *
 * The retired deck and the after-event pick share one storage path and shape
 * (`profileDecisions/{swiperId}/outgoing/{targetId}`). A current pick is only
 * ever written as `{swiperId, targetId, eventId, direction: "like",
 * createdAt}`; the deck wrote passes, likes carrying a reaction target and an
 * optional comment, and, before the reaction feature, plain likes. No pick
 * writer existed before the deck was retired (commit ec12ccadb), so any
 * decision older than that commit is deck-era too.
 *
 * The owner-approved rule (Nov 2026): a decision is deck-era when any of
 * these holds:
 * - `direction == "pass"`;
 * - a reaction field or a comment is present (non-null);
 * - `createdAt` is before 2026-11-12T12:50:04Z.
 *
 * `tool/data/purge_deck_era_records.mjs` loads this compiled module. Live
 * matching does not import it yet: the change that makes onSwipeCreated and
 * fetchSwipeCandidates honour it ships after the prod purge, so both apply
 * the same rule.
 */

/** When the swipe deck was retired and the first pick writer merged. */
export const deckRetiredAtIso = "2026-11-12T12:50:04Z";
export const deckRetiredAtMillis = Date.parse(deckRetiredAtIso);

/** Fields only the retired deck ever wrote. */
export const deckEraOnlyFields = [
  "reactionTargetId",
  "reactionTargetType",
  "reactionTargetLabel",
  "reactionTargetPreview",
  "comment",
] as const;

export type DeckEraReason = "pass" | "reactionOrComment" | "beforeCutoff";

/** The subset of a stored decision the classifier reads. */
export interface ClassifiableDecision {
  direction?: unknown;
  createdAt?: unknown;
  reactionTargetId?: unknown;
  reactionTargetType?: unknown;
  reactionTargetLabel?: unknown;
  reactionTargetPreview?: unknown;
  comment?: unknown;
}

/**
 * Lists every reason a stored decision counts as deck-era.
 * @param {ClassifiableDecision | undefined} decision Stored decision data.
 * @return {DeckEraReason[]} Reasons, in rule order; empty for a current pick.
 */
export function deckEraReasons(
  decision: ClassifiableDecision | undefined
): DeckEraReason[] {
  if (!decision) return [];
  const reasons: DeckEraReason[] = [];
  if (decision.direction === "pass") reasons.push("pass");
  if (deckEraOnlyFields.some((field) => decision[field] != null)) {
    reasons.push("reactionOrComment");
  }
  const createdAtMillis = timestampMillis(decision.createdAt);
  if (createdAtMillis != null && createdAtMillis < deckRetiredAtMillis) {
    reasons.push("beforeCutoff");
  }
  return reasons;
}

/**
 * Whether a stored decision came from the retired swipe deck.
 * @param {ClassifiableDecision | undefined} decision Stored decision data.
 * @return {boolean} True for a deck-era like or pass.
 */
export function isDeckEraDecision(
  decision: ClassifiableDecision | undefined
): boolean {
  return deckEraReasons(decision).length > 0;
}

/**
 * Whether a stored decision is a current Stay in touch pick: a like that is
 * not deck-era. Only current picks count toward a mutual pick, hide someone
 * from the pick list, or open a chat.
 * @param {ClassifiableDecision | undefined} decision Stored decision data.
 * @return {boolean} True for a current pick.
 */
export function isCurrentPick<T extends ClassifiableDecision>(
  decision: T | undefined
): decision is T {
  return decision?.direction === "like" && !isDeckEraDecision(decision);
}

/**
 * Reads epoch milliseconds from a Firestore Timestamp, a serialized
 * timestamp (`seconds`/`_seconds`), a Date, or an ISO string.
 * @param {unknown} value Stored timestamp value.
 * @return {number | null} Milliseconds, or null when unreadable.
 */
export function timestampMillis(value: unknown): number | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.getTime() : null;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value !== "object") return null;
  const candidate = value as {
    toMillis?: unknown;
    seconds?: unknown;
    _seconds?: unknown;
    nanoseconds?: unknown;
    _nanoseconds?: unknown;
  };
  if (typeof candidate.toMillis === "function") {
    const millis = (candidate.toMillis as () => unknown)();
    return typeof millis === "number" && Number.isFinite(millis) ?
      millis :
      null;
  }
  const seconds = candidate.seconds ?? candidate._seconds;
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return null;
  const nanos = candidate.nanoseconds ?? candidate._nanoseconds;
  return seconds * 1000 +
    (typeof nanos === "number" && Number.isFinite(nanos) ?
      Math.floor(nanos / 1e6) :
      0);
}
