import type {
  EventSuccessPlanDocument,
  OrganizerEventSuccessLayoutDocument,
} from
  "../shared/generated/firestoreAdminTypes";
import type {AssignmentConstraintConfig} from "./assignmentConstraints";
import {HttpsError} from "firebase-functions/v2/https";
import {organizerEventSuccessLayoutDocumentId} from
  "../domain/formats/layoutDocumentId";

export type EventSuccessLayoutUnit =
  OrganizerEventSuccessLayoutDocument["units"][number];

export interface EventSuccessUnitProximity {
  aUnitId: string;
  bUnitId: string;
  distance: number;
}

export interface NormalizedEventSuccessLayoutUnit {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

interface SpatialAssignment {
  uid: string;
  unitKind?: string;
  unitIndex?: number;
  rotationSlots?: Array<{roundIndex: number; unitIndex?: number}>;
  groupRotationSlots?: Array<{roundIndex: number; unitIndex?: number}>;
  layoutUnitId?: string;
  confirmedLayoutUnitId?: string | null;
}

/** Loads the selected organizer asset without copying it onto the event. */
export async function loadSelectedEventSuccessLayout(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  plan: {layoutId?: string | null; structureConfig?: {unitKind?: unknown}}
): Promise<OrganizerEventSuccessLayoutDocument | null> {
  if (!plan.layoutId || plan.structureConfig?.unitKind === "wholeGroup") {
    return null;
  }
  const snap = await db.collection("organizerEventSuccessLayouts").doc(
    organizerEventSuccessLayoutDocumentId(organizerId, plan.layoutId)
  ).get();
  if (!snap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "The selected room layout no longer exists."
    );
  }
  const layout = snap.data() as OrganizerEventSuccessLayoutDocument;
  if (layout.organizerId !== organizerId || layout.layoutId !== plan.layoutId) {
    throw new HttpsError("failed-precondition", "Selected layout mismatch.");
  }
  return layout;
}

/** Projects a stored layout without ownership timestamps. */
export function publicEventSuccessLayout(
  layout: OrganizerEventSuccessLayoutDocument
): Pick<OrganizerEventSuccessLayoutDocument, "layoutId" | "label" | "units"> {
  return {
    layoutId: layout.layoutId,
    label: layout.label,
    units: layout.units,
  };
}

/**
 * Derives the complete weighted unit-proximity graph from coarse grid
 * coordinates. No cutoff is used: T6 can consume the stable distance itself.
 */
export function deriveEventSuccessUnitProximity(
  units: EventSuccessLayoutUnit[]
): EventSuccessUnitProximity[] {
  const edges: EventSuccessUnitProximity[] = [];
  for (let aIndex = 0; aIndex < units.length; aIndex += 1) {
    for (let bIndex = aIndex + 1; bIndex < units.length; bIndex += 1) {
      const a = units[aIndex];
      const b = units[bIndex];
      edges.push({
        aUnitId: a.id < b.id ? a.id : b.id,
        bUnitId: a.id < b.id ? b.id : a.id,
        distance: Math.hypot(a.gridX - b.gridX, a.gridY - b.gridY),
      });
    }
  }
  return edges.sort((a, b) =>
    a.distance - b.distance ||
    a.aUnitId.localeCompare(b.aUnitId) ||
    a.bUnitId.localeCompare(b.bUnitId)
  );
}

/** Derives the shared normalized grid-cell rectangles used by both runtimes. */
export function normalizeEventSuccessLayoutUnits(
  units: EventSuccessLayoutUnit[]
): NormalizedEventSuccessLayoutUnit[] {
  if (units.length === 0) return [];
  const columns = Math.max(...units.map((unit) => unit.gridX)) + 1;
  const rows = Math.max(...units.map((unit) => unit.gridY)) + 1;
  return [...units]
    .sort(compareLayoutUnits)
    .map((unit) => ({
      id: unit.id,
      left: rounded(unit.gridX / columns),
      top: rounded(unit.gridY / rows),
      width: rounded(1 / columns),
      height: rounded(1 / rows),
    }));
}

/** Adds pinned constraints to the generator's primitive constraints. */
export function assignmentConstraintsForSpatialPlan(
  base: AssignmentConstraintConfig,
  plan: Pick<EventSuccessPlanDocument, "affinityConstraints">
): AssignmentConstraintConfig {
  const affinityConstraints = (plan.affinityConstraints ?? [])
    .filter((constraint) => constraint.scope === "pinned");
  return affinityConstraints.length === 0 ? base : {
    ...base,
    affinityConstraints,
  };
}

/** Returns only overrides and constraints that must survive regeneration. */
export function persistentSpatialPlanFields(
  plan: SpatialPlanFields
): SpatialPlanFields {
  return {
    affinityConstraints: (plan.affinityConstraints ?? [])
      .filter((constraint) => constraint.scope === "pinned"),
    spatialOverrides: (plan.spatialOverrides ?? [])
      .filter((override) => override.scope === "pinned"),
  };
}

type SpatialPlanFields = Pick<
  EventSuccessPlanDocument,
  "affinityConstraints" | "spatialOverrides"
>;

/**
 * Applies the selected organizer layout to generated assignment projections.
 * `thisRound` overrides intentionally disappear here; pinned overrides are
 * applied to both the moved attendee and the named destination peer.
 */
export function applyEventSuccessSpatialLayout<T extends SpatialAssignment>(
  assignments: Map<string, T>,
  layout: OrganizerEventSuccessLayoutDocument | null,
  plan: Pick<EventSuccessPlanDocument, "spatialOverrides">,
  targetRoundIndex: number
): Map<string, T> {
  if (layout === null) return assignments;
  const orderedUnits = [...layout.units].sort(compareLayoutUnits);
  if (orderedUnits.length === 0) return assignments;
  const pinnedUnitByUid = new Map<string, string>();
  for (const override of plan.spatialOverrides ?? []) {
    if (
      override.scope !== "pinned" ||
      !orderedUnits.some((unit) => unit.id === override.layoutUnitId)
    ) continue;
    pinnedUnitByUid.set(override.uid, override.layoutUnitId);
    if (!pinnedUnitByUid.has(override.targetPeerUid)) {
      pinnedUnitByUid.set(override.targetPeerUid, override.layoutUnitId);
    }
  }
  for (const [id, assignment] of assignments) {
    if (assignment.unitKind === "wholeGroup") {
      assignments.set(id, withoutSpatialProjection(assignment));
      continue;
    }
    const pinnedUnitId = pinnedUnitByUid.get(assignment.uid);
    const unitIndex = assignmentUnitIndex(assignment, targetRoundIndex);
    const generatedUnit = unitIndex === null ? null :
      orderedUnits[unitIndex % orderedUnits.length];
    const layoutUnitId = pinnedUnitId ?? generatedUnit?.id;
    assignments.set(id, {
      ...assignment,
      ...(layoutUnitId === undefined ? {} : {layoutUnitId}),
      confirmedLayoutUnitId: null,
    });
  }
  return assignments;
}

function assignmentUnitIndex(
  assignment: SpatialAssignment,
  targetRoundIndex: number
): number | null {
  const rotation = assignment.rotationSlots?.find(
    (slot) => slot.roundIndex === targetRoundIndex
  );
  if (rotation?.unitIndex !== undefined) return rotation.unitIndex;
  const group = assignment.groupRotationSlots?.find(
    (slot) => slot.roundIndex === targetRoundIndex
  );
  if (group?.unitIndex !== undefined) return group.unitIndex;
  return assignment.unitIndex ?? null;
}

function withoutSpatialProjection<T extends SpatialAssignment>(value: T): T {
  const copy = {...value};
  delete copy.layoutUnitId;
  delete copy.confirmedLayoutUnitId;
  return copy;
}

function compareLayoutUnits(
  a: EventSuccessLayoutUnit,
  b: EventSuccessLayoutUnit
): number {
  return a.order - b.order || a.id.localeCompare(b.id);
}

function rounded(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
