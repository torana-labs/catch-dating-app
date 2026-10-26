import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall, onRequest} from
  "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import {requireAuth} from "../shared/auth";
import {
  appCheckCallableOptionsWithSecrets,
} from "../shared/callableOptions";
import {checkIpRateLimit, checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {
  dutyAssignments,
  nextRevision,
  requireProgramAccess,
  requireProgramMutable,
  type ProgramAccess,
} from "../shared/programAuthority";
import {staffTimestampMillis} from "../shared/eventOperatorAuthority";
import type {
  OrganizerProgramDocument,
  ProgramFunctionDocument,
  ProgramFunctionGuestDocument,
  ProgramGuestDocument,
  ProgramHouseholdDocument,
  ProgramTravelLegDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {IssueProgramHouseholdRsvpLinkCallablePayload} from
  "../shared/generated/issueProgramHouseholdRsvpLinkCallablePayload";
import type {GetProgramHouseholdRsvpViewCallablePayload} from
  "../shared/generated/getProgramHouseholdRsvpViewCallablePayload";
import type {SubmitProgramHouseholdRsvpCallablePayload} from
  "../shared/generated/submitProgramHouseholdRsvpCallablePayload";
import type {ProgramHouseholdRsvpLinkCallableResponse} from
  "../shared/generated/programHouseholdRsvpLinkCallableResponse";
import type {ProgramHouseholdRsvpViewCallableResponse} from
  "../shared/generated/programHouseholdRsvpViewCallableResponse";
import type {SubmitProgramHouseholdRsvpCallableResponse} from
  "../shared/generated/submitProgramHouseholdRsvpCallableResponse";
import {
  validateIssueProgramHouseholdRsvpLinkCallablePayload,
} from
  "../shared/generated/validators/issueProgramHouseholdRsvpLinkInput";
import {
  validateGetProgramHouseholdRsvpViewCallablePayload,
} from
  "../shared/generated/validators/getProgramHouseholdRsvpViewInput";
import {
  validateSubmitProgramHouseholdRsvpCallablePayload,
} from
  "../shared/generated/validators/submitProgramHouseholdRsvpInput";
import {buildConversionPlan} from "./conversionPlan";
import {
  resolveEffectiveInviteSet,
  type FunctionGuestRowLike,
  type FunctionLike,
  type ProgramGuestLike,
} from "./functionInvitation";
import {
  mintHouseholdToken,
  verifyHouseholdToken,
} from "./rsvpLinkTokens";
import {functionCountPatch} from "./rsvpRollup";
import {buildIcsFeed} from "../programSchedule/icsFeed";
import {
  buildRsvpTravelLegDoc,
  dedupeTravelBlocks,
  rsvpTravelBlockRejection,
  rsvpTravelLegId,
  type RsvpTravelBlockInput,
} from "./rsvpTravelBlocks";
import {reconcileTravelLegState} from "../transport/travelLegState";
import {requireMutableTravelLeg} from "../transport/travelPartyPolicy";

export const householdRsvpSecret =
  defineSecret("PROGRAM_HOUSEHOLD_RSVP_SECRET");

interface HouseholdRsvpDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
  householdTokenSecret: () => string;
}

const defaultDeps: HouseholdRsvpDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
  householdTokenSecret: () => householdRsvpSecret.value(),
};

const rsvpCallableLimits = {timeoutSeconds: 60, maxInstances: 20};

const joinKey = (functionId: string, guestId: string) =>
  `${functionId}_${guestId}`;

const millis = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const ts = value as FirebaseFirestore.Timestamp;
  return typeof ts.toMillis === "function" ? ts.toMillis() : null;
};

const functionLike = (doc: ProgramFunctionDocument,
  id: string): FunctionLike => ({
  functionId: id,
  invitationMode: doc.invitationMode ?? "allGuests",
  status: doc.status,
  expectedCount: doc.expectedCount ?? null,
  checkedInCount: doc.checkedInCount ?? null,
});

const guestLike = (doc: ProgramGuestDocument,
  id: string): ProgramGuestLike => ({
  guestId: id,
  invitationStatus: doc.invitationStatus,
  rsvpStatus: doc.rsvpStatus,
});

const rowLike = (doc: ProgramFunctionGuestDocument): FunctionGuestRowLike => ({
  functionId: doc.functionId,
  guestId: doc.guestId,
  invited: doc.invited,
  rsvpStatus: doc.rsvpStatus,
  attendanceStatus: doc.attendanceStatus,
  partySize: doc.partySize ?? null,
  responseNote: doc.responseNote ?? null,
  respondedAt: millis(doc.respondedAt),
});

function requireAnyDuty(access: ProgramAccess,
  duties: Parameters<typeof dutyAssignments>[1][]): void {
  if (access.role === "manager") return;
  const covering = duties.flatMap((duty) => dutyAssignments(access, duty));
  if (covering.length === 0) {
    throw new HttpsError("permission-denied",
      `This account lacks any of ${duties.join(", ")} for this program.`);
  }
}

function verifyTokenOrThrow(
  token: string,
  deps: HouseholdRsvpDeps,
): {programId: string; householdId: string} {
  const result = verifyHouseholdToken(
    token, deps.householdTokenSecret(), deps.now().toMillis());
  if (!result.ok) {
    throw new HttpsError(
      "unauthenticated", "This RSVP link is invalid or has expired.");
  }
  return {
    programId: result.payload.programId,
    householdId: result.payload.householdId,
  };
}

export async function issueProgramHouseholdRsvpLinkHandler(
  request: CallableRequest<unknown>,
  deps: HouseholdRsvpDeps = defaultDeps
): Promise<ProgramHouseholdRsvpLinkCallableResponse> {
  const actorUid = requireAuth(request);
  const data =
    validateCallableWithAjv<IssueProgramHouseholdRsvpLinkCallablePayload>(
      request, validateIssueProgramHouseholdRsvpLinkCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "issueProgramHouseholdRsvpLink", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const access = await requireProgramAccess({
    db, programId: data.programId, actorUid, now: deps.now(),
  });
  requireProgramMutable(access.program);
  requireAnyDuty(access, ["guestRelations", "communications"]);
  const householdSnap = await db.collection("programHouseholds")
    .doc(data.householdId).get();
  if (!householdSnap.exists ||
      (householdSnap.data() as ProgramHouseholdDocument).programId !==
        data.programId) {
    throw new HttpsError("not-found", "Household not found in this program.");
  }
  const expiresAtMillis = data.expiresAtMillis ??
    staffTimestampMillis(access.program.endsAt);
  const token = mintHouseholdToken({
    programId: data.programId,
    householdId: data.householdId,
    expiresAtMillis,
  }, deps.householdTokenSecret());
  return {
    entityId: data.householdId,
    token,
    expiresAtMillis,
    alreadyApplied: false,
  };
}

async function loadHouseholdBundle(
  db: FirebaseFirestore.Firestore,
  programId: string,
  householdId: string,
  tx?: FirebaseFirestore.Transaction,
) {
  const read = <T extends FirebaseFirestore.DocumentData>(
    ref: FirebaseFirestore.DocumentReference<T>) =>
      tx ? tx.get(ref) : ref.get();
  const programSnap = await read(
    db.collection("organizerPrograms").doc(programId));
  if (!programSnap.exists) {
    throw new HttpsError("not-found", "Program not found.");
  }
  const program = programSnap.data() as OrganizerProgramDocument;
  const householdSnap = await read(
    db.collection("programHouseholds").doc(householdId));
  if (!householdSnap.exists ||
      (householdSnap.data() as ProgramHouseholdDocument).programId !==
        programId) {
    throw new HttpsError("not-found", "Household not found in this program.");
  }
  const household = householdSnap.data() as ProgramHouseholdDocument;
  const memberIds = household.memberGuestIds;
  const [functionSnap, guestSnaps, rowSnaps] = await Promise.all([
    tx ? tx.get(db.collection("programFunctions")
      .where("programId", "==", programId)) :
      db.collection("programFunctions")
        .where("programId", "==", programId).get(),
    Promise.all(memberIds.map((id) =>
      read(db.collection("programGuests").doc(id)))),
    tx ? tx.get(db.collection("programFunctionGuests")
      .where("programId", "==", programId)) :
      db.collection("programFunctionGuests")
        .where("programId", "==", programId).get(),
  ]);
  const guests = new Map<string, ProgramGuestDocument>();
  for (const snap of guestSnaps) {
    if (snap.exists) {
      guests.set(snap.id,
      snap.data() as ProgramGuestDocument);
    }
  }
  const rowsByGuest = new Map<string, FunctionGuestRowLike[]>();
  const rowMeta = new Map<string,
    {revision: number; createdAt: FirebaseFirestore.Timestamp}>();
  for (const doc of rowSnaps.docs) {
    const data = doc.data() as ProgramFunctionGuestDocument;
    const row = rowLike(data);
    const list = rowsByGuest.get(row.guestId) ?? [];
    list.push(row);
    rowsByGuest.set(row.guestId, list);
    rowMeta.set(doc.id, {
      revision: data.revision, createdAt: data.createdAt});
  }
  const functions = new Map<string, ProgramFunctionDocument>();
  for (const doc of functionSnap.docs) {
    functions.set(doc.id, doc.data() as ProgramFunctionDocument);
  }
  return {program, household, guests, rowsByGuest, rowMeta, functions};
}

export async function getProgramHouseholdRsvpViewHandler(
  request: CallableRequest<unknown>,
  deps: HouseholdRsvpDeps = defaultDeps
): Promise<ProgramHouseholdRsvpViewCallableResponse> {
  const data =
    validateCallableWithAjv<GetProgramHouseholdRsvpViewCallablePayload>(
      request, validateGetProgramHouseholdRsvpViewCallablePayload);
  const identity = verifyTokenOrThrow(data.token, deps);
  const db = deps.firestore();
  await deps.checkRateLimit(db, `household:${identity.householdId}`,
    "getProgramHouseholdRsvpView",
    {maxRequests: 120, windowMs: 60 * 1000});
  const bundle = await loadHouseholdBundle(
    db, identity.programId, identity.householdId);
  const {household, guests, rowsByGuest, functions} = bundle;
  const liveFunctions = [...functions.entries()]
    .filter(([, fn]) => fn.status !== "cancelled")
    .sort((a, b) => staffTimestampMillis(a[1].startsAt) -
      staffTimestampMillis(b[1].startsAt) || a[0].localeCompare(b[0]));
  // Travel echo: only household-submitted legs at their deterministic
  // ids are visible to the token — planner legs stay server-side.
  const legKinds = ["inbound", "outbound", "ground"] as const;
  const legRefs = household.memberGuestIds.flatMap((guestId) =>
    legKinds.map((kind) => db.collection("programTravelLegs")
      .doc(rsvpTravelLegId(identity.householdId, guestId, kind))));
  const [hotelSnap, legSnaps] = await Promise.all([
    db.collection("programHotels")
      .where("programId", "==", identity.programId).limit(50).get(),
    Promise.all(legRefs.map((ref) => ref.get())),
  ]);
  type MemberTravel =
    ProgramHouseholdRsvpViewCallableResponse["members"][number][
      "travel"][number];
  const travelByGuest = new Map<string, MemberTravel[]>();
  for (const snap of legSnaps) {
    if (!snap.exists) continue;
    const leg = snap.data() as ProgramTravelLegDocument;
    if (leg.programId !== identity.programId ||
        leg.organizerId !== household.organizerId ||
        leg.source !== "formResponse") continue;
    const list = travelByGuest.get(leg.guestId) ?? [];
    list.push({
      kind: leg.kind,
      flightNumber: leg.flightNumber,
      carrierCode: leg.carrierCode,
      originIata: leg.originIata,
      destinationIata: leg.destinationIata,
      scheduledArrivalAtMillis: leg.scheduledArrivalAt?.toMillis() ?? null,
      destinationHotelId: leg.destinationHotelId,
      destinationLabel: leg.destinationLabel,
      passengers: leg.passengers,
      luggageUnits: leg.luggageUnits,
    });
    travelByGuest.set(leg.guestId, list);
  }
  const hotels = hotelSnap.docs
    .map((doc) => ({
      hotelId: doc.id,
      name: (doc.data() as {name?: unknown}).name,
    }))
    .filter((hotel): hotel is {hotelId: string; name: string} =>
      typeof hotel.name === "string" && hotel.name !== "")
    .sort((a, b) => a.name.localeCompare(b.name));
  type MemberFunction =
    ProgramHouseholdRsvpViewCallableResponse["members"][number][
      "functions"][number];
  const members: ProgramHouseholdRsvpViewCallableResponse["members"] = [];
  for (const guestId of household.memberGuestIds) {
    const guest = guests.get(guestId);
    if (!guest) continue;
    const memberRows = rowsByGuest.get(guestId) ?? [];
    const memberFunctions: MemberFunction[] = [];
    for (const [functionId, fn] of liveFunctions) {
      const invited = resolveEffectiveInviteSet(
        functionLike(fn, functionId), [guestLike(guest, guestId)],
        memberRows).has(guestId);
      if (!invited) continue;
      const row = memberRows.find(
        (entry) => entry.functionId === functionId);
      memberFunctions.push({
        functionId,
        name: fn.name,
        startsAtMillis: staffTimestampMillis(fn.startsAt),
        endsAtMillis: staffTimestampMillis(fn.endsAt),
        venueName: fn.venueName ?? null,
        dressCode: fn.dressCode ?? null,
        instructions: fn.instructions ?? null,
        rsvpStatus: row?.rsvpStatus ?? "pending",
        partySize: row?.partySize ?? null,
        responseNote: row?.responseNote ?? null,
      });
    }
    members.push({
      guestId,
      displayName: guest.displayName,
      functions: memberFunctions,
      travel: travelByGuest.get(guestId) ?? [],
    });
  }
  return {
    programId: identity.programId,
    programTitle: bundle.program.title,
    timezone: bundle.program.timezone,
    householdId: identity.householdId,
    householdLabel: household.label,
    messagingConsentGranted: household.messagingConsent?.granted === true,
    members,
    hotels,
  };
}

export async function submitProgramHouseholdRsvpHandler(
  request: CallableRequest<unknown>,
  deps: HouseholdRsvpDeps = defaultDeps
): Promise<SubmitProgramHouseholdRsvpCallableResponse> {
  const data =
    validateCallableWithAjv<SubmitProgramHouseholdRsvpCallablePayload>(
      request, validateSubmitProgramHouseholdRsvpCallablePayload);
  const identity = verifyTokenOrThrow(data.token, deps);
  const db = deps.firestore();
  await deps.checkRateLimit(db, `household:${identity.householdId}`,
    "submitProgramHouseholdRsvp",
    {maxRequests: 60, windowMs: 60 * 1000});
  const householdRef = db.collection("programHouseholds")
    .doc(identity.householdId);
  // Generated response type gains travelLegAppliedCount on regen.
  let result: (SubmitProgramHouseholdRsvpCallableResponse &
    {travelLegAppliedCount: number}) | null = null;
  await db.runTransaction(async (tx) => {
    const bundle = await loadHouseholdBundle(
      db, identity.programId, identity.householdId, tx);
    requireProgramMutable(bundle.program);
    const {household, guests, rowsByGuest, functions} = bundle;
    const now = deps.now();
    const memberIds = new Set(household.memberGuestIds);
    const liveFunctions = new Map<string, FunctionLike>();
    for (const [id, doc] of functions) {
      liveFunctions.set(id, functionLike(doc, id));
    }
    // Last response wins per (guest, function) pair inside one submit.
    const responses = new Map<string,
      SubmitProgramHouseholdRsvpCallablePayload["responses"][number]>();
    for (const response of data.responses) {
      responses.set(joinKey(response.functionId, response.guestId),
        response);
    }
    const rowsByFunction = new Map<string, FunctionGuestRowLike[]>();
    const rowWrites: {ref: FirebaseFirestore.DocumentReference;
      doc: ProgramFunctionGuestDocument}[] = [];
    const guestRollups = new Map<string, string>();
    for (const response of responses.values()) {
      if (!memberIds.has(response.guestId)) {
        throw new HttpsError("permission-denied",
          "Responses are limited to this household's members.");
      }
      const guest = guests.get(response.guestId);
      if (!guest) {
        throw new HttpsError("not-found",
          "Guest not found in this household.");
      }
      const memberRows = rowsByGuest.get(response.guestId) ?? [];
      const fn = functions.get(response.functionId);
      if (!fn || fn.status === "cancelled") {
        throw new HttpsError("failed-precondition",
          "This function is not open for responses.");
      }
      const invited = resolveEffectiveInviteSet(
        functionLike(fn, response.functionId),
        [guestLike(guest, response.guestId)], memberRows)
        .has(response.guestId);
      if (!invited) {
        throw new HttpsError("permission-denied",
          "This guest is not invited to that function.");
      }
      const plan = buildConversionPlan({
        guestId: response.guestId,
        functionId: response.functionId,
        rsvpStatus: response.rsvpStatus,
        partySize: response.partySize,
        responseNote: response.responseNote,
        respondedAt: now.toMillis(),
      }, {
        functions: liveFunctions,
        rows: memberRows,
        guests: [guestLike(guest, response.guestId)],
      });
      if (plan.rejected) {
        throw new HttpsError("failed-precondition",
          `RSVP rejected: ${plan.rejected.reason}.`);
      }
      const upsert = plan.functionGuestUpserts[0];
      const prior = bundle.rowMeta.get(upsert.joinKey);
      const document: ProgramFunctionGuestDocument = {
        programId: identity.programId,
        organizerId: household.organizerId,
        functionId: upsert.fields.functionId,
        guestId: upsert.fields.guestId,
        invited: upsert.fields.invited,
        rsvpStatus: upsert.fields.rsvpStatus,
        attendanceStatus: upsert.fields.attendanceStatus,
        partySize: upsert.fields.partySize,
        responseNote: upsert.fields.responseNote,
        respondedAt: admin.firestore.Timestamp.fromMillis(
          upsert.fields.respondedAt),
        responseSource: "householdLink",
        recordedByUid: null,
        createdAt: prior?.createdAt ?? now,
        updatedAt: now,
        revision: nextRevision(prior?.revision ?? 0, now),
      };
      rowWrites.push({
        ref: db.collection("programFunctionGuests").doc(upsert.joinKey),
        doc: document,
      });
      const nextRow = rowLike(document);
      rowsByGuest.set(response.guestId, [
        ...memberRows.filter(
          (row) => row.functionId !== response.functionId),
        nextRow,
      ]);
      const fnRows = rowsByFunction.get(response.functionId) ??
        Array.from(rowsByGuest.values()).flat()
          .filter((row) => row.functionId === response.functionId);
      rowsByFunction.set(response.functionId, [
        ...fnRows.filter((row) => row.guestId !== response.guestId),
        nextRow,
      ]);
      guestRollups.set(response.guestId, plan.guestRollup.rsvpStatus);
    }
    // Household-submitted travel: one deterministic leg per (guest, kind),
    // so resubmits update in place and replays stay idempotent. Every leg
    // read must happen before the write phase below.
    const travelBlocks = dedupeTravelBlocks(
      (data as {travel?: RsvpTravelBlockInput[] | null}).travel);
    const legWrites: {ref: FirebaseFirestore.DocumentReference;
      doc: ProgramTravelLegDocument}[] = [];
    if (travelBlocks.size > 0) {
      const hotelIds = new Set<string>();
      const pickupPointIds = new Set<string>();
      for (const block of travelBlocks.values()) {
        if (!memberIds.has(block.guestId)) {
          throw new HttpsError("permission-denied",
            "Travel blocks are limited to this household's members.");
        }
        if (!guests.has(block.guestId)) {
          throw new HttpsError("not-found",
            "Guest not found in this household.");
        }
        const reason = rsvpTravelBlockRejection(block);
        if (reason === "missingDestination") {
          throw new HttpsError("invalid-argument",
            "A travel block needs a hotel destination or a destination " +
            "label.");
        }
        if (reason === "arrivalRequired") {
          throw new HttpsError("invalid-argument",
            "A travel block needs a scheduled arrival time.");
        }
        if (block.destinationHotelId) hotelIds.add(block.destinationHotelId);
        if (block.pickupPointId) pickupPointIds.add(block.pickupPointId);
      }
      const refSnaps = await Promise.all([
        ...[...hotelIds].map((id) =>
          tx.get(db.collection("programHotels").doc(id))),
        ...[...pickupPointIds].map((id) =>
          tx.get(db.collection("programPickupPoints").doc(id))),
      ]);
      for (const snap of refSnaps) {
        const doc = snap.data() as {programId?: string} | undefined;
        if (!snap.exists || doc?.programId !== identity.programId) {
          throw new HttpsError("invalid-argument",
            "A travel block references a place outside this program.");
        }
      }
      const blockList = [...travelBlocks.values()];
      const legSnaps = await Promise.all(blockList
        .map((block) => tx.get(db.collection("programTravelLegs")
          .doc(rsvpTravelLegId(
            identity.householdId, block.guestId, block.kind)))));
      legSnaps.forEach((snap, index) => {
        const block = blockList[index];
        const existing = snap.data() as ProgramTravelLegDocument | undefined;
        if (existing &&
            (existing.programId !== identity.programId ||
              existing.organizerId !== household.organizerId)) {
          throw new HttpsError("failed-precondition",
            "This journey does not belong to this program.");
        }
        if (existing) requireMutableTravelLeg(existing);
        const document = buildRsvpTravelLegDoc(block, {
          programId: identity.programId,
          organizerId: household.organizerId,
          householdId: identity.householdId,
          now,
        }, existing);
        legWrites.push({
          ref: snap.ref,
          doc: reconcileTravelLegState(existing, document, now.toDate()),
        });
      });
    }
    // All reads are done; now apply the writes.
    for (const write of rowWrites) tx.set(write.ref, write.doc);
    for (const write of legWrites) tx.set(write.ref, write.doc);
    for (const [functionId, fnRows] of rowsByFunction) {
      const fn = functions.get(functionId)!;
      const patch = functionCountPatch(
        functionLike(fn, functionId), fnRows);
      if (patch !== null) {
        tx.update(db.collection("programFunctions").doc(functionId), {
          ...patch, updatedAt: now,
          revision: nextRevision(fn.revision, now),
        });
      }
    }
    for (const [guestId, rollup] of guestRollups) {
      const guest = guests.get(guestId)!;
      if (rollup !== guest.rsvpStatus ||
          guest.invitationStatus !== "responded") {
        tx.update(db.collection("programGuests").doc(guestId), {
          rsvpStatus: rollup,
          invitationStatus: "responded",
          updatedAt: now,
          revision: nextRevision(guest.revision, now),
        });
      }
    }
    const revision = nextRevision(household.revision, now);
    tx.update(householdRef, {
      messagingConsent: {
        granted: data.messagingConsent === true,
        grantedAt: now,
        source: "householdRsvpLink",
      },
      updatedAt: now,
      revision,
    });
    result = {
      entityId: identity.householdId,
      revision,
      appliedCount: rowWrites.length,
      travelLegAppliedCount: legWrites.length,
      messagingConsentGranted: data.messagingConsent === true,
      alreadyApplied: false,
    };
  });
  return result!;
}

export const issueProgramHouseholdRsvpLink = onCall(
  appCheckCallableOptionsWithSecrets([householdRsvpSecret],
    rsvpCallableLimits),
  (request) => issueProgramHouseholdRsvpLinkHandler(request)
);
export const getProgramHouseholdRsvpView = onCall(
  appCheckCallableOptionsWithSecrets([householdRsvpSecret],
    rsvpCallableLimits),
  (request) => getProgramHouseholdRsvpViewHandler(request)
);
export const submitProgramHouseholdRsvp = onCall(
  appCheckCallableOptionsWithSecrets([householdRsvpSecret],
    rsvpCallableLimits),
  (request) => submitProgramHouseholdRsvpHandler(request)
);

export type HouseholdBundle = Awaited<ReturnType<typeof loadHouseholdBundle>>;

function invitedFunctionIds(bundle: HouseholdBundle): Set<string> {
  const invited = new Set<string>();
  for (const guestId of bundle.household.memberGuestIds) {
    const guest = bundle.guests.get(guestId);
    if (!guest) continue;
    const memberRows = bundle.rowsByGuest.get(guestId) ?? [];
    for (const [functionId, fn] of bundle.functions) {
      if (fn.status === "cancelled") continue;
      if (resolveEffectiveInviteSet(
        functionLike(fn, functionId),
        [guestLike(guest, guestId)],
        memberRows).has(guestId)) {
        invited.add(functionId);
      }
    }
  }
  return invited;
}

export function householdIcsFeed(
  bundle: HouseholdBundle,
  generatedAtMillis: number,
): string {
  const invited = invitedFunctionIds(bundle);
  return buildIcsFeed({
    programTitle: bundle.program.title,
    generatedAtMillis,
    functions: [...bundle.functions.entries()]
      .filter(([functionId, fn]) =>
        invited.has(functionId) && fn.status !== "cancelled")
      .map(([functionId, fn]) => ({
        functionId,
        name: fn.name,
        startsAt: staffTimestampMillis(fn.startsAt),
        endsAt: staffTimestampMillis(fn.endsAt),
        status: fn.status,
        revision: fn.revision,
        venueName: fn.venueName ?? null,
        venueNotes: [
          fn.venueLocation?.name,
          fn.venueLocation?.address,
          fn.venueLocation?.notes,
        ]
          .filter((value): value is string =>
            typeof value === "string" && value !== "")
          .join(", ") || null,
      })),
  });
}

interface IcsRequestLike {
  method: string;
  query: Record<string, unknown>;
  get: (name: string) => string | undefined;
  ip?: string;
}

interface IcsResponseLike {
  status: (code: number) => IcsResponseLike;
  set: (headers: Record<string, string>) => IcsResponseLike;
  send: (body: string) => unknown;
}

function sendIcsError(
  response: IcsResponseLike,
  code: number,
  message: string,
): void {
  response
    .status(code)
    .set({"Content-Type": "application/json; charset=utf-8"})
    .send(JSON.stringify({error: message}));
}

export async function programHouseholdItineraryIcsHandler(
  request: IcsRequestLike,
  response: IcsResponseLike,
  deps: HouseholdRsvpDeps = defaultDeps,
): Promise<void> {
  if (request.method !== "GET") {
    sendIcsError(response, 405, "Method not allowed.");
    return;
  }
  const clientIp = request.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.ip ?? "unknown";
  if (!checkIpRateLimit(clientIp)) {
    sendIcsError(response, 429, "Too many requests. Please try again later.");
    return;
  }
  const tokenParam = request.query["token"];
  const token = typeof tokenParam === "string" ? tokenParam : null;
  if (!token) {
    sendIcsError(response, 400, "An RSVP link token is required.");
    return;
  }
  let identity: {programId: string; householdId: string};
  try {
    identity = verifyTokenOrThrow(token, deps);
  } catch {
    sendIcsError(response, 401, "This RSVP link is invalid or has expired.");
    return;
  }
  const db = deps.firestore();
  let bundle: HouseholdBundle;
  try {
    bundle = await loadHouseholdBundle(
      db, identity.programId, identity.householdId);
  } catch {
    sendIcsError(response, 404, "This RSVP link is no longer valid.");
    return;
  }
  const feed = householdIcsFeed(bundle, deps.now().toMillis());
  response
    .status(200)
    .set({
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Disposition":
        "inline; filename=\"itinerary.ics\"",
    })
    .send(feed);
}

export const programHouseholdItineraryIcs = onRequest(
  {
    region: "asia-south1",
    timeoutSeconds: 60,
    maxInstances: 20,
    secrets: [householdRsvpSecret],
  },
  (request, response) =>
    programHouseholdItineraryIcsHandler(
      request as unknown as IcsRequestLike,
      response as unknown as IcsResponseLike)
);
