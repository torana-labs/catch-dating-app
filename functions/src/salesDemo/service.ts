import {PARTNER_TERMS_VERSION, hash as partnerHash} from "../partners/model";
import {partnerDemoPreviewMaterial, proposalWording,
  type PartnerDemoReviewGrant,
  type PartnerDemoPreviewProposal} from "./partnerReview";
import {assertSalesMaterialPrivacyOpen} from "../admin/sales/privacyBoundary";
import {assertSalesPrivacyOpen, assertSalesPrivacyOpenRead} from
  "../admin/salesPrivacy/model";
import {organizerFormTemplateCatalog} from
  "../shared/generated/catalogs/organizerFormTemplateCatalog";
import {checkDemoSalesLinks, prepareDemoSalesActivity} from "./salesActivity";
import {HttpsError} from "firebase-functions/v2/https";
import {createAdminAuditLogInTransaction} from "../platform/adminAudit";
import {Timestamp} from "firebase-admin/firestore";
import {
  classifyCommandReceiptData,
  commandReceiptRef,
  commandRequestHash,
  writeCommandReceipt,
} from "../shared/commandReceipts";
import {authorizeFormMutation} from "../organizers/organizerFormTarget";
import {createOrganizerFormInTransaction} from "../organizers/organizerForms";
import {currentSetupPlan, reviewedSetupPlan, setupPlanHash} from
  "./setupPlan";
import {createHash, createHmac, timingSafeEqual, randomBytes} from
  "node:crypto";
import {DEMO_ACTIONS, DEMO_CAPABILITY, Blueprint, ContactBinding,
  CurrentUser, DemoAction, Identity, Invitation, Preview, Session,
  contact, fail, fieldMappings, formReview, grantToken, id, only,
  optionalId, positive, preview,
  record, requestId, revision} from "./model";

const BLUEPRINTS = "salesDemoBlueprints";
const INVITATIONS = "salesDemoInvitations";
const SESSIONS = "salesDemoSessions";
/** One replay command for every Sales demo request id, so an id reused
 * across actions still conflicts. */
const RECEIPT_COMMAND = "salesDemo";
const CAPABILITIES = "salesDemoCapabilities";
const MAX_SESSION_ACTIONS = 20;
const MAX_START_RECEIPTS = 12;
const MAX_STARTS_PER_MINUTE = 6;
const DAY = 86_400_000;

export interface DemoDeps {
  db: FirebaseFirestore.Firestore;
  now(): Date;
  getUser(uid: string): Promise<CurrentUser>;
  tokenKey(): Uint8Array;
}

function key(deps: DemoDeps): Uint8Array {
  const secret = deps.tokenKey();
  if (secret.length < 32) {
    return fail("failed-precondition", "Demo signing key is unavailable.");
  }
  return secret;
}
function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
function hmac(secret: Uint8Array, value: string): Buffer {
  return createHmac("sha256", secret).update(value).digest();
}
function receiptId(uid: string, stableRequestId: string): string {
  return hash(`${uid}\u0000${stableRequestId}`);
}
function receiptRefFor(deps: DemoDeps, uid: string,
  stableRequestId: string): FirebaseFirestore.DocumentReference {
  return commandReceiptRef(deps.db, RECEIPT_COMMAND,
    receiptId(uid, stableRequestId));
}
function receiptRequestHash(identity: Identity, action: string,
  target: string, digest: string): string {
  return commandRequestHash(identity.uid, action, target, digest);
}
/** The stored result of an exact retry, or undefined for a new request. */
function replayedResult(deps: DemoDeps, saved: unknown, identity: Identity,
  action: string, target: string, digest: string):
  Record<string, unknown> | undefined {
  const lookup = classifyCommandReceiptData<Record<string, unknown>>(saved, {
    command: RECEIPT_COMMAND,
    requestHash: receiptRequestHash(identity, action, target, digest),
    nowMillis: deps.now().getTime(),
  });
  if (lookup.kind === "none") return undefined;
  if (lookup.kind === "conflict" || !lookup.result) {
    return fail("already-exists", "Request id has different material.");
  }
  return lookup.result;
}
function writeReceipt(deps: DemoDeps, tx: FirebaseFirestore.Transaction,
  ref: FirebaseFirestore.DocumentReference, identity: Identity,
  action: string, target: string, digest: string,
  result: Record<string, unknown>): void {
  writeCommandReceipt(tx, ref, {command: RECEIPT_COMMAND,
    retention: "request",
    requestHash: receiptRequestHash(identity, action, target, digest),
    result, nowMillis: deps.now().getTime()});
}
function invitationIdFor(secret: Uint8Array, uid: string,
  stableRequestId: string): string {
  return hmac(secret, `invitation\u0000${uid}\u0000${stableRequestId}`)
    .subarray(0, 18).toString("base64url");
}
function tokenFor(secret: Uint8Array, uid: string,
  stableRequestId: string, invitationId: string): string {
  return hmac(secret,
    `grant\u0000${uid}\u0000${stableRequestId}\u0000${invitationId}`)
    .toString("base64url");
}
function contactDigest(secret: Uint8Array,
  value: {kind: "email" | "phone"; value: string}): ContactBinding {
  return {kind: value.kind,
    digest: hmac(secret, `contact\u0000${value.kind}\u0000${value.value}`)
      .toString("hex")};
}
function exactDigest(expected: string, actual: string): boolean {
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(actual, "hex");
  return a.length === 32 && b.length === 32 && timingSafeEqual(a, b);
}
function boundContact(identity: Identity, user: CurrentUser,
  binding: ContactBinding, secret: Uint8Array): boolean {
  if (binding.kind === "email") {
    if (identity.token.email_verified !== true ||
        user.emailVerified !== true ||
        typeof identity.token.email !== "string" || !user.email ||
        identity.token.email.trim().toLowerCase() !==
          user.email.trim().toLowerCase()) return false;
    return exactDigest(binding.digest, contactDigest(secret, {kind: "email",
      value: user.email.trim().toLowerCase()}).digest);
  }
  if (typeof identity.token.phone_number !== "string" ||
      !user.phoneNumber || identity.token.phone_number !== user.phoneNumber) {
    return false;
  }
  return exactDigest(binding.digest, contactDigest(secret, {kind: "phone",
    value: user.phoneNumber}).digest);
}
function currentToken(identity: Identity, user: CurrentUser): void {
  const authenticatedAt = identity.token.auth_time;
  const validAfter = typeof user.tokensValidAfterTime === "string" ?
    Date.parse(user.tokensValidAfterTime) : Number.NaN;
  if (typeof authenticatedAt !== "number" ||
      !Number.isInteger(authenticatedAt) || authenticatedAt <= 0 ||
      !Number.isFinite(validAfter) ||
      authenticatedAt * 1000 < validAfter) {
    fail("permission-denied", "Firebase session is no longer current.");
  }
}
async function owner(deps: DemoDeps, identity: Identity): Promise<void> {
  const user = await deps.getUser(identity.uid);
  currentToken(identity, user);
  if (user.disabled || user.customClaims?.adminOwner !== true ||
      identity.token === undefined) {
    fail("permission-denied", "Current Admin Owner required.");
  }
}
function material(action: string, target: string,
  payload: Record<string, unknown>): string {
  return hash(JSON.stringify({action, target, payload}));
}
interface MutationResult {result: Record<string, unknown>;
  beforeRevision: number; afterRevision: number}
interface CapabilityGate {capability: typeof DEMO_CAPABILITY;
  revision: string; evidenceRevision: string; enabled: boolean}
async function availableSalesAccount(deps: DemoDeps,
  organizerId: string | null,
  tx?: FirebaseFirestore.Transaction): Promise<void> {
  if (!organizerId) return;
  if (tx) await assertSalesPrivacyOpen(tx, deps.db, organizerId);
  else await assertSalesPrivacyOpenRead(deps.db, organizerId);
  const ref = deps.db.collection("organizerSalesAccounts").doc(organizerId);
  const account = (tx ? await tx.get(ref) : await ref.get()).data();
  if (account && (account.classification !== "sales_private" ||
      account.organizerId !== organizerId ||
      account.researchStatus === "archived" ||
      account.suppressionStatus !== "clear" ||
      account.duplicateReviewRequired === true)) {
    fail("failed-precondition",
      "This Sales account is unavailable for a private demo.");
  }
}
async function invitationPrivacy(deps: DemoDeps, blueprintId: unknown,
  tx?: FirebaseFirestore.Transaction): Promise<void> {
  if (typeof blueprintId !== "string") {
    fail("failed-precondition", "Invitation scope is unavailable.");
  }
  const ref = deps.db.collection(BLUEPRINTS).doc(id(blueprintId));
  const blueprint = (tx ? await tx.get(ref) : await ref.get()).data();
  if (!blueprint) {
    fail("failed-precondition", "Invitation scope is unavailable.");
  }
  await assertSalesMaterialPrivacyOpen(deps.db, blueprint, tx);
}
async function currentCapability(deps: DemoDeps,
  tx?: FirebaseFirestore.Transaction): Promise<CapabilityGate> {
  const ref = deps.db.collection(CAPABILITIES).doc(DEMO_CAPABILITY);
  const snap = tx ? await tx.get(ref) : await ref.get();
  const gate = snap.data() as CapabilityGate | undefined;
  if (!gate || gate.capability !== DEMO_CAPABILITY ||
      gate.enabled !== true || typeof gate.revision !== "string" ||
      gate.revision.length < 3 ||
      typeof gate.evidenceRevision !== "string" ||
      gate.evidenceRevision.length < 3) {
    return fail("failed-precondition", "Current demo capability unavailable.");
  }
  return gate;
}
async function adminMutation(deps: DemoDeps, identity: Identity,
  action: string, target: string, stableRequestId: string,
  input: Record<string, unknown>, apply: (tx: FirebaseFirestore.Transaction) =>
    Promise<MutationResult>,
  actorFields: string[] = []): Promise<Record<string, unknown>> {
  await owner(deps, identity);
  const digest = material(action, target, input);
  const receiptRef = receiptRefFor(deps, identity.uid, stableRequestId);
  const auditId = `sales_demo_${receiptId(identity.uid, stableRequestId)}`;
  // The receipt keeps no actor ids; the request hash binds the actor, so a
  // replay restores them from the caller.
  const withActor = (result: Record<string, unknown>) => ({...result,
    ...Object.fromEntries(actorFields.map((field) => [field, identity.uid]))});
  return deps.db.runTransaction(async (tx) => {
    await owner(deps, identity);
    await assertSalesMaterialPrivacyOpen(deps.db, input, tx);
    const targetCollection = action.includes("blueprint") ?
      BLUEPRINTS : INVITATIONS;
    const scopedTarget = (await tx.get(deps.db.collection(targetCollection)
      .doc(target))).data();
    await assertSalesMaterialPrivacyOpen(deps.db, scopedTarget, tx);
    if (action.includes("invitation")) {
      await invitationPrivacy(deps,
        scopedTarget?.blueprintId ?? input.blueprintId, tx);
    }
    const receipt = await tx.get(receiptRef);
    const saved = replayedResult(deps, receipt.data(), identity, action,
      target, digest);
    if (saved) {
      await assertSalesMaterialPrivacyOpen(deps.db, saved, tx);
      return withActor(saved);
    }
    const changed = await apply(tx);
    writeReceipt(deps, tx, receiptRef, identity, action, target, digest,
      Object.fromEntries(Object.entries(changed.result)
        .filter(([field]) => !actorFields.includes(field))));
    createAdminAuditLogInTransaction(tx, deps.db,
      {uid: identity.uid, roles: ["adminOwner"]}, {
        action, targetPath: action.includes("blueprint") ?
          `${BLUEPRINTS}/${target}` : `${INVITATIONS}/${target}`,
        requestId: stableRequestId,
        before: {revision: changed.beforeRevision},
        after: {revision: changed.afterRevision, materialHash: digest},
      }, {docId: auditId});
    return changed.result;
  });
}

/** Save a draft; editing a reviewed blueprint creates a new draft revision. */
export async function saveBlueprint(deps: DemoDeps, identity: Identity,
  raw: unknown): Promise<Record<string, unknown>> {
  const body = record(raw);
  only(body, ["requestId", "blueprintId", "expectedRevision",
    "organizerId", "candidateId", "opportunityId", "evidenceRevision",
    "preview", "formCapabilityReview", "fieldMappings", "setupPlan"]);
  const stableRequestId = requestId(body.requestId);
  const blueprintId = id(body.blueprintId);
  const expected = revision(body.expectedRevision);
  const organizerId = optionalId(body.organizerId);
  const candidateId = optionalId(body.candidateId);
  if (Boolean(organizerId) === Boolean(candidateId)) {
    return fail("invalid-argument", "Choose one organizer or candidate.");
  }
  const opportunityId = optionalId(body.opportunityId);
  const evidenceRevision = id(body.evidenceRevision);
  const publicPreview = preview(body.preview);
  const capabilityReview = formReview(body.formCapabilityReview);
  const mappings = fieldMappings(body.fieldMappings);
  const setupPlan = reviewedSetupPlan(body.setupPlan);
  if (publicPreview.limitations.length === 0) {
    return fail("invalid-argument", "Disclose simulation limitations.");
  }
  const ref = deps.db.collection(BLUEPRINTS).doc(blueprintId);
  return adminMutation(deps, identity, "salesDemo.blueprint.save",
    blueprintId, stableRequestId,
    {expected, organizerId, candidateId, opportunityId, evidenceRevision,
      publicPreview, capabilityReview, mappings, setupPlan}, async (tx) => {
      const [old, gate] = await Promise.all([
        tx.get(ref), currentCapability(deps, tx),
      ]);
      const current = old.data() as Blueprint | undefined;
      if (Number(current?.revision ?? 0) !== expected) {
        return fail("failed-precondition", "Blueprint revision changed.");
      }
      if (current?.state === "withdrawn" ||
          evidenceRevision !== gate.evidenceRevision) {
        return fail("failed-precondition", "Current evidence review required.");
      }
      await availableSalesAccount(deps, organizerId, tx);
      await checkDemoSalesLinks(tx, deps.db, organizerId, opportunityId);
      const updatedAt = deps.now().toISOString();
      const next: Blueprint = {schemaVersion: 1,
        classification: "sales_private", blueprintId,
        revision: expected + 1, state: "draft", organizerId, candidateId,
        opportunityId, capability: DEMO_CAPABILITY,
        capabilityRevision: gate.revision, evidenceRevision,
        seedVersion: 1, formCapabilityReview: capabilityReview,
        fieldMappings: mappings, setupPlan, preview: publicPreview,
        reviewedByUid: null,
        reviewedAt: null, updatedAt, updatedByUid: identity.uid};
      tx.set(ref, next);
      return {result: {blueprintId, revision: next.revision,
        state: next.state}, beforeRevision: expected,
      afterRevision: next.revision};
    });
}

export async function reviewBlueprint(deps: DemoDeps, identity: Identity,
  raw: unknown): Promise<Record<string, unknown>> {
  const body = record(raw);
  only(body, ["requestId", "blueprintId", "expectedRevision"]);
  const stableRequestId = requestId(body.requestId);
  const blueprintId = id(body.blueprintId);
  const expected = revision(body.expectedRevision);
  const ref = deps.db.collection(BLUEPRINTS).doc(blueprintId);
  return adminMutation(deps, identity, "salesDemo.blueprint.review",
    blueprintId, stableRequestId, {expected}, async (tx) => {
      const [snap, gate] = await Promise.all([
        tx.get(ref), currentCapability(deps, tx),
      ]);
      const source = snap.data() as Blueprint | undefined;
      if (!source || source.state !== "draft" ||
          source.revision !== expected ||
          source.capability !== DEMO_CAPABILITY ||
          source.capabilityRevision !== gate.revision ||
          source.evidenceRevision !== gate.evidenceRevision) {
        return fail("failed-precondition", "Current draft review required.");
      }
      await availableSalesAccount(deps, source.organizerId, tx);
      await checkDemoSalesLinks(tx, deps.db, source.organizerId,
        source.opportunityId);
      currentSetupPlan(source.setupPlan);
      const reviewedAt = deps.now().toISOString();
      const result = {blueprintId, revision: expected + 1,
        state: "reviewed", reviewedAt};
      tx.update(ref, {...result, reviewedByUid: identity.uid,
        updatedAt: reviewedAt, updatedByUid: identity.uid});
      return {result, beforeRevision: expected,
        afterRevision: expected + 1};
    });
}

export async function withdrawBlueprint(deps: DemoDeps, identity: Identity,
  raw: unknown): Promise<Record<string, unknown>> {
  const body = record(raw);
  only(body, ["requestId", "blueprintId", "expectedRevision"]);
  const stableRequestId = requestId(body.requestId);
  const blueprintId = id(body.blueprintId);
  const expected = revision(body.expectedRevision);
  const ref = deps.db.collection(BLUEPRINTS).doc(blueprintId);
  return adminMutation(deps, identity, "salesDemo.blueprint.withdraw",
    blueprintId, stableRequestId, {expected}, async (tx) => {
      const snap = await tx.get(ref);
      const source = snap.data() as Blueprint | undefined;
      if (!source || source.state === "withdrawn" ||
          source.revision !== expected) {
        return fail("failed-precondition", "Blueprint revision changed.");
      }
      const updatedAt = deps.now().toISOString();
      const result = {blueprintId, revision: expected + 1,
        state: "withdrawn"};
      tx.update(ref, {...result, updatedAt, updatedByUid: identity.uid});
      return {result, beforeRevision: expected,
        afterRevision: expected + 1};
    });
}

export async function issueInvitation(deps: DemoDeps, identity: Identity,
  raw: unknown): Promise<Record<string, unknown>> {
  const body = record(raw);
  only(body, ["requestId", "blueprintId", "blueprintRevision",
    "contactBinding", "expiresAt", "sessionCap"]);
  const stableRequestId = requestId(body.requestId);
  const blueprintId = id(body.blueprintId);
  const blueprintRevision = revision(body.blueprintRevision);
  const binding = contact(body.contactBinding);
  const expiresAt = typeof body.expiresAt === "string" ?
    Date.parse(body.expiresAt) : Number.NaN;
  if (!Number.isFinite(expiresAt)) {
    return fail("invalid-argument", "Valid invitation expiry required.");
  }
  const sessionCap = positive(body.sessionCap, 3);
  const secret = key(deps);
  await owner(deps, identity);
  const issueAction = "salesDemo.invitation.issue";
  const issueInput = {blueprintId, blueprintRevision,
    contactBinding: binding,
    expiresAt: new Date(expiresAt).toISOString(), sessionCap};
  // An exact retry keeps the invitation id it was first issued under, even
  // after the signing key changes; anything else derives it afresh.
  const prior = (await receiptRefFor(deps, identity.uid, stableRequestId)
    .get()).data();
  const priorId = (prior?.result as Record<string, unknown> | undefined)
    ?.invitationId;
  const previousId = typeof priorId === "string" &&
    classifyCommandReceiptData(prior, {command: RECEIPT_COMMAND,
      requestHash: receiptRequestHash(identity, issueAction, priorId,
        material(issueAction, priorId, issueInput)),
      nowMillis: deps.now().getTime()}).kind === "replay" ? priorId : null;
  const invitationId = typeof previousId === "string" ?
    id(previousId) : invitationIdFor(secret, identity.uid, stableRequestId);
  const issuedToken = tokenFor(secret, identity.uid, stableRequestId,
    invitationId);
  const bindingDigest = binding ? contactDigest(secret, binding) : null;
  const ref = deps.db.collection(INVITATIONS).doc(invitationId);
  const result = await adminMutation(deps, identity,
    issueAction, invitationId, stableRequestId, issueInput,
    async (tx) => {
      const [old, blueprintSnap, gate] = await Promise.all([
        tx.get(ref),
        tx.get(deps.db.collection(BLUEPRINTS).doc(blueprintId)),
        currentCapability(deps, tx),
      ]);
      const blueprint = blueprintSnap.data() as Blueprint | undefined;
      if (old.exists || !blueprint || blueprint.state !== "reviewed" ||
          blueprint.revision !== blueprintRevision ||
          blueprint.capability !== DEMO_CAPABILITY ||
          blueprint.capabilityRevision !== gate.revision ||
          blueprint.evidenceRevision !== gate.evidenceRevision) {
        return fail("failed-precondition", "Reviewed blueprint required.");
      }
      await availableSalesAccount(deps, blueprint.organizerId, tx);
      const now = deps.now();
      if (expiresAt <= now.getTime() ||
          expiresAt > now.getTime() + 7 * DAY) {
        return fail("invalid-argument", "Expiry must be within seven days.");
      }
      const issuedAt = now.toISOString();
      const doc: Invitation = {schemaVersion: 1,
        classification: "sales_private", invitationId, blueprintId,
        blueprintRevision, tokenDigest: hash(issuedToken),
        contactBinding: bindingDigest, expiresAt: new Date(expiresAt)
          .toISOString(), revoked: false, revision: 1, sessionCap,
        sessionCount: 0, startReceiptCount: 0,
        startWindowMinute: 0, startWindowCount: 0,
        currentSessionId: null,
        issuedByUid: identity.uid, issuedAt};
      tx.create(ref, doc);
      return {result: {invitationId, blueprintId,
        blueprintRevision, previewOnly: !bindingDigest,
        expiresAt: doc.expiresAt, revision: 1},
      beforeRevision: 0, afterRevision: 1};
    });
  const currentInvite = await ref.get();
  if (!exactDigest(String(currentInvite.data()?.tokenDigest ?? ""),
    hash(issuedToken))) {
    return fail("failed-precondition",
      "Grant key changed; issue a new invitation.");
  }
  // The grant is recomputed on exact replay; only its digest is persisted.
  return {...result, grantToken: issuedToken};
}

export async function revokeInvitation(deps: DemoDeps, identity: Identity,
  raw: unknown): Promise<Record<string, unknown>> {
  const body = record(raw);
  only(body, ["requestId", "invitationId", "expectedRevision"]);
  const stableRequestId = requestId(body.requestId);
  const invitationId = id(body.invitationId);
  const expected = revision(body.expectedRevision);
  const ref = deps.db.collection(INVITATIONS).doc(invitationId);
  return adminMutation(deps, identity, "salesDemo.invitation.revoke",
    invitationId, stableRequestId, {expected}, async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.data() as Invitation | undefined;
      if (!current || current.revoked || current.revision !== expected) {
        return fail("failed-precondition", "Invitation revision changed.");
      }
      const revokedAt = deps.now().toISOString();
      const result = {invitationId, revoked: true,
        revision: expected + 1, revokedAt, revokedByUid: identity.uid};
      tx.update(ref, result);
      return {result, beforeRevision: expected,
        afterRevision: expected + 1};
    }, ["revokedByUid"]);
}

async function validInvitation(deps: DemoDeps,
  invitation: Invitation | undefined,
  blueprint: Blueprint | undefined,
  tx?: FirebaseFirestore.Transaction): Promise<Invitation> {
  const gate = await currentCapability(deps, tx);
  if (!invitation || invitation.revoked ||
      !Number.isFinite(Date.parse(invitation.expiresAt)) ||
      Date.parse(invitation.expiresAt) <= deps.now().getTime() ||
      !blueprint || blueprint.state !== "reviewed" ||
      blueprint.revision !== invitation.blueprintRevision ||
      blueprint.capability !== DEMO_CAPABILITY ||
      blueprint.capabilityRevision !== gate.revision ||
      blueprint.evidenceRevision !== gate.evidenceRevision) {
    return fail("permission-denied", "Invitation is unavailable.");
  }
  await availableSalesAccount(deps, blueprint.organizerId, tx);
  return invitation;
}

/**
 * Anonymous unfurls show a generic sample; personalized material requires
 * current contact and grant.
 */
export async function getPreview(deps: DemoDeps, raw: unknown,
  identity?: Identity): Promise<{
  schemaVersion: 1; invitationId: string; preview: Preview;
  interactiveAvailable: boolean; expiresAt: string | null;
  synthetic: true; notice: string}> {
  const body = record(raw);
  only(body, ["invitationId", "grantToken"]);
  const invitationId = id(body.invitationId);
  if (body.grantToken !== undefined) grantToken(body.grantToken);
  if (!identity || !body.grantToken) {
    return {schemaVersion: 1, invitationId, synthetic: true,
      interactiveAvailable: false, expiresAt: null,
      preview: {brandName: "Catch Host", headline: "Explore a private sample",
        scenario: "Sign in with the invited contact to review your " +
          "personalized example.",
        steps: ["Review a fictional application", "Prepare an example reply"],
        retainedTools: [],
        limitations: ["This is a synthetic practice workflow."],
        cta: "Review private sample"},
      notice: "Sample workflow only. No real messages, charges or admission."};
  }
  return deps.db.runTransaction(async (tx) => {
    const invitation = (await tx.get(deps.db.collection(INVITATIONS)
      .doc(invitationId))).data() as Invitation | undefined;
    if (!invitation) return fail("permission-denied", "Preview unavailable.");
    const blueprint = (await tx.get(deps.db.collection(BLUEPRINTS)
      .doc(invitation.blueprintId))).data() as Blueprint | undefined;
    await grant(deps, identity, invitation, blueprint,
      String(body.grantToken), tx);
    return {schemaVersion: 1, invitationId, preview: blueprint!.preview,
      interactiveAvailable: true, expiresAt: invitation.expiresAt,
      synthetic: true,
      notice: "Sample workflow only. No real messages, charges or admission."};
  });
}

async function grant(deps: DemoDeps, identity: Identity,
  invitation: Invitation | undefined, blueprint: Blueprint | undefined,
  token: string, tx?: FirebaseFirestore.Transaction): Promise<Invitation> {
  const current = await validInvitation(deps, invitation, blueprint, tx);
  const supplied = hash(grantToken(token));
  if (!exactDigest(current.tokenDigest, supplied) ||
      !current.contactBinding) {
    return fail("permission-denied", "Interactive grant unavailable.");
  }
  const deletedRef = deps.db.collection("deletedUsers").doc(identity.uid);
  const [user, deleted] = await Promise.all([deps.getUser(identity.uid),
    tx ? tx.get(deletedRef) : deletedRef.get()]);
  currentToken(identity, user);
  if (user.disabled || deleted.exists || !boundContact(identity, user,
    current.contactBinding, key(deps))) {
    return fail("permission-denied", "Verified contact does not match.");
  }
  return current;
}
function initialSession(sessionId: string, invitation: Invitation,
  actorUid: string, now: Date): Session {
  const expires = Math.min(Date.parse(invitation.expiresAt),
    now.getTime() + DAY);
  return {schemaVersion: 1, classification: "sales_private", sessionId,
    invitationId: invitation.invitationId,
    blueprintId: invitation.blueprintId,
    blueprintRevision: invitation.blueprintRevision, actorUid,
    createdAt: now.toISOString(), expiresAt: new Date(expires).toISOString(),
    status: "active", allowedActions: [...DEMO_ACTIONS],
    revision: 1, actionCount: 0, step: "application",
    application: {applicantName: "Sample Applicant",
      request: "Sample event application", review: "pending"},
    reply: {status: "none", template: "none"},
    guest: {status: "not_admitted", displayName: "Sample Applicant"},
    assistanceRequested: false};
}
function sessionProjection(session: Session): Record<string, unknown> {
  const {schemaVersion, classification, actorUid, ...safe} = session;
  void schemaVersion;
  void classification;
  void actorUid;
  return {schemaVersion: 1, synthetic: true, ...safe};
}
function receiptMaterial(action: string, target: string,
  payload: Record<string, unknown>): string {
  return material(action, target, payload);
}

export async function startSession(deps: DemoDeps, identity: Identity,
  raw: unknown): Promise<Record<string, unknown>> {
  const body = record(raw);
  only(body, ["invitationId", "grantToken", "requestId"]);
  const invitationId = id(body.invitationId);
  const token = grantToken(body.grantToken);
  const stableRequestId = requestId(body.requestId);
  const digest = receiptMaterial("salesDemo.session.start", invitationId, {});
  const inviteRef = deps.db.collection(INVITATIONS).doc(invitationId);
  const receiptRef = receiptRefFor(deps, identity.uid, stableRequestId);
  const candidateSessionId = hash(
    `session\u0000${invitationId}\u0000${identity.uid}`+
    `\u0000${stableRequestId}`).slice(0, 40);
  return deps.db.runTransaction(async (tx) => {
    const inviteSnap = await tx.get(inviteRef);
    const invitation = inviteSnap.data() as Invitation | undefined;
    if (!invitation) {
      return fail("permission-denied", "Invitation unavailable.");
    }
    const [blueprintSnap, receiptSnap] = await Promise.all([
      tx.get(deps.db.collection(BLUEPRINTS).doc(invitation.blueprintId)),
      tx.get(receiptRef),
    ]);
    await grant(deps, identity, invitation,
      blueprintSnap.data() as Blueprint | undefined, token, tx);
    const replay = replayedResult(deps, receiptSnap.data(), identity,
      "salesDemo.session.start", invitationId, digest);
    if (replay) {
      const savedId = replay.sessionId;
      if (typeof savedId !== "string") {
        return fail("failed-precondition", "Invalid start receipt.");
      }
      const saved = await tx.get(deps.db.collection(SESSIONS).doc(savedId));
      const session = saved.data() as Session | undefined;
      if (!session || session.actorUid !== identity.uid ||
          Date.parse(session.expiresAt) <= deps.now().getTime()) {
        return fail("failed-precondition", "Start a new trial session.");
      }
      return sessionProjection(session);
    }
    const minute = Math.floor(deps.now().getTime() / 60_000);
    const windowCount = invitation.startWindowMinute === minute ?
      invitation.startWindowCount : 0;
    if (!Number.isInteger(invitation.startReceiptCount) ||
        !Number.isInteger(windowCount) ||
        invitation.startReceiptCount < 0 || windowCount < 0) {
      return fail("failed-precondition",
        "Invitation start budget unavailable.");
    }
    if (invitation.startReceiptCount >= MAX_START_RECEIPTS) {
      return fail("resource-exhausted",
        "Invitation start limit reached; ask for a renewed invitation.");
    }
    if (windowCount >= MAX_STARTS_PER_MINUTE) {
      return fail("resource-exhausted", "Too many trial starts; retry later.");
    }
    let active: Session | undefined;
    if (invitation.currentSessionId) {
      const snap = await tx.get(deps.db.collection(SESSIONS)
        .doc(invitation.currentSessionId));
      active = snap.data() as Session | undefined;
    }
    const now = deps.now();
    if (!active || active.status !== "active" ||
        Date.parse(active.expiresAt) <= now.getTime()) {
      if (invitation.sessionCount >= invitation.sessionCap) {
        return fail("resource-exhausted", "Ask for a renewed invitation.");
      }
      active = initialSession(candidateSessionId, invitation,
        identity.uid, now);
      const recordStarted = await prepareDemoSalesActivity(tx, deps.db,
        blueprintSnap.data() as Blueprint, active, "started",
        now.toISOString());
      tx.create(deps.db.collection(SESSIONS).doc(candidateSessionId), active);
      recordStarted();
    } else if (active.actorUid !== identity.uid) {
      return fail("permission-denied", "Trial belongs to another account.");
    }
    tx.update(inviteRef, {currentSessionId: active.sessionId,
      sessionCount: invitation.currentSessionId === active.sessionId ?
        invitation.sessionCount : invitation.sessionCount + 1,
      startReceiptCount: invitation.startReceiptCount + 1,
      startWindowMinute: minute, startWindowCount: windowCount + 1});
    writeReceipt(deps, tx, receiptRef, identity, "salesDemo.session.start",
      invitationId, digest, {sessionId: active.sessionId});
    return sessionProjection(active);
  });
}

export async function getSession(deps: DemoDeps, identity: Identity,
  raw: unknown): Promise<Record<string, unknown>> {
  const body = record(raw);
  only(body, ["sessionId", "grantToken"]);
  const sessionId = id(body.sessionId);
  const token = grantToken(body.grantToken);
  const snap = await deps.db.collection(SESSIONS).doc(sessionId).get();
  const session = snap.data() as Session | undefined;
  if (!session || session.actorUid !== identity.uid ||
      Date.parse(session.expiresAt) <= deps.now().getTime()) {
    return fail("permission-denied", "Session unavailable.");
  }
  const inviteSnap = await deps.db.collection(INVITATIONS)
    .doc(session.invitationId).get();
  const invitation = inviteSnap.data() as Invitation | undefined;
  if (!invitation) return fail("permission-denied", "Invitation unavailable.");
  const blueprintSnap = await deps.db.collection(BLUEPRINTS)
    .doc(invitation.blueprintId).get();
  await grant(deps, identity, invitation,
    blueprintSnap.data() as Blueprint | undefined, token);
  return sessionProjection(session);
}

/** Explicitly synthetic Forms practice; no live handler or outbox is called. */
export function reduceSyntheticForms(session: Session, action: DemoAction,
  choice: unknown): Session {
  if ((session.status !== "active" && action !== "requestAssistance") ||
      session.actionCount >= MAX_SESSION_ACTIONS) {
    return fail("failed-precondition", "Trial is no longer active.");
  }
  const next: Session = {...session, revision: session.revision + 1,
    actionCount: session.actionCount + 1};
  if (!session.allowedActions.includes(action)) {
    return fail("permission-denied", "Action is outside trial scope.");
  }
  switch (action) {
  case "reviewApplication":
    if (session.step !== "application" ||
        (choice !== "approve" && choice !== "needs_info")) {
      return fail("failed-precondition", "Choose a synthetic review.");
    }
    next.application = {...session.application,
      review: choice === "approve" ? "approved" : "needs_info"};
    next.step = "reply";
    return next;
  case "prepareReply":
    if (session.step !== "reply" ||
        (choice !== "welcome" && choice !== "clarify") ||
        (session.application.review === "needs_info" &&
          choice !== "clarify")) {
      return fail("failed-precondition", "Choose a sample reply template.");
    }
    next.reply = {status: "prepared", template: choice};
    next.step = session.application.review === "approved" ?
      "admission" : "complete";
    if (next.step === "complete") next.status = "completed";
    return next;
  case "admitGuest":
    if (session.step !== "admission" || choice !== undefined ||
        session.application.review !== "approved" ||
        session.reply.status !== "prepared") {
      return fail("failed-precondition", "Sample guest is not eligible.");
    }
    next.guest = {...session.guest, status: "admitted"};
    next.step = "complete";
    next.status = "completed";
    return next;
  case "requestAssistance":
    if (choice !== undefined || session.assistanceRequested) {
      return fail("failed-precondition", "Assistance already requested.");
    }
    next.assistanceRequested = true;
    return next;
  }
}

export async function advanceSession(deps: DemoDeps, identity: Identity,
  raw: unknown): Promise<Record<string, unknown>> {
  const body = record(raw);
  only(body, ["sessionId", "grantToken", "requestId",
    "expectedRevision", "action", "choice"]);
  const sessionId = id(body.sessionId);
  const token = grantToken(body.grantToken);
  const stableRequestId = requestId(body.requestId);
  const expected = revision(body.expectedRevision);
  if (!DEMO_ACTIONS.includes(body.action as DemoAction)) {
    return fail("invalid-argument", "Unsupported synthetic action.");
  }
  const action = body.action as DemoAction;
  const digest = receiptMaterial(`salesDemo.session.${action}`, sessionId,
    {expected, ...(Object.prototype.hasOwnProperty.call(body, "choice") ?
      {choice: body.choice} : {})});
  const sessionRef = deps.db.collection(SESSIONS).doc(sessionId);
  const receiptRef = receiptRefFor(deps, identity.uid, stableRequestId);
  return deps.db.runTransaction(async (tx) => {
    const sessionSnap = await tx.get(sessionRef);
    const session = sessionSnap.data() as Session | undefined;
    if (!session || session.actorUid !== identity.uid ||
        Date.parse(session.expiresAt) <= deps.now().getTime()) {
      return fail("permission-denied", "Session unavailable.");
    }
    const inviteRef = deps.db.collection(INVITATIONS)
      .doc(session.invitationId);
    const [inviteSnap, receiptSnap] = await Promise.all([
      tx.get(inviteRef), tx.get(receiptRef),
    ]);
    const invitation = inviteSnap.data() as Invitation | undefined;
    if (!invitation) {
      return fail("permission-denied", "Invitation unavailable.");
    }
    const blueprintSnap = await tx.get(deps.db.collection(BLUEPRINTS)
      .doc(invitation.blueprintId));
    await grant(deps, identity, invitation,
      blueprintSnap.data() as Blueprint | undefined, token, tx);
    if (session.blueprintId !== invitation.blueprintId ||
        session.blueprintRevision !== invitation.blueprintRevision) {
      return fail("permission-denied", "Trial blueprint changed.");
    }
    const replay = replayedResult(deps, receiptSnap.data(), identity,
      `salesDemo.session.${action}`, sessionId, digest);
    if (replay) return replay;
    if (session.revision !== expected) {
      return fail("failed-precondition", "Session revision changed.");
    }
    const next = reduceSyntheticForms(session, action, body.choice);
    const result = sessionProjection(next);
    const recordCompleted = session.status === "active" &&
      next.status === "completed" ?
      await prepareDemoSalesActivity(tx, deps.db,
        blueprintSnap.data() as Blueprint, next, "completed",
        deps.now().toISOString()) : () => {};
    tx.update(sessionRef, next);
    recordCompleted();
    writeReceipt(deps, tx, receiptRef, identity,
      `salesDemo.session.${action}`, sessionId, digest, result);
    return result;
  });
}

export async function adminGetBlueprint(deps: DemoDeps, identity: Identity,
  raw: unknown): Promise<Blueprint> {
  await owner(deps, identity);
  const body = record(raw);
  only(body, ["blueprintId"]);
  const snap = await deps.db.collection(BLUEPRINTS)
    .doc(id(body.blueprintId)).get();
  await owner(deps, identity);
  if (!snap.exists) return fail("not-found", "Blueprint not found.");
  await assertSalesMaterialPrivacyOpen(deps.db, snap.data());
  return snap.data() as Blueprint;
}
export async function adminGetInvitation(deps: DemoDeps, identity: Identity,
  raw: unknown): Promise<Omit<Invitation, "tokenDigest" | "contactBinding">> {
  await owner(deps, identity);
  const body = record(raw);
  only(body, ["invitationId"]);
  const snap = await deps.db.collection(INVITATIONS)
    .doc(id(body.invitationId)).get();
  await owner(deps, identity);
  if (!snap.exists) return fail("not-found", "Invitation not found.");
  const {tokenDigest, contactBinding, ...safe} = snap.data() as Invitation;
  void tokenDigest;
  void contactBinding;
  await invitationPrivacy(deps, safe.blueprintId);
  await assertSalesMaterialPrivacyOpen(deps.db, safe);
  return safe;
}

export async function adminGetCapability(deps: DemoDeps,
  identity: Identity, raw: unknown): Promise<CapabilityGate & {
    templateOptions: Array<{templateId: string; title: string}>}> {
  await owner(deps, identity);
  const body = record(raw);
  only(body, []);
  const gate = await currentCapability(deps);
  await owner(deps, identity);
  return {capability: gate.capability, revision: gate.revision,
    evidenceRevision: gate.evidenceRevision, enabled: true,
    templateOptions: organizerFormTemplateCatalog.templates.map((template) =>
      ({templateId: template.id, title: template.title}))};
}

function pageInput(raw: unknown, scopeKey: string):
  {target: string; cursor: string | null; limit: number} {
  const body = record(raw);
  only(body, [scopeKey, "cursor", "limit"]);
  const target = id(body[scopeKey]);
  const cursor = body.cursor === undefined || body.cursor === null ?
    null : id(body.cursor);
  const limit = body.limit === undefined ? 20 : positive(body.limit, 20);
  return {target, cursor, limit};
}

export async function adminListBlueprints(deps: DemoDeps, identity: Identity,
  raw: unknown): Promise<{rows: Blueprint[]; nextCursor: string | null}> {
  await owner(deps, identity);
  const {target, cursor, limit} = pageInput(raw, "organizerId");
  let query: FirebaseFirestore.Query = deps.db.collection(BLUEPRINTS)
    .where("organizerId", "==", target).orderBy("__name__");
  if (cursor) {
    const anchor = await deps.db.collection(BLUEPRINTS).doc(cursor).get();
    if (!anchor.exists || anchor.data()?.organizerId !== target) {
      return fail("invalid-argument", "Invalid blueprint page cursor.");
    }
    query = query.startAfter(anchor);
  }
  const snaps = await query.limit(limit + 1).get();
  await owner(deps, identity);
  const rows = snaps.docs.slice(0, limit);
  await assertSalesPrivacyOpenRead(deps.db, target);
  return {rows: rows.map((snap) => snap.data() as Blueprint),
    nextCursor: snaps.docs.length > limit ? rows[rows.length - 1].id : null};
}

export async function adminListInvitations(deps: DemoDeps,
  identity: Identity, raw: unknown): Promise<{rows: Array<Omit<Invitation,
  "tokenDigest" | "contactBinding">>; nextCursor: string | null}> {
  await owner(deps, identity);
  const {target, cursor, limit} = pageInput(raw, "blueprintId");
  let query: FirebaseFirestore.Query = deps.db.collection(INVITATIONS)
    .where("blueprintId", "==", target).orderBy("__name__");
  if (cursor) {
    const anchor = await deps.db.collection(INVITATIONS).doc(cursor).get();
    if (!anchor.exists || anchor.data()?.blueprintId !== target) {
      return fail("invalid-argument", "Invalid invitation page cursor.");
    }
    query = query.startAfter(anchor);
  }
  const snaps = await query.limit(limit + 1).get();
  await owner(deps, identity);
  const rows = snaps.docs.slice(0, limit).map((snap) => {
    const {tokenDigest, contactBinding, ...safe} = snap.data() as Invitation;
    void tokenDigest;
    void contactBinding;
    return safe;
  });
  await invitationPrivacy(deps, target);
  await assertSalesMaterialPrivacyOpen(deps.db, rows);
  return {rows, nextCursor: snaps.docs.length > limit ?
    snaps.docs[limit - 1].id : null};
}

/** Host setup requires current organizer authority beyond the sample grant. */
export async function salesDemoSetup(deps: DemoDeps, identity: Identity,
  raw: unknown, prepare: boolean): Promise<Record<string, unknown>> {
  const body = record(raw);
  only(body, prepare ? ["sessionId", "grantToken", "setupHash"] :
    ["sessionId", "grantToken"]);
  const sessionId = id(body.sessionId);
  const token = grantToken(body.grantToken);
  return deps.db.runTransaction(async (tx) => {
    const session = (await tx.get(deps.db.collection(SESSIONS)
      .doc(sessionId))).data() as Session | undefined;
    if (!session || session.actorUid !== identity.uid ||
        session.status !== "completed" ||
        Date.parse(session.expiresAt) <= deps.now().getTime()) {
      return fail("permission-denied", "Complete a current sample first.");
    }
    const [inviteSnap, blueprintSnap] = await Promise.all([
      tx.get(deps.db.collection(INVITATIONS).doc(session.invitationId)),
      tx.get(deps.db.collection(BLUEPRINTS).doc(session.blueprintId)),
    ]);
    const blueprint = blueprintSnap.data() as Blueprint | undefined;
    const invitation = await grant(deps, identity,
      inviteSnap.data() as Invitation | undefined, blueprint, token, tx);
    if (!blueprint || session.blueprintId !== invitation.blueprintId ||
        session.blueprintRevision !== invitation.blueprintRevision) {
      return fail("permission-denied", "The reviewed setup changed.");
    }
    return reviewedOrganizerSetup(
      deps, identity, blueprint, tx, prepare, body.setupHash);
  });
}


/**
 * Shared existing Forms materializer; callers must prove their own current
 * demo scope.
 */
async function reviewedOrganizerSetup(deps: DemoDeps, identity: Identity,
  blueprint: Blueprint, tx: FirebaseFirestore.Transaction,
  prepare: boolean,
  requestedSetupHash: unknown): Promise<Record<string, unknown>> {
  const publicFormId = randomBytes(24).toString("base64url");
  const plan = currentSetupPlan(blueprint.setupPlan);
  const setupHash = setupPlanHash(plan);
  const organizerId = blueprint.organizerId;
  const base = {schemaVersion: 1, setupHash, plan, organizerId,
    formId: null, editorPath: null, publicationAuthority: false};
  if (!organizerId || plan.mode === "manual") {
    if (prepare) {
      return fail("failed-precondition",
        "This setup needs the Catch team's review.");
    }
    return {...base, status: "manual_setup"};
  }
  const organizer = (await tx.get(deps.db.collection("organizers")
    .doc(organizerId))).data();
  if (!organizer || !["claimed", "verified"].includes(
    organizer.claim?.state)) {
    if (prepare) {
      return fail("permission-denied",
        "Claim this organizer before preparing its draft.");
    }
    return {...base, status: "claim_required"};
  }
  try {
    await authorizeFormMutation({db: deps.db, tx, actorUid: identity.uid,
      organizerId});
  } catch (error) {
    if (prepare || !(error instanceof HttpsError) ||
        !["permission-denied", "not-found"].includes(error.code)) throw error;
    // Never expose organizer details or a prepared form to a non-manager.
    return {...base, status: "claim_required"};
  }
  if (prepare && requestedSetupHash !== setupHash) {
    return fail("failed-precondition", "Review the latest setup first.");
  }
  const setupId = hash(`${organizerId}\u0000${blueprint.blueprintId}`+
    `\u0000${blueprint.revision}\u0000${setupHash}`);
  const setupRef = deps.db.collection("salesDemoSetups").doc(setupId);
  const prior = (await tx.get(setupRef)).data();
  if (prior) {
    if (prior.organizerId !== organizerId || prior.setupHash !== setupHash ||
        prior.blueprintId !== blueprint.blueprintId ||
        prior.blueprintRevision !== blueprint.revision ||
        prior.formId !== `demo_${setupId.slice(0, 40)}`) {
      return fail("failed-precondition", "Invalid setup receipt.");
    }
    const form = (await tx.get(deps.db.collection("organizerForms")
      .doc(prior.formId))).data();
    if (!form || form.organizerId !== organizerId) {
      return fail("failed-precondition", "Prepared form is unavailable.");
    }
    return {...base, status: "prepared", formId: prior.formId,
      editorPath: `/host/audience/forms/${prior.formId}`};
  }
  if (!prepare) return {...base, status: "ready"};
  const formId = `demo_${setupId.slice(0, 40)}`;
  // Read every Sales/grant/receipt gate before the Forms owner's first write.
  await createOrganizerFormInTransaction({db: deps.db, tx,
    actorUid: identity.uid, organizerId, formId,
    templateId: plan.templateId, title: plan.title,
    defaultTargetKind: "organizer", defaultTargetId: null, publicFormId,
    timestamp: () => Timestamp.fromDate(deps.now())});
  tx.create(setupRef, {schemaVersion: 1, classification: "sales_private",
    setupId, organizerId, blueprintId: blueprint.blueprintId,
    blueprintRevision: blueprint.revision, setupHash, formId,
    createdByUid: identity.uid, createdAt: deps.now().toISOString()});
  return {...base, status: "prepared", formId,
    editorPath: `/host/audience/forms/${formId}`};
}

interface DemoContinuation {
  schemaVersion: 1; classification: "sales_private"; continuationId: string;
  actorUid: string; organizerId: string; invitationId: string;
  invitationRevision: number;
  invitationExpiresAt: string; blueprintId: string; blueprintRevision: number;
  sessionId: string; sessionRevision: number; setupHash: string;
  completedAt: string; createdAt: string; expiresAt: string;
}
const CONTINUATIONS = "salesDemoContinuations";
const CONTINUATION_DAYS = 30;
function continuationIdFor(uid: string, sessionId: string): string {
  return hash(`continuation\u0000${uid}\u0000${sessionId}`);
}
async function continuationAccount(deps: DemoDeps, identity: Identity,
  tx: FirebaseFirestore.Transaction, organizerId: string): Promise<void> {
  const user = await deps.getUser(identity.uid); currentToken(identity, user);
  const [deleted, organizer, account] = await Promise.all([
    tx.get(deps.db.collection("deletedUsers").doc(identity.uid)),
    tx.get(deps.db.collection("organizers").doc(organizerId)),
    tx.get(deps.db.collection("organizerSalesAccounts").doc(organizerId)),
  ]);
  await assertSalesPrivacyOpen(tx, deps.db, organizerId);
  const sales = account.data(); const canonical = organizer.data();
  if (user.disabled || deleted.exists || !canonical ||
      canonical.archived === true || canonical.status === "archived" ||
      sales?.classification !== "sales_private" ||
      sales.organizerId !== organizerId ||
      sales.researchStatus === "archived" ||
      sales.suppressionStatus !== "clear" || sales.duplicateReviewRequired) {
    fail("permission-denied",
      "Current organizer onboarding scope is unavailable.");
  }
}

/**
 * Explicitly preserve completed practice for a bounded claim review delay;
 * no bearer storage.
 */
export async function createDemoContinuation(deps: DemoDeps, identity: Identity,
  raw: unknown): Promise<Record<string, unknown>> {
  const body = record(raw); only(body, ["sessionId", "grantToken"]);
  const sessionId = id(body.sessionId);
  const token = grantToken(body.grantToken);
  return deps.db.runTransaction(async (tx) => {
    const continuationId = continuationIdFor(identity.uid, sessionId);
    const ref = deps.db.collection(CONTINUATIONS).doc(continuationId);
    const existing = (await tx.get(ref)).data() as DemoContinuation | undefined;
    if (existing) {
      const recovered = await resumeContinuationInTransaction(deps, identity,
        tx, continuationId, false, undefined);
      return {
        continuationId,
        expiresAt: recovered.expiresAt,
        publicationAuthority: false,
      };
    }
    const session = (await tx.get(
      deps.db.collection(SESSIONS).doc(sessionId)
    )).data() as Session | undefined;
    if (!session || session.actorUid !== identity.uid ||
        session.status !== "completed" ||
        !Number.isFinite(Date.parse(session.expiresAt)) ||
        Date.parse(session.expiresAt) <= deps.now().getTime()) {
      return fail("permission-denied",
        "Complete a current private sample before preserving its setup.");
    }
    const [inviteSnap, blueprintSnap] = await Promise.all([
      tx.get(deps.db.collection(INVITATIONS).doc(session.invitationId)),
      tx.get(deps.db.collection(BLUEPRINTS).doc(session.blueprintId)),
    ]);
    const blueprint = blueprintSnap.data() as Blueprint | undefined;
    const invitation = await grant(deps, identity,
      inviteSnap.data() as Invitation | undefined, blueprint, token, tx);
    if (!blueprint?.organizerId ||
        blueprint.blueprintId !== session.blueprintId ||
        blueprint.revision !== session.blueprintRevision) {
      return fail("failed-precondition",
        "A reviewed canonical organizer setup is required.");
    }
    await continuationAccount(deps, identity, tx, blueprint.organizerId);
    const setupHash = setupPlanHash(currentSetupPlan(blueprint.setupPlan));
    const now = deps.now().toISOString();
    const row: DemoContinuation = {
      schemaVersion: 1, classification: "sales_private", continuationId,
      actorUid: identity.uid, organizerId: blueprint.organizerId,
      invitationId: invitation.invitationId,
      invitationRevision: invitation.revision,
      invitationExpiresAt: invitation.expiresAt,
      blueprintId: blueprint.blueprintId,
      blueprintRevision: blueprint.revision,
      sessionId, sessionRevision: session.revision,
      setupHash, completedAt: now, createdAt: now,
      expiresAt: new Date(
        Date.parse(now) + CONTINUATION_DAYS * DAY
      ).toISOString(),
    };
    tx.create(ref, row);
    return {
      continuationId,
      expiresAt: row.expiresAt,
      publicationAuthority: false,
    };
  });
}

/**
 * Read or materialize only after current Auth, invitation review, Sales and
 * Forms authority checks.
 */
export async function resumeDemoContinuation(deps: DemoDeps, identity: Identity,
  raw: unknown, prepare: boolean): Promise<Record<string, unknown>> {
  const body = record(raw);
  only(body, prepare ?
    ["continuationId", "setupHash"] : ["continuationId"]);
  const continuationId = id(body.continuationId);
  return deps.db.runTransaction((tx) => resumeContinuationInTransaction(deps,
    identity, tx, continuationId, prepare, body.setupHash));
}
async function resumeContinuationInTransaction(
  deps: DemoDeps,
  identity: Identity,
  tx: FirebaseFirestore.Transaction, continuationId: string, prepare: boolean,
  requestedSetupHash: unknown): Promise<Record<string, unknown>> {
  const row = (await tx.get(
    deps.db.collection(CONTINUATIONS).doc(continuationId)
  )).data() as DemoContinuation | undefined;
  const now = deps.now().getTime();
  if (!row || row.actorUid !== identity.uid || row.schemaVersion !== 1 ||
        row.classification !== "sales_private" ||
        row.continuationId !== continuationId ||
        continuationIdFor(identity.uid, row.sessionId) !== continuationId ||
        !Number.isFinite(Date.parse(row.expiresAt)) ||
        !Number.isFinite(Date.parse(row.createdAt)) ||
        !Number.isFinite(Date.parse(row.completedAt)) ||
        !Number.isFinite(Date.parse(row.invitationExpiresAt)) ||
        Date.parse(row.expiresAt) <= now ||
        Date.parse(row.createdAt) > now || row.completedAt !== row.createdAt ||
        Date.parse(row.expiresAt) !==
          Date.parse(row.createdAt) + CONTINUATION_DAYS * DAY ||
        Date.parse(row.completedAt) >= Date.parse(row.invitationExpiresAt)) {
    return fail("permission-denied", "Current preserved setup is required.");
  }
  const [inviteSnap, blueprintSnap, user] = await Promise.all([
    tx.get(deps.db.collection(INVITATIONS).doc(row.invitationId)),
    tx.get(deps.db.collection(BLUEPRINTS).doc(row.blueprintId)),
    deps.getUser(identity.uid),
  ]);
  currentToken(identity, user);
  const invite = inviteSnap.data() as Invitation | undefined;
  const blueprint = blueprintSnap.data() as Blueprint | undefined;
  const gate = await currentCapability(deps, tx);
  // The original interactive invitation may expire during claim review. Only
  // the previously preserved completion authorizes this bounded own setup;
  // revocation, contact binding and all current review gates remain required.
  if (user.disabled || !invite || invite.revoked || !invite.contactBinding ||
        invite.revision !== row.invitationRevision ||
        invite.invitationId !== row.invitationId ||
        invite.expiresAt !== row.invitationExpiresAt ||
        invite.blueprintId !== row.blueprintId ||
        invite.blueprintRevision !== row.blueprintRevision || !blueprint ||
        blueprint.state !== "reviewed" ||
        blueprint.blueprintId !== row.blueprintId ||
        blueprint.revision !== row.blueprintRevision ||
        blueprint.organizerId !== row.organizerId ||
        blueprint.capability !== DEMO_CAPABILITY ||
        blueprint.capabilityRevision !== gate.revision ||
        blueprint.evidenceRevision !== gate.evidenceRevision ||
        setupPlanHash(currentSetupPlan(blueprint.setupPlan)) !==
          row.setupHash ||
        !boundContact(identity, user, invite.contactBinding, key(deps))) {
    return fail("permission-denied",
      "The preserved completion or current review changed.");
  }
  await continuationAccount(deps, identity, tx, row.organizerId);
  const canonical = (await tx.get(
    deps.db.collection("organizers").doc(row.organizerId)
  )).data()!;
  const setup = await reviewedOrganizerSetup(
    deps, identity, blueprint, tx, prepare, requestedSetupHash);
  return {
    continuationId,
    expiresAt: row.expiresAt,
    organizer: {
      organizerId: row.organizerId,
      name: canonical.name ?? "Your organizer",
      claimState: canonical.claim?.state ?? "unclaimed",
    },
    setup,
  };
}


/**
 * Review recipient state using the real Owner; target user lookup is not
 * impersonation.
 */
async function ownerPartnerPreviewState(deps: DemoDeps, identity: Identity,
  tx: FirebaseFirestore.Transaction, blueprintId: string) {
  const source = (await tx.get(
    deps.db.collection(BLUEPRINTS).doc(blueprintId)
  )).data();
  if (!source || source.blueprintId !== blueprintId ||
      source.state !== "reviewed" ||
      source.classification !== "sales_private" || source.schemaVersion !== 1 ||
      source.candidateId !== null || typeof source.organizerId !== "string" ||
      !Number.isSafeInteger(source.revision) || Number(source.revision) < 1) {
    return fail("failed-precondition",
      "A current reviewed canonical demo is required.");
  }
  const organizerId = id(source.organizerId);
  const [gate, assignmentSnap, organizerSnap, salesSnap] = await Promise.all([
    currentCapability(deps, tx),
    tx.get(deps.db.collection("salesPartnerAssignments").doc(organizerId)),
    tx.get(deps.db.collection("organizers").doc(organizerId)),
    tx.get(deps.db.collection("organizerSalesAccounts").doc(organizerId)),
  ]);
  const organizer = organizerSnap.data();
  const sales = salesSnap.data();
  if (!organizer || organizer.archived === true ||
      organizer.status === "archived" || sales?.organizerId !== organizerId ||
      sales.classification !== "sales_private") {
    return fail("failed-precondition",
      "Current canonical organizer and Sales identity required.");
  }
  await availableSalesAccount(deps, organizerId, tx);
  await checkDemoSalesLinks(
    tx, deps.db, organizerId, source.opportunityId ?? null);
  const assignment = assignmentSnap.data();
  if (source.capability !== DEMO_CAPABILITY ||
      source.capabilityRevision !== gate.revision ||
      source.evidenceRevision !== gate.evidenceRevision ||
      !source.reviewedByUid ||
      !Number.isFinite(Date.parse(source.reviewedAt)) ||
      assignment?.classification !== "sales_private" ||
      assignment.schemaVersion !== 1 ||
      assignment.organizerId !== organizerId ||
      assignment.status !== "accepted" ||
      typeof assignment.partnerUid !== "string" ||
      !Number.isSafeInteger(assignment.revision)) {
    return fail("failed-precondition",
      "Current reviewed demo and accepted partner assignment are required.");
  }
  const partnerUid = assignment.partnerUid;
  const [membershipSnap, deleted, recipient] = await Promise.all([
    tx.get(deps.db.collection("salesPartnerMemberships").doc(partnerUid)),
    tx.get(deps.db.collection("deletedUsers").doc(partnerUid)),
    deps.getUser(partnerUid),
  ]);
  const membership = membershipSnap.data();
  // Owner Auth may change during recipient/source reads. No further awaits
  // follow.
  await owner(deps, identity);
  const evaluatedAt = deps.now();
  if (recipient.disabled || deleted.exists || membership?.uid !== partnerUid ||
      membership.schemaVersion !== 1 ||
      membership.classification !== "sales_private" ||
      membership.status !== "active" ||
      membership.termsVersion !== PARTNER_TERMS_VERSION ||
      !Number.isFinite(Date.parse(membership.expiresAt)) ||
      Date.parse(membership.expiresAt) <= evaluatedAt.getTime() ||
      !Number.isFinite(Date.parse(assignment.expiresAt)) ||
      Date.parse(assignment.expiresAt) <= evaluatedAt.getTime() ||
      Date.parse(source.reviewedAt) > evaluatedAt.getTime()) {
    return fail("failed-precondition",
      "Current recipient membership and assignment are required.");
  }
  const material = partnerDemoPreviewMaterial(source);
  const prior = source.partnerReviewGrant as PartnerDemoReviewGrant | undefined;
  if (prior && (!Number.isSafeInteger(prior.revision) || prior.revision < 1 ||
      !["active", "withdrawn"].includes(prior.state) ||
      !Number.isFinite(Date.parse(prior.expiresAt)))) {
    return fail("failed-precondition", "Current sharing state is unavailable.");
  }
  const sharingRevision = prior ? revision(prior.revision) : 0;
  const proposal = source.partnerPreviewProposal as
    PartnerDemoPreviewProposal | undefined;
  const proposalCurrent = proposal?.partnerUid === partnerUid &&
    proposal.assignmentRevision === assignment.revision &&
    proposal.blueprintRevision === source.revision &&
    proposal.sourcePreviewHash === partnerHash(material) &&
    proposal.state === "pending_owner_review";
  return {source, prior, organizerId, partnerUid,
    assignmentRevision: Number(assignment.revision), blueprintId,
    blueprintRevision: Number(source.revision), preview: material.preview,
    previewHash: partnerHash(material), sharingRevision,
    proposedWording: proposalCurrent ? proposalWording(proposal) : null,
    proposalRevision: proposalCurrent ? proposal!.revision : 0,
    maximumExpiresAt: new Date(Math.min(evaluatedAt.getTime() + 7 * DAY,
      Date.parse(membership.expiresAt),
      Date.parse(assignment.expiresAt))).toISOString(),
    evaluatedAt: evaluatedAt.toISOString()};
}

export async function getOwnerPartnerDemoReview(
  deps: DemoDeps,
  identity: Identity,
  raw: unknown): Promise<Record<string, unknown>> {
  const body = record(raw);
  only(body, ["blueprintId"]);
  const blueprintId = id(body.blueprintId);
  await owner(deps, identity);
  return deps.db.runTransaction(async (tx) => {
    const state = await ownerPartnerPreviewState(
      deps, identity, tx, blueprintId);
    return {organizerId: state.organizerId, blueprintId,
      blueprintRevision: state.blueprintRevision,
      partnerUid: state.partnerUid,
      assignmentRevision: state.assignmentRevision,
      preview: state.preview,
      previewHash: state.previewHash,
      sharingRevision: state.sharingRevision,
      proposedWording: state.proposedWording,
      proposalRevision: state.proposalRevision,
      sharingState: state.prior?.state ?? "none",
      expiresAt: state.prior?.expiresAt ?? null,
      sharingCurrent: state.prior?.state === "active" &&
        state.prior.previewHash === state.previewHash &&
        state.prior.partnerUid === state.partnerUid &&
        state.prior.assignmentRevision === state.assignmentRevision &&
        state.prior.blueprintRevision === state.blueprintRevision &&
        Date.parse(state.prior.expiresAt) > Date.parse(state.evaluatedAt),
      maximumExpiresAt: state.maximumExpiresAt,
      evaluatedAt: state.evaluatedAt,
      sendAuthority: false,
      capabilityApprovalAuthority: false,
      organizerControlAuthority: false};
  });
}

/**
 * Share or withdraw one exact preview; core blueprint revision and invitations
 * are unaffected.
 */
export async function sharePartnerDemoReview(deps: DemoDeps, identity: Identity,
  raw: unknown): Promise<Record<string, unknown>> {
  const body = record(raw);
  only(body, [
    "requestId", "blueprintId", "expectedBlueprintRevision",
    "expectedSharingRevision", "partnerUid", "expectedAssignmentRevision",
    "expectedPreviewHash", "decision", "expiresAt",
  ]);
  const stableRequestId = requestId(body.requestId);
  const blueprintId = id(body.blueprintId);
  const expectedBlueprintRevision = revision(body.expectedBlueprintRevision);
  const expectedSharingRevision = revision(body.expectedSharingRevision);
  const partnerUid = id(body.partnerUid);
  const expectedAssignmentRevision =
    revision(body.expectedAssignmentRevision);
  if (typeof body.expectedPreviewHash !== "string" ||
      !/^[a-f0-9]{64}$/u.test(body.expectedPreviewHash) ||
      !["share", "withdraw"].includes(String(body.decision))) {
    return fail("invalid-argument",
      "Exact preview hash and sharing decision required.");
  }
  const decision = body.decision as "share" | "withdraw";
  const expiresAt = decision === "share" &&
    typeof body.expiresAt === "string" ? body.expiresAt : null;
  if (decision === "share" ?
    !Number.isFinite(Date.parse(expiresAt ?? "")) :
    body.expiresAt !== null) {
    return fail("invalid-argument", "Explicit sharing expiry required.");
  }
  const material = {
    expectedBlueprintRevision,
    expectedSharingRevision,
    partnerUid,
    expectedAssignmentRevision,
    expectedPreviewHash: body.expectedPreviewHash,
    decision,
    expiresAt,
  };
  const result = await adminMutation(
    deps, identity, "salesDemo.blueprint.partnerReview.share",
    blueprintId, stableRequestId, material, async (tx) => {
      const state = await ownerPartnerPreviewState(
        deps, identity, tx, blueprintId);
      if (state.blueprintRevision !== expectedBlueprintRevision ||
          state.sharingRevision !== expectedSharingRevision ||
          state.partnerUid !== partnerUid ||
          state.assignmentRevision !== expectedAssignmentRevision ||
          state.previewHash !== body.expectedPreviewHash) {
        return fail("failed-precondition",
          "Preview or partner sharing scope changed; review again.");
      }
      if (decision === "share" &&
          (Date.parse(expiresAt!) <= Date.parse(state.evaluatedAt) ||
          Date.parse(expiresAt!) > Date.parse(state.maximumExpiresAt))) {
        return fail("invalid-argument",
          "Sharing must expire within current access and seven days.");
      }
      if (decision === "withdraw" && !state.prior) {
        return fail("failed-precondition", "No sharing grant to withdraw.");
      }
      const grant: PartnerDemoReviewGrant = {
        revision: expectedSharingRevision + 1,
        state: decision === "share" ? "active" : "withdrawn",
        partnerUid,
        assignmentRevision: expectedAssignmentRevision,
        blueprintRevision: expectedBlueprintRevision,
        previewHash: state.previewHash,
        expiresAt: decision === "share" ? expiresAt! : state.evaluatedAt,
        ownerReviewedByUid: identity.uid,
        ownerReviewedAt: state.evaluatedAt,
      };
      tx.update(deps.db.collection(BLUEPRINTS).doc(blueprintId), {
        partnerReviewGrant: grant,
      });
      return {
        result: {
          blueprintId,
          blueprintRevision: expectedBlueprintRevision,
          sharingRevision: grant.revision,
          sharingState: grant.state,
          previewHash: grant.previewHash,
          expiresAt: grant.expiresAt,
          sendAuthority: false,
          capabilityApprovalAuthority: false,
          organizerControlAuthority: false,
        },
        beforeRevision: expectedSharingRevision,
        afterRevision: grant.revision,
      };
    });
  // Receipt replay must never re-establish stale, withdrawn or reassigned
  // sharing.
  await owner(deps, identity);
  await deps.db.runTransaction(async (tx) => {
    const state = await ownerPartnerPreviewState(
      deps, identity, tx, blueprintId);
    const prior = state.prior;
    if (!prior || state.sharingRevision !== result.sharingRevision ||
        prior.state !== result.sharingState ||
        prior.previewHash !== result.previewHash ||
        state.partnerUid !== partnerUid ||
        state.assignmentRevision !== expectedAssignmentRevision ||
        state.previewHash !== body.expectedPreviewHash ||
        decision === "share" &&
          Date.parse(prior.expiresAt) <= Date.parse(state.evaluatedAt)) {
      return fail("failed-precondition",
        "Sharing receipt is no longer current.");
    }
  });
  return result;
}
