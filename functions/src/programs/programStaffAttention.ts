import type {ProgramAccess} from "../shared/programAuthority";

// Staff attention sends as the programme live board and its read model see
// them: the organizerMomentSends journal rows written for staffAttention
// actions, and the duties a caller's grant lets them read.

export interface StaffAttentionSend {
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
export function staffAttentionSend(
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

/** Null means unrestricted (manager or coordinator); otherwise the set of
 *  duties the caller's grant actively satisfies. Send duties are free
 *  strings authored on the moment template, so membership, not enum
 *  validation, decides visibility. */
export function staffVisibleDuties(access: ProgramAccess): Set<string> | null {
  if (access.role === "manager") return null;
  const duties = new Set(access.grant!.duties.map((a) => a.duty));
  if (duties.has("programCoordinator")) return null;
  return duties;
}
