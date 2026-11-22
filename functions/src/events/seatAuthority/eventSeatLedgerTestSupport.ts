import {deriveEventSeatPolicy} from "./firestoreAdapter";

/**
 * Test fixtures only. Every event has its seat ledger, so a fixture that
 * seeds `events/{id}` without one gets the ledger the event would have: its
 * capacity and policy, ready, with `occupied` equal to the seeded
 * `bookedCount`. An explicitly seeded ledger (or `undefined`) is kept, and an
 * event whose capacity or policy is deliberately malformed gets none.
 */
export function withEventSeatLedgers<T>(
  docs: Record<string, T>): Record<string, T> {
  const result: Record<string, unknown> = {...docs};
  for (const [path, value] of Object.entries(docs)) {
    const match = /^events\/([^/]+)$/u.exec(path);
    if (!match || !value || `eventSeatLedgers/${match[1]}` in docs) continue;
    let policy;
    try {
      policy = deriveEventSeatPolicy(value);
    } catch {
      continue;
    }
    const booked = (value as {bookedCount?: unknown}).bookedCount;
    result[`eventSeatLedgers/${match[1]}`] = {eventId: match[1],
      capacity: policy.capacity,
      occupied: Number.isSafeInteger(booked) ? booked : 0,
      revision: 1, capacityRevision: 1, policyVersion: policy.policyVersion,
      policyHash: policy.policyHash, migrationRevision: 1, state: "ready"};
  }
  return result as Record<string, T>;
}
