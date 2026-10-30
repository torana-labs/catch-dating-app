import {BRAND} from "../shared/generated/brand";
/**
 * Domain activation policy for the hosting adapter. Records are inert until a
 * trusted DNS probe and certificate observer supply current evidence.
 * Never route from an unvalidated request Host alone.
 */
export interface OrganizerFormDomain {
  hostname: string;
  organizerId: string;
  formId: string;
  publicFormId: string;
  ownershipChallenge: string;
  expectedCname: string;
  status: "pending" | "verified" | "active" | "revoked";
  certificateStatus: "pending" | "ready" | "failed";
  verifiedAtMillis: number | null;
  generation: number;
  reservedAtMillis: number;
  pendingExpiresAtMillis: number;
}

export interface DomainProbe {
  hostname: string;
  txtValues: readonly string[];
  cnameTarget: string | null;
  checkedAtMillis: number;
}

const MAX_PROBE_AGE_MS = 15 * 60 * 1000;

export function normalizeCustomFormHost(raw: string): string | null {
  // Host headers with ports, paths, userinfo, wildcards, or invalid DNS labels
  // must never select a tenant. Only one exact lowercase ASCII hostname routes.
  const host = raw.toLowerCase();
  if (host.length > 253 || !host.includes(".") || host.endsWith(".") ||
      !/^[a-z0-9.-]+$/u.test(host)) return null;
  const labels = host.split(".");
  if (labels.some((label) => label.length < 1 || label.length > 63 ||
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(label))) return null;
  if (labels.length < 3 || /^\d+$/u.test(labels[labels.length - 1]) ||
      host === BRAND.web.domain || host.endsWith(`.${BRAND.web.domain}`) ||
      host.endsWith(".firebaseapp.com") || host.endsWith(".web.app") ||
      host.endsWith(".localhost")) return null;
  return host;
}

/** A trusted deployment target may itself be on a Catch/provider hostname. */
export function normalizeHostingTarget(raw: string): string | null {
  const host = raw.toLowerCase().replace(/\.$/u, "");
  if (host.length > 253 || !/^[a-z0-9.-]+$/u.test(host)) return null;
  const labels = host.split(".");
  if (labels.length < 2 || labels.some((label) => label.length < 1 ||
      label.length > 63 ||
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(label))) return null;
  return host;
}

export function parseOrganizerFormDomain(
  value: unknown
): OrganizerFormDomain | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<OrganizerFormDomain>;
  if (typeof record.hostname !== "string" ||
      normalizeCustomFormHost(record.hostname) !== record.hostname ||
      typeof record.organizerId !== "string" || !record.organizerId ||
      typeof record.formId !== "string" || !record.formId ||
      typeof record.publicFormId !== "string" || !record.publicFormId ||
      typeof record.ownershipChallenge !== "string" ||
      !/^catch-verification=[A-Za-z0-9_-]{32}$/u.test(
        record.ownershipChallenge) ||
      typeof record.expectedCname !== "string" ||
      normalizeHostingTarget(record.expectedCname) !== record.expectedCname ||
      !["pending", "verified", "active", "revoked"].includes(
        record.status ?? "") ||
      !["pending", "ready", "failed"].includes(
        record.certificateStatus ?? "") ||
      !(record.verifiedAtMillis === null ||
        (typeof record.verifiedAtMillis === "number" &&
          Number.isFinite(record.verifiedAtMillis))) ||
      !Number.isSafeInteger(record.generation) ||
      (record.generation ?? 0) < 1 ||
      typeof record.reservedAtMillis !== "number" ||
      !Number.isFinite(record.reservedAtMillis) ||
      typeof record.pendingExpiresAtMillis !== "number" ||
      !Number.isFinite(record.pendingExpiresAtMillis) ||
      record.pendingExpiresAtMillis <= record.reservedAtMillis) {
    return null;
  }
  return record as OrganizerFormDomain;
}

export function hasCurrentDomainOwnership(
  domain: OrganizerFormDomain,
  probe: DomainProbe | null,
  nowMillis: number
): boolean {
  if (!probe || domain.status === "revoked" ||
      normalizeCustomFormHost(domain.hostname) !== domain.hostname ||
      normalizeCustomFormHost(probe.hostname) !== domain.hostname ||
      !Number.isFinite(nowMillis) || !Number.isFinite(probe.checkedAtMillis) ||
      probe.checkedAtMillis > nowMillis ||
      nowMillis - probe.checkedAtMillis > MAX_PROBE_AGE_MS) return false;
  return probe.txtValues.includes(domain.ownershipChallenge) &&
    probe.cnameTarget?.replace(/\.$/u, "").toLowerCase() ===
      domain.expectedCname;
}

export function verifyFormDomain(
  domain: OrganizerFormDomain,
  probe: DomainProbe,
  nowMillis: number
): OrganizerFormDomain {
  if (domain.status !== "pending" ||
      nowMillis >= domain.pendingExpiresAtMillis ||
      !hasCurrentDomainOwnership(domain, probe, nowMillis)) {
    throw new Error("Domain ownership or routing is unverified");
  }
  return {...domain, status: "verified", verifiedAtMillis: nowMillis};
}

export function activateFormDomain(
  domain: OrganizerFormDomain,
  probe: DomainProbe,
  nowMillis: number
): OrganizerFormDomain {
  if (domain.status !== "verified" || domain.certificateStatus !== "ready" ||
      !hasCurrentDomainOwnership(domain, probe, nowMillis)) {
    throw new Error("Domain or certificate is not ready");
  }
  return {...domain, status: "active"};
}

export function resolveCustomFormHost(
  requestHost: string,
  domain: OrganizerFormDomain | null,
  probe: DomainProbe | null,
  nowMillis: number,
  expectedOrganizerId?: string
): {organizerId: string; formId: string; publicFormId: string} | null {
  const hostname = normalizeCustomFormHost(requestHost);
  if (!hostname || !domain || domain.hostname !== hostname ||
      domain.status !== "active" || domain.certificateStatus !== "ready" ||
      !domain.verifiedAtMillis ||
      (expectedOrganizerId && domain.organizerId !== expectedOrganizerId) ||
      !hasCurrentDomainOwnership(domain, probe, nowMillis)) return null;
  return {organizerId: domain.organizerId, formId: domain.formId,
    publicFormId: domain.publicFormId};
}

export function revokeFormDomain(
  domain: OrganizerFormDomain
): OrganizerFormDomain {
  return {...domain, status: "revoked", certificateStatus: "pending"};
}
