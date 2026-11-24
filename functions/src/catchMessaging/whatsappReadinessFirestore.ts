import {createHash} from "node:crypto";
import {Timestamp, type Firestore} from "firebase-admin/firestore";
import {validateCatchWhatsappReplyReadinessDocument} from
  "../shared/generated/validators/catchWhatsappReplyReadinessDocument";
import type {
  CatchAppAuthorityStore,
  CatchAuditedAuthFence,
} from "./whatsappAppAuthorityStore";
import {
  applyCatchReadinessReview,
  catchReadinessRecordDigest,
} from "./whatsappReadinessProvisioning";
import type {
  ReadinessApproval,
  ReadinessScope,
  ReadinessSnapshot,
} from "./whatsappReadinessProvisioning";
import {verifyCatchWhatsappHistoryArchive} from
  "./whatsappHistoryArchiveVerifier";
import type {TrustedCatchHistoryArchivePin} from
  "./whatsappHistoryArchiveVerifier";
import {validateCatchWhatsappReadinessApprovalDocument} from
  "../shared/generated/validators/catchWhatsappReadinessApprovalDocument";
import {validateCatchWhatsappReadinessIngressDocument} from
  "../shared/generated/validators/catchWhatsappReadinessIngressDocument";
import {validateCatchWhatsappReadinessAuditDocument} from
  "../shared/generated/validators/catchWhatsappReadinessAuditDocument";
import {catchWithdrewAllWhatsapp, contactPermissionRef,
  readContactPermission} from "../shared/contactPermissions";
import {
  prepareCatchReadinessEvidence,
  loadProtectedCatchReadinessArchive,
} from "./whatsappReadinessEvidence";
import type {
  CatchReadinessEvidencePublication,
  CatchReadinessEvidenceSources,
} from "./whatsappReadinessEvidence";

/**
 * Protected current-observation protocol. The producer must read reviewer
 * role/session and recipient identity from Firebase Auth close to each write.
 * It cannot exclude out-of-band Auth mutations between the last read and
 * Firestore commit. No live producer or default capability exists.
 */
export interface CatchReadinessAuthorityFence extends CatchAuditedAuthFence {
  projectId: string;
  approvalId: string;
  provenanceSha256: string;
  readCurrent(
    approval: ReadinessApproval,
  ): Promise<
    Pick<
      ReadinessSnapshot,
      "authority" | "recipientEnabled" | "verifiedRecipientEndpointHash"
    >
  >;
}

export interface CatchReadinessFirestoreDependencies {
  projectId: string;
  now: () => number;
  appAuthorityStore: CatchAppAuthorityStore;
  withAuditedAuthorityFence<T>(
    identity: {
      projectId: string;
      approvalId: string;
    },
    callback: (fence: CatchReadinessAuthorityFence) => Promise<T>,
  ): Promise<T>;
  /**
   * Read-only loader from audited immutable sources. Never request
   * JSON, self-attested archive metadata, or an empty retained-receipt query.
   */
  loadTrustedHistoryArchive(approval: ReadinessApproval): Promise<{
    archiveBytes: Uint8Array;
    trustedPin: TrustedCatchHistoryArchivePin;
  } | null>;
}

const digest = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const isHash = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
const validMillis = (value: number): boolean =>
  Number.isSafeInteger(value) && value >= 0;
const maxPrivatePublicationBytes = 512 * 1024;
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, entry]) => [key, canonical(entry)]),
    );
  }
  return value;
}
export const catchReadinessPublicationDigest = (value: {
  projectId: string;
  authorityFenceSha256: string;
  approval: unknown;
  reviewSession: unknown;
  ingress: unknown;
  archive: { archiveBytes: Uint8Array; trustedPin: unknown };
}): string =>
  digest(
    canonical([
      "catch.readiness-publication/v1",
      value.projectId,
      value.authorityFenceSha256,
      value.approval,
      value.reviewSession,
      value.ingress,
      Buffer.from(value.archive.archiveBytes).toString("base64"),
      value.archive.trustedPin,
    ]),
  );

/**
 * Independent audit source; a stored digest or Firestore rules are
 * insufficient.
 */
export interface CatchReadinessPublicationAuditReader {
  verifyImmutablePublication(binding: {
    projectId: string;
    approvalId: string;
    publicationSha256: string;
  }): Promise<void>;
}
function fail(): never {
  throw new Error("Catch readiness transaction unavailable.");
}
const scopeKey = (scope: ReadinessScope): string =>
  digest([
    scope.projectId,
    scope.wabaId,
    scope.phoneNumberId,
    scope.recipientUid,
    scope.endpointHash,
    scope.evidenceSha256,
  ]);
export const catchReadinessIngressId = (
  scope: Pick<ReadinessScope, "projectId" | "wabaId" | "phoneNumberId">,
): string =>
  "cwingress_" + digest([scope.projectId, scope.wabaId, scope.phoneNumberId]);

/**
 * Create-only private publication. The existing atomic ingress record must
 * already be active and match the independently verified protected source.
 * One Firestore transaction creates the approval and its complete private
 * evidence together. No caller evidence, overwrite, idempotent collision
 * success, readiness creation or send permission is accepted here.
 *
 * This is not a live export. Protected sources have no production provider.
 * Firebase Console/Admin SDK mutations can race the last current read.
 */
export async function publishCatchReadinessEvidenceInFirestore(
  reference: string,
  db: Firestore,
  deps: CatchReadinessFirestoreDependencies,
  sources: CatchReadinessEvidenceSources,
): Promise<void> {
  const projectId: unknown = Reflect.get(db, "projectId");
  if (
    typeof projectId !== "string" ||
    projectId !== deps.projectId ||
    projectId !== sources.actualProjectId ||
    db.databaseId !== "(default)" ||
    deps.appAuthorityStore?.db !== db ||
    !/^[A-Za-z0-9_-]{1,128}$/u.test(reference) ||
    typeof deps.withAuditedAuthorityFence !== "function"
  ) {
    fail();
  }
  await deps.withAuditedAuthorityFence(
    {projectId, approvalId: reference},
    async (fence) => {
      if (
        !fence ||
        fence.projectId !== projectId ||
        fence.approvalId !== reference ||
        !isHash(fence.provenanceSha256)
      ) {
        fail();
      }
      fence.assertHeld();
      // No SDK retry: a lost create response needs private reconciliation,
      // never a second approval attempt.
      const publication = await db.runTransaction(
        async (tx) => {
          fence.assertHeld();
          const publication = await prepareCatchReadinessEvidence(
            reference,
            sources,
          );
          const approval = publication.approval.approval;
          const current = await fence.readCurrent(structuredClone(approval));
          if (
            current.authority?.uid !== approval.reviewerUid ||
            current.authority.disabled !== false ||
            current.authority.sessionCurrent !== true ||
            !current.authority.roles?.includes("adminOwner") ||
            current.recipientEnabled !== true ||
            current.verifiedRecipientEndpointHash !==
              approval.scope.endpointHash ||
            publication.archive.archiveBytes.byteLength >
              maxPrivatePublicationBytes
          ) {
            fail();
          }
          const approvalRef = db
            .collection("catchWhatsappReadinessApprovals")
            .doc(reference);
          const evidenceRef = db
            .collection("catchWhatsappReadinessPublications")
            .doc(reference);
          const ingressRef = db
            .collection("catchWhatsappReadinessIngress")
            .doc(publication.ingress.document.ingressId);
          const auditRef = db
            .collection("catchWhatsappReadinessAudits")
            .doc(reference);
          const readinessRef = db
            .collection("catchWhatsappReplyReadiness")
            .doc(
              "cwready_" +
                digest([
                  approval.scope.wabaId,
                  approval.scope.phoneNumberId,
                  approval.scope.endpointHash,
                ]),
            );
          const [priorApproval, priorEvidence, ingress, audit, readiness] =
            await Promise.all([
              tx.get(approvalRef),
              tx.get(evidenceRef),
              tx.get(ingressRef),
              tx.get(auditRef),
              tx.get(readinessRef),
            ]);
          if (
            priorApproval.exists ||
            priorEvidence.exists ||
            audit.exists ||
            readiness.exists ||
            !ingress.exists ||
            !validateCatchWhatsappReadinessIngressDocument(
              serialized(ingress.data()),
            ) ||
            digest(canonical(serialized(ingress.data()))) !==
              digest(canonical(publication.ingress.document))
          ) {
            fail();
          }
          const freshNow = deps.now();
          if (
            !validMillis(freshNow) ||
            freshNow < publication.reviewSession.observedAtMillis ||
            freshNow >= approval.expiresAtMillis ||
            freshNow >= publication.reviewSession.tokenExpiresAtMillis
          ) {
            fail();
          }
          // Bound Firestore document size well below its 1 MiB limit. Preserve
          // exact archive bytes and avoid a second blob store/partial commit.
          const body = {
            ...publication,
            archive: {
              ...publication.archive,
              archiveBytes: Buffer.from(publication.archive.archiveBytes),
            },
            projectId,
            authorityFenceSha256: fence.provenanceSha256,
          };
          const stored = {
            ...body,
            publicationSha256: catchReadinessPublicationDigest(body),
          };
          const latest = await fence.readCurrent(structuredClone(approval));
          if (
            latest.authority?.uid !== approval.reviewerUid ||
            latest.authority.disabled !== false ||
            latest.authority.sessionCurrent !== true ||
            !latest.authority.roles?.includes("adminOwner") ||
            latest.recipientEnabled !== true ||
            latest.verifiedRecipientEndpointHash !==
              approval.scope.endpointHash
          ) {
            fail();
          }
          const finalNow = deps.now();
          if (
            !validMillis(finalNow) ||
            finalNow < freshNow ||
            finalNow >= approval.expiresAtMillis ||
            finalNow >= publication.reviewSession.tokenExpiresAtMillis
          ) {
            fail();
          }
          fence.assertHeld();
          tx.create(evidenceRef, stored);
          tx.create(approvalRef, publication.approval);
          return {
            freshNow: finalNow,
            expiresAtMillis: approval.expiresAtMillis,
            tokenExpiresAtMillis:
              publication.reviewSession.tokenExpiresAtMillis,
          };
        },
        {maxAttempts: 1},
      );
      fence.assertHeld();
      const completedAt = deps.now();
      if (
        !validMillis(completedAt) ||
        completedAt < publication.freshNow ||
        completedAt >= publication.expiresAtMillis ||
        completedAt >= publication.tokenExpiresAtMillis
      ) {
        fail();
      }
    },
  );
}

/** Private read bridge for the existing complete-history verifier. */
export async function loadCatchReadinessArchiveFromFirestore(
  approval: ReadinessApproval,
  db: Firestore,
  projectId: string,
  now: () => number,
  auditReader: CatchReadinessPublicationAuditReader,
) {
  if (
    Reflect.get(db, "projectId") !== projectId ||
    db.databaseId !== "(default)" ||
    typeof auditReader?.verifyImmutablePublication !== "function" ||
    !/^[A-Za-z0-9_-]{1,128}$/u.test(approval.approvalId)
  ) {
    fail();
  }
  return loadProtectedCatchReadinessArchive(approval, {
    actualProjectId: projectId,
    now,
    loadImmutablePublication: async (reference) => {
      const snap = await db
        .collection("catchWhatsappReadinessPublications")
        .doc(reference)
        .get();
      const value = snap.data();
      if (
        !value ||
        value.projectId !== projectId ||
        Object.keys(value).sort().join("|") !==
          [
            "approval",
            "archive",
            "authorityFenceSha256",
            "ingress",
            "projectId",
            "publicationSha256",
            "reviewSession",
          ]
            .sort()
            .join("|") ||
        !isHash(value.authorityFenceSha256) ||
        !isHash(value.publicationSha256) ||
        !(value.archive?.archiveBytes instanceof Uint8Array) ||
        value.archive.archiveBytes.byteLength > maxPrivatePublicationBytes
      ) {
        return null;
      }
      if (
        catchReadinessPublicationDigest(
          value as Parameters<typeof catchReadinessPublicationDigest>[0],
        ) !== value.publicationSha256
      ) {
        fail();
      }
      await auditReader.verifyImmutablePublication({
        projectId,
        approvalId: reference,
        publicationSha256: value.publicationSha256,
      });
      return {
        approval: value.approval,
        reviewSession: value.reviewSession,
        ingress: value.ingress,
        archive: {
          trustedPin: value.archive.trustedPin,
          archiveBytes: Uint8Array.from(value.archive.archiveBytes),
        },
      } as CatchReadinessEvidencePublication;
    },
  });
}

function serialized(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return {_seconds: value.seconds, _nanoseconds: value.nanoseconds};
  }
  if (Array.isArray(value)) return value.map(serialized);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serialized(entry)]),
    );
  }
  return value;
}

/**
 * Concrete Firestore writes, deliberately disconnected from handlers/exports.
 * Only an opaque review reference is input; protected records own scope.
 * Fresh Auth observations and independent history remain prerequisites.
 * No approval/ingress writer, credential access, provider I/O or gate change.
 *
 * SDK automatic retries include UNKNOWN and deadline errors, so maxAttempts is
 * explicitly one. A bounded retry requires a trusted definite-noncommit
 * classification. The current production SDK adapter supplies none, so
 * ordinary ABORTED errors fail closed pending reconciliation.
 * Other outcomes propagate; reconcile privately, never blind retry.
 */
export async function applyCatchReadinessReviewInFirestore(
  reference: string,
  db: Firestore,
  deps: CatchReadinessFirestoreDependencies,
): Promise<{
  readinessId: string;
  state: "ready" | "revoked";
}> {
  // The installed Firestore SDK exposes this initialized-client getter at
  // runtime but omits it from public typings. Missing/uninitialized identity
  // rejects rather than falling back to an environment or approval assertion.
  const actualProjectId: unknown = Reflect.get(db, "projectId");
  if (
    typeof actualProjectId !== "string" ||
    typeof reference !== "string" ||
    !/^[A-Za-z0-9_-]{1,128}$/u.test(reference) ||
    typeof deps?.withAuditedAuthorityFence !== "function" ||
    typeof deps.loadTrustedHistoryArchive !== "function" ||
    actualProjectId !== deps.projectId ||
    deps.appAuthorityStore?.db !== db ||
    db.databaseId !== "(default)"
  ) {
    fail();
  }
  return deps.withAuditedAuthorityFence(
    {projectId: actualProjectId, approvalId: reference},
    async (fence) => {
      if (
        !fence ||
        fence.projectId !== actualProjectId ||
        fence.approvalId !== reference ||
        !isHash(fence.provenanceSha256) ||
        typeof fence.readCurrent !== "function"
      ) {
        fail();
      }
      // Only a reviewed definite-noncommit signal permits a bounded retry.
      // Each attempt rereads approval, audit absence and current
      // Firestore facts.
      for (let attempt = 0; ; attempt++) {
        let callbackFailed = false;
        let result: { readinessId: string; state: "ready" | "revoked" };
        try {
          result = await db.runTransaction(
            async (tx) => {
              try {
                const approvalRef = db
                  .collection("catchWhatsappReadinessApprovals")
                  .doc(reference);
                const auditRef = db
                  .collection("catchWhatsappReadinessAudits")
                  .doc(reference);
                const [approvalSnap, auditSnap] = await Promise.all([
                  tx.get(approvalRef),
                  tx.get(auditRef),
                ]);
                const stored = approvalSnap.data();
                if (
                  auditSnap.exists ||
                  !validateCatchWhatsappReadinessApprovalDocument(stored) ||
                  stored.approvalId !== reference ||
                  stored.state !== "approved" ||
                  stored.consumedAtMillis !== null ||
                  stored.recordSha256 !== null ||
                  stored.approval.approvalId !== reference ||
                  stored.approval.scope.projectId !== actualProjectId
                ) {
                  fail();
                }
                const approval: ReadinessApproval = structuredClone(
                  stored.approval,
                );
                const scope = approval.scope;
                const endpointKey = digest([
                  scope.wabaId,
                  scope.phoneNumberId,
                  scope.endpointHash,
                ]);
                const readinessRef = db
                  .collection("catchWhatsappReplyReadiness")
                  .doc("cwready_" + endpointKey);
                let currentRead = false;
                let bindings: Awaited<
                  ReturnType<CatchAppAuthorityStore["readinessBindings"]>
                > | null = null;
                return await applyCatchReadinessReview(reference, {
                  runFencedTransaction: async (callback) =>
                    callback({
                      loadApprovedReview: async (requested) =>
                        requested === reference ?
                          structuredClone(approval) :
                          null,
                      readCurrent: async (requestedScope) => {
                        if (scopeKey(requestedScope) !== scopeKey(scope)) {
                          fail();
                        }
                        const ingressId = catchReadinessIngressId(scope);
                        const [
                          stop,
                          preference,
                          deleted,
                          ingressSnap,
                          readiness,
                        ] = await Promise.all([
                          tx.get(
                            db
                              .collection("catchWhatsappEndpointStops")
                              .doc("cwstop_" + endpointKey),
                          ),
                          tx.get(contactPermissionRef(db,
                            scope.recipientUid, {kind: "catch"})),
                          tx.get(
                            db
                              .collection("deletedUsers")
                              .doc(scope.recipientUid),
                          ),
                          tx.get(
                            db
                              .collection("catchWhatsappReadinessIngress")
                              .doc(ingressId),
                          ),
                          tx.get(readinessRef),
                        ]);
                        const nowMillis = deps.now();
                        if (!validMillis(nowMillis)) fail();
                        const ingress = ingressSnap.data();
                        const ingressValid =
                          validateCatchWhatsappReadinessIngressDocument(
                            ingress,
                          ) &&
                          ingress.ingressId === ingressId &&
                          ingress.projectId === actualProjectId &&
                          ingress.wabaId === scope.wabaId &&
                          ingress.phoneNumberId === scope.phoneNumberId &&
                          ingress.state === "active" &&
                          ingress.evidenceSha256 ===
                            stored.ingressEvidenceSha256 &&
                          ingress.atomicIngressStartedAtMillis <=
                            ingress.verifiedAtMillis &&
                          ingress.verifiedAtMillis <=
                            approval.reviewedAtMillis;
                        const pref = readContactPermission(
                          preference.data(), {kind: "catch"});
                        const invalidPreference =
                          preference.exists &&
                          (!pref ||
                            (await catchWithdrewAllWhatsapp(
                              (ref) => tx.get(ref), db, pref)));
                        const identity = await fence.readCurrent(
                          structuredClone(approval),
                        );
                        if (approval.action === "create") {
                          bindings =
                            await deps.appAuthorityStore.readinessBindings(
                              tx,
                              fence,
                              {
                                reviewerUid: approval.reviewerUid,
                                recipientUid: scope.recipientUid,
                                endpointHash: scope.endpointHash,
                              },
                            );
                        }
                        currentRead = true;
                        return {
                          ...structuredClone(identity),
                          scope: {...scope},
                          nowMillis,
                          suppressed:
                            stop.exists ||
                            deleted.exists ||
                            invalidPreference,
                          atomicIngressStartedAtMillis: ingressValid ?
                            ingress.atomicIngressStartedAtMillis :
                            null,
                          existing: readiness.exists ?
                            readiness.data() :
                            null,
                        };
                      },
                      verifyCompleteStopHistory: async (review) => {
                        const source = await deps.loadTrustedHistoryArchive(
                          structuredClone(review),
                        );
                        if (!source) return null;
                        return verifyCatchWhatsappHistoryArchive({
                          ...source,
                          approval: review,
                          nowMillis: deps.now(),
                        });
                      },
                      commit: async (mutation) => {
                        if (approval.action === "create") {
                          bindings =
                            await deps.appAuthorityStore.readinessBindings(
                              tx,
                              fence,
                              {
                                reviewerUid: approval.reviewerUid,
                                recipientUid: scope.recipientUid,
                                endpointHash: scope.endpointHash,
                              },
                            );
                        }
                        const latest = await fence.readCurrent(
                          structuredClone(approval),
                        );
                        const now = deps.now();
                        if (
                          latest.authority?.uid !== approval.reviewerUid ||
                          latest.authority.disabled !== false ||
                          latest.authority.sessionCurrent !== true ||
                          !latest.authority.roles?.includes("adminOwner") ||
                          (approval.action === "create" &&
                            (latest.recipientEnabled !== true ||
                              latest.verifiedRecipientEndpointHash !==
                                scope.endpointHash))
                        ) {
                          fail();
                        }
                        if (
                          !currentRead ||
                          (approval.action === "create" && !bindings) ||
                          !validMillis(now) ||
                          now < mutation.audit.atMillis ||
                          now >= approval.expiresAtMillis ||
                          mutation.record.readinessId !== readinessRef.id ||
                          mutation.audit.approvalId !== reference
                        ) {
                          fail();
                        }
                        deps.appAuthorityStore.assertFence(
                          fence,
                          approval.action === "create" ?
                            [approval.reviewerUid, scope.recipientUid] :
                            [approval.reviewerUid],
                        );
                        const record =
                          approval.action === "create" ?
                            {
                              ...mutation.record,
                              appAuthorityBindings: bindings,
                            } :
                            mutation.record;
                        if (
                          !validateCatchWhatsappReplyReadinessDocument(record)
                        ) {
                          fail();
                        }
                        const recordSha256 =
                          catchReadinessRecordDigest(record);
                        const audit = {
                          schemaVersion: 1,
                          auditId: reference,
                          ...mutation.audit,
                          recordSha256,
                          atMillis: now,
                          readinessId: readinessRef.id,
                          authorityFenceSha256: fence.provenanceSha256,
                        };
                        const consumed = {
                          ...stored,
                          state: "consumed",
                          consumedAtMillis: now,
                          recordSha256,
                        };
                        if (
                          !validateCatchWhatsappReadinessAuditDocument(
                            audit,
                          ) ||
                          !validateCatchWhatsappReadinessApprovalDocument(
                            consumed,
                          )
                        ) {
                          fail();
                        }
                        // Read-set preconditions
                        // fence concurrent STOP,
                        // withdrawal,
                        // deletion, ingress, readiness and approval changes.
                        if (approval.action === "create") {
                          tx.create(readinessRef, record);
                        } else {
                          tx.update(readinessRef, {state: "revoked"});
                        }
                        tx.update(approvalRef, consumed);
                        tx.create(auditRef, audit);
                      },
                    }),
                });
              } catch (error) {
                callbackFailed = true;
                throw error;
              }
            },
            {maxAttempts: 1},
          );
        } catch (error) {
          const code =
            error && typeof error === "object" && "code" in error ?
              error.code :
              null;
          if (
            callbackFailed ||
            attempt >= 2 ||
            code !== 10 ||
            !error ||
            typeof error !== "object" ||
            !("definiteNonCommit" in error) ||
            error.definiteNonCommit !== true
          ) {
            throw error;
          }
          continue;
        }
        // A fence loss after an uncertain commit is never safe to retry.
        fence.assertHeld();
        return result;
      }
    },
  );
}
