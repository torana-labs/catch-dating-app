"use strict";

const {createHash} = require("node:crypto");
const {setupHash, setupExact, setupUnavailable: fail} = require("../../lib/catchMessaging/whatsappOperatorSetup.js");
const {operatorBoundAuthorityStore, readOperatorSetupOperation} = require("../../lib/catchMessaging/whatsappOperatorSetupFirestore.js");
const {createOperatorReadinessAdapters} = require("../../lib/catchMessaging/whatsappOperatorSetupSources.js");
const {withCatchFreshAuthContext} = require("../../lib/catchMessaging/whatsappAppAuthorityStore.js");
const {catchReadinessIngressId, catchReadinessPublicationDigest} = require("../../lib/catchMessaging/whatsappReadinessFirestore.js");
const {catchReadinessEvidenceDecisionDigest, prepareCatchReadinessEvidence} = require("../../lib/catchMessaging/whatsappReadinessEvidence.js");
const {catchReadinessRecordDigest} = require("../../lib/catchMessaging/whatsappReadinessProvisioning.js");
const {verifyCatchWhatsappHistoryArchive} = require("../../lib/catchMessaging/whatsappHistoryArchiveVerifier.js");
const {ADMIN_ROLE_CLAIMS} = require("../../lib/platform/adminAuth.js");
const {validateCatchWhatsappReadinessIngressDocument: validIngress} = require("../../lib/shared/generated/validators/catchWhatsappReadinessIngressDocument.js");
const {validateCatchWhatsappReadinessApprovalDocument: validApproval} = require("../../lib/shared/generated/validators/catchWhatsappReadinessApprovalDocument.js");
const {validateCatchWhatsappReadinessAuditDocument: validAudit} = require("../../lib/shared/generated/validators/catchWhatsappReadinessAuditDocument.js");
const {catchWithdrewAllWhatsapp, contactPermissionRef, readContactPermission} = require("../../lib/shared/contactPermissions.js");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const ref = value => typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/u.test(value);
const hash = value => typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
const millis = value => Number.isSafeInteger(value) && value >= 0;
const auditBody = value => value && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length > 0;

// All filenames are fixed from the immutable review reference. This is a
// custody loader for separately admitted owners' ACTUAL audits, not an auditor
// that can manufacture completeness, deployed atomicity or source authenticity.
// The audit-custodian delegation must be separately authorized for live use;
// neither POSIX permissions nor publishing this module supplies that authority.
function createProtectedReadinessRuntime({privateFiles: files, binding,
  now, assertBinding, saved, load, servicesFor, token}) {
  const {plan, request} = structuredClone(saved);
  const scope = plan.scope;
  const reference = plan.createReviewRef;
  const sourceBinding = {planSha256: request.planSha256,
    scopeSha256: setupHash(scope), ...binding};
  const readOnlyPolicy = async digest => {
    assertBinding();
    if (digest !== request.planSha256 || setupHash(load(plan.planId)) !== setupHash({plan, request})) fail();
  };
  const admitted = (allowExpired = false) => {
    const delegation = files.read("readiness-audit-delegation.json");
    setupExact(delegation, ["schemaVersion", "authorityRef", "delegationRef", "ingressOwnerRef", "historyOwnerRef"]);
    if (delegation.schemaVersion !== 1 || ![delegation.authorityRef, delegation.delegationRef,
      delegation.ingressOwnerRef, delegation.historyOwnerRef].every(ref)) fail();
    const admission = files.read(`audit-admissions/${reference}.json`);
    setupExact(admission, ["schemaVersion", "authorityRef", "delegationRef", "scope",
      "ingressAuditSha256", "historyAuditSha256", "archiveSha256", "admittedAtMillis", "expiresAtMillis"]);
    if (admission.schemaVersion !== 1 || admission.authorityRef !== delegation.authorityRef ||
        admission.delegationRef !== delegation.delegationRef || setupHash(admission.scope) !== setupHash(scope) ||
        !millis(admission.admittedAtMillis) || admission.admittedAtMillis > now() ||
        !millis(admission.expiresAtMillis) || admission.expiresAtMillis <= admission.admittedAtMillis ||
        (!allowExpired && admission.expiresAtMillis <= now())) fail();
    const ingress = files.read(`ingress-audits/${reference}.json`);
    const history = files.read(`history-audits/${reference}.json`);
    setupExact(ingress, ["schemaVersion", "scope", "document", "sourceAudit"]);
    setupExact(history, ["schemaVersion", "scope", "trustedPin", "sourceAudit"]);
    if (ingress.schemaVersion !== 1 || history.schemaVersion !== 1 ||
        setupHash(ingress.scope) !== setupHash(scope) || setupHash(history.scope) !== setupHash(scope) ||
        setupHash(ingress) !== admission.ingressAuditSha256 || setupHash(history) !== admission.historyAuditSha256) fail();
    const ia = ingress.sourceAudit;
    setupExact(ia, ["schema", "authorityRef", "authenticationRef", "scopeSha256", "deployedRevisionSha256",
      "atomicIngressStartedAtMillis", "verifiedAtMillis", "audit"]);
    const ha = history.sourceAudit;
    setupExact(ha, ["schema", "authorityRef", "authenticationRef", "scopeSha256", "archiveSha256",
      "objectPath", "generation", "historyFromMillis", "coveredThroughMillis", "atomicIngressStartedAtMillis",
      "sourceAuthenticityAudit", "retentionAudit", "normalizationAudit", "lateArrivalAudit"]);
    const document = ingress.document;
    if (!validIngress(document) || document.state !== "active" ||
        document.ingressId !== catchReadinessIngressId(scope) || document.projectId !== scope.projectId ||
        document.wabaId !== scope.wabaId || document.phoneNumberId !== scope.phoneNumberId ||
        ia.schema !== "catch.atomic-ingress-source-audit/v1" || ia.authorityRef !== delegation.ingressOwnerRef ||
        !ref(ia.authenticationRef) || ia.scopeSha256 !== setupHash(scope) || !auditBody(ia.audit) ||
        !hash(ia.deployedRevisionSha256) || ia.atomicIngressStartedAtMillis !== document.atomicIngressStartedAtMillis ||
        ia.verifiedAtMillis !== document.verifiedAtMillis || document.atomicIngressStartedAtMillis <= 0 ||
        document.verifiedAtMillis < document.atomicIngressStartedAtMillis || document.verifiedAtMillis > now() ||
        sha(JSON.stringify(ia)) !== document.evidenceSha256 ||
        ha.schema !== "catch.history-source-audit/v1" || ha.authorityRef !== delegation.historyOwnerRef ||
        !ref(ha.authenticationRef) || ha.scopeSha256 !== setupHash(scope) || ha.historyFromMillis !== 0 ||
        ha.coveredThroughMillis !== document.atomicIngressStartedAtMillis ||
        ha.atomicIngressStartedAtMillis !== document.atomicIngressStartedAtMillis ||
        !/^catch-whatsapp-history\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.json$/u.test(ha.objectPath) ||
        !/^[1-9][0-9]{0,19}$/u.test(ha.generation) ||
        ![ha.sourceAuthenticityAudit, ha.retentionAudit, ha.normalizationAudit, ha.lateArrivalAudit].every(auditBody) ||
        history.trustedPin?.sourceAuditSha256 !== sha(JSON.stringify(ha))) fail();
    const archiveBytes = Uint8Array.from(files.readBytes(`archives/${reference}.json`, 512 * 1024));
    if (sha(archiveBytes) !== admission.archiveSha256 || ha.archiveSha256 !== admission.archiveSha256 ||
        history.trustedPin?.scope?.evidenceSha256 !== admission.archiveSha256) fail();
    return {delegation, admission, ingress, history, archiveBytes,
      auditBindingSha256: setupHash({delegation, admission, ingress, history}),
      ingressEvidence: {document, sourceAuditSha256: document.evidenceSha256,
        deployedRevisionSha256: ia.deployedRevisionSha256}};
  };
  const current = async (services, work, write = false) => {
    const {store, sources} = services;
    return withCatchFreshAuthContext(store.deps.firebase, {projectId: scope.projectId,
      uids: [...new Set([scope.actorUid, scope.recipientUid])], actorUid: scope.actorUid,
      actorIdToken: await token()}, async context => store.db.runTransaction(async tx => {
      const operation = readOperatorSetupOperation((await tx.get(store.db.collection(
        "catchWhatsappOperatorSetupOperations").doc(scope.projectId))).data(), plan, request);
      if (operation.revision < 9 || operation.revision >= 14) fail();
      const bound = operatorBoundAuthorityStore(store, sources, plan, 3);
      const authorities = await bound.readinessBindings(tx, context, {reviewerUid: scope.actorUid,
        recipientUid: scope.recipientUid, endpointHash: scope.endpointHash});
      const actor = await sources.actor();
      if (actor.auth.creationTimeMillis !== plan.actorCreationTimeMillis ||
          actor.googleSubjectSha256 !== plan.googleSubjectSha256 || actor.emailSha256 !== scope.actorEmailSha256 ||
          setupHash(actor.claims) !== plan.desiredClaimsSha256 ||
          actor.auth.relevantRoles.includes("adminOwner") !== (actor.claims.adminOwner === true) ||
          actor.auth.relevantRoles.includes("support") !== (actor.claims.support === true)) fail();
      await context.recheck();
      const result = work ? await work(tx, actor, authorities, operation) : {actor, authorities, operation};
      await sources.authorizeApply(request.planSha256);
      context.assertHeld();
      return result;
    }, write ? {maxAttempts: 1} : {readOnly: true}), now);
  };
  const sessionFrom = (receipt, approval) => ({projectId: scope.projectId, reviewerUid: scope.actorUid,
    roles: receipt.roles, disabled: receipt.actor.auth.disabled,
    authTimeMillis: receipt.actor.session.authTimeSeconds * 1000,
    tokensValidAfterMillis: receipt.actor.auth.tokensValidAfterMillis,
    observedAtMillis: approval.approval.reviewedAtMillis,
    tokenExpiresAtMillis: receipt.actor.session.expiresAtSeconds * 1000,
    decisionSha256: catchReadinessEvidenceDecisionDigest(approval), authenticationAuditSha256: setupHash(receipt)});
  const reviewed = (allowExpired = false) => {
    const candidate = files.read(`reviewed-readiness/${reference}.json`);
    setupExact(candidate, ["schemaVersion", "planSha256", "scopeSha256", "sourceSha", "executionSha256",
      "auditBindingSha256", "approval", "reviewSession"]);
    const bundle = admitted(allowExpired);
    if (candidate.schemaVersion !== 1 || !validApproval(candidate.approval) ||
        candidate.approval.approvalId !== reference || candidate.approval.approval.action !== "create" ||
        candidate.approval.approval.reviewerUid !== scope.actorUid ||
        candidate.auditBindingSha256 !== bundle.auditBindingSha256 ||
        candidate.approval.ingressEvidenceSha256 !== bundle.ingress.document.evidenceSha256 ||
        Object.entries(sourceBinding).some(([key, value]) => candidate[key] !== value)) fail();
    const receipt = files.read(`authentication-audits/${reference}.json`);
    setupExact(receipt, ["schemaVersion", "kind", "approvalId", "planSha256", "scopeSha256", "sourceSha",
      "executionSha256", "decisionSha256", "actor", "roles", "authorityBindingsSha256"]);
    if (receipt.schemaVersion !== 1 || receipt.kind !== "catch-operator-readiness-auth" || receipt.approvalId !== reference ||
        !hash(receipt.authorityBindingsSha256) || receipt.decisionSha256 !== catchReadinessEvidenceDecisionDigest(candidate.approval) ||
        receipt.actor.auth.uid !== scope.actorUid || receipt.actor.auth.projectId !== scope.projectId ||
        receipt.actor.auth.creationTimeMillis !== plan.actorCreationTimeMillis ||
        receipt.actor.googleSubjectSha256 !== plan.googleSubjectSha256 || receipt.actor.claimsSha256 !== plan.desiredClaimsSha256 ||
        Object.entries(sourceBinding).some(([key, value]) => receipt[key] !== value) ||
        setupHash(sessionFrom(receipt, candidate.approval)) !== setupHash(candidate.reviewSession)) fail();
    verifyCatchWhatsappHistoryArchive({archiveBytes: bundle.archiveBytes, trustedPin: bundle.history.trustedPin,
      approval: candidate.approval.approval, nowMillis: allowExpired ?
        Math.min(now(), candidate.approval.approval.expiresAtMillis - 1) : now()});
    return {candidate, bundle};
  };
  const witness = () => {
    const value = files.read(`pending-publications/${reference}.json`);
    setupExact(value, ["schemaVersion", "approvalId", "planSha256", "scopeSha256", "sourceSha", "executionSha256",
      "readinessSha256", "auditBindingSha256", "publicationSha256"]);
    if (value.schemaVersion !== 1 || value.approvalId !== reference || !hash(value.publicationSha256) ||
        Object.entries(sourceBinding).some(([key, expected]) => value[key] !== expected)) fail();
    return value;
  };
  const publicationAudit = (allowExpired = false) => {
    const receipt = files.read(`publication-audits/${reference}.json`);
    setupExact(receipt, ["schemaVersion", "authorityRef", "delegationRef", "approvalId", "planSha256", "scopeSha256",
      "sourceSha", "executionSha256", "publicationSha256", "witnessSha256", "reviewedAtMillis", "expiresAtMillis"]);
    const {candidate, bundle} = reviewed(allowExpired);
    const pending = witness();
    if (receipt.schemaVersion !== 1 || receipt.authorityRef !== bundle.delegation.authorityRef ||
        receipt.delegationRef !== bundle.delegation.delegationRef || receipt.approvalId !== reference ||
        Object.entries(sourceBinding).some(([key, expected]) => receipt[key] !== expected) ||
        receipt.publicationSha256 !== pending.publicationSha256 || receipt.witnessSha256 !== setupHash(pending) ||
        pending.readinessSha256 !== setupHash(candidate) || pending.auditBindingSha256 !== bundle.auditBindingSha256 ||
        !millis(receipt.reviewedAtMillis) || receipt.reviewedAtMillis > now() ||
        !millis(receipt.expiresAtMillis) || receipt.expiresAtMillis <= receipt.reviewedAtMillis ||
        (!allowExpired && receipt.expiresAtMillis <= now()) ||
        receipt.expiresAtMillis > candidate.approval.approval.expiresAtMillis) fail();
    return receipt;
  };
  const evidence = () => ({actualProjectId: scope.projectId, now,
    loadAuthenticatedReview: async id => {
      if (id !== reference) fail();
      const {candidate} = reviewed();
      return {approval: candidate.approval, reviewSession: candidate.reviewSession};
    },
    loadVerifiedAtomicIngress: async approval => {
      const {candidate, bundle} = reviewed();
      if (setupHash(approval) !== setupHash(candidate.approval)) fail();
      return bundle.ingressEvidence;
    },
    loadAuditedArchive: async approval => {
      const {candidate, bundle} = reviewed();
      if (setupHash(approval) !== setupHash(candidate.approval.approval)) fail();
      return {archiveBytes: Uint8Array.from(bundle.archiveBytes), trustedPin: structuredClone(bundle.history.trustedPin)};
    }});
  const attach = (services) => {
    services.sources.readiness = createOperatorReadinessAdapters({plan, sources: services.sources,
      store: services.store, actorIdToken: token, evidence: evidence(),
      publicationAudit: {verifyImmutablePublication: async actual => {
        const receipt = publicationAudit();
        if (actual.projectId !== scope.projectId || actual.approvalId !== reference ||
            actual.publicationSha256 !== receipt.publicationSha256) fail();
      }}});
    return services;
  };
  const readPublication = async (services, tx, candidate, bundle, pending, operation) => {
    if (!["published", "readiness-intent", "ready"].includes(operation.phase)) fail();
    const value = (await tx.get(services.store.db.collection("catchWhatsappReadinessPublications").doc(reference))).data();
    setupExact(value, ["approval", "archive", "authorityFenceSha256", "ingress", "projectId", "publicationSha256", "reviewSession"]);
    if (!value || value.projectId !== scope.projectId || !(value.archive?.archiveBytes instanceof Uint8Array) ||
        !hash(value.authorityFenceSha256) || !hash(value.publicationSha256) ||
        value.archive.archiveBytes.byteLength > 512 * 1024 ||
        catchReadinessPublicationDigest(value) !== pending.publicationSha256 ||
        value.publicationSha256 !== pending.publicationSha256 || setupHash(value.approval) !== setupHash(candidate.approval) ||
        setupHash(value.reviewSession) !== setupHash(candidate.reviewSession) ||
        setupHash(value.ingress) !== setupHash(bundle.ingressEvidence) || sha(value.archive.archiveBytes) !== bundle.admission.archiveSha256 ||
        setupHash(value.archive.trustedPin) !== setupHash(bundle.history.trustedPin) ||
        pending.readinessSha256 !== setupHash(candidate) || pending.auditBindingSha256 !== bundle.auditBindingSha256) fail();
  };
  const runtime = {
    authorizationBinding(action) {
      if (!["readiness-ingress", "readiness-publish", "readiness-apply"].includes(action)) fail();
      const {candidate, bundle} = reviewed();
      const audit = action === "readiness-apply" ? publicationAudit() : null;
      return {readinessSha256: setupHash(candidate), auditBindingSha256: bundle.auditBindingSha256,
        expiresAtMillis: Math.min(candidate.approval.approval.expiresAtMillis, bundle.admission.expiresAtMillis,
          audit?.expiresAtMillis ?? Number.MAX_SAFE_INTEGER),
        ...(audit ? {publicationAuditSha256: setupHash(audit)} : {})};
    },
    async plan() {
      await readOnlyPolicy(request.planSha256);
      const bundle = admitted(); // Missing delegation/admission fails before SDK.
      const {actor, authorities} = await current(servicesFor(saved, readOnlyPolicy));
      const reviewedAtMillis = now();
      const approval = {schemaVersion: 1, approvalId: reference, approval: {approvalId: reference,
        action: "create", scope: {projectId: scope.projectId, wabaId: scope.wabaId, phoneNumberId: scope.phoneNumberId,
          recipientUid: scope.recipientUid, endpointHash: scope.endpointHash, evidenceSha256: bundle.admission.archiveSha256},
        reviewerUid: scope.actorUid, reviewedAtMillis,
        expiresAtMillis: Math.min(reviewedAtMillis + 10 * 60 * 1000, actor.session.expiresAtSeconds * 1000,
          bundle.admission.expiresAtMillis),
        atomicIngressStartedAtMillis: bundle.ingress.document.atomicIngressStartedAtMillis, expectedRecordSha256: null},
      state: "approved", ingressEvidenceSha256: bundle.ingress.document.evidenceSha256, consumedAtMillis: null, recordSha256: null};
      const receipt = {schemaVersion: 1, kind: "catch-operator-readiness-auth", approvalId: reference,
        ...sourceBinding, decisionSha256: catchReadinessEvidenceDecisionDigest(approval),
        actor: {auth: actor.auth, session: actor.session, googleSubjectSha256: actor.googleSubjectSha256,
          claimsSha256: setupHash(actor.claims)}, roles: ADMIN_ROLE_CLAIMS.filter(role => actor.claims[role] === true),
        authorityBindingsSha256: setupHash(authorities)};
      const reviewSession = sessionFrom(receipt, approval);
      await prepareCatchReadinessEvidence(reference, {actualProjectId: scope.projectId, now,
        loadAuthenticatedReview: async () => ({approval, reviewSession}),
        loadVerifiedAtomicIngress: async () => bundle.ingressEvidence,
        loadAuditedArchive: async () => ({archiveBytes: bundle.archiveBytes, trustedPin: bundle.history.trustedPin})});
      files.create(`authentication-audits/${reference}.json`, receipt);
      const candidate = {schemaVersion: 1, ...sourceBinding, auditBindingSha256: bundle.auditBindingSha256, approval, reviewSession};
      files.create(`pending-readiness/${reference}.json`, candidate);
      return {kind: "catch-operator-readiness-plan", planId: plan.planId, readinessSha256: setupHash(candidate),
        auditBindingSha256: bundle.auditBindingSha256, expiresAtMillis: approval.approval.expiresAtMillis, reviewed: false};
    },
    async ingress(policy) {
      const services = servicesFor(saved, policy);
      const {bundle} = reviewed();
      try {
        const state = await current(services, async (tx, actor, authorities, operation) => {
          if (operation.phase !== "complete") fail();
          const ref = services.store.db.collection("catchWhatsappReadinessIngress").doc(bundle.ingress.document.ingressId);
          const prior = await tx.get(ref);
          if (prior.exists) {
            if (setupHash(prior.data()) !== setupHash(bundle.ingress.document)) fail();
            return "exact-ingress-observed";
          }
          await policy(request.planSha256);
          tx.create(ref, structuredClone(bundle.ingress.document));
          return "ingress-created";
        }, true);
        return {kind: "catch-operator-ingress", state};
      } catch {return {kind: "catch-operator-ingress", state: "reconciliation-required"};}
    },
    async publish(policy) {
      const {candidate, bundle} = reviewed();
      const services = attach(servicesFor(saved, policy, db => new Proxy(db, {get(target, key) {
        if (key === "runTransaction") return (callback, options) => target.runTransaction(async tx => {
          const wrapped = new Proxy(tx, {get(transaction, method) {
            if (method === "create") return (ref, value) => {
              if (ref.path === `catchWhatsappReadinessPublications/${reference}`) {
                files.create(`pending-publications/${reference}.json`, {schemaVersion: 1, approvalId: reference,
                  ...sourceBinding, readinessSha256: setupHash(candidate), auditBindingSha256: bundle.auditBindingSha256,
                  publicationSha256: catchReadinessPublicationDigest(value)});
              }
              return transaction.create(ref, value);
            };
            const value = Reflect.get(transaction, method, transaction);
            return typeof value === "function" ? value.bind(transaction) : value;
          }});
          const result = await callback(wrapped);
          await policy(request.planSha256); // Exact action reread before the SDK commits queued writes.
          return result;
        }, options);
        const value = Reflect.get(target, key, target);
        return typeof value === "function" ? value.bind(target) : value;
      }})));
      let result;
      try {result = await services.engine.readiness(request, "publish");}
      catch {result = {state: "reconciliation-required"};}
      // Publication can commit before independent publication-review admission.
      // Its pre-write witness is only integrity evidence, never authorization.
      try {
        const operation = await services.journal.read(plan, request);
        if (operation.phase === "published") {
          await runtime.review();
          result = {state: "publication-review-required"};
        }
      } catch { /* Preserve unknown outcomes without redispatch. */ }
      return {kind: "catch-operator-readiness-publication", state: result.state, planSha256: request.planSha256};
    },
    async review() {
      await readOnlyPolicy(request.planSha256);
      const {candidate, bundle} = reviewed(true);
      const pending = witness();
      const services = servicesFor(saved, readOnlyPolicy);
      await current(services, (tx, actor, authorities, operation) =>
        readPublication(services, tx, candidate, bundle, pending, operation));
      return {kind: "catch-operator-publication-review", planId: plan.planId, approvalId: reference,
        publicationSha256: pending.publicationSha256, witnessSha256: setupHash(pending), approved: false};
    },
    async observe() {
      await readOnlyPolicy(request.planSha256);
      const {candidate, bundle} = reviewed(true);
      const pending = witness();
      const admittedPublication = publicationAudit(true);
      const services = servicesFor(saved, readOnlyPolicy);
      return current(services, async (tx, actor, authorities, operation) => {
        if (operation.phase !== "ready") fail();
        await readPublication(services, tx, candidate, bundle, pending, operation);
        const endpointKey = sha(JSON.stringify([scope.wabaId, scope.phoneNumberId, scope.endpointHash]));
        const read = async (collection, id) => tx.get(services.store.db.collection(collection).doc(id));
        const catchPermission = contactPermissionRef(services.store.db, scope.recipientUid, {kind: "catch"});
        const [approvalSnap, auditSnap, recordSnap, ingressSnap, stop, pref, deleted] = await Promise.all([
          read("catchWhatsappReadinessApprovals", reference), read("catchWhatsappReadinessAudits", reference),
          read("catchWhatsappReplyReadiness", "cwready_" + endpointKey),
          read("catchWhatsappReadinessIngress", bundle.ingress.document.ingressId),
          read("catchWhatsappEndpointStops", "cwstop_" + endpointKey),
          tx.get(catchPermission), read("deletedUsers", scope.recipientUid)]);
        const audit = auditSnap.data();
        const record = recordSnap.data();
        const approval = candidate.approval.approval;
        const proof = verifyCatchWhatsappHistoryArchive({archiveBytes: bundle.archiveBytes, trustedPin: bundle.history.trustedPin,
          approval, nowMillis: Math.min(now(), approval.expiresAtMillis - 1)});
        const expected = {schemaVersion: 1, readinessId: "cwready_" + endpointKey, wabaId: scope.wabaId,
          phoneNumberId: scope.phoneNumberId, recipientUid: scope.recipientUid, endpointHash: scope.endpointHash,
          purpose: "serviceSupport", state: "ready", completeHistory: true, historyFromMillis: 0,
          coveredThroughMillis: proof.coveredThroughMillis, atomicIngressStartedAtMillis: approval.atomicIngressStartedAtMillis,
          evidenceSha256: approval.scope.evidenceSha256, reviewedByUid: scope.actorUid,
          reviewedAtMillis: approval.reviewedAtMillis, expiresAtMillis: approval.expiresAtMillis,
          appAuthorityBindings: authorities};
        if (!validAudit(audit) || !hash(audit.authorityFenceSha256) ||
            audit.atMillis < admittedPublication.reviewedAtMillis || audit.atMillis < approval.reviewedAtMillis ||
            audit.atMillis >= approval.expiresAtMillis || audit.atMillis > now() ||
            setupHash(record) !== setupHash(expected) ||
            setupHash(audit) !== setupHash({schemaVersion: 1, auditId: reference, approvalId: reference,
              action: "create", projectId: scope.projectId, actorUid: scope.actorUid, atMillis: audit.atMillis,
              provenanceSha256: proof.provenanceSha256, recordSha256: catchReadinessRecordDigest(record),
              readinessId: record.readinessId, authorityFenceSha256: audit.authorityFenceSha256}) ||
            setupHash(approvalSnap.data()) !== setupHash({...candidate.approval, state: "consumed",
              consumedAtMillis: audit.atMillis, recordSha256: audit.recordSha256}) ||
            setupHash(ingressSnap.data()) !== setupHash(bundle.ingress.document)) fail();
        const permission = readContactPermission(pref.data(), {kind: "catch"});
        const withdrewAll = permission !== null &&
          await catchWithdrewAllWhatsapp((ref) => tx.get(ref), services.store.db, permission);
        return now() < record.expiresAtMillis && !stop.exists && !deleted.exists &&
          (!pref.exists || (permission !== null && !withdrewAll));
      });
    },
    async apply(policy) {
      const services = attach(servicesFor(saved, policy));
      const result = await services.engine.readiness(request, "apply");
      return {kind: "catch-operator-readiness-apply", state: result.state, planSha256: request.planSha256};
    },
  };
  return runtime;
}

module.exports = {createProtectedReadinessRuntime};
