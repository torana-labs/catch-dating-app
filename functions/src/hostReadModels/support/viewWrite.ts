import {isDeepStrictEqual} from "node:util";

/** What every movement view records about its last evaluation. */
export interface EvaluationFields {
  revision: number;
  evaluatedAt: FirebaseFirestore.Timestamp;
  sourceCoverage: "complete" | "invalidSource";
  incompleteSource: string | null;
}

/** The fields planViewWrite maintains on any view document. */
type RevisionFields = Pick<EvaluationFields, "revision" | "evaluatedAt">;

/**
 * Plans one view write with no-op avoidance: [next] is everything except
 * revision and evaluatedAt. An unchanged document is not written; a changed
 * one gets revision + 1 and evaluatedAt now. Firestore does not keep map key
 * order, so documents are compared structurally.
 */
export function planViewWrite<D extends RevisionFields>(
  previous: D | null, next: Omit<D, "revision" | "evaluatedAt">,
  now: FirebaseFirestore.Timestamp
): {unchanged: true; revision: number} |
  {unchanged: false; revision: number; document: D} {
  const previousRevision = positiveInteger(previous?.revision) ?? 0;
  if (previous !== null) {
    const {revision: _revision, evaluatedAt: _evaluatedAt, ...rest} =
      previous;
    void _revision;
    void _evaluatedAt;
    if (isDeepStrictEqual(normalized(rest), normalized(next))) {
      return {unchanged: true, revision: previousRevision};
    }
  }
  const revision = previousRevision + 1;
  return {unchanged: false, revision,
    document: {...next, revision, evaluatedAt: now} as unknown as D};
}

/** Firestore drops undefined fields; compare what a read would return. */
function normalized(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

export function positiveInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) > 0 ?
    value as number : null;
}

export function millisOf(stamp: FirebaseFirestore.Timestamp): number {
  return stamp.toMillis();
}

/** What one view evaluation did. */
export type ViewOutcome =
  | {kind: "removed"; existed: boolean}
  | {kind: "unchanged"; revision: number}
  | {kind: "complete"; revision: number}
  | {
    kind: "invalidSource";
    source: string;
    detail: string;
    revision: number;
    written: boolean;
  };

export type ViewOutcomeCounts = Record<ViewOutcome["kind"], number>;

/** One zero count for each outcome kind. */
export function emptyOutcomeCounts(): ViewOutcomeCounts {
  return {removed: 0, unchanged: 0, complete: 0, invalidSource: 0};
}

/** Counts one outcome. */
export function countOutcome(counts: ViewOutcomeCounts,
  outcome: ViewOutcome): void {
  counts[outcome.kind]++;
}
