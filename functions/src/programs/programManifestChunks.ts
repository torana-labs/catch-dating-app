import {HttpsError} from "firebase-functions/v2/https";
import type {
  ProgramGuestDocument, ProgramGuestGroupDocument,
  ProgramHouseholdDocument, ProgramHotelDocument,
  ProgramPickupPointDocument, ProgramTravelLegDocument,
  ProgramTravelPartyDocument, TransportOperationReceiptDocument,
} from "../shared/generated/firestoreAdminTypes";
import {buildManifestPlans, type ManifestRow, type RowIssue} from
  "./programManifestPlan";
import {buildManifestWrites} from "./programManifestWrites";

type Plan = ReturnType<typeof buildManifestPlans>;
export interface ManifestState {
  guests: Map<string, ProgramGuestDocument>;
  legs: Map<string, ProgramTravelLegDocument>;
  households: Map<string, ProgramHouseholdDocument>;
  parties: Map<string, ProgramTravelPartyDocument>;
  hotels: Map<string, ProgramHotelDocument>;
  pickupPoints: Map<string, ProgramPickupPointDocument>;
  groups: Map<string, ProgramGuestGroupDocument>;
}

/** Keep the old prefix cursor readable; new receipts resolve whole parties. */
export function completedManifestRows(
  receipt: TransportOperationReceiptDocument | undefined, total: number,
): number[] {
  if (!receipt) return [];
  const count = receipt.completedRows ?? total;
  const invalidProgress = () => new HttpsError("failed-precondition",
    "Import progress needs reconciliation before it can resume.");
  if (!Number.isInteger(count) || count < 0 || count > total) {
    throw invalidProgress();
  }
  const indices = receipt.completedRowIndices ??
    Array.from({length: count}, (_, index) => index);
  if (!Array.isArray(indices) || indices.length !== count ||
      new Set(indices).size !== count ||
      indices.some((index) => !Number.isInteger(index) ||
        index < 0 || index >= total)) {
    throw invalidProgress();
  }
  return [...indices].sort((a, b) => a - b);
}

/** Connected party identities bind valid and invalid rows to one outcome. */
function partyGroups(plan: Plan, rowCount: number): number[][] {
  const parent = Array.from({length: rowCount}, (_, index) => index);
  const root = (index: number): number => {
    while (parent[index] !== index) index = parent[index];
    return index;
  };
  const byKey = new Map<string, number>();
  for (const [index, keys] of plan.partyKeysByRow) {
    for (const key of keys) {
      const previous = byKey.get(key);
      if (previous !== undefined) parent[root(index)] = root(previous);
      byKey.set(key, index);
    }
  }
  const groups = new Map<number, number[]>();
  for (let index = 0; index < rowCount; index++) {
    const group = root(index);
    groups.set(group, [...(groups.get(group) ?? []), index]);
  }
  return [...groups.values()].sort((a, b) => a[0] - b[0]);
}

/** Pure staging for one transaction; callers publish only its final writes. */
export function buildManifestChunk(args: {
  rows: ManifestRow[]; completed: number[]; importedGuestIds: string[];
  state: ManifestState; programId: string; organizerId: string;
  allocateId: (collection: string) => string;
  now: FirebaseFirestore.Timestamp;
  source: {operationId: string; actorUid: string};
}): {planned: Plan; writes: ReturnType<typeof buildManifestWrites>;
    resolvedIndices: number[]; state: ManifestState} {
  const {rows, completed, allocateId, programId, organizerId, now} = args;
  const done = new Set(completed);
  const allIndices = rows.map((_, index) => index);
  const state: ManifestState = {...args.state,
    guests: new Map(args.state.guests), legs: new Map(args.state.legs),
    households: new Map(args.state.households),
    parties: new Map(args.state.parties),
    groups: new Map(args.state.groups)};
  const planRows = (indices: number[], guestIds: string[]) =>
    buildManifestPlans(indices.map((i) => rows[i]), state.guests, state.legs,
      state.households, state.parties, state.hotels, state.pickupPoints,
      state.groups, allocateId, [], guestIds);
  // This pass establishes source-order identity conflicts and party boundaries.
  // Capacity, route and related-record validation is repeated per whole party
  // against only accepted writes, so a rejected party consumes no capacity.
  const identity = planRows(allIndices, []);
  const groups = partyGroups(identity, rows.length)
    .map((group) => group.filter((index) => !done.has(index)))
    .filter((group) => group.length > 0);
  const planned: Plan = {plans: [], issues: [], newHouseholds: new Map(),
    newParties: new Map(), newLabels: new Map(), newGroups: new Map(),
    newGroupMeta: new Map(), partyKeysByRow: new Map(),
    identityIssues: []};
  const resolvedIndices: number[] = [];
  const importedGuestIds = [...args.importedGuestIds];
  const writes = new Map<string, object>();
  let writtenRows = 0;
  for (const group of groups) {
    const indices = group;
    const identityErrors = identity.identityIssues.filter((issue) =>
      group.includes(issue.index));
    if (group.length <= 50 && writtenRows + group.length > 50) break;
    const candidate = planRows(indices, importedGuestIds);
    const issues = [...identityErrors, ...candidate.issues.map((issue) =>
      ({...issue, index: indices[issue.index]}))];
    if (group.length > 50) {
      issues.push({index: indices[0],
        message: "A travel party cannot import more than 50 source rows."});
    }
    const groupWrites = issues.length === 0 ? buildManifestWrites(
      programId, organizerId, candidate, state.households, state.parties,
      state.legs, state.groups, now, {...args.source,
        rowIndices: indices}) : [];
    // One extra write persists the receipt. Count de-duplicated documents,
    // including assertions, before accepting an atomic travel-party group.
    const combinedPaths = new Set([...writes.keys(),
      ...groupWrites.map((write) => write.path)]);
    if (combinedPaths.size > 499 && writes.size > 0) break;
    if (combinedPaths.size > 499) {
      issues.push({index: indices[0],
        message: "This travel party exceeds the transaction write limit."});
    }
    if (issues.length > 0) {
      for (const index of indices) {
        // One issue per message, keeping the first one's detachable journey.
        const own = new Map<string, RowIssue>();
        for (const issue of issues) {
          if (issue.index === index && !own.has(issue.message)) {
            own.set(issue.message, issue);
          }
        }
        if (own.size === 0) {
          const message = "This travel party was not imported because " +
            "another row needs correction.";
          own.set(message, {index, message});
        }
        planned.issues.push(...own.values());
      }
    } else {
      for (const write of groupWrites) {
        writes.set(write.path, write.data);
        const [collection, id] = write.path.split("/");
        if (collection === "programGuests") {
          state.guests.set(id, write.data as ProgramGuestDocument);
        } else if (collection === "programTravelLegs") {
          state.legs.set(id, write.data as ProgramTravelLegDocument);
        } else if (collection === "programHouseholds") {
          state.households.set(id, write.data as ProgramHouseholdDocument);
        } else if (collection === "programTravelParties") {
          state.parties.set(id, write.data as ProgramTravelPartyDocument);
        } else if (collection === "programGuestGroups") {
          state.groups.set(id, write.data as ProgramGuestGroupDocument);
        }
      }
      planned.plans.push(...candidate.plans.map((plan) =>
        ({...plan, index: indices[plan.index]})));
      const groupMaps = ["newHouseholds", "newParties", "newLabels",
        "newGroups"] as const;
      for (const name of groupMaps) {
        for (const [key, value] of candidate[name]) {
          planned[name].set(key, value);
        }
      }
      for (const [id, meta] of candidate.newGroupMeta) {
        planned.newGroupMeta.set(id, meta);
      }
      importedGuestIds.push(...candidate.plans.map((plan) => plan.guestId));
      writtenRows += candidate.plans.length;
    }
    resolvedIndices.push(...indices);
  }
  planned.issues.sort((a, b) => a.index - b.index);
  const finalWrites = [...writes].map(([path, data]) => ({path, data}));
  return {planned, writes: finalWrites,
    resolvedIndices, state};
}
