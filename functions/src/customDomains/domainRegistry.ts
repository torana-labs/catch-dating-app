import {randomBytes} from "node:crypto";
import {resolveCname, resolveTxt} from "node:dns/promises";
import type {firestore} from "firebase-admin";
import {
  BLOCKING_STATUSES, LAPSE_GRACE_MS, hasCurrentDomainOwnership, holdsHostname,
  isFreshActiveProviderEvidence, isInsideTargetZone, isLeaseExpired,
  isTerminalStatus, newReservation, normalizeHostingTarget, parseCustomDomain,
  parseServedHostname, PENDING_LEASE_MS, resolveFormTarget,
  reviseCustomDomain, sameCustomDomainBinding, screenHostname,
  transitionCustomDomain,
  type CustomDomainActor, type CustomDomainApexRedirect,
  type CustomDomainRecord, type CustomDomainStatus, type DomainProbe,
  type ProviderEvidence, type TransitionContext,
} from "./domainPolicy";

/**
 * The customDomains registry (#1110): every write is one Firestore
 * transaction fenced by the reservation's generation (and, for operator
 * flows, its whole immutable binding), so a stale probe, provider callback
 * or request can never act on a newer lease. Provider calls happen outside
 * these transactions and arrive here only as fresh, trusted evidence.
 */
const COLLECTION = "customDomains";

export type OrganizerAuthority = (params: {
  db: firestore.Firestore;
  organizerId: string;
  actorUid: string;
  transaction?: firestore.Transaction;
}) => Promise<unknown>;

export interface RegistryActor {
  kind: CustomDomainActor;
  uid: string | null;
  /** Checked inside the transaction against the record's organiser. */
  authority?: OrganizerAuthority;
}

/** The record a caller read, or just its hostname and generation. */
export type CustomDomainFence = CustomDomainRecord |
  {hostname: string; generation: number};

type Clock = number | (() => number);

function readClock(clock: Clock): number {
  const nowMillis = typeof clock === "function" ? clock() : clock;
  if (!Number.isSafeInteger(nowMillis) || nowMillis < 0) {
    throw new Error("Invalid clock");
  }
  return nowMillis;
}

function requireHostname(hostname: string): string {
  if (parseServedHostname(hostname)?.hostname !== hostname) {
    throw new Error("Invalid custom hostname");
  }
  return hostname;
}

function matchesFence(current: CustomDomainRecord,
  fence: CustomDomainFence): boolean {
  if (current.hostname !== fence.hostname ||
      current.generation !== fence.generation) return false;
  return !("ownershipChallenge" in fence) ||
    sameCustomDomainBinding(current, fence);
}

function context(actor: RegistryActor, atMillis: number,
  reason: string | null = null): TransitionContext {
  return {atMillis, actor: actor.kind, actorUid: actor.uid, reason};
}

/** Probe failures return no evidence. DNS is checked against the record. */
export async function probeCustomDomain(
  hostname: string
): Promise<DomainProbe | null> {
  if (!parseServedHostname(hostname)) return null;
  try {
    const [txt, cname] = await Promise.all([
      resolveTxt(`_catch-verify.${hostname}`), resolveCname(hostname),
    ]);
    return {
      hostname, txtValues: txt.map((parts) => parts.join("")),
      cnameTarget: cname.length === 1 ? cname[0] : null,
      checkedAtMillis: Date.now(),
    };
  } catch {
    return null;
  }
}

async function readPublishedForm(tx: firestore.Transaction,
  db: firestore.Firestore, formId: string) {
  return tx.get(db.collection("organizerForms").doc(formId));
}

function isPublishedFormFor(form: firestore.DocumentSnapshot,
  target: Extract<CustomDomainRecord["target"], {kind: "form"}>): boolean {
  return form.exists && form.get("status") === "published" &&
    form.get("organizerId") === target.organizerId &&
    form.get("publicFormId") === target.publicFormId;
}

export interface ReserveCustomDomainInput {
  hostname: string;
  target: {kind: "organizerPage"; organizerId: string} |
    {kind: "form"; organizerId: string; formId: string};
  apexRedirect?: CustomDomainApexRedirect;
  provider: CustomDomainRecord["provider"];
  expectedCname: string;
  actor: RegistryActor;
  reason?: string | null;
}

/**
 * Starts a new generation for one exact host: a fresh TXT challenge, a 7-day
 * lease, DNS instructions and the abuse screening verdict. A record that
 * still holds the host, or any other live domain of the same organiser,
 * refuses the reservation.
 */
export async function reserveCustomDomain(
  db: firestore.Firestore,
  input: ReserveCustomDomainInput,
  clock: Clock
): Promise<CustomDomainRecord> {
  const served = parseServedHostname(input.hostname);
  if (!served) throw new Error("Invalid custom hostname");
  const expectedCname = normalizeHostingTarget(input.expectedCname);
  if (!expectedCname || expectedCname !== input.expectedCname ||
      isInsideTargetZone(served.hostname, expectedCname)) {
    throw new Error("Invalid hosting target");
  }
  const apexRedirect = input.apexRedirect ?? null;
  if (apexRedirect && apexRedirect.hostname !== served.registrableDomain) {
    throw new Error("Apex redirect must come from the registrable domain");
  }
  const screening = screenHostname(served);
  if (screening.verdict === "reject") {
    throw new Error("Hostname is blocklisted");
  }
  const {organizerId} = input.target;
  const domainRef = db.collection(COLLECTION).doc(served.hostname);
  return db.runTransaction(async (tx) => {
    if (input.actor.authority) {
      if (!input.actor.uid) throw new Error("An acting user is required");
      await input.actor.authority({db, organizerId,
        actorUid: input.actor.uid, transaction: tx});
    }
    /* firestore-index: customDomains (
      target.organizerId:ASCENDING,
      status:ASCENDING
    ) */
    const [existing, organizerDomains, form] = await Promise.all([
      tx.get(domainRef),
      tx.get(db.collection("customDomains")
        .where("target.organizerId", "==", organizerId)
        .where("status", "in", [...BLOCKING_STATUSES])),
      input.target.kind === "form" ?
        readPublishedForm(tx, db, input.target.formId) : Promise.resolve(null),
    ]);
    const nowMillis = readClock(clock);
    let target: CustomDomainRecord["target"] = {kind: "organizerPage",
      organizerId};
    if (input.target.kind === "form") {
      const publicFormId = form?.get("publicFormId");
      if (!form?.exists || form.get("organizerId") !== organizerId ||
          form.get("status") !== "published" ||
          typeof publicFormId !== "string") {
        throw new Error("Published form ownership is required");
      }
      target = {kind: "form", organizerId, formId: input.target.formId,
        publicFormId};
    }
    const previous = existing.exists ?
      parseCustomDomain(existing.data()) : null;
    if (existing.exists && !previous) throw new Error("Invalid domain record");
    for (const doc of organizerDomains.docs) {
      if (doc.id === served.hostname) continue;
      const other = parseCustomDomain(doc.data());
      // An unreadable record fails closed: it may be a live domain.
      if (!other || holdsHostname(other, nowMillis)) {
        throw new Error("Organizer already has a custom domain");
      }
    }
    const record = newReservation({served, apexRedirect, target,
      provider: input.provider, expectedCname,
      ownershipChallenge: `catch-verification=${
        randomBytes(24).toString("base64url")}`,
      previous, screening,
      context: context(input.actor, nowMillis, input.reason ?? null)});
    tx.set(domainRef, record);
    return record;
  });
}

interface MutationOptions {
  fence: CustomDomainFence;
  actor: RegistryActor;
  /** Statuses this operation accepts; anything else is a changed record. */
  from: readonly CustomDomainStatus[];
  /** Re-check a form target's publication inside the transaction. */
  requirePublishedForm?: boolean;
}

/**
 * One fenced read-modify-write. The clock is read after every transaction
 * read (and again on retries), so a held read cannot backdate a decision.
 * Returning the current record unchanged skips the write.
 */
async function mutate(
  db: firestore.Firestore,
  options: MutationOptions,
  clock: Clock,
  apply: (current: CustomDomainRecord, nowMillis: number) => CustomDomainRecord
): Promise<CustomDomainRecord> {
  requireHostname(options.fence.hostname);
  const ref = db.collection(COLLECTION).doc(options.fence.hostname);
  return db.runTransaction(async (tx) => {
    const current = parseCustomDomain((await tx.get(ref)).data());
    if (!current || !matchesFence(current, options.fence) ||
        !options.from.includes(current.status)) {
      throw new Error("Domain reservation changed");
    }
    if (options.actor.authority) {
      if (!options.actor.uid) throw new Error("An acting user is required");
      await options.actor.authority({db,
        organizerId: current.target.organizerId, actorUid: options.actor.uid,
        transaction: tx});
    }
    if (options.requirePublishedForm && current.target.kind === "form") {
      const form = await readPublishedForm(tx, db, current.target.formId);
      if (!isPublishedFormFor(form, current.target)) {
        throw new Error("Published form binding changed");
      }
    }
    const next = apply(current, readClock(clock));
    if (next !== current) tx.set(ref, next);
    return next;
  });
}

/** pendingDns -> verified on current TXT and CNAME proof inside the lease. */
export async function verifyCustomDomain(
  db: firestore.Firestore,
  input: {fence: CustomDomainFence; probe: DomainProbe | null;
    actor: RegistryActor},
  clock: Clock
): Promise<CustomDomainRecord> {
  if (!input.probe) throw new Error("DNS is unavailable");
  return mutate(db, {fence: input.fence, actor: input.actor,
    from: ["pendingDns"]}, clock, (current, nowMillis) => {
    if (isLeaseExpired(current, nowMillis) ||
        !hasCurrentDomainOwnership(current, input.probe, nowMillis)) {
      throw new Error("Domain ownership or routing is unverified");
    }
    return transitionCustomDomain(current, "verified",
      context(input.actor, nowMillis), {verifiedAtMillis: nowMillis,
        pendingExpiresAtMillis: null, lastCheckedAtMillis: nowMillis,
        consecutiveProbeFailures: 0});
  });
}

/** verified -> provisioning once the provider hostname exists. Idempotent. */
export async function markCustomDomainProvisioning(
  db: firestore.Firestore,
  input: {fence: CustomDomainFence; providerHostnameId: string;
    actor: RegistryActor},
  clock: Clock
): Promise<CustomDomainRecord> {
  return mutate(db, {fence: input.fence, actor: input.actor,
    from: ["verified", "provisioning"], requirePublishedForm: true}, clock,
  (current, nowMillis) => {
    if (current.status === "provisioning") {
      if (current.providerHostnameId !== input.providerHostnameId) {
        throw new Error("Provider hostname changed");
      }
      return current;
    }
    return transitionCustomDomain(current, "provisioning",
      context(input.actor, nowMillis),
      {providerHostnameId: input.providerHostnameId});
  });
}

function activePatch(evidence: ProviderEvidence,
  nowMillis: number): Partial<CustomDomainRecord> {
  return {providerStatus: {hostname: evidence.hostnameStatus,
    ssl: evidence.sslStatus, errors: [],
    observedAtMillis: evidence.observedAtMillis},
  lastCheckedAtMillis: nowMillis, lastHealthyAtMillis: nowMillis,
  consecutiveProbeFailures: 0, lapsedAtMillis: null};
}

function requireServingEvidence(current: CustomDomainRecord,
  probe: DomainProbe | null, evidence: ProviderEvidence | null,
  nowMillis: number): ProviderEvidence {
  if (current.review.state === "held") {
    throw new Error("Domain is held for review");
  }
  if (!hasCurrentDomainOwnership(current, probe, nowMillis) ||
      !evidence || !isFreshActiveProviderEvidence(current, evidence,
    nowMillis)) {
    throw new Error("Domain, DNS or certificate evidence is stale");
  }
  return evidence;
}

/**
 * provisioning -> active, atomically, on fresh DNS proof and fresh provider
 * evidence for the exact provider hostname. A held review never activates.
 * Activating an already active record is a no-op.
 */
export async function activateCustomDomain(
  db: firestore.Firestore,
  input: {fence: CustomDomainFence; probe: DomainProbe | null;
    evidence: ProviderEvidence | null | ((current: CustomDomainRecord,
      nowMillis: number) => ProviderEvidence | null);
    actor: RegistryActor},
  clock: Clock
): Promise<CustomDomainRecord> {
  return mutate(db, {fence: input.fence, actor: input.actor,
    from: ["provisioning", "active"], requirePublishedForm: true}, clock,
  (current, nowMillis) => {
    const evidence = requireServingEvidence(current, input.probe,
      typeof input.evidence === "function" ?
        input.evidence(current, nowMillis) : input.evidence, nowMillis);
    if (current.status === "active") return current;
    return transitionCustomDomain(current, "active",
      context(input.actor, nowMillis),
      {...activePatch(evidence, nowMillis), activatedAtMillis: nowMillis});
  });
}

/** active -> lapsed: DNS stopped proving the domain. It stops serving now. */
export async function lapseCustomDomain(
  db: firestore.Firestore,
  input: {fence: CustomDomainFence; actor: RegistryActor; reason: string},
  clock: Clock
): Promise<CustomDomainRecord> {
  return mutate(db, {fence: input.fence, actor: input.actor,
    from: ["active"]}, clock, (current, nowMillis) =>
    transitionCustomDomain(current, "lapsed",
      context(input.actor, nowMillis, input.reason),
      {lapsedAtMillis: nowMillis, lastCheckedAtMillis: nowMillis,
        consecutiveProbeFailures: current.consecutiveProbeFailures + 1}));
}

/** lapsed -> active within the grace, without a new challenge. */
export async function restoreCustomDomain(
  db: firestore.Firestore,
  input: {fence: CustomDomainFence; probe: DomainProbe | null;
    evidence: ProviderEvidence | null; actor: RegistryActor},
  clock: Clock
): Promise<CustomDomainRecord> {
  return mutate(db, {fence: input.fence, actor: input.actor,
    from: ["lapsed"], requirePublishedForm: true}, clock,
  (current, nowMillis) => {
    if (current.lapsedAtMillis === null ||
        nowMillis >= current.lapsedAtMillis + LAPSE_GRACE_MS) {
      throw new Error("Lapse grace has ended");
    }
    const evidence = requireServingEvidence(current, input.probe,
      input.evidence, nowMillis);
    return transitionCustomDomain(current, "active",
      context(input.actor, nowMillis, "DNS recovered within the grace"),
      activePatch(evidence, nowMillis));
  });
}

/** lapsed -> removed once the 14-day grace has passed. */
export async function removeLapsedCustomDomain(
  db: firestore.Firestore,
  input: {fence: CustomDomainFence; actor: RegistryActor},
  clock: Clock
): Promise<CustomDomainRecord> {
  return mutate(db, {fence: input.fence, actor: input.actor,
    from: ["lapsed"]}, clock, (current, nowMillis) => {
    if (current.lapsedAtMillis === null ||
        nowMillis < current.lapsedAtMillis + LAPSE_GRACE_MS) {
      throw new Error("Lapse grace has not ended");
    }
    return transitionCustomDomain(current, "removed",
      context(input.actor, nowMillis, "Lapsed for the whole grace period"));
  });
}

/** pendingDns -> expired once the lease ends. */
export async function expireCustomDomainLease(
  db: firestore.Firestore,
  input: {fence: CustomDomainFence; actor: RegistryActor},
  clock: Clock
): Promise<CustomDomainRecord> {
  return mutate(db, {fence: input.fence, actor: input.actor,
    from: ["pendingDns"]}, clock, (current, nowMillis) => {
    if (!isLeaseExpired(current, nowMillis)) {
      throw new Error("Lease has not ended");
    }
    return transitionCustomDomain(current, "expired",
      context(input.actor, nowMillis, "Lease ended before DNS was verified"));
  });
}

/**
 * Any live status -> removed: owner removal, lifecycle hooks, Admin or the
 * operator's revoke. Routing stops in the same commit. Repeating it for the
 * same generation is a no-op.
 */
export async function removeCustomDomain(
  db: firestore.Firestore,
  input: {fence: CustomDomainFence; actor: RegistryActor;
    reason?: string | null},
  clock: Clock
): Promise<CustomDomainRecord> {
  return mutate(db, {fence: input.fence, actor: input.actor,
    from: [...BLOCKING_STATUSES, "removed"]}, clock, (current, nowMillis) =>
    current.status === "removed" ? current :
      transitionCustomDomain(current, "removed",
        context(input.actor, nowMillis, input.reason ?? null)));
}

/** Any live status -> failed on a provider error the owner may retry. */
export async function failCustomDomain(
  db: firestore.Firestore,
  input: {fence: CustomDomainFence; actor: RegistryActor; reason: string;
    providerStatus?: CustomDomainRecord["providerStatus"]},
  clock: Clock
): Promise<CustomDomainRecord> {
  return mutate(db, {fence: input.fence, actor: input.actor,
    from: ["pendingDns", "verified", "provisioning", "active"]}, clock,
  (current, nowMillis) => transitionCustomDomain(current, "failed",
    context(input.actor, nowMillis, input.reason),
    {lastCheckedAtMillis: nowMillis,
      ...(input.providerStatus !== undefined ?
        {providerStatus: input.providerStatus} : {})}));
}

/** failed -> pendingDns with a fresh lease and the same challenge. */
export async function retryCustomDomain(
  db: firestore.Firestore,
  input: {fence: CustomDomainFence; actor: RegistryActor},
  clock: Clock
): Promise<CustomDomainRecord> {
  return mutate(db, {fence: input.fence, actor: input.actor,
    from: ["failed"]}, clock, (current, nowMillis) =>
    transitionCustomDomain(current, "pendingDns",
      context(input.actor, nowMillis, "Retry after a provider error"),
      {pendingExpiresAtMillis: nowMillis + PENDING_LEASE_MS,
        verifiedAtMillis: null, activatedAtMillis: null,
        consecutiveProbeFailures: 0}));
}

/** Admin suspension: routing stops within the website's 60-second cache. */
export async function suspendCustomDomain(
  db: firestore.Firestore,
  input: {fence: CustomDomainFence; byUid: string; reason: string},
  clock: Clock
): Promise<CustomDomainRecord> {
  const actor: RegistryActor = {kind: "admin", uid: input.byUid};
  return mutate(db, {fence: input.fence, actor,
    from: BLOCKING_STATUSES}, clock, (current, nowMillis) =>
    current.status === "suspended" ? current :
      transitionCustomDomain(current, "suspended",
        context(actor, nowMillis, input.reason),
        {suspension: {reason: input.reason, byUid: input.byUid,
          atMillis: nowMillis}}));
}

/**
 * Lifts a suspension back to the status it interrupted. When the bounded
 * history no longer shows it, the record becomes failed: retryable, never
 * serving without fresh proof.
 */
export async function unsuspendCustomDomain(
  db: firestore.Firestore,
  input: {fence: CustomDomainFence; byUid: string; reason: string},
  clock: Clock
): Promise<CustomDomainRecord> {
  const actor: RegistryActor = {kind: "admin", uid: input.byUid};
  return mutate(db, {fence: input.fence, actor, from: ["suspended"]}, clock,
    (current, nowMillis) => {
      const entry = [...current.history].reverse()
        .find((item) => item.to === "suspended");
      const before = entry?.from;
      const to: CustomDomainStatus = before && before !== "suspended" &&
        !isTerminalStatus(before) ? before : "failed";
      return transitionCustomDomain(current, to,
        context(actor, nowMillis, input.reason));
    });
}

/** Admin clears a review hold; the status is unchanged. */
export async function approveCustomDomainReview(
  db: firestore.Firestore,
  input: {fence: CustomDomainFence; byUid: string},
  clock: Clock
): Promise<CustomDomainRecord> {
  const actor: RegistryActor = {kind: "admin", uid: input.byUid};
  return mutate(db, {fence: input.fence, actor, from: BLOCKING_STATUSES},
    clock, (current) => current.review.state !== "held" ? current :
      reviseCustomDomain(current, {review: {state: "approved",
        reason: current.review.reason}}));
}

/** Operator-only evidence from the exact, live Firebase Hosting resource. */
export interface FormDomainCertificateEvidence {
  projectId: string;
  siteId: string;
  hostname: string;
  observedAtMillis: number;
  expiresAtMillis: number;
}

/** The provider id the Hosting adapter records for one site and host. */
export function firebaseHostingProviderHostnameId(siteId: string,
  hostname: string): string {
  return `${siteId}:${hostname}`;
}

/**
 * Activate a form domain on Firebase Hosting certificate evidence. The
 * evidence must name the trusted project, the record's exact host and the
 * site its CNAME targets, and be at most five minutes old after every read.
 */
export async function activateFormCustomDomain(
  db: firestore.Firestore,
  input: {expected: CustomDomainRecord; probe: DomainProbe | null;
    certificate: FormDomainCertificateEvidence | null; actorUid: string;
    trustedProjectId: string},
  clock: Clock,
  assertManager: OrganizerAuthority
): Promise<CustomDomainRecord> {
  const {expected, probe, certificate} = input;
  requireHostname(expected.hostname);
  if (!parseCustomDomain(expected) || expected.target.kind !== "form" ||
      expected.provider !== "firebaseHosting" || !probe || !certificate) {
    throw new Error("Domain, DNS or certificate evidence is unavailable");
  }
  return activateCustomDomain(db, {fence: expected, probe,
    actor: {kind: "operator", uid: input.actorUid, authority: assertManager},
    evidence: (current, nowMillis) => {
      if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/u.test(input.trustedProjectId) ||
          certificate.projectId !== input.trustedProjectId ||
          certificate.hostname !== current.hostname ||
          !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(
            certificate.siteId) ||
          `${certificate.siteId}.web.app` !== current.expectedCname ||
          !Number.isSafeInteger(certificate.expiresAtMillis) ||
          certificate.expiresAtMillis <= nowMillis) {
        throw new Error("Hosting certificate evidence is stale or mismatched");
      }
      return {providerHostnameId: firebaseHostingProviderHostnameId(
        certificate.siteId, certificate.hostname),
      hostnameStatus: "active", sslStatus: "active",
      observedAtMillis: certificate.observedAtMillis};
    }}, clock);
}

/**
 * Check current manager, reservation and publication together. This is a
 * read-only transaction; external provider writes still need a fresh check.
 */
export async function assertFormCustomDomainBinding(
  db: firestore.Firestore, expected: CustomDomainRecord, actorUid: string,
  statuses: readonly CustomDomainStatus[], assertManager: OrganizerAuthority
): Promise<CustomDomainRecord> {
  requireHostname(expected.hostname);
  return db.runTransaction(async (tx) => {
    const current = parseCustomDomain((await tx.get(db.collection(
      COLLECTION).doc(expected.hostname))).data());
    if (!current || !sameCustomDomainBinding(current, expected) ||
        current.target.kind !== "form" ||
        !statuses.includes(current.status)) {
      throw new Error("Domain reservation changed");
    }
    await assertManager({db, organizerId: current.target.organizerId,
      actorUid, transaction: tx});
    // Removal and provider cleanup remain possible after unpublication.
    if (!statuses.includes("removed")) {
      const form = await readPublishedForm(tx, db, current.target.formId);
      if (!isPublishedFormFor(form, current.target)) {
        throw new Error("Published form binding changed");
      }
    }
    return current;
  });
}

/** Exact host, current DNS, and current form ownership all have to agree. */
export async function resolveFormCustomDomain(
  db: firestore.Firestore, requestHost: string,
  probeOrLoad: DomainProbe | null | (() => Promise<DomainProbe | null>),
  clock: Clock
): Promise<{organizerId: string; publicFormId: string} | null> {
  const served = parseServedHostname(requestHost);
  if (!served) return null;
  const domainRef = db.collection(COLLECTION).doc(served.hostname);
  const record = parseCustomDomain((await domainRef.get()).data());
  if (!record || record.status !== "active" ||
      record.target.kind !== "form") return null;
  const probe = typeof probeOrLoad === "function" ?
    await probeOrLoad() : probeOrLoad;
  if (!probe) return null;
  // DNS can outlive removal or reassignment. Read the binding and form in one
  // transaction, and never let this request switch reservation identity.
  return db.runTransaction(async (tx) => {
    const current = parseCustomDomain((await tx.get(domainRef)).data());
    if (!current || current.status !== "active" ||
        !sameCustomDomainBinding(current, record) ||
        current.target.kind !== "form") return null;
    const form = await readPublishedForm(tx, db, current.target.formId);
    // Probe timestamps describe completion. Check time after DNS and reads,
    // including any transaction retry, without treating network time as future.
    const resolved = resolveFormTarget(served.hostname, current, probe,
      readClock(clock));
    if (!resolved || !isPublishedFormFor(form, current.target)) return null;
    return {organizerId: resolved.organizerId,
      publicFormId: resolved.publicFormId};
  });
}
