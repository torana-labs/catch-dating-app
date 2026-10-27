import * as admin from "firebase-admin";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {
  requireProgramAccess,
  requireProgramDuty,
  type ProgramAccess,
} from "../shared/programAuthority";
import {momentAttentionWindowMillis} from
  "../organizers/organizerAttentionPolicy";
import {MOMENT_SENDS_COLLECTION} from "../moments/momentDocuments";
import type {ProgramIdCallablePayload} from
  "../shared/generated/programIdCallablePayload";
import type {ProgramStaffAttentionCallableResponse} from
  "../shared/generated/programStaffAttentionCallableResponse";
import {
  validateProgramIdCallablePayload,
} from "../shared/generated/validators/programIdInput";

const SEND_SCAN_LIMIT = 400;
const ITEM_LIMIT = 100;

export interface StaffAttentionDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: StaffAttentionDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
};

interface StaffAttentionSend {
  runId: string;
  momentId: string;
  scopeKind: string;
  scopeId: string;
  duty: string;
  severity: "info" | "warning" | "urgent";
  title: string;
  createdAtMillis: number;
}

/** Lenient journal parse matching organizerAttention: sends written before
 *  the projection fields shipped drop out rather than failing the read. */
function staffAttentionSend(
  snapshot: FirebaseFirestore.DocumentSnapshot
): StaffAttentionSend | null {
  const data = snapshot.data() as Record<string, unknown> | undefined;
  if (!data) return null;
  const {runId, momentId, scopeKind, scopeId, duty, severity, title} = data;
  const createdAtMillis = data.createdAtMillis;
  if (typeof runId !== "string" || typeof momentId !== "string" ||
      (scopeKind !== "event" && scopeKind !== "program") ||
      typeof scopeId !== "string" || typeof duty !== "string" ||
      (severity !== "info" && severity !== "warning" &&
        severity !== "urgent") ||
      typeof title !== "string" || typeof createdAtMillis !== "number") {
    return null;
  }
  return {
    runId, momentId, scopeKind, scopeId, duty,
    severity: severity as StaffAttentionSend["severity"],
    title, createdAtMillis,
  };
}

type AttentionItem =
  ProgramStaffAttentionCallableResponse["items"][number];

/**
 * Program-scoped attention feed for field staff. The durable source is the
 * organizerMomentSends journal row written at fire time for staffAttention
 * actions; the organizer Today list reads the same rows. Each caller sees
 * only the sends stamped for duties they hold — a function lead reads
 * functionLead alerts, a coordinator or manager reads the program's full
 * alert stream. Send fanout (one journal row per addressed staff member)
 * is deduplicated per run and duty.
 */
export async function listProgramStaffAttentionHandler(
  request: CallableRequest<unknown>,
  deps: StaffAttentionDeps = defaultDeps,
): Promise<ProgramStaffAttentionCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ProgramIdCallablePayload>(
    request, validateProgramIdCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listProgramStaffAttention", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const access = await requireProgramAccess({
    db, programId: data.programId, actorUid, now: deps.now(),
  });
  // Attention is a function-lead surface; coordinators satisfy it implicitly.
  requireProgramDuty(access, "functionLead");
  const now = deps.now();

  const sendSnap = await db.collection(MOMENT_SENDS_COLLECTION)
    .where("organizerId", "==", access.program.organizerId)
    .where("actionKind", "==", "staffAttention")
    .where(
      "createdAtMillis",
      ">",
      now.toMillis() - momentAttentionWindowMillis
    )
    .orderBy("createdAtMillis")
    .orderBy(admin.firestore.FieldPath.documentId())
    .limit(SEND_SCAN_LIMIT + 1)
    .get();
  const truncated = sendSnap.docs.length > SEND_SCAN_LIMIT;
  const visibleDuties = staffVisibleDuties(access);
  const seen = new Set<string>();
  const items: AttentionItem[] = [];
  for (const snap of sendSnap.docs.slice(0, SEND_SCAN_LIMIT)) {
    const send = staffAttentionSend(snap);
    if (send === null || send.scopeKind !== "program" ||
        send.scopeId !== data.programId ||
        (visibleDuties !== null && !visibleDuties.has(send.duty))) {
      continue;
    }
    const itemId = `${send.runId}_${send.duty}`;
    if (seen.has(itemId)) continue;
    seen.add(itemId);
    items.push({
      itemId,
      runId: send.runId,
      momentId: send.momentId,
      duty: send.duty,
      severity: send.severity,
      title: send.title,
      createdAtMillis: send.createdAtMillis,
    });
  }
  items.sort((a, b) => b.createdAtMillis - a.createdAtMillis);
  return {
    programId: data.programId,
    items: items.slice(0, ITEM_LIMIT),
    truncated,
  };
}

/** Null means unrestricted (manager or coordinator); otherwise the set of
 *  duties the caller's grant actively satisfies. Send duties are free
 *  strings authored on the moment template, so membership, not enum
 *  validation, decides visibility. */
function staffVisibleDuties(access: ProgramAccess): Set<string> | null {
  if (access.role === "manager") return null;
  const duties = new Set(access.grant!.duties.map((a) => a.duty));
  if (duties.has("programCoordinator")) return null;
  return duties;
}

export const listProgramStaffAttention = onCall(
  appCheckCallableOptionsWithLimits(
    {timeoutSeconds: 60, maxInstances: 20}),
  (request) => listProgramStaffAttentionHandler(request),
);
