import {travelPartyRouteKey} from "../transport/travelPartyPolicy";
import {normalizeFlightNumber} from "../transport/flightIdentity";
import type {ImportProgramManifestCallablePayload} from
  "../shared/generated/importProgramManifestCallablePayload";
import type {
  ProgramGuestDocument, ProgramGuestGroupDocument,
  ProgramHouseholdDocument, ProgramHotelDocument,
  ProgramPickupPointDocument, ProgramTravelLegDocument,
  ProgramTravelPartyDocument,
} from "../shared/generated/firestoreAdminTypes";

export type ManifestRow =
  ImportProgramManifestCallablePayload["rows"][number];

export interface RowIssue {
  index: number;
  message: string;
  /** The journey whose party blocks the row, for detachProgramTravelLeg. */
  partyJourney?: {legId: string; revision: number};
}

const PARTY_ROUTE_BLOCK =
  "Remove this journey from its party before changing route.";
const PARTY_MOVE_BLOCK =
  "Remove this journey from its old party before moving it.";

export interface RowPlan {
  index: number;
  row: ManifestRow;
  guestId: string;
  guestAction: "create" | "update";
  existingGuest: ProgramGuestDocument | null;
  legId: string | null;
  legAction: "create" | "update" | "none";
  existingLeg: ProgramTravelLegDocument | null;
  householdId: string | null;
  partyId: string | null;
  pickupPointId: string | null;
  hotelId: string | null;
  groupIds: string[];
}

/**
 * The row's existing journey when detaching it from its party would clear a
 * party block: the party lists it and it has not departed.
 */
function detachableJourney(plan: RowPlan,
  parties: Map<string, ProgramTravelPartyDocument>,
): RowIssue["partyJourney"] | undefined {
  const leg = plan.existingLeg;
  if (!leg?.partyId || !plan.legId ||
      leg.readiness === "dispatched" || leg.readiness === "arrived" ||
      !parties.get(leg.partyId)?.legIds?.includes(plan.legId)) {
    return undefined;
  }
  return {legId: plan.legId, revision: leg.revision};
}

function normalizeLabel(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

export interface ManifestGroupEntry {
  dimension: string;
  label: string;
}

/**
 * groupLabels cells are `entry;entry` where each entry is `label` or
 * `dimension:label` (the first colon splits). Bare labels land on `custom`.
 */
export function parseManifestGroupLabels(
  value: string | null | undefined,
): ManifestGroupEntry[] {
  const trimmed = value?.trim();
  if (!trimmed) return [];
  return trimmed.split(";").map((entry) => {
    const text = entry.trim();
    const colon = text.indexOf(":");
    if (colon < 0) return {dimension: "custom", label: text};
    return {
      dimension: text.slice(0, colon).trim(),
      label: text.slice(colon + 1).trim(),
    };
  });
}

const groupKey = (dimension: string, label: string) =>
  `${normalizeLabel(dimension) ?? ""}|${normalizeLabel(label) ?? ""}`;

function arrivalDayBucket(millis: number | null | undefined): string {
  if (millis == null) return "none";
  return new Date(millis).toISOString().slice(0, 10);
}

export function normalizeManifestFlightNumber(
  value: string | null | undefined
): string | null {
  const normalized = value ? normalizeFlightNumber(value) : null;
  return normalized ? normalized : null;
}

/**
 * Dedup keys: externalReference wins; a flight leg keys on
 * name + flight + arrival day only when exactly one candidate exists.
 * Name-only matches require review and never merge people.
 */
function guestDedupKey(row: ManifestRow): {
  key: string; ambiguous: boolean;
} {
  if (row.externalReference) {
    return {
      key: `ref:${row.externalReference}`, ambiguous: false,
    };
  }
  const name = normalizeLabel(row.displayName)!;
  const flight = normalizeManifestFlightNumber(row.flightNumber);
  if (flight) {
    return {
      key: `leg:${name}|${flight}|` +
        arrivalDayBucket(row.scheduledArrivalAtMillis),
      ambiguous: false,
    };
  }
  return {key: `name:${name}`, ambiguous: true};
}

export function buildManifestPlans(
  rows: ManifestRow[],
  guests: Map<string, ProgramGuestDocument>,
  legs: Map<string, ProgramTravelLegDocument>,
  households: Map<string, ProgramHouseholdDocument>,
  parties: Map<string, ProgramTravelPartyDocument>,
  hotels: Map<string, ProgramHotelDocument>,
  pickupPoints: Map<string, ProgramPickupPointDocument>,
  groups: Map<string, ProgramGuestGroupDocument>,
  allocateId: (collection: string) => string,
  previousRows: ManifestRow[] = [],
  previousGuestIds: string[] = [],
): {plans: RowPlan[]; issues: RowIssue[];
    newHouseholds: Map<string, string>; newParties: Map<string, string>;
    newLabels: Map<string, string>; newGroups: Map<string, string>;
    newGroupMeta: Map<string, ManifestGroupEntry>;
    partyKeysByRow: Map<number, string[]>; identityIssues: RowIssue[]} {
  const issues: RowIssue[] = [];
  const identityIssues: RowIssue[] = [];
  const partyKeysByRow = new Map<number, string[]>();
  const plans: RowPlan[] = [];
  const seenKeys = new Set(previousRows.map((row) => guestDedupKey(row).key));
  const selectedGuests = new Set(previousGuestIds);
  const householdByLabel = new Map<string, string | null>();
  const partyByLabel = new Map<string, string | null>();
  const hotelByName = new Map<string, string | null>();
  const pickupByLabel = new Map<string, string | null>();
  const newHouseholds = new Map<string, string>();
  const newParties = new Map<string, string>();
  const newLabels = new Map<string, string>();
  const newGroups = new Map<string, string>();
  const newGroupMeta = new Map<string, ManifestGroupEntry>();
  const indexLabel = (map: Map<string, string | null>,
    label: string | null, id: string) => {
    if (label) map.set(label, map.has(label) ? null : id);
  };
  for (const [id, doc] of households) {
    indexLabel(householdByLabel, normalizeLabel(doc.label), id);
  }
  for (const [id, doc] of parties) {
    indexLabel(partyByLabel, normalizeLabel(doc.label), id);
  }
  for (const [id, doc] of hotels) {
    if (doc.active) indexLabel(hotelByName, normalizeLabel(doc.name), id);
  }
  for (const [id, doc] of pickupPoints) {
    if (doc.active) indexLabel(pickupByLabel, normalizeLabel(doc.label), id);
  }
  const groupByKey = new Map<string, string | null>();
  for (const [id, doc] of groups) {
    indexLabel(groupByKey, groupKey(doc.dimension, doc.label), id);
  }
  const householdMembers = new Map([...households].map(([id, doc]) =>
    [id, new Set(doc.memberGuestIds)]));
  const partyMembers = new Map([...parties].map(([id, doc]) =>
    [id, new Set(doc.legIds ?? [])]));
  const partyRoutes = new Map<string, string>();
  for (const party of parties.values()) {
    const first = legs.get(party.legIds?.[0] ?? "");
    const label = normalizeLabel(party.label);
    if (first && label) partyRoutes.set(label, travelPartyRouteKey(first));
  }

  const guestsByRef = new Map<string, string[]>();
  const guestsByName = new Map<string, string[]>();
  for (const [id, guest] of guests) {
    if (guest.externalReference) {
      const key = `ref:${guest.externalReference}`;
      guestsByRef.set(key, [...(guestsByRef.get(key) ?? []), id]);
    }
    const name = normalizeLabel(guest.displayName);
    if (name) {
      const list = guestsByName.get(name) ?? [];
      list.push(id);
      guestsByName.set(name, list);
    }
  }
  const legsByGuestFlight = new Map<string, string[]>();
  const legKey = (guestId: string, flight: string | null,
    millis: number | null | undefined) =>
    `${guestId}|${flight ?? "ground"}|${arrivalDayBucket(millis)}`;
  for (const [id, leg] of legs) {
    if (leg.kind !== "inbound") continue;
    const key = legKey(leg.guestId,
      normalizeManifestFlightNumber(leg.flightNumber),
      leg.scheduledArrivalAt?.toMillis());
    legsByGuestFlight.set(key, [...(legsByGuestFlight.get(key) ?? []), id]);
  }

  for (const [index, row] of rows.entries()) {
    const plan: RowPlan = {
      index, row,
      guestId: "", guestAction: "create", existingGuest: null,
      legId: null, legAction: "none", existingLeg: null,
      householdId: null, partyId: null,
      pickupPointId: null, hotelId: null, groupIds: [],
    };
    const rowErrors: string[] = [];

    const dedup = guestDedupKey(row);
    if (seenKeys.has(dedup.key)) {
      const message =
        "Duplicate manifest row; add a distinct externalReference.";
      rowErrors.push(message);
      identityIssues.push({index, message});
    }
    seenKeys.add(dedup.key);

    if (!row.displayName.trim()) rowErrors.push("Guest name is required.");
    const referenceMatches = dedup.key.startsWith("ref:") ?
      guestsByRef.get(dedup.key) ?? [] : [];
    let guestId = referenceMatches.length === 1 ?
      referenceMatches[0] : undefined;
    if (referenceMatches.length > 1) {
      rowErrors.push("Multiple guests share this reference; resolve it first.");
    }
    // A new upstream reference may adopt exactly one unreferenced guest.
    // It must never overwrite a different reference or choose an arbitrary
    // same-name person. Flight-only evidence also requires a service date.
    if (!guestId && referenceMatches.length === 0 && row.flightNumber &&
        row.scheduledArrivalAtMillis != null) {
      const name = normalizeLabel(row.displayName)!;
      const flight = normalizeManifestFlightNumber(row.flightNumber)!;
      const day = arrivalDayBucket(row.scheduledArrivalAtMillis);
      const candidates = (guestsByName.get(name) ?? []).filter((id) =>
        (!row.externalReference || !guests.get(id)!.externalReference) &&
        legsByGuestFlight.has(`${id}|${flight}|${day}`));
      if (candidates.length === 1) guestId = candidates[0];
      if (candidates.length > 1) {
        rowErrors.push("Ambiguous guest and flight; use externalReference.");
      }
    }
    if (!guestId && !row.externalReference &&
        (!row.flightNumber || row.scheduledArrivalAtMillis == null) &&
        (guestsByName.get(normalizeLabel(row.displayName)!) ?? []).length > 0) {
      rowErrors.push(
        "Name alone cannot identify a guest; use externalReference.");
    }
    if (guestId && selectedGuests.has(guestId)) {
      const message = "Multiple rows target the same guest; resolve the rows.";
      rowErrors.push(message);
      identityIssues.push({index, message});
    }
    if (guestId) {
      plan.guestId = guestId;
      plan.guestAction = "update";
      plan.existingGuest = guests.get(guestId)!;
    }

    const pickupLabel = normalizeLabel(row.pickupPointLabel);
    if (row.pickupPointLabel != null) {
      plan.pickupPointId = pickupLabel ?
        pickupByLabel.get(pickupLabel) ?? null : null;
      if (!plan.pickupPointId) {
        rowErrors.push(`Unknown pickup point "${row.pickupPointLabel}".`);
      }
    }
    const hotelName = normalizeLabel(row.destinationHotelName);
    if (row.destinationHotelName != null) {
      plan.hotelId = hotelName ? hotelByName.get(hotelName) ?? null : null;
      if (!plan.hotelId) {
        rowErrors.push(`Unknown hotel "${row.destinationHotelName}".`);
      }
    }
    const flight = normalizeManifestFlightNumber(row.flightNumber);
    if (flight || row.scheduledArrivalAtMillis != null || row.partyLabel ||
        row.pickupPointLabel || row.destinationHotelName ||
        row.destinationLabel) {
      const matches = plan.guestId ? legsByGuestFlight.get(legKey(
        plan.guestId, flight, row.scheduledArrivalAtMillis)) ?? [] : [];
      if (matches.length > 1) {
        rowErrors.push("Multiple inbound legs match; resolve them first.");
      }
      if (matches.length === 1) {
        plan.legId = matches[0];
        plan.existingLeg = legs.get(matches[0])!;
        plan.legAction = "update";
        if (["dispatched", "arrived"].includes(plan.existingLeg.readiness)) {
          rowErrors.push(
            "This journey has been dispatched; edit it separately.");
        }
      } else {
        plan.legAction = "create";
        plan.legId = allocateId("programTravelLegs");
      }
    }
    for (const [labelValue, byLabel, members, kind] of [
      [row.householdLabel, householdByLabel, householdMembers, "household"],
      [row.partyLabel, partyByLabel, partyMembers, "travel party"],
    ] as const) {
      const label = normalizeLabel(labelValue);
      if (!label) continue;
      const id = byLabel.get(label);
      if (id === null) {
        rowErrors.push(`Ambiguous ${kind} label; resolve it first.`);
      }
      if (id && (members.get(id)?.size ?? 0) >= 50 &&
          !members.get(id)?.has(kind === "household" ?
            plan.guestId : plan.legId!)) {
        rowErrors.push(`The ${kind} already has 50 members.`);
      }
    }
    const groupEntries = parseManifestGroupLabels(row.groupLabels);
    if (groupEntries.length > 10) {
      rowErrors.push("A row can carry at most 10 group memberships.");
    }
    const matchedGroupIds = new Set<string>();
    const pendingGroupKeys = new Set<string>();
    for (const entry of groupEntries) {
      if (!entry.label || !entry.dimension) {
        rowErrors.push("Group entries need a label, " +
          "optionally prefixed by a dimension.");
        continue;
      }
      const key = groupKey(entry.dimension, entry.label);
      const id = groupByKey.get(key);
      if (id === null) {
        rowErrors.push(`Ambiguous guest group "${entry.label}".`);
      } else if (id) {
        matchedGroupIds.add(id);
      } else {
        pendingGroupKeys.add(key);
      }
    }
    const unionGroupIds = new Set([
      ...(plan.existingGuest?.groupIds ?? []), ...matchedGroupIds]);
    if (unionGroupIds.size + pendingGroupKeys.size > 20) {
      rowErrors.push("Guest group membership is limited to 20 groups.");
    }
    const route = travelPartyRouteKey({kind: "inbound",
      pickupPointId: plan.pickupPointId ??
        plan.existingLeg?.pickupPointId ?? null,
      destinationHotelId: plan.hotelId ??
        plan.existingLeg?.destinationHotelId ?? null,
      destinationLabel: row.destinationLabel === undefined ?
        plan.existingLeg?.destinationLabel ?? null : row.destinationLabel,
    });
    if (plan.existingLeg?.partyId) {
      const currentParty = parties.get(plan.existingLeg.partyId);
      if (!currentParty?.legIds?.includes(plan.legId!)) {
        rowErrors.push("Party and journey membership need reconciliation.");
      }
      if (route !== travelPartyRouteKey(plan.existingLeg)) {
        rowErrors.push(PARTY_ROUTE_BLOCK);
      }
    }
    const partyLabel = normalizeLabel(row.partyLabel);
    if (partyLabel) {
      const partyId = partyByLabel.get(partyLabel);
      const party = partyId ? parties.get(partyId) : undefined;
      if (party && !Array.isArray(party.legIds)) {
        rowErrors.push("Legacy party membership needs journey reconciliation.");
      }
      if (party?.legIds?.some((id) => {
        const readiness = legs.get(id)?.readiness;
        return readiness === "dispatched" || readiness === "arrived";
      })) {
        rowErrors.push("This party already departed; use a new party label.");
      }
      if (plan.existingLeg?.partyId && plan.existingLeg.partyId !== partyId) {
        rowErrors.push(PARTY_MOVE_BLOCK);
      }
      if (partyRoutes.has(partyLabel) &&
          partyRoutes.get(partyLabel) !== route) {
        rowErrors.push(
          "Travel party members need the same pickup and destination.");
      }
      if (rowErrors.length === 0) partyRoutes.set(partyLabel, route);
    }
    // Preserve both current and requested party identities even for bad rows.
    // Transaction batching must not publish the valid half of either party.
    const partyKeys = new Set<string>();
    if (partyLabel) partyKeys.add(`label:${partyLabel}`);
    for (const id of [plan.existingLeg?.partyId,
      partyLabel ? partyByLabel.get(partyLabel) : null]) {
      if (!id) continue;
      partyKeys.add(`id:${id}`);
      const label = normalizeLabel(parties.get(id)?.label);
      if (label) partyKeys.add(`label:${label}`);
    }
    partyKeysByRow.set(index, [...partyKeys]);
    // An errored row never creates groups or alters existing membership.
    if (rowErrors.length > 0) {
      const partyJourney = detachableJourney(plan, parties);
      for (const message of rowErrors) {
        issues.push(partyJourney && (message === PARTY_ROUTE_BLOCK ||
          message === PARTY_MOVE_BLOCK) ?
          {index, message, partyJourney} : {index, message});
      }
      continue;
    }
    if (normalizeLabel(row.householdLabel)) {
      const label = normalizeLabel(row.householdLabel)!;
      let householdId = householdByLabel.get(label);
      if (!householdId) {
        householdId = newHouseholds.get(label) ??
          allocateId("programHouseholds");
        newHouseholds.set(label, householdId);
        newLabels.set(householdId, row.householdLabel!.trim());
        householdByLabel.set(label, householdId);
      }
      plan.householdId = householdId;
    }
    if (normalizeLabel(row.partyLabel)) {
      const label = normalizeLabel(row.partyLabel)!;
      let partyId = partyByLabel.get(label);
      if (!partyId) {
        partyId = newParties.get(label) ??
          allocateId("programTravelParties");
        newParties.set(label, partyId);
        newLabels.set(partyId, row.partyLabel!.trim());
        partyByLabel.set(label, partyId);
      }
      plan.partyId = partyId;
    }
    for (const entry of groupEntries) {
      const key = groupKey(entry.dimension, entry.label);
      let groupId = groupByKey.get(key) ?? undefined;
      if (!groupId) {
        groupId = newGroups.get(key) ?? allocateId("programGuestGroups");
        newGroups.set(key, groupId);
        newGroupMeta.set(groupId, entry);
        groupByKey.set(key, groupId);
      }
      if (!plan.groupIds.includes(groupId)) plan.groupIds.push(groupId);
    }

    if (!plan.guestId) {
      plan.guestId = allocateId("programGuests");
    }
    for (const [id, members] of [
      [plan.householdId, householdMembers], [plan.partyId, partyMembers],
    ] as const) {
      if (!id) continue;
      const group = members.get(id) ?? new Set<string>();
      group.add(members === householdMembers ? plan.guestId : plan.legId!);
      members.set(id, group);
    }
    selectedGuests.add(plan.guestId);
    plans.push(plan);
  }
  return {plans, issues, newHouseholds, newParties, newLabels,
    newGroups, newGroupMeta, partyKeysByRow, identityIssues};
}

