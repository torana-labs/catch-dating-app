import {createHash} from "node:crypto";
import {ADMIN_ROLE_CLAIMS} from "../platform/adminAuth";
import type {ReadinessApproval} from "./whatsappReadinessProvisioning";
import type {TrustedCatchHistoryArchivePin} from
  "./whatsappHistoryArchiveVerifier";
import {verifyCatchWhatsappHistoryArchive} from
  "./whatsappHistoryArchiveVerifier";
import type {CatchWhatsappReadinessApprovalDocument as ApprovalDocument} from
  "../shared/generated/catchWhatsappReadinessApprovalDocument";
import type {CatchWhatsappReadinessIngressDocument as IngressDocument} from
  "../shared/generated/catchWhatsappReadinessIngressDocument";
import {validateCatchWhatsappReadinessApprovalDocument} from
  "../shared/generated/validators/catchWhatsappReadinessApprovalDocument";
import {validateCatchWhatsappReadinessIngressDocument} from
  "../shared/generated/validators/catchWhatsappReadinessIngressDocument";

/**
 * Historical verified Auth/token observations at the exact review, NOT a
 * sessionCurrent assertion or a lock against subsequent Auth mutations.
 * The protected producer must authenticate the session, check enabled owner
 * authority and revocation, and independently bind this exact decision digest.
 * Never deserialize this interface from a request or accept an audit hash as
 * authentication. No producer, token reader or authority fence is implemented.
 */
export interface CatchReadinessReviewSessionEvidence {
  projectId: string;
  reviewerUid: string;
  /** Bounded unique canonical role observations, including adminOwner. */
  roles: readonly string[];
  disabled: boolean;
  authTimeMillis: number;
  tokensValidAfterMillis: number;
  observedAtMillis: number;
  /** Expiry of the authenticated ID token, verified by the protected source. */
  tokenExpiresAtMillis: number;
  decisionSha256: string;
  authenticationAuditSha256: string;
}

/** Actual deployment/atomic-commit audit, not a flag or invented start time. */
export interface CatchReadinessAtomicIngressEvidence {
  document: IngressDocument;
  /** Authenticated immutable audit pinned by document evidence. */
  sourceAuditSha256: string;
  /** Source-verified deployed revision; shape/hash checks cannot prove it. */
  deployedRevisionSha256: string;
}

export interface CatchReadinessArchiveEvidence {
  archiveBytes: Uint8Array;
  trustedPin: TrustedCatchHistoryArchivePin;
}

/** Private internal value; never expose archive bytes in UI/log/errors. */
export interface CatchReadinessEvidencePublication {
  approval: ApprovalDocument;
  reviewSession: CatchReadinessReviewSessionEvidence;
  ingress: CatchReadinessAtomicIngressEvidence;
  archive: CatchReadinessArchiveEvidence;
}

/**
 * Mandatory protected producers. These methods MUST verify actual authenticated
 * sources, authorization and immutable provenance independently of requests.
 * Hashes/shape checks below do not provide their authenticity or completeness.
 * No live implementation, default, credential or network client is supplied.
 */
export interface CatchReadinessEvidenceSources {
  /** Actual backend identity, not an environment or request assertion. */
  actualProjectId: string;
  now: () => number;
  loadAuthenticatedReview(reference: string): Promise<{
    approval: ApprovalDocument;
    reviewSession: CatchReadinessReviewSessionEvidence;
  } | null>;
  loadVerifiedAtomicIngress(approval: ApprovalDocument):
    Promise<CatchReadinessAtomicIngressEvidence | null>;
  /** Independent completeness, normalization and late-data audit. */
  loadAuditedArchive(approval: ReadinessApproval):
    Promise<CatchReadinessArchiveEvidence | null>;
}

/**
 * Interface ONLY: no writer, collection, schema or call to this method exists.
 * A future audited implementation must create immutable private approval,
 * ingress binding, archive/pin and review provenance atomically, with collision
 * rejection and no overwrite. It must preserve exact cloned bytes and evidence
 * identity, and revalidate protected-source provenance before publication.
 * Publication grants no readiness, Auth fence, deployment or send authority.
 */
export interface CatchReadinessEvidencePublisher {
  publishCreateOnly(evidence: CatchReadinessEvidencePublication): Promise<void>;
}

export interface CatchReadinessEvidenceReader {
  actualProjectId: string;
  now: () => number;
  /** Protected immutable source, never caller JSON or arbitrary blob paths. */
  loadImmutablePublication(reference: string):
    Promise<CatchReadinessEvidencePublication | null>;
}

const digest = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const hash = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
const millis = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const referenceId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/u.test(value);
function fail(): never {
  throw new Error("Protected Catch readiness evidence unavailable.");
}
function exactKeys(value: unknown, keys: string[]): void {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).sort().join("|") !== keys.sort().join("|")) fail();
}
async function privateResult<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch {
    // Protected backends may include private content in their exception text.
    fail();
  }
}
function approvalParts(a: ReadinessApproval): unknown[] {
  return [a.approvalId, a.action, a.scope.projectId, a.scope.wabaId,
    a.scope.phoneNumberId, a.scope.recipientUid, a.scope.endpointHash,
    a.scope.evidenceSha256, a.reviewerUid, a.reviewedAtMillis,
    a.expiresAtMillis, a.atomicIngressStartedAtMillis,
    a.expectedRecordSha256];
}

/** Binds the authenticated review to exact scope/action/expiry and ingress. */
export function catchReadinessEvidenceDecisionDigest(
  document: ApprovalDocument): string {
  if (!validateCatchWhatsappReadinessApprovalDocument(document) ||
      document.state !== "approved" || document.consumedAtMillis !== null ||
      document.recordSha256 !== null ||
      document.approvalId !== document.approval.approvalId) fail();
  return digest(["catch.readiness-evidence-review/v1", "serviceSupport",
    ...approvalParts(document.approval), document.ingressEvidenceSha256]);
}

function validatePublication(value: CatchReadinessEvidencePublication,
  projectId: string, now: number): void {
  exactKeys(value, ["approval", "reviewSession", "ingress", "archive"]);
  const {approval: document, reviewSession: session, ingress, archive} = value;
  exactKeys(session, ["projectId", "reviewerUid", "roles", "disabled",
    "authTimeMillis", "tokensValidAfterMillis", "observedAtMillis",
    "tokenExpiresAtMillis", "decisionSha256", "authenticationAuditSha256"]);
  exactKeys(ingress, ["document", "sourceAuditSha256",
    "deployedRevisionSha256"]);
  exactKeys(archive, ["archiveBytes", "trustedPin"]);
  const decision = catchReadinessEvidenceDecisionDigest(document);
  const a = document.approval;
  // This producer supports complete-history creation only. Revoke remains the
  // existing separately approved exact-record operation, with no new publisher.
  if (a.action !== "create" || a.expectedRecordSha256 !== null ||
      a.scope.projectId !== projectId || !session || !millis(now) ||
      session.projectId !== projectId ||
      session.reviewerUid !== a.reviewerUid ||
      !Array.isArray(session.roles) ||
      session.roles.length > ADMIN_ROLE_CLAIMS.length ||
      new Set(session.roles).size !== session.roles.length ||
      !session.roles.includes("adminOwner") ||
      !session.roles.every((role) =>
        ADMIN_ROLE_CLAIMS.some((allowed) => allowed === role)) ||
      session.disabled !== false || !millis(session.authTimeMillis) ||
      !millis(session.tokensValidAfterMillis) ||
      !millis(session.observedAtMillis) ||
      !millis(session.tokenExpiresAtMillis) ||
      session.authTimeMillis < session.tokensValidAfterMillis ||
      session.authTimeMillis > session.observedAtMillis ||
      session.observedAtMillis !== a.reviewedAtMillis ||
      session.observedAtMillis > now || session.tokenExpiresAtMillis <= now ||
      session.tokenExpiresAtMillis < a.expiresAtMillis ||
      session.decisionSha256 !== decision ||
      !hash(session.authenticationAuditSha256) || !ingress ||
      !validateCatchWhatsappReadinessIngressDocument(ingress.document) ||
      !hash(ingress.sourceAuditSha256) ||
      !hash(ingress.deployedRevisionSha256)) fail();
  const i = ingress.document;
  if (i.ingressId !== "cwingress_" + digest([projectId, a.scope.wabaId,
    a.scope.phoneNumberId]) || i.projectId !== projectId ||
      i.wabaId !== a.scope.wabaId ||
      i.phoneNumberId !== a.scope.phoneNumberId ||
      i.state !== "active" ||
      i.evidenceSha256 !== document.ingressEvidenceSha256 ||
      ingress.sourceAuditSha256 !== i.evidenceSha256 ||
      i.atomicIngressStartedAtMillis !== a.atomicIngressStartedAtMillis ||
      i.verifiedAtMillis < i.atomicIngressStartedAtMillis ||
      i.verifiedAtMillis > a.reviewedAtMillis || !archive) fail();
  verifyCatchWhatsappHistoryArchive({...archive, approval: a, nowMillis: now});
}

/**
 * Prepares a private publication from mandatory protected sources, without
 * writing anything. Caller supplies only an opaque reference. Every dependency
 * receives a separate copy; later callbacks cannot rewrite earlier evidence.
 * This never implements withAuditedAuthorityFence or creates ready records.
 */
export async function prepareCatchReadinessEvidence(reference: string,
  sources: CatchReadinessEvidenceSources):
  Promise<CatchReadinessEvidencePublication> {
  return privateResult(async () => {
    if (!referenceId(reference)) fail();
    const projectId = sources.actualProjectId;
    const review = structuredClone(
      await sources.loadAuthenticatedReview(reference));
    exactKeys(review, ["approval", "reviewSession"]);
    if (!review || review.approval.approvalId !== reference) fail();
    catchReadinessEvidenceDecisionDigest(review.approval);
    const ingress = structuredClone(await sources.loadVerifiedAtomicIngress(
      structuredClone(review.approval)));
    if (!ingress) fail();
    const archive = structuredClone(await sources.loadAuditedArchive(
      structuredClone(review.approval.approval)));
    if (!archive || !(archive.archiveBytes instanceof Uint8Array)) fail();
    // structuredClone preserves SharedArrayBuffer backing; detach explicitly.
    archive.archiveBytes = Uint8Array.from(archive.archiveBytes);
    const publication = {...review, ingress, archive};
    validatePublication(publication, projectId, sources.now());
    return publication;
  });
}

/**
 * Read-only bridge to loadTrustedHistoryArchive. Exact current
 * approval binding is checked again; protected storage provenance is mandatory.
 * Revalidation does not authenticate an arbitrary object or fence current Auth.
 */
export async function loadProtectedCatchReadinessArchive(
  approval: ReadinessApproval, reader: CatchReadinessEvidenceReader):
  Promise<CatchReadinessArchiveEvidence> {
  return privateResult(async () => {
    const expected = structuredClone(approval);
    if (!referenceId(expected?.approvalId)) fail();
    const projectId = reader.actualProjectId;
    const publication = structuredClone(
      await reader.loadImmutablePublication(expected.approvalId));
    if (!publication ||
        !(publication.archive?.archiveBytes instanceof Uint8Array)) fail();
    publication.archive.archiveBytes =
      Uint8Array.from(publication.archive.archiveBytes);
    validatePublication(publication, projectId, reader.now());
    if (digest(approvalParts(publication.approval.approval)) !==
        digest(approvalParts(expected))) fail();
    return publication.archive;
  });
}
