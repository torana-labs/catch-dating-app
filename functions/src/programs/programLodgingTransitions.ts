import {createHash} from "node:crypto";
import {assertLodgingProposalCurrent, immutableLodgingProposal}
  from "./programLodgingPlanner";
import {inventoryFacts, validateLodgingPlacements}
  from "./programLodgingValidation";
import type {LodgingProposal, LodgingSnapshot} from "./programLodgingTypes";

/** Resolved from current canonical program authority inside the transaction;
 * Never derive it from callable payloads or cached client state. */
export interface LodgingAuthority {
  uid: string;
  organizerId: string;
  programId: string;
  role: "manager" | "coordinator" | "hotelDesk";
  hotelIds: string[];
  expiresAtMillis: number;
}
export interface LodgingWorkflow {
  revision: number;
  approvedProposalId: string | null;
  confirmedHotelIds: string[];
  guestPublishedProposalId: string | null;
}
export interface LodgingCommand {
  operationId: string;
  expectedWorkflowRevision: number;
  proposalId: string;
  action: "approve" | "confirmHotel" | "publishGuests";
  hotelId: string | null;
}
export interface LodgingReceipt {
  operationId: string;
  requestHash: string;
  actorUid: string;
  resultingRevision: number;
}
export interface LodgingTransition {
  workflow: LodgingWorkflow;
  receipt: LodgingReceipt;
  replayed: boolean;
}

function requireAuthority(snapshot: LodgingSnapshot,
  authority: LodgingAuthority, nowMillis: number, hotelId?: string): void {
  if (!authority.uid || authority.organizerId !== snapshot.scope.organizerId ||
      authority.programId !== snapshot.scope.programId ||
      !Number.isFinite(nowMillis) || authority.expiresAtMillis <= nowMillis ||
      !Number.isFinite(authority.expiresAtMillis) ||
      !["manager", "coordinator", "hotelDesk"].includes(authority.role)) {
    throw new Error("Current program authority is required.");
  }
  if (authority.role === "hotelDesk" && (!hotelId ||
      !authority.hotelIds.includes(hotelId))) {
    throw new Error("This duty does not cover the requested hotel.");
  }
}

/** Atomic decision logic for the later Firestore adapter. The adapter must
 * read current authority, source/check-in revisions, workflow and receipt in
 * the SAME transaction, then write this workflow and receipt together. This
 * pure module neither grants authority nor persists/publishes guest data. */
export function lodgingTransition(snapshot: LodgingSnapshot,
  proposal: LodgingProposal, workflow: LodgingWorkflow,
  authority: LodgingAuthority, command: LodgingCommand,
  existingReceipt: LodgingReceipt | null, nowMillis: number,
): LodgingTransition {
  requireAuthority(snapshot, authority, nowMillis,
    command.action === "confirmHotel" ?
      command.hotelId ?? undefined : undefined);
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(command.operationId) ||
      !Number.isSafeInteger(command.expectedWorkflowRevision) ||
      command.expectedWorkflowRevision < 0 ||
      command.proposalId !== proposal.id ||
      proposal.scope.organizerId !== snapshot.scope.organizerId ||
      proposal.scope.programId !== snapshot.scope.programId ||
      !["approve", "confirmHotel", "publishGuests"].includes(command.action) ||
      (command.action !== "confirmHotel" && command.hotelId !== null)) {
    throw new Error("Invalid lodging command.");
  }
  const requestHash = createHash("sha256").update(JSON.stringify([
    snapshot.scope.organizerId, snapshot.scope.programId, authority.uid,
    command.operationId, command.proposalId, command.action, command.hotelId,
    command.expectedWorkflowRevision,
  ])).digest("hex");
  if (existingReceipt) {
    if (existingReceipt.operationId !== command.operationId ||
        existingReceipt.actorUid !== authority.uid ||
        existingReceipt.requestHash !== requestHash) {
      throw new Error("Operation ID already used for a different request.");
    }
    // Replay reports current state; it cannot revive an older approval.
    return {workflow: structuredClone(workflow),
      receipt: {...existingReceipt}, replayed: true};
  }
  if (!Number.isSafeInteger(workflow.revision) || workflow.revision < 0 ||
      workflow.revision !== command.expectedWorkflowRevision) {
    throw new Error("Stale lodging workflow revision.");
  }
  assertLodgingProposalCurrent(proposal, snapshot.revisions);
  if (immutableLodgingProposal(snapshot, proposal.placements).id !==
      proposal.id ||
      validateLodgingPlacements(snapshot, proposal.placements, true).length) {
    throw new Error("A complete, current and feasible proposal is required.");
  }
  const next = structuredClone(workflow);
  if (command.action === "approve") {
    if (next.approvedProposalId !== proposal.id) next.confirmedHotelIds = [];
    next.approvedProposalId = proposal.id;
    // Prior guest publication stays visible until an explicit replacement.
  } else {
    if (workflow.approvedProposalId !== proposal.id) {
      throw new Error("The host must approve this exact proposal first.");
    }
    if (command.action === "confirmHotel") {
      const hotels = proposalHotels(snapshot, proposal);
      if (!command.hotelId || !hotels.has(command.hotelId)) {
        throw new Error("No allocated inventory in this hotel.");
      }
      next.confirmedHotelIds = [...new Set([...next.confirmedHotelIds,
        command.hotelId])].sort();
    } else {
      next.guestPublishedProposalId = proposal.id;
    }
  }
  next.revision++;
  if (!Number.isSafeInteger(next.revision)) {
    throw new Error("Revision exhausted.");
  }
  return {workflow: next, receipt: {operationId: command.operationId,
    requestHash, actorUid: authority.uid, resultingRevision: next.revision},
  replayed: false};
}

function proposalHotels(snapshot: LodgingSnapshot,
  proposal: LodgingProposal): Set<string> {
  return new Set(proposal.placements.map((row) => {
    const unit = snapshot.inventory.find((i) => i.id === row.inventoryId)!;
    return inventoryFacts(snapshot, unit).hotelId;
  }));
}

/** Names a hotel desk reads beside the allocation: each guest's display
 * name and each unit's room label (null until exact rooms are released). */
export interface LodgingDeskLabels {
  guests: Readonly<Record<string, string>>;
  rooms: Readonly<Record<string, string | null>>;
}

/** Exact allowlisted operational projection. No affinity memberships,
 * accessibility requirements, private notes, contact fields or group labels
 * are exposed: only room facts, the room label, and each guest's name and
 * dates. */
export function lodgingHotelProjection(snapshot: LodgingSnapshot,
  proposal: LodgingProposal, authority: LodgingAuthority,
  hotelId: string, nowMillis: number, labels: LodgingDeskLabels) {
  requireAuthority(snapshot, authority, nowMillis, hotelId);
  if (proposal.scope.organizerId !== snapshot.scope.organizerId ||
      proposal.scope.programId !== snapshot.scope.programId) {
    throw new Error("Foreign proposal.");
  }
  assertLodgingProposalCurrent(proposal, snapshot.revisions);
  if (validateLodgingPlacements(snapshot, proposal.placements).length) {
    throw new Error("Invalid proposal.");
  }
  return proposal.placements.flatMap((row) => {
    const unit = snapshot.inventory.find((i) => i.id === row.inventoryId)!;
    const room = inventoryFacts(snapshot, unit);
    if (room.hotelId !== hotelId) return [];
    const party = snapshot.parties.find((p) => p.id === row.partyId)!;
    return [{partyId: party.id, inventoryId: unit.id,
      physicalRoomId: unit.physicalRoomId, zoneId: room.zoneId,
      roomType: room.roomType, roomLabel: labels.rooms[unit.id] ?? null,
      guests: party.guestIds.map((id) => {
        const guest = snapshot.guests.find((g) => g.id === id)!;
        const displayName = labels.guests[id];
        if (typeof displayName !== "string" || !displayName) {
          throw new Error("Missing guest name.");
        }
        return {guestId: id, displayName, arrival: guest.arrival,
          departure: guest.departure};
      })}];
  });
}
