import {createHash} from "crypto";
import {HttpsError} from "firebase-functions/v2/https";
import {seatIdentityAliasId, seatIdentityValueHash} from
  "../events/seatIdentityAuthority";

type AliasKind = "contact" | "contactOrigin";
export interface AliasCore {
  canonicalKey: string;
  identityRevision: number;
  migrationRevision: number;
  state: "ready";
}
export interface SeatMove {
  eventId: string;
  aliasId: string;
  kind: AliasKind;
  valueHash: string;
  before: AliasCore | null;
  after: AliasCore;
}
interface ReservationCore {
  canonicalKey: string;
  identityRevision: number;
  revision: number;
  active: boolean;
}
export interface SeatEventGuard {
  eventId: string;
  ledgerRevision: number;
  migrationRevision: number;
  sourceAlias: AliasCore | null;
  survivorAlias: AliasCore | null;
  sourceReservation: ReservationCore | null;
  survivorReservation: ReservationCore | null;
  aliasIdsBefore: string[];
}
export interface SeatAdmissionGuard {
  eventId: string;
  responseId: string;
  ownershipId: string;
  receiptId: string | null;
}
export interface MergeSeatEvidence {
  seatMoves: SeatMove[];
  seatEventGuards: SeatEventGuard[];
  seatAdmissionGuards: SeatAdmissionGuard[];
  survivorOriginIdsBefore: string[];
  sourceOriginAliasIdsBefore: string[];
}
export interface MergeOrigin {
  id: string;
  currentContactId: string;
  originContactId: string;
  sourceKind: string;
  sourceEntityKind: string;
  responseId: string | null;
  eventId: string | null;
  organizerId: string;
}
interface AliasRow extends AliasCore {
  eventId: string;
  organizerId: string;
  kind: string;
  valueHash: string;
}

/** Leave room for Firestore names, timestamps and document framing. */
export function assertContactMergeReceiptBudget(receipt: unknown,
  movedFacts: number, seatWrites: number): void {
  const encoded = JSON.stringify(receipt);
  if (!encoded || Buffer.byteLength(encoded, "utf8") > 800_000 ||
      movedFacts + seatWrites + 3 > 400) {
    throw new HttpsError("resource-exhausted",
      "Contact merge exceeds the atomic Firestore document budget.");
  }
}

const maxAliases = 200;
const maxEvents = 100;
const hash = (...parts: string[]) => createHash("sha256")
  .update(parts.join("\u001f")).digest("hex");
const fail = (message: string): never => {
  throw new HttpsError("failed-precondition", message);
};
const stale = (message: string): never => {
  throw new HttpsError("aborted", message);
};
const positive = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) > 0;
const aliasCore = (value: AliasRow): AliasCore => ({
  canonicalKey: value.canonicalKey,
  identityRevision: value.identityRevision,
  migrationRevision: value.migrationRevision, state: "ready",
});
const same = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
const reservationId = (eventId: string, key: string) => hash(eventId, key);
const ownershipId = (organizerId: string, eventId: string,
  responseId: string) => hash(organizerId, eventId, responseId);
const unique = (values: string[]) => [...new Set(values)].sort();

async function aliasesForHashes(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, hashes: string[]): Promise<
  FirebaseFirestore.QueryDocumentSnapshot[]> {
  const docs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  for (let at = 0; at < hashes.length; at += 30) {
    const page = await tx.get(db.collection("eventSeatIdentityAliases")
      .where("valueHash", "in", hashes.slice(at, at + 30))
      .limit(maxAliases + 1));
    docs.push(...page.docs);
    if (docs.length > maxAliases) {
      throw new HttpsError("resource-exhausted",
        "Too many seat aliases for an atomic contact merge.");
    }
  }
  return docs;
}
async function aliasesForKey(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, key: string): Promise<
  FirebaseFirestore.QueryDocumentSnapshot[]> {
  const snap = await tx.get(db.collection("eventSeatIdentityAliases")
    .where("canonicalKey", "==", key).limit(maxAliases + 1));
  if (snap.docs.length > maxAliases) {
    throw new HttpsError("resource-exhausted",
      "Too many seat aliases for an atomic contact merge.");
  }
  return snap.docs;
}
function requireAlias(doc: FirebaseFirestore.QueryDocumentSnapshot,
  organizerId: string, values: Map<string, {kind: AliasKind;
    value: string}>): AliasRow | null {
  const raw = doc.data() as AliasRow;
  if (raw.organizerId !== organizerId) return null;
  const expected = values.get(raw.valueHash);
  if (!expected || raw.kind !== expected.kind ||
      doc.id !== seatIdentityAliasId(raw.eventId, expected.kind,
        expected.value) || raw.state !== "ready" ||
      !positive(raw.identityRevision) ||
      !positive(raw.migrationRevision) ||
      typeof raw.canonicalKey !== "string" || !raw.canonicalKey) {
    fail("Seat alias provenance is ambiguous.");
  }
  return raw;
}
function reservationCore(value: FirebaseFirestore.DocumentData | undefined,
  eventId: string, key: string, revision: number):
  ReservationCore | null {
  if (!value) return null;
  if (value.checkoutHold !== undefined || value.temporaryHold !== undefined) {
    fail("A checkout hold must finish before merging or unmerging contacts.");
  }
  if (value.eventId !== eventId || value.canonicalKey !== key ||
      value.identityRevision !== revision || !positive(value.revision) ||
      typeof value.active !== "boolean") {
    fail("Seat reservation is inconsistent with contact identity.");
  }
  return {canonicalKey: key, identityRevision: revision,
    revision: value.revision, active: value.active};
}
/** The event's ready ledger. Every alias the merge moves was already checked
 * against the merging organizer. */
function requireLedger(ledger: FirebaseFirestore.DocumentData | undefined,
  eventId: string): {revision: number; migrationRevision: number} {
  if (!ledger || ledger.eventId !== eventId || ledger.state !== "ready" ||
      !positive(ledger.revision) || !positive(ledger.migrationRevision)) {
    fail("Event seats are not available for contact merge.");
  }
  return {revision: ledger!.revision as number,
    migrationRevision: ledger!.migrationRevision as number};
}

/** Reads every affected seat fact before any merge write is staged. */
export async function prepareContactMergeSeats(params: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  organizerId: string;
  sourceContactId: string;
  survivorContactId: string;
  sourceLinkedUid: string | null;
  survivorLinkedUid: string | null;
  sourceOrigins: MergeOrigin[];
  survivorOrigins: MergeOrigin[];
}): Promise<{evidence: MergeSeatEvidence; apply: () => void}> {
  const {db, tx, organizerId, sourceContactId, survivorContactId,
    sourceOrigins, survivorOrigins} = params;
  if (params.sourceLinkedUid && params.survivorLinkedUid &&
      params.sourceLinkedUid !== params.survivorLinkedUid) {
    fail("Distinct verified accounts cannot share a seat identity.");
  }
  const values = new Map<string, {kind: AliasKind; value: string}>();
  for (const value of [sourceContactId, survivorContactId]) {
    values.set(seatIdentityValueHash("contact", value),
      {kind: "contact", value});
  }
  for (const origin of [...sourceOrigins, ...survivorOrigins]) {
    values.set(seatIdentityValueHash("contactOrigin", origin.id),
      {kind: "contactOrigin", value: origin.id});
  }
  const aliasDocs = await aliasesForHashes(db, tx, [...values.keys()]);
  const byEvent = new Map<string, Map<string, {doc:
    FirebaseFirestore.QueryDocumentSnapshot; value: AliasRow}>>();
  const originById = new Map([...sourceOrigins, ...survivorOrigins]
    .map((origin) => [origin.id, origin]));
  for (const doc of aliasDocs) {
    const value = requireAlias(doc, organizerId, values);
    if (!value) continue;
    const event = byEvent.get(value.eventId) ?? new Map();
    if (event.has(doc.id)) fail("Duplicate event seat alias.");
    event.set(doc.id, {doc, value});
    byEvent.set(value.eventId, event);
  }
  if (byEvent.size > maxEvents) {
    throw new HttpsError("resource-exhausted",
      "Too many event seats for an atomic contact merge.");
  }
  const evidence: MergeSeatEvidence = {seatMoves: [],
    seatEventGuards: [], seatAdmissionGuards: [],
    survivorOriginIdsBefore: unique(survivorOrigins.map((o) => o.id)),
    sourceOriginAliasIdsBefore: unique(aliasDocs.filter((doc) => {
      const row = doc.data() as AliasRow;
      return row.organizerId === organizerId &&
        sourceOrigins.some((o) => row.valueHash ===
          seatIdentityValueHash("contactOrigin", o.id));
    }).map((doc) => doc.id))};
  for (const [eventId, aliases] of byEvent) {
    const sourceId = seatIdentityAliasId(eventId, "contact", sourceContactId);
    const survivorId = seatIdentityAliasId(eventId, "contact",
      survivorContactId);
    const source = aliases.get(sourceId)?.value;
    const survivor = aliases.get(survivorId)?.value;
    if (!source && !survivor) fail("Orphan contact origin seat alias.");
    const ledgerSnap = await tx.get(db.collection("eventSeatLedgers")
      .doc(eventId));
    const ledger = requireLedger(ledgerSnap.data(), eventId);
    for (const {value} of aliases.values()) {
      if (value.migrationRevision !== ledger.migrationRevision ||
          (value.kind === "contactOrigin" &&
          !originById.has(values.get(value.valueHash)!.value))) {
        fail("Seat alias has stale migration or origin ownership.");
      }
    }
    if (source && survivor && source.canonicalKey === survivor.canonicalKey &&
        source.identityRevision !== survivor.identityRevision) {
      fail("Same-key contact aliases disagree on identity revision.");
    }
    const sourceReservation = source ? reservationCore((await tx.get(
      db.collection("eventSeatReservations").doc(reservationId(eventId,
        source.canonicalKey)))).data(), eventId, source.canonicalKey,
    source.identityRevision) : null;
    const survivorReservation = survivor ? reservationCore((await tx.get(
      db.collection("eventSeatReservations").doc(reservationId(eventId,
        survivor.canonicalKey)))).data(), eventId, survivor.canonicalKey,
    survivor.identityRevision) : null;
    if (source && survivor && source.canonicalKey !== survivor.canonicalKey &&
        sourceReservation?.active && survivorReservation?.active) {
      fail("Two occupied seats cannot be merged by a CRM confirmation.");
    }
    const target = sourceReservation?.active ? source! :
      survivor ?? source!;
    const losingContactId = target === source ? survivorContactId :
      sourceContactId;
    const losing = target === source ? survivor : source;
    const keyDocs = losing && losing.canonicalKey !== target.canonicalKey ?
      await aliasesForKey(db, tx, losing.canonicalKey) : [];
    const expectedLosing = new Set<string>();
    for (const [id, item] of aliases) {
      const identity = item.value;
      const expected = values.get(identity.valueHash)!;
      const belongs = expected.kind === "contact" ?
        expected.value === losingContactId :
        originById.get(expected.value)?.currentContactId === losingContactId;
      if (belongs && losing && identity.canonicalKey === losing.canonicalKey) {
        expectedLosing.add(id);
      }
      if (expected.kind === "contactOrigin") {
        const owner = originById.get(expected.value)!;
        const contact = aliases.get(seatIdentityAliasId(eventId, "contact",
          owner.currentContactId))?.value;
        if (!contact || identity.canonicalKey !== contact.canonicalKey ||
            identity.identityRevision !== contact.identityRevision) {
          fail("Contact origin and current contact seats disagree.");
        }
      }
    }
    for (const doc of keyDocs) {
      const row = doc.data() as AliasRow;
      if (row.eventId === eventId && row.organizerId === organizerId &&
          !expectedLosing.has(doc.id)) {
        fail("Seat has verified or operational aliases requiring review.");
      }
    }
    const targetKeyDocs = await aliasesForKey(db, tx,
      target.canonicalKey);
    for (const doc of targetKeyDocs) {
      const alias = doc.data() as AliasRow;
      if (alias.eventId !== eventId || alias.organizerId !== organizerId) {
        continue;
      }
      if (alias.state !== "ready" ||
          alias.migrationRevision !== ledger.migrationRevision ||
          alias.identityRevision !== target.identityRevision) {
        fail("Target seat alias authority is inconsistent.");
      }
    }
    const beforeIds = unique([...aliases.keys(),
      ...targetKeyDocs.filter((doc) =>
        (doc.data() as AliasRow).eventId === eventId &&
      (doc.data() as AliasRow).organizerId === organizerId)
        .map((doc) => doc.id), ...keyDocs.filter((doc) =>
        (doc.data() as AliasRow).eventId === eventId &&
      (doc.data() as AliasRow).organizerId === organizerId)
        .map((doc) => doc.id)]);
    evidence.seatEventGuards.push({eventId,
      ledgerRevision: ledger.revision,
      migrationRevision: ledger.migrationRevision,
      sourceAlias: source ? aliasCore(source) : null,
      survivorAlias: survivor ? aliasCore(survivor) : null,
      sourceReservation, survivorReservation,
      aliasIdsBefore: beforeIds});
    if (!survivor && source) {
      evidence.seatMoves.push({eventId, aliasId: survivorId,
        kind: "contact", valueHash: seatIdentityValueHash("contact",
          survivorContactId), before: null, after: aliasCore(source)});
    } else if (losing && losing.canonicalKey !== target.canonicalKey) {
      for (const id of expectedLosing) {
        const item = aliases.get(id)!;
        evidence.seatMoves.push({eventId, aliasId: id,
          kind: item.value.kind as AliasKind,
          valueHash: item.value.valueHash,
          before: aliasCore(item.value), after: aliasCore(target)});
      }
    }
    for (const [id, item] of aliases) {
      if (item.value.kind !== "contactOrigin") continue;
      const originId = values.get(item.value.valueHash)!.value;
      const origin = originById.get(originId)!;
      if (origin.currentContactId !== sourceContactId ||
          origin.sourceKind !== "hostForm" ||
          origin.sourceEntityKind !== "hostFormResponse" ||
          !origin.responseId) continue;
      const markerId = ownershipId(organizerId, eventId,
        origin.responseId);
      const marker = (await tx.get(db.collection("organizerFormAdmissions")
        .doc(markerId))).data();
      if (marker && (marker.organizerId !== organizerId ||
          marker.eventId !== eventId ||
          marker.responseId !== origin.responseId ||
          typeof marker.receiptId !== "string")) {
        fail("Form admission ownership is malformed.");
      }
      evidence.seatAdmissionGuards.push({eventId,
        responseId: origin.responseId, ownershipId: markerId,
        receiptId: marker?.receiptId ?? null});
      if (!id) fail("Malformed origin alias.");
    }
  }
  if (evidence.seatMoves.length > maxAliases ||
      evidence.seatAdmissionGuards.length > maxAliases) {
    throw new HttpsError("resource-exhausted",
      "Too many seat facts for an atomic contact merge.");
  }
  return {evidence, apply: () => {
    for (const move of evidence.seatMoves) {
      const ref = db.collection("eventSeatIdentityAliases").doc(move.aliasId);
      if (move.before === null) {
        tx.create(ref, {eventId: move.eventId, organizerId,
          kind: move.kind, valueHash: move.valueHash, ...move.after});
      } else {
        tx.update(ref, {canonicalKey: move.after.canonicalKey,
          identityRevision: move.after.identityRevision});
      }
    }
  }};
}

/** Reversal only restores the exact aliases recorded before the merge. */
export async function prepareContactUnmergeSeats(params: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  organizerId: string;
  sourceContactId: string;
  survivorContactId: string;
  movedOriginIds: string[];
  evidence: MergeSeatEvidence | null;
}): Promise<() => void> {
  const {db, tx, organizerId, sourceContactId, survivorContactId,
    movedOriginIds, evidence} = params;
  const survivorOrigins = await tx.get(db.collection("organizerContactOrigins")
    .where("currentContactId", "==", survivorContactId)
    .limit(401));
  if (survivorOrigins.docs.length > 400) fail("Too many current origins.");
  const currentIds = unique(survivorOrigins.docs.filter((doc) =>
    doc.data().organizerId === organizerId).map((doc) => doc.id));
  if (!evidence) {
    const hashes = [seatIdentityValueHash("contact", sourceContactId),
      seatIdentityValueHash("contact", survivorContactId),
      ...movedOriginIds.map((id) =>
        seatIdentityValueHash("contactOrigin", id))];
    const found = await aliasesForHashes(db, tx, hashes);
    if (found.some((doc) => doc.data().organizerId === organizerId)) {
      fail("Legacy merge lacks reversible seat evidence.");
    }
    return () => undefined;
  }
  const expectedIds = unique([...evidence.survivorOriginIdsBefore,
    ...movedOriginIds]);
  if (!same(currentIds, expectedIds)) {
    stale("Contact origins changed since merge.");
  }
  const contactValues = new Map<string, {kind: AliasKind; value: string}>(
    [sourceContactId, survivorContactId].map((value) => [
      seatIdentityValueHash("contact", value), {kind: "contact", value},
    ]));
  const contactAliases = await aliasesForHashes(db, tx,
    [...contactValues.keys()]);
  const currentContactEvents = unique(contactAliases.flatMap((doc) => {
    const alias = requireAlias(doc, organizerId, contactValues);
    return alias ? [alias.eventId] : [];
  }));
  if (!same(currentContactEvents,
    unique(evidence.seatEventGuards.map((guard) => guard.eventId)))) {
    stale("Contact seat event membership changed since merge.");
  }
  const hashes = movedOriginIds.map((id) =>
    seatIdentityValueHash("contactOrigin", id));
  const found = await aliasesForHashes(db, tx, hashes);
  const actualOriginAliasIds = unique(found.filter((doc) =>
    doc.data().organizerId === organizerId).map((doc) => doc.id));
  if (!same(actualOriginAliasIds,
    evidence.sourceOriginAliasIdsBefore)) {
    stale("Source origin seat aliases changed since merge.");
  }
  const moves = await Promise.all(evidence.seatMoves.map(async (move) => {
    const snap = await tx.get(db.collection("eventSeatIdentityAliases")
      .doc(move.aliasId));
    const raw = snap.data() as AliasRow | undefined;
    if (!raw || raw.eventId !== move.eventId ||
        raw.organizerId !== organizerId || raw.kind !== move.kind ||
        raw.state !== "ready" ||
        raw.valueHash !== move.valueHash ||
        !same(aliasCore(raw), move.after)) {
      stale("Seat alias changed since merge.");
    }
    return move;
  }));
  for (const guard of evidence.seatEventGuards) {
    const ledger = (await tx.get(db.collection("eventSeatLedgers")
      .doc(guard.eventId))).data();
    const current = requireLedger(ledger, guard.eventId);
    if (current.revision !== guard.ledgerRevision ||
        current.migrationRevision !== guard.migrationRevision) {
      stale("Event seats changed since merge.");
    }
    for (const [alias, reservation] of [
      [guard.sourceAlias, guard.sourceReservation],
      [guard.survivorAlias, guard.survivorReservation],
    ] as Array<[AliasCore | null, ReservationCore | null]>) {
      if (!alias) continue;
      const snap = await tx.get(db.collection("eventSeatReservations")
        .doc(reservationId(guard.eventId, alias.canonicalKey)));
      const currentReservation = reservationCore(snap.data(),
        guard.eventId, alias.canonicalKey, alias.identityRevision);
      if (!same(currentReservation, reservation)) {
        stale("Seat reservation changed since merge.");
      }
    }
    const keys = unique([guard.sourceAlias?.canonicalKey,
      guard.survivorAlias?.canonicalKey,
      ...moves.filter((move) => move.eventId === guard.eventId)
        .map((move) => move.after.canonicalKey)]
      .filter((key): key is string => typeof key === "string"));
    const currentAliases = (await Promise.all(keys.map((key) =>
      aliasesForKey(db, tx, key)))).flat().filter((doc) =>
      doc.data().eventId === guard.eventId &&
      doc.data().organizerId === organizerId);
    for (const doc of currentAliases) {
      const alias = doc.data() as AliasRow;
      const expectedIdentity = [guard.sourceAlias, guard.survivorAlias,
        ...moves.filter((move) => move.eventId === guard.eventId)
          .map((move) => move.after)].find((candidate) =>
        candidate?.canonicalKey === alias.canonicalKey);
      if (alias.state !== "ready" ||
          alias.migrationRevision !== guard.migrationRevision ||
          !positive(alias.identityRevision) || !expectedIdentity ||
          alias.identityRevision !== expectedIdentity.identityRevision) {
        stale("Event seat alias authority changed since merge.");
      }
    }
    const expected = unique([...guard.aliasIdsBefore,
      ...moves.filter((move) => move.eventId === guard.eventId &&
        move.before === null).map((move) => move.aliasId)]);
    if (!same(unique(currentAliases.map((doc) => doc.id)), expected)) {
      stale("Event seat alias membership changed since merge.");
    }
  }
  for (const guard of evidence.seatAdmissionGuards) {
    const marker = (await tx.get(db.collection("organizerFormAdmissions")
      .doc(guard.ownershipId))).data();
    if ((marker?.receiptId ?? null) !== guard.receiptId) {
      stale("A moved response was admitted after this merge.");
    }
  }
  return () => {
    for (const move of moves) {
      const ref = db.collection("eventSeatIdentityAliases").doc(move.aliasId);
      if (move.before === null) {
        tx.delete(ref);
      } else {
        tx.update(ref, {canonicalKey: move.before.canonicalKey,
          identityRevision: move.before.identityRevision});
      }
    }
  };
}
