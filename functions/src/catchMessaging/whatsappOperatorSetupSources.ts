import {validateCatchWhatsappOperatorSetupAuditDocument} from
  "../shared/generated/validators/catchWhatsappOperatorSetupAuditDocument";
import {ADMIN_ROLE_CLAIMS} from "../platform/adminAuth";
import {createHash} from "node:crypto";
import type {Auth} from "firebase-admin/auth";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {authorizeCatchAppCapability} from "./whatsappAppAuthority";
import {createCatchFirebaseAuthority,
  createCatchGoogleFirebaseLookupTransport} from "./whatsappFirebaseAuthority";
import type {CatchFirebaseLookupTransport} from "./whatsappFirebaseAuthority";
import {CATCH_APP_AUTHORITIES, CatchAppAuthorityStore,
  withCatchFreshAuthContext} from
  "./whatsappAppAuthorityStore";
import {assertPlannedSetupIdentity, desiredOperatorClaims, setupExact,
  setupHash, setupUnavailable, setupAssignmentMatches,
  validateSetupScope, validateSetupPlan, validateSetupRequest} from
  "./whatsappOperatorSetup";
import type {OperatorSetupPlan, OperatorSetupScope,
  OperatorSetupSources, OperatorSetupRequest,
  OperatorSetupPhase} from "./whatsappOperatorSetup";
import {OPERATOR_SETUP_OPERATIONS, OPERATOR_SETUP_AUDITS,
  readOperatorSetupOperation,
  commitOperatorSetupPhase, operatorBoundAuthorityStore} from
  "./whatsappOperatorSetupFirestore";
import {catchReadinessEvidenceDecisionDigest} from
  "./whatsappReadinessEvidence";
import type {CatchReadinessEvidenceSources} from "./whatsappReadinessEvidence";
import {applyCatchReadinessReviewInFirestore,
  publishCatchReadinessEvidenceInFirestore,
  loadCatchReadinessArchiveFromFirestore} from "./whatsappReadinessFirestore";
import type {CatchReadinessFirestoreDependencies,
  CatchReadinessPublicationAuditReader, CatchReadinessAuthorityFence} from
  "./whatsappReadinessFirestore";
import type {ReadinessApproval} from "./whatsappReadinessProvisioning";
import {catchReadinessRecordDigest} from "./whatsappReadinessProvisioning";
import {validateCatchWhatsappReadinessApprovalDocument} from
  "../shared/generated/validators/catchWhatsappReadinessApprovalDocument";
import {validateCatchWhatsappReadinessAuditDocument} from
  "../shared/generated/validators/catchWhatsappReadinessAuditDocument";
import {validateCatchWhatsappReplyReadinessDocument} from
  "../shared/generated/validators/catchWhatsappReplyReadinessDocument";
import {verifyCatchWhatsappHistoryArchive} from
  "./whatsappHistoryArchiveVerifier";
import type {TrustedCatchHistoryArchivePin} from
  "./whatsappHistoryArchiveVerifier";

export const operatorEmailHash = (email: string): string =>
  setupHash(email.trim().toLowerCase());
type OperatorAuth = Pick<Auth, "app" | "getUser" | "listUsers" |
  "verifyIdToken" | "setCustomUserClaims"> & {tenantId?: string};
/** All options are protected server configuration, never deserialized requests.
 * Construction/import is key-free and performs no network/credential lookup. */
export function createProtectedOperatorSetupSources(options: {
  scope: OperatorSetupScope;
  sourceSha: string;
  db: Firestore;
  auth: OperatorAuth;
  actorIdToken: () => Promise<string>;
  reviewedPlans: ReadonlyMap<string, OperatorSetupPlan>;
  now?: () => number;
  transport?: CatchFirebaseLookupTransport;
  authorizeApply?: (planSha256: string) => Promise<void>;
  /** Metadata only. This boundary has no token payload/provider API. */
  credentialMetadata: () => Promise<{
    resourceSha256: string; enabled: boolean; runtimeAccessor: boolean;
  }>;
}): OperatorSetupSources {
  const scope = structuredClone(options.scope);
  validateSetupScope(scope);
  const now = options.now ?? Date.now;
  const plans = new Map([...options.reviewedPlans].map(([id, plan]) => {
    validateSetupPlan(plan);
    if (id !== plan.planId) setupUnavailable();
    return [id, structuredClone(plan)] as const;
  }));
  const firebase = createCatchFirebaseAuthority({projectId: scope.projectId,
    auth: options.auth, now,
    transport: options.transport ?? createCatchGoogleFirebaseLookupTransport(
      scope.projectId)});
  let armed: OperatorSetupPlan | undefined;
  const identity = () => {
    if (options.auth.app.options.projectId !== scope.projectId ||
        options.auth.tenantId !== undefined ||
        Reflect.get(options.db, "projectId") !== scope.projectId ||
        options.db.databaseId !== "(default)") setupUnavailable();
  };
  const privateRead = async <T>(read: () => Promise<T>): Promise<T> => {
    try {
      identity();
      return await read();
    } catch {
      setupUnavailable();
    }
  };
  const actor = () => privateRead(async () => {
    const token = await options.actorIdToken();
    const [user, decoded, auth, session] = await Promise.all([
      options.auth.getUser(scope.actorUid),
      options.auth.verifyIdToken(token, true),
      firebase.observe(scope.actorUid),
      firebase.verifySession(scope.actorUid, token),
    ]);
    const provider = user.providerData.filter((p) =>
      p.providerId === "google.com");
    const googleIdentities = decoded.firebase?.identities?.["google.com"];
    if (user.uid !== scope.actorUid || user.disabled || !user.emailVerified ||
        !user.email || operatorEmailHash(user.email) !==
          scope.actorEmailSha256 ||
        decoded.email_verified !== true || !decoded.email ||
        operatorEmailHash(decoded.email) !== scope.actorEmailSha256 ||
        decoded.firebase?.sign_in_provider !== "google.com" ||
        provider.length !== 1 || !provider[0].uid ||
        !Array.isArray(googleIdentities) || googleIdentities.length !== 1 ||
        googleIdentities[0] !== provider[0].uid ||
        decoded.auth_time !== session.authTimeSeconds ||
        decoded.exp !== session.expiresAtSeconds) setupUnavailable();
    return {auth, session, emailSha256: scope.actorEmailSha256,
      googleSubjectSha256: setupHash(["catch.google-subject/v1",
        scope.projectId, scope.actorUid, provider[0].uid]),
      claims: structuredClone(user.customClaims ?? {})};
  });
  const snapshot = () => privateRead(async () => {
    const [currentActor, recipientUser, recipientAuth, metadata,
      authority, slot, assignments, actorAssignment] = await Promise.all([
      actor(), options.auth.getUser(scope.recipientUid),
      firebase.observe(scope.recipientUid), options.credentialMetadata(),
      options.db.collection(CATCH_APP_AUTHORITIES).limit(1).get(),
      options.db.collection(OPERATOR_SETUP_OPERATIONS).doc(
        scope.projectId).get(),
      options.db.collection("adminRoleAssignments")
        .where("roles", "array-contains", "adminOwner").limit(2).get(),
      options.db.collection("adminRoleAssignments").doc(scope.actorUid).get(),
    ]);
    setupExact(metadata, ["resourceSha256", "enabled", "runtimeAccessor"]);
    if (recipientUser.uid !== scope.recipientUid || recipientUser.disabled ||
        metadata.resourceSha256 !== scope.credentialVersionSha256 ||
        metadata.enabled !== true || metadata.runtimeAccessor !== true) {
      setupUnavailable();
    }
    // Auth has no role query. Complete bounded pagination, or fail closed.
    // This detects existing owners; it is not exclusion of concurrent writers.
    const owners = new Set<string>(assignments.docs.map((d) => d.id));
    const seen = new Set<string>();
    let cursor: string | undefined;
    for (let page = 0; ; page++) {
      const result = await options.auth.listUsers(1000, cursor);
      for (const user of result.users) {
        if (user.customClaims?.adminOwner === true) owners.add(user.uid);
      }
      if (!result.pageToken) break;
      if (page >= 99 || seen.has(result.pageToken)) setupUnavailable();
      seen.add(result.pageToken);
      cursor = result.pageToken;
    }
    return {actor: currentActor, recipient: {auth: recipientAuth,
      claims: structuredClone(recipientUser.customClaims ?? {})},
    existingOwnerUids: [...owners].sort(), authorityExists: !authority.empty,
    bootstrapExists: slot.exists,
    actorAssignmentExists: actorAssignment.exists,
    ...(actorAssignment.exists ?
      {actorAssignment: actorAssignment.data()} : {})};
  });
  return {scope, sourceSha: options.sourceSha, now, snapshot, actor,
    loadReviewedPlan: async (id) => structuredClone(plans.get(id) ?? null),
    ...(options.authorizeApply ? {authorizeApply: async (digest: string) => {
      const matches = [...plans.values()].filter((plan) =>
        setupHash(plan) === digest && setupHash(plan.scope) ===
          setupHash(scope) &&
        plan.sourceSha === options.sourceSha);
      if (matches.length !== 1) setupUnavailable();
      await options.authorizeApply?.(digest);
      armed = structuredClone(matches[0]);
    }} : {}),
    setActorClaims: async (claims, input) => privateRead(async () => {
      claims = structuredClone(claims);
      const request = validateSetupRequest(input);
      if (!armed) setupUnavailable();
      const plan = structuredClone(armed);
      if (setupHash(claims) !== plan.desiredClaimsSha256 ||
          now() >= plan.expiresAtMillis) setupUnavailable();
      const latest = await snapshot();
      assertPlannedSetupIdentity(plan, latest, now());
      if (setupHash(latest.actor.claims) !== plan.beforeClaimsSha256 ||
          latest.existingOwnerUids.length || latest.authorityExists ||
          !setupAssignmentMatches(plan, latest) ||
          setupHash(claims) !== setupHash(desiredOperatorClaims(
            latest.actor.claims))) {
        setupUnavailable();
      }
      // Consume a create-only dispatch intent BEFORE crossing into Auth. An
      // unknown Firestore or Auth outcome can never mint a second permit.
      await options.db.runTransaction(async (tx) => {
        const operation = readOperatorSetupOperation((await tx.get(
          options.db.collection(OPERATOR_SETUP_OPERATIONS)
            .doc(scope.projectId))).data(), plan, request);
        const auditId = `${scope.projectId}_auth_dispatch`;
        const ref = options.db.collection(OPERATOR_SETUP_AUDITS).doc(auditId);
        const prior = await tx.get(ref);
        if (operation.phase !== "auth-intent" || prior.exists) {
          setupUnavailable();
        }
        const current = await snapshot();
        assertPlannedSetupIdentity(plan, current, now());
        if (setupHash(current.actor.claims) !== plan.beforeClaimsSha256 ||
            current.existingOwnerUids.length || current.authorityExists ||
            !setupAssignmentMatches(plan, current) ||
            now() >= plan.expiresAtMillis) {
          setupUnavailable();
        }
        const audit = {schemaVersion: 1,
          receiptKind: "auth-dispatch-intent", auditId,
          operationId: operation.operationId, projectId: scope.projectId,
          actorUid: scope.actorUid, planSha256: operation.planSha256,
          scopeSha256: operation.scopeSha256, fromPhase: "auth-intent",
          toPhase: "auth-intent", revision: operation.revision,
          atMillis: now(), beforeSha256: setupHash(operation),
          afterSha256: setupHash(operation),
          effectSha256: plan.desiredClaimsSha256};
        if (!validateCatchWhatsappOperatorSetupAuditDocument(audit)) {
          setupUnavailable();
        }
        tx.create(ref, audit);
      }, {maxAttempts: 1});
      if (now() >= plan.expiresAtMillis) setupUnavailable();
      const beforeDispatch = await snapshot();
      assertPlannedSetupIdentity(plan, beforeDispatch, now());
      if (setupHash(beforeDispatch.actor.claims) !== plan.beforeClaimsSha256 ||
          beforeDispatch.existingOwnerUids.length ||
          beforeDispatch.authorityExists ||
          !setupAssignmentMatches(plan, beforeDispatch) ||
          now() >= plan.expiresAtMillis) setupUnavailable();
      // Firebase replaces the full claim object: preserve the exact reviewed
      // unrelated claims. No atomic CAS exists against external Auth writers.
      await options.auth.setCustomUserClaims(scope.actorUid,
        structuredClone(claims));
    }),
  };
}

/** Generation-pinned GCS-shaped loader; callers inject an authorized bucket,
 * not a URL or arbitrary archive path. Independent completeness/source audit
 * must authenticate the pin; storage hash alone is not historical truth. */
export function createPinnedOperatorHistoryLoader(options: {
  scope: OperatorSetupScope;
  now: () => number;
  loadAuthenticatedPin: (approvalId: string) => Promise<{
    objectPath: string; generation: string; archiveSha256: string;
    trustedPin: TrustedCatchHistoryArchivePin;
  } | null>;
  bucket: {file(name: string, options: {generation: string}): {
    download(options: {validation: "crc32c"}): Promise<[Uint8Array]>;
  }};
}) {
  const scope = structuredClone(options.scope);
  validateSetupScope(scope);
  return async (approval: ReadinessApproval) => {
    try {
      approval = structuredClone(approval);
      assertOperatorReadinessScope(scope, approval);
      const pin = structuredClone(await options.loadAuthenticatedPin(
        approval.approvalId));
      if (!pin || !/^[1-9][0-9]{0,19}$/u.test(pin.generation) ||
          !/^catch-whatsapp-history\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.json$/u
            .test(pin.objectPath) ||
          pin.archiveSha256 !== approval.scope.evidenceSha256) {
        setupUnavailable();
      }
      const [raw] = await options.bucket.file(pin.objectPath,
        {generation: pin.generation}).download({validation: "crc32c"});
      const archiveBytes = Uint8Array.from(raw);
      if (archiveBytes.byteLength > 512 * 1024 ||
          createHash("sha256").update(archiveBytes).digest("hex") !==
          pin.archiveSha256) setupUnavailable();
      verifyCatchWhatsappHistoryArchive({archiveBytes,
        trustedPin: pin.trustedPin, approval, nowMillis: options.now()});
      return {archiveBytes, trustedPin: pin.trustedPin};
    } catch {
      setupUnavailable();
    }
  };
}
export function assertOperatorReadinessScope(scope: OperatorSetupScope,
  approval: ReadinessApproval) {
  if (approval.reviewerUid !== scope.actorUid ||
      approval.scope.projectId !== scope.projectId ||
      approval.scope.wabaId !== scope.wabaId ||
      approval.scope.phoneNumberId !== scope.phoneNumberId ||
      approval.scope.recipientUid !== scope.recipientUid ||
      approval.scope.endpointHash !== scope.endpointHash) setupUnavailable();
}

/** Concrete adapter around existing publisher, protected archive bridge and
 * review/apply/revoke engine. Evidence producers/audit pins are server-owned.
 * The legacy 'fence' name means bounded current observation, not a mutex. */
export function createOperatorReadinessAdapters(options: {
  plan: OperatorSetupPlan;
  sources: OperatorSetupSources;
  store: CatchAppAuthorityStore;
  actorIdToken: () => Promise<string>;
  evidence: CatchReadinessEvidenceSources;
  publicationAudit: CatchReadinessPublicationAuditReader;
}): NonNullable<OperatorSetupSources["readiness"]> {
  const plan = structuredClone(options.plan);
  validateSetupPlan(plan);
  const {store, sources} = options;
  const db = store.db;
  if (setupHash(plan.scope) !== setupHash(sources.scope) ||
      plan.sourceSha !== sources.sourceSha ||
      options.evidence.actualProjectId !== plan.scope.projectId) {
    setupUnavailable();
  }
  const reference = (ref: string) => {
    if (ref !== plan.createReviewRef && ref !== plan.revokeReviewRef) {
      setupUnavailable();
    }
  };
  const loadApproval = async (ref: string) => {
    reference(ref);
    const value = (await db.collection("catchWhatsappReadinessApprovals")
      .doc(ref).get()).data();
    if (!validateCatchWhatsappReadinessApprovalDocument(value) ||
        value.approvalId !== ref) setupUnavailable();
    assertOperatorReadinessScope(plan.scope, value.approval);
    if (value.approval.action !==
        (ref === plan.createReviewRef ? "create" : "revoke")) {
      setupUnavailable();
    }
    return value;
  };
  const deps: CatchReadinessFirestoreDependencies = {
    projectId: plan.scope.projectId, now: sources.now,
    appAuthorityStore: store,
    loadTrustedHistoryArchive: (approval) => {
      assertOperatorReadinessScope(plan.scope, approval);
      return loadCatchReadinessArchiveFromFirestore(approval, db,
        plan.scope.projectId, sources.now, options.publicationAudit);
    },
    withAuditedAuthorityFence: async ({approvalId, projectId}, callback) => {
      reference(approvalId);
      if (projectId !== plan.scope.projectId) setupUnavailable();
      const revoking = approvalId === plan.revokeReviewRef;
      return withCatchFreshAuthContext(store.deps.firebase, {
        projectId, uids: revoking ? [plan.scope.actorUid] :
          [...new Set([plan.scope.actorUid, plan.scope.recipientUid])],
        actorUid: plan.scope.actorUid,
        actorIdToken: await options.actorIdToken(),
      }, async (context) => callback({...context, approvalId,
        readCurrent: async (approval) => {
          assertOperatorReadinessScope(plan.scope, approval);
          if (approval.approvalId !== approvalId ||
              approval.action !== (revoking ? "revoke" : "create")) {
            setupUnavailable();
          }
          const actor = await sources.actor();
          if (actor.emailSha256 !== plan.scope.actorEmailSha256 ||
              actor.googleSubjectSha256 !== plan.googleSubjectSha256 ||
              setupHash(actor.claims) !== plan.desiredClaimsSha256) {
            setupUnavailable();
          }
          await context.recheck();
          const recipient = revoking ? null : await store.deps.firebase
            .observe(plan.scope.recipientUid);
          return {authority: {uid: actor.auth.uid,
            disabled: actor.auth.disabled, roles: actor.auth.relevantRoles,
            sessionCurrent: actor.session.authTimeSeconds * 1000 >=
              actor.auth.tokensValidAfterMillis &&
              actor.session.expiresAtSeconds * 1000 > sources.now()},
          recipientEnabled: recipient?.disabled === false,
          verifiedRecipientEndpointHash: recipient?.endpointHash ?? ""};
        },
      }), sources.now);
    },
  };
  const boundEvidence: CatchReadinessEvidenceSources = {
    ...options.evidence,
    loadAuthenticatedReview: async (ref) => {
      reference(ref);
      if (ref !== plan.createReviewRef) setupUnavailable();
      const review = structuredClone(await options.evidence
        .loadAuthenticatedReview(ref));
      if (!review) setupUnavailable();
      assertOperatorReadinessScope(plan.scope, review.approval.approval);
      return review;
    },
    loadVerifiedAtomicIngress: (approval) => {
      assertOperatorReadinessScope(plan.scope, approval.approval);
      return options.evidence.loadVerifiedAtomicIngress(structuredClone(
        approval));
    },
    loadAuditedArchive: (approval) => {
      assertOperatorReadinessScope(plan.scope, approval);
      return options.evidence.loadAuditedArchive(structuredClone(approval));
    },
  };
  const dispatch = async <T>(ref: string, request: OperatorSetupRequest,
    intent: OperatorSetupPhase, done: OperatorSetupPhase,
    work: (database: Firestore,
      dependencies: CatchReadinessFirestoreDependencies,
      setAdvance: (enabled: boolean, approvalSha256?: string) => void) =>
      Promise<T>): Promise<T> => {
    reference(ref);
    if (!sources.authorizeApply) setupUnavailable();
    await sources.authorizeApply(setupHash(plan));
    const slot = db.collection(OPERATOR_SETUP_OPERATIONS).doc(
      plan.scope.projectId);
    const initial = readOperatorSetupOperation((await slot.get()).data(),
      plan, request);
    if (initial.phase !== intent) setupUnavailable();
    let context: CatchReadinessAuthorityFence | undefined;
    let advance = true;
    let approvedReceiptSha256: string | undefined;
    // Per-invocation adapter: adds the durable intent and exact authority to
    // the existing publisher/apply transaction's read set, then writes the
    // phase audit with its effect. No nested transaction or global mutex.
    const database = new Proxy(db, {get(target, key) {
      if (key === "runTransaction") {
        return (callback: (tx: Transaction) => Promise<unknown>,
          transactionOptions: {maxAttempts: number}) => target.runTransaction(
          async (tx) => {
            const before = readOperatorSetupOperation((await tx.get(
              slot)).data(),
            plan, request);
            if (before.phase !== intent || !context) setupUnavailable();
            if (approvedReceiptSha256) {
              const saved = (await tx.get(target.collection(
                "catchWhatsappReadinessApprovals").doc(ref))).data();
              if (setupHash(saved) !== approvedReceiptSha256) {
                setupUnavailable();
              }
            }
            const bound = operatorBoundAuthorityStore(store, sources, plan, 3);
            if (ref === plan.revokeReviewRef) {
              const actor = await bound.principal(tx, context,
                plan.scope.actorUid, "protected");
              authorizeCatchAppCapability(actor, "review", sources.now(),
                {projectId: plan.scope.projectId, uid: plan.scope.actorUid});
            } else {
              await bound.readinessBindings(tx, context, {
                reviewerUid: plan.scope.actorUid,
                recipientUid: plan.scope.recipientUid,
                endpointHash: plan.scope.endpointHash,
              });
            }
            const result = await callback(tx);
            if (advance) {
              commitOperatorSetupPhase(tx, target, plan, before,
                {...before, phase: done, revision: before.revision + 1,
                  updatedAtMillis: sources.now()});
            }
            return result;
          }, transactionOptions);
      }
      const value = Reflect.get(target, key, target);
      return typeof value === "function" ? value.bind(target) : value;
    }});
    const boundStore = operatorBoundAuthorityStore(
      new CatchAppAuthorityStore(database, store.deps), sources, plan, 3);
    const dependencies: CatchReadinessFirestoreDependencies = {...deps,
      appAuthorityStore: boundStore,
      withAuditedAuthorityFence: (identity, callback) =>
        deps.withAuditedAuthorityFence(identity, async (fence) => {
          context = fence;
          try {
            return await callback(fence);
          } finally {
            context = undefined;
          }
        }),
    };
    return work(database, dependencies, (enabled, approvalSha256) => {
      advance = enabled;
      approvedReceiptSha256 = approvalSha256;
    });
  };
  const admitOrProveRevokeReview = async (database: Firestore,
    dependencies: CatchReadinessFirestoreDependencies, resume = false) => {
    const ref = plan.revokeReviewRef;
    const review = structuredClone(await options.evidence
      .loadAuthenticatedReview(ref));
    if (!review) setupUnavailable();
    const document = review.approval;
    const approval = document.approval;
    assertOperatorReadinessScope(plan.scope, approval);
    const session = review.reviewSession;
    setupExact(session, ["projectId", "reviewerUid", "roles", "disabled",
      "authTimeMillis", "tokensValidAfterMillis", "observedAtMillis",
      "tokenExpiresAtMillis", "decisionSha256", "authenticationAuditSha256"]);
    if (!validateCatchWhatsappReadinessApprovalDocument(document) ||
        document.state !== "approved" || document.consumedAtMillis !== null ||
        document.recordSha256 !== null ||
        approval.approvalId !== ref || approval.action !== "revoke" ||
        session.projectId !== plan.scope.projectId ||
        session.reviewerUid !== plan.scope.actorUid || session.disabled !==
          false ||
        !Array.isArray(session.roles) ||
        session.roles.length > ADMIN_ROLE_CLAIMS.length ||
        new Set(session.roles).size !== session.roles.length ||
        !session.roles.includes("adminOwner") ||
        !session.roles.every((role) =>
          ADMIN_ROLE_CLAIMS.includes(
            role as typeof ADMIN_ROLE_CLAIMS[number])) ||
        ![session.authTimeMillis, session.tokensValidAfterMillis,
          session.observedAtMillis, session.tokenExpiresAtMillis]
          .every((v) => Number.isSafeInteger(v) && v >= 0) ||
        session.authTimeMillis < session.tokensValidAfterMillis ||
        session.authTimeMillis > session.observedAtMillis ||
        session.observedAtMillis !== approval.reviewedAtMillis ||
        session.observedAtMillis > sources.now() ||
        session.tokenExpiresAtMillis < approval.expiresAtMillis ||
        sources.now() >= approval.expiresAtMillis ||
        session.decisionSha256 !==
          catchReadinessEvidenceDecisionDigest(document) ||
        !/^[a-f0-9]{64}$/u.test(session.authenticationAuditSha256)) {
      setupUnavailable();
    }
    await dependencies.withAuditedAuthorityFence(
      {projectId: plan.scope.projectId,
        approvalId: ref},
      async (fence) => database.runTransaction(async (tx) => {
        const approvalRef = database.collection(
          "catchWhatsappReadinessApprovals")
          .doc(ref);
        const key = createHash("sha256").update(JSON.stringify([
          plan.scope.wabaId, plan.scope.phoneNumberId, plan.scope.endpointHash,
        ])).digest("hex");
        const [prior, record, audit] = await Promise.all([
          tx.get(approvalRef),
          tx.get(database.collection("catchWhatsappReplyReadiness")
            .doc("cwready_" + key)),
          tx.get(database.collection("catchWhatsappReadinessAudits").doc(ref)),
        ]);
        if ((resume ? !prior.exists ||
          setupHash(prior.data()) !== setupHash(document) : prior.exists) ||
          audit.exists ||
          !validateCatchWhatsappReplyReadinessDocument(record.data()) ||
          catchReadinessRecordDigest(record.data() as
            Parameters<typeof catchReadinessRecordDigest>[0]) !==
              approval.expectedRecordSha256) setupUnavailable();
        const current = await fence.readCurrent(approval);
        if (!current.authority.sessionCurrent ||
          !current.authority.roles.includes("adminOwner")) setupUnavailable();
        fence.assertHeld();
        if (!resume) tx.create(approvalRef, document);
      }, {maxAttempts: 1}));
    return setupHash(document);
  };
  return {
    publish: async (ref, request) => {
      reference(ref);
      if (ref !== plan.createReviewRef) setupUnavailable();
      await dispatch(ref, request, "publish-intent", "published",
        (database, dependencies) => publishCatchReadinessEvidenceInFirestore(
          ref, database, dependencies, boundEvidence));
    },
    apply: async (ref, request) => {
      const revoke = ref === plan.revokeReviewRef;
      await dispatch(ref, request,
        revoke ? "revoke-intent" : "readiness-intent",
        revoke ? "revoked" : "ready", async (database, dependencies,
          setAdvance) => {
          if (revoke) {
            setAdvance(false);
            const receipt = await admitOrProveRevokeReview(database,
              dependencies);
            setAdvance(true, receipt);
          }
          await loadApproval(ref);
          await applyCatchReadinessReviewInFirestore(ref, database,
            dependencies);
        });
    },
    resumeRevoke: async (ref, request) => {
      if (ref !== plan.revokeReviewRef) setupUnavailable();
      await dispatch(ref, request, "revoke-intent", "revoked",
        async (database, dependencies, setAdvance) => {
          // Prove the exact approved receipt and absence of its effect.
          // Existing apply rechecks the frozen receipt digest in its actual
          // transaction, then consumes it with the effect and phase audit.
          setAdvance(false);
          const receipt = await admitOrProveRevokeReview(database,
            dependencies, true);
          setAdvance(true, receipt);
          await applyCatchReadinessReviewInFirestore(ref, database,
            dependencies);
        });
    },
    reconcile: async (ref, action, request) => {
      readOperatorSetupOperation((await db.collection(OPERATOR_SETUP_OPERATIONS)
        .doc(plan.scope.projectId).get()).data(), plan, request);
      const document = await loadApproval(ref);
      if ((action === "revoke") !== (ref === plan.revokeReviewRef)) {
        setupUnavailable();
      }
      if (action === "publish") {
        if (document.state !== "approved") return false;
        await deps.loadTrustedHistoryArchive(document.approval);
        return true;
      }
      const audit = (await db.collection("catchWhatsappReadinessAudits")
        .doc(ref).get()).data();
      if (!audit) return false;
      if (!validateCatchWhatsappReadinessAuditDocument(audit) ||
          audit.approvalId !== ref || audit.actorUid !== plan.scope.actorUid ||
          audit.projectId !== plan.scope.projectId ||
          audit.action !== (action === "revoke" ? "revoke" : "create") ||
          document.state !== "consumed" ||
          document.recordSha256 !== audit.recordSha256) setupUnavailable();
      const record = (await db.collection("catchWhatsappReplyReadiness")
        .doc(audit.readinessId).get()).data();
      if (!validateCatchWhatsappReplyReadinessDocument(record) ||
          catchReadinessRecordDigest(record) !== audit.recordSha256 ||
          record?.state !== (action === "revoke" ? "revoked" : "ready")) {
        setupUnavailable();
      }
      return true;
    },
  };
}
