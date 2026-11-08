import {createHash} from "node:crypto";
import {HttpsError} from "firebase-functions/v2/https";

export interface HostSalesIntentInput {
  waitlistId: string;
  requestId: string | null;
  fullName: string;
  email: string | null;
  city: string;
  role: string;
  hostApplication: Record<string, unknown> | null;
  entryRoute: string | null;
  /** Optional E.164 number; a phone-only applicant has no email. */
  phone?: string | null;
  /** The programme product, e.g. "weddings"; absent for events Hosts. */
  programme?: "weddings" | null;
  programmeApplication?: Record<string, unknown> | null;
}

/** A submission proposes a relationship without product authority. */
export function prepareHostSalesIntent(input: HostSalesIntentInput) {
  if (input.role !== "host" && input.role !== "both") return null;
  const projection = {
    fullName: input.fullName,
    email: input.email,
    city: input.city,
    hostApplication: input.hostApplication,
    entryRoute: input.entryRoute,
    // Present only when sent, so earlier submissions keep their replay hash.
    ...(input.phone ? {phone: input.phone} : {}),
    ...(input.programme ? {
      programme: input.programme,
      programmeApplication: input.programmeApplication ?? null,
    } : {}),
  };
  const requestHash = digest(canonical(projection));
  // Older clients lack a request ID. Exact content is safely coalesced while
  // changed operating details become a new reviewable observation.
  const submissionId = input.requestId || `content_${requestHash}`;
  const intentId = digest(JSON.stringify([input.waitlistId, submissionId]));
  return {
    intentId,
    schemaVersion: 1 as const,
    revision: 1,
    classification: "sales_private" as const,
    source: "website" as const,
    submissionId,
    requestHash,
    waitlistId: input.waitlistId,
    status: "needs_identity_review" as const,
    organizerId: null,
    evidenceStatus: "self_reported" as const,
    ...projection,
  };
}

/** Reusing an identity cannot overwrite a prior accepted submission. */
export function hostSalesIntentReplay(
  existing: Record<string, unknown> | undefined,
  incoming: NonNullable<ReturnType<typeof prepareHostSalesIntent>>
): boolean | null {
  if (!existing) return null;
  if (existing.requestHash !== incoming.requestHash ||
      existing.waitlistId !== incoming.waitlistId ||
      typeof existing.alreadyJoined !== "boolean") {
    throw new HttpsError("already-exists", "Submission identity conflicts.");
  }
  return existing.alreadyJoined;
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
