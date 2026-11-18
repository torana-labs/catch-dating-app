import {parse} from "tldts";
import {BRAND} from "../shared/generated/brand";
import {customDomainBlocklistCatalog} from
  "../shared/generated/catalogs/customDomainBlocklistCatalog";
import type {CustomDomainDocument} from
  "../shared/generated/customDomainDocument";
import {validateCustomDomainDocument} from
  "../shared/generated/validators/customDomainDocument";

/**
 * Provider-neutral policy for customDomains/{hostname} (#1110): which hosts
 * Catch may serve, how a typed domain becomes a served host, the lifecycle
 * state machine and the DNS proof every transition relies on. Pure functions
 * only; the registry applies them inside Firestore transactions. Never route
 * from an unvalidated request Host alone.
 */
export type CustomDomainRecord = CustomDomainDocument;
export type CustomDomainStatus = CustomDomainRecord["status"];
export type CustomDomainTarget = CustomDomainRecord["target"];
export type CustomDomainHistoryEntry = CustomDomainRecord["history"][number];
export type CustomDomainActor = CustomDomainHistoryEntry["actor"];
export type CustomDomainApexRedirect = CustomDomainRecord["apexRedirect"];

export interface DomainProbe {
  hostname: string;
  txtValues: readonly string[];
  cnameTarget: string | null;
  checkedAtMillis: number;
}

/** Organisers are slower than operators, so the lease outlasts the old 48h. */
export const PENDING_LEASE_MS = 7 * 24 * 60 * 60 * 1000;
/** A lapsed domain is removed after this grace unless DNS recovers first. */
export const LAPSE_GRACE_MS = 14 * 24 * 60 * 60 * 1000;
export const MAX_PROBE_AGE_MS = 15 * 60 * 1000;
export const MAX_PROVIDER_EVIDENCE_AGE_MS = 5 * 60 * 1000;
export const HISTORY_LIMIT = 30;

/**
 * pendingDns -> verified -> provisioning -> active <-> lapsed -> removed.
 * Any live state can be suspended (Admin) or fail (provider error, retried to
 * pendingDns). An ended pendingDns lease becomes expired. removed and expired
 * end a generation; only a new reservation (generation + 1) leaves them.
 */
export const CUSTOM_DOMAIN_TRANSITIONS: Readonly<Record<CustomDomainStatus,
  readonly CustomDomainStatus[]>> = {
    pendingDns: ["verified", "expired", "failed", "suspended", "removed"],
    verified: ["provisioning", "failed", "suspended", "removed"],
    provisioning: ["active", "failed", "suspended", "removed"],
    active: ["lapsed", "failed", "suspended", "removed"],
    lapsed: ["active", "suspended", "removed"],
    suspended: ["pendingDns", "verified", "provisioning", "active", "lapsed",
      "failed", "removed"],
    failed: ["pendingDns", "suspended", "removed"],
    expired: [],
    removed: [],
  };

/** Statuses that hold the hostname and count towards an organiser's limit. */
export const BLOCKING_STATUSES: readonly CustomDomainStatus[] = [
  "pendingDns", "verified", "provisioning", "active", "lapsed", "suspended",
  "failed",
];

export function isTerminalStatus(status: CustomDomainStatus): boolean {
  return CUSTOM_DOMAIN_TRANSITIONS[status].length === 0;
}

export function canTransition(from: CustomDomainStatus,
  to: CustomDomainStatus): boolean {
  return CUSTOM_DOMAIN_TRANSITIONS[from].includes(to);
}

export function isLeaseExpired(record: CustomDomainRecord,
  nowMillis: number): boolean {
  return record.status === "pendingDns" &&
    record.pendingExpiresAtMillis !== null &&
    record.pendingExpiresAtMillis <= nowMillis;
}

/** Whether this record still holds its hostname against another reservation. */
export function holdsHostname(record: CustomDomainRecord,
  nowMillis: number): boolean {
  return !isTerminalStatus(record.status) && !isLeaseExpired(record, nowMillis);
}

const LDH_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u;
// RFC 2606 and 6761 names never resolve publicly, so they can never pass DNS
// proof in production; tests and fixtures use them instead of real domains.
const RESERVED_TEST_SUFFIXES = new Set(["test", "example"]);

function isLdhHostname(host: string): boolean {
  if (host.length > 253) return false;
  const labels = host.split(".");
  return labels.length >= 2 &&
    labels.every((label) => LDH_LABEL.test(label) &&
      // IDN A-labels (xn--) and every other reserved "??--" prefix.
      label.slice(2, 4) !== "--") &&
    /^[a-z]{2,63}$/u.test(labels[labels.length - 1]);
}

function hostIsUnder(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** Catch's own domains and the hosting providers Catch or others operate. */
export function isReservedHost(host: string): boolean {
  return [BRAND.web.domain, ...customDomainBlocklistCatalog.providerSuffixes]
    .some((domain) => hostIsUnder(host, domain));
}

/**
 * The registrable domain from the pinned Public Suffix List (tldts), never a
 * label count: club.co.in is itself registrable. Null for IPs, bare public
 * suffixes, non-ICANN names (except the reserved test names) and hosts under a
 * private suffix such as a hosting provider's, whose DNS the organiser does
 * not control.
 */
export function registrableDomainOf(host: string): string | null {
  if (!isLdhHostname(host)) return null;
  const icann = parse(host, {extractHostname: false,
    allowPrivateDomains: false, detectIp: true, validateHostname: true});
  if (icann.isIp || !icann.domain || !icann.publicSuffix) return null;
  if (!icann.isIcann && !RESERVED_TEST_SUFFIXES.has(icann.publicSuffix)) {
    return null;
  }
  const withPrivate = parse(host, {extractHostname: false,
    allowPrivateDomains: true, detectIp: false});
  if (withPrivate.isPrivate) return null;
  return icann.domain;
}

export interface ServedHostname {
  hostname: string;
  registrableDomain: string;
}

/**
 * Strict parse of an already-normalised served host: a document id, a lookup
 * key or a request Host. Ports, case, trailing dots, wildcards, IPs, IDN,
 * reserved hosts and apex domains all return null.
 */
export function parseServedHostname(raw: unknown): ServedHostname | null {
  if (typeof raw !== "string") return null;
  const registrableDomain = registrableDomainOf(raw);
  if (!registrableDomain || registrableDomain === raw ||
      isReservedHost(raw)) return null;
  return {hostname: raw, registrableDomain};
}

/** A served host can never sit inside the zone its CNAME target lives in. */
export function isInsideTargetZone(hostname: string,
  expectedCname: string): boolean {
  const zone = parse(expectedCname, {extractHostname: false,
    allowPrivateDomains: true}).domain ?? expectedCname;
  return hostIsUnder(hostname, zone);
}

/** A trusted deployment target may itself be on a Catch/provider hostname. */
export function normalizeHostingTarget(raw: string): string | null {
  const host = raw.toLowerCase().replace(/\.$/u, "");
  if (host.length > 253 || !/^[a-z0-9.-]+$/u.test(host)) return null;
  const labels = host.split(".");
  if (labels.length < 2 || labels.some((label) => !LDH_LABEL.test(label))) {
    return null;
  }
  return host;
}

export type HostnameRejection = "invalid" | "ipAddress" | "idn" |
  "noRegistrableDomain" | "reservedHost";

export type RequestedHostname = ServedHostname & {
  apexRedirect: CustomDomainApexRedirect;
} | {rejected: HostnameRejection};

/**
 * Turns what an owner typed into the host Catch serves. A bare registrable
 * domain becomes www.<domain> with a registrar redirect from the apex; any
 * other subdomain is served as typed.
 */
export function normalizeRequestedHostname(raw: string): RequestedHostname {
  let host = raw.trim().toLowerCase();
  if (host.endsWith(".")) host = host.slice(0, -1);
  if (!host || /[\s:/\\@*?#[\]]/u.test(host)) return {rejected: "invalid"};
  // eslint-disable-next-line no-control-regex
  if (/[^\x00-\x7f]/u.test(host) ||
      host.split(".").some((label) => label.slice(2, 4) === "--")) {
    return {rejected: "idn"};
  }
  if (/^[0-9.]+$/u.test(host)) return {rejected: "ipAddress"};
  if (!isLdhHostname(host)) return {rejected: "invalid"};
  if (isReservedHost(host)) return {rejected: "reservedHost"};
  const registrableDomain = registrableDomainOf(host);
  if (!registrableDomain) {
    const withPrivate = parse(host, {extractHostname: false,
      allowPrivateDomains: true});
    return {rejected: withPrivate.isPrivate ?
      "reservedHost" : "noRegistrableDomain"};
  }
  const hostname = host === registrableDomain ? `www.${host}` : host;
  const served = parseServedHostname(hostname);
  if (!served) return {rejected: "invalid"};
  return {...served, apexRedirect: hostname === `www.${registrableDomain}` ?
    {hostname: registrableDomain, mode: "registrar"} : null};
}

export type HostnameScreening = {verdict: "allow"} |
  {verdict: "review" | "reject"; reason: string};

const CONFUSABLES: ReadonlyArray<[RegExp, string]> = [
  [/rn/gu, "m"], [/vv/gu, "w"], [/0/gu, "o"], [/[1i]/gu, "l"], [/3/gu, "e"],
  [/4/gu, "a"], [/5/gu, "s"], [/7/gu, "t"], [/8/gu, "b"],
];

function skeleton(text: string): string {
  return CONFUSABLES.reduce((value, [pattern, replacement]) =>
    value.replace(pattern, replacement), text);
}

function withinOneEdit(left: string, right: string): boolean {
  if (Math.abs(left.length - right.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (left.length > right.length) i++;
    else if (right.length > left.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (left.length - i) + (right.length - j) <= 1;
}

function rejectTerms(): string[] {
  // Catch's brand label comes from the brand config, not the public catalog.
  const brandLabel = BRAND.web.domain.split(".")[0].replaceAll("-", "");
  return [brandLabel, ...customDomainBlocklistCatalog.terms
    .filter((entry) => entry.action === "reject")
    .map((entry) => entry.term)];
}

/**
 * Abuse screening (#1110 owner decision): an exact blocklist hit is refused,
 * a lookalike of a refused term or a credential/payment term is held for
 * Admin review and never serves until approved.
 */
export function screenHostname(served: ServedHostname): HostnameScreening {
  const labels = served.hostname.split(".")
    .map((label) => label.replaceAll("-", ""));
  const registrableLabel = served.registrableDomain.split(".")[0]
    .replaceAll("-", "");
  const refused = rejectTerms();
  for (const term of refused) {
    if (labels.includes(term) || registrableLabel.includes(term)) {
      return {verdict: "reject", reason: `blocklisted:${term}`};
    }
  }
  for (const term of refused) {
    const shape = skeleton(term);
    if (labels.some((label) => skeleton(label).includes(shape) ||
        (term.length >= 6 && withinOneEdit(label, term)))) {
      return {verdict: "review", reason: `lookalike:${term}`};
    }
  }
  for (const {term} of customDomainBlocklistCatalog.terms
    .filter((entry) => entry.action === "review")) {
    const shape = skeleton(term);
    if (labels.some((label) => label.includes(term) ||
        skeleton(label).includes(shape))) {
      return {verdict: "review", reason: `term:${term}`};
    }
  }
  return {verdict: "allow"};
}

export function dnsInstructionsFor(input: {hostname: string;
  ownershipChallenge: string; expectedCname: string;
  apexRedirect: CustomDomainApexRedirect;
}): CustomDomainRecord["dnsInstructions"] {
  return [
    {type: "CNAME", name: input.hostname, value: input.expectedCname,
      purpose: "routing"},
    {type: "TXT", name: `_catch-verify.${input.hostname}`,
      value: input.ownershipChallenge, purpose: "ownership"},
    ...(input.apexRedirect ? [{type: "redirect" as const,
      name: input.apexRedirect.hostname, value: `https://${input.hostname}/`,
      purpose: "apexRedirect" as const}] : []),
  ];
}

/**
 * Reads one stored record. The schema validator covers shape; this also
 * enforces what JSON Schema cannot: the Public Suffix List relationship
 * between hostname and registrableDomain, and the apex redirect source.
 */
export function parseCustomDomain(value: unknown): CustomDomainRecord | null {
  if (!validateCustomDomainDocument(value)) return null;
  const record = value as CustomDomainRecord;
  const served = parseServedHostname(record.hostname);
  if (!served || served.registrableDomain !== record.registrableDomain ||
      (record.apexRedirect !== null &&
        record.apexRedirect.hostname !== record.registrableDomain) ||
      normalizeHostingTarget(record.expectedCname) !== record.expectedCname) {
    return null;
  }
  return record;
}

export function requireValidCustomDomain(
  record: CustomDomainRecord
): CustomDomainRecord {
  if (!parseCustomDomain(record)) {
    throw new Error("Custom domain record would be invalid");
  }
  return record;
}

/** Immutable reservation identity carried across provider and DNS reads. */
export function sameCustomDomainBinding(
  current: CustomDomainRecord, expected: CustomDomainRecord
): boolean {
  return (["hostname", "registrableDomain", "ownershipChallenge",
    "expectedCname", "generation", "reservedAtMillis", "provider"] as const)
    .every((key) => current[key] === expected[key]) &&
    sameTarget(current.target, expected.target);
}

export function sameTarget(left: CustomDomainTarget,
  right: CustomDomainTarget): boolean {
  if (left.kind !== right.kind || left.organizerId !== right.organizerId) {
    return false;
  }
  return left.kind === "organizerPage" || (right.kind === "form" &&
    left.formId === right.formId && left.publicFormId === right.publicFormId);
}

export function hasCurrentDomainOwnership(
  record: CustomDomainRecord,
  probe: DomainProbe | null,
  nowMillis: number
): boolean {
  if (!probe || isTerminalStatus(record.status) ||
      parseServedHostname(record.hostname)?.hostname !== record.hostname ||
      probe.hostname !== record.hostname ||
      !Number.isFinite(nowMillis) || !Number.isFinite(probe.checkedAtMillis) ||
      probe.checkedAtMillis > nowMillis ||
      nowMillis - probe.checkedAtMillis > MAX_PROBE_AGE_MS) return false;
  return probe.txtValues.includes(record.ownershipChallenge) &&
    probe.cnameTarget?.replace(/\.$/u, "").toLowerCase() ===
      record.expectedCname;
}

export interface TransitionContext {
  atMillis: number;
  actor: CustomDomainActor;
  actorUid: string | null;
  reason: string | null;
}

function appendHistory(record: CustomDomainRecord,
  entry: CustomDomainHistoryEntry): CustomDomainRecord["history"] {
  return [...record.history, entry].slice(-HISTORY_LIMIT);
}

/** Applies one guarded status change, bumping revision and history. */
export function transitionCustomDomain(
  record: CustomDomainRecord,
  to: CustomDomainStatus,
  context: TransitionContext,
  patch: Partial<CustomDomainRecord> = {}
): CustomDomainRecord {
  if (!canTransition(record.status, to)) {
    throw new Error(`Custom domain cannot move from ${record.status} to ${to}`);
  }
  return requireValidCustomDomain({
    ...record, ...patch, status: to, revision: record.revision + 1,
    suspension: to === "suspended" ? patch.suspension ?? null : null,
    history: appendHistory(record, {atMillis: context.atMillis,
      from: record.status, to, actor: context.actor,
      actorUid: context.actorUid, reason: context.reason}),
  });
}

/** A field change without a status change still bumps revision. */
export function reviseCustomDomain(record: CustomDomainRecord,
  patch: Partial<CustomDomainRecord>): CustomDomainRecord {
  return requireValidCustomDomain({...record, ...patch, status: record.status,
    revision: record.revision + 1});
}

/** Starts a new generation: a fresh challenge, lease and DNS instructions. */
export function newReservation(input: {
  served: ServedHostname;
  apexRedirect: CustomDomainApexRedirect;
  target: CustomDomainTarget;
  provider: CustomDomainRecord["provider"];
  expectedCname: string;
  ownershipChallenge: string;
  previous: CustomDomainRecord | null;
  screening: HostnameScreening;
  context: TransitionContext;
}): CustomDomainRecord {
  const {served, previous, context} = input;
  if (input.screening.verdict === "reject") {
    throw new Error("Hostname is blocklisted");
  }
  if (previous && holdsHostname(previous, context.atMillis)) {
    throw new Error("Hostname is already reserved");
  }
  const history = previous ? previous.history : [];
  // An expired lease is recorded as expired before the new generation starts.
  const closed = previous && previous.status === "pendingDns" ? [{
    atMillis: context.atMillis, from: "pendingDns" as const,
    to: "expired" as const, actor: context.actor, actorUid: context.actorUid,
    reason: "Lease ended before DNS was verified"}] : [];
  const fromStatus = closed.length ? "expired" : previous?.status ?? null;
  return requireValidCustomDomain({
    hostname: served.hostname,
    registrableDomain: served.registrableDomain,
    target: input.target,
    status: "pendingDns",
    generation: (previous?.generation ?? 0) + 1,
    revision: (previous?.revision ?? 0) + 1,
    ownershipChallenge: input.ownershipChallenge,
    expectedCname: input.expectedCname,
    apexRedirect: input.apexRedirect,
    provider: input.provider,
    providerHostnameId: null,
    providerStatus: null,
    dnsInstructions: dnsInstructionsFor({hostname: served.hostname,
      ownershipChallenge: input.ownershipChallenge,
      expectedCname: input.expectedCname, apexRedirect: input.apexRedirect}),
    reservedAtMillis: context.atMillis,
    pendingExpiresAtMillis: context.atMillis + PENDING_LEASE_MS,
    verifiedAtMillis: null,
    activatedAtMillis: null,
    lastCheckedAtMillis: null,
    lastHealthyAtMillis: null,
    lapsedAtMillis: null,
    consecutiveProbeFailures: 0,
    review: input.screening.verdict === "review" ?
      {state: "held", reason: input.screening.reason} :
      {state: "none", reason: null},
    suspension: null,
    createdByUid: context.actor === "owner" ? context.actorUid : null,
    history: [...history, ...closed, {atMillis: context.atMillis,
      from: fromStatus, to: "pendingDns" as const, actor: context.actor,
      actorUid: context.actorUid, reason: context.reason}]
      .slice(-HISTORY_LIMIT),
  });
}

/** Trusted provider evidence for one exact hostname, freshly observed. */
export interface ProviderEvidence {
  providerHostnameId: string;
  hostnameStatus: string;
  sslStatus: string;
  observedAtMillis: number;
}

export function isFreshActiveProviderEvidence(record: CustomDomainRecord,
  evidence: ProviderEvidence | null, nowMillis: number): boolean {
  return !!evidence && record.providerHostnameId !== null &&
    evidence.providerHostnameId === record.providerHostnameId &&
    evidence.hostnameStatus === "active" && evidence.sslStatus === "active" &&
    Number.isSafeInteger(evidence.observedAtMillis) &&
    evidence.observedAtMillis <= nowMillis &&
    nowMillis - evidence.observedAtMillis <= MAX_PROVIDER_EVIDENCE_AGE_MS;
}

/** A held review never serves; only an approved or unscreened record does. */
export function isServable(record: CustomDomainRecord): boolean {
  return record.status === "active" && record.review.state !== "held" &&
    record.providerStatus?.ssl === "active" &&
    record.providerStatus.hostname === "active";
}

/** Exact host, live record, current DNS and a form target all have to agree. */
export function resolveFormTarget(
  requestHost: string,
  record: CustomDomainRecord | null,
  probe: DomainProbe | null,
  nowMillis: number
): {organizerId: string; formId: string; publicFormId: string} | null {
  const served = parseServedHostname(requestHost);
  if (!served || !record || record.hostname !== served.hostname ||
      record.target.kind !== "form" || !isServable(record) ||
      !record.verifiedAtMillis ||
      !hasCurrentDomainOwnership(record, probe, nowMillis)) return null;
  return {organizerId: record.target.organizerId,
    formId: record.target.formId, publicFormId: record.target.publicFormId};
}
