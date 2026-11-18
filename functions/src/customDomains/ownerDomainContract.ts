import type {CheckOrganizerDomainCallablePayload} from
  "../shared/generated/checkOrganizerDomainCallablePayload";
import type {GetOrganizerDomainCallablePayload} from
  "../shared/generated/getOrganizerDomainCallablePayload";
import type {OrganizerDomainCallableResponse} from
  "../shared/generated/organizerDomainCallableResponse";
import type {RemoveOrganizerDomainCallablePayload} from
  "../shared/generated/removeOrganizerDomainCallablePayload";
import {validateCheckOrganizerDomainCallablePayload} from
  "../shared/generated/validators/checkOrganizerDomainInput";
import {validateGetOrganizerDomainCallablePayload} from
  "../shared/generated/validators/getOrganizerDomainInput";
import {validateOrganizerDomainCallableResponse} from
  "../shared/generated/validators/organizerDomainOutput";
import {validateRemoveOrganizerDomainCallablePayload} from
  "../shared/generated/validators/removeOrganizerDomainInput";
import {validateRequestOrganizerDomainCallablePayload} from
  "../shared/generated/validators/requestOrganizerDomainInput";
import {
  LAPSE_GRACE_MS, hasCurrentDomainOwnership, isLeaseExpired,
  isTerminalStatus, normalizeRequestedHostname,
  type CustomDomainRecord, type DomainProbe, type HostnameRejection,
  type ServedHostname,
} from "./domainPolicy";

/**
 * The provider-neutral boundary of the owner domain callables (#1110):
 * payload parsing through the generated validators and the bounded owner
 * view of a record. The callables themselves (auth, owner role, rate limits,
 * kill switch) arrive with the owner callables; this keeps what they accept
 * and disclose single-sourced with the registry policy.
 */
export type OwnerDomainView = NonNullable<
  OrganizerDomainCallableResponse["domain"]>;
export type OwnerDomainProblem = OwnerDomainView["problemCode"];

export type ParsedRequestPayload = {organizerId: string;
  served: ServedHostname; apexRedirect: CustomDomainRecord["apexRedirect"]} |
  {error: "invalidPayload" | HostnameRejection};

/** Validates and normalises what an owner typed. */
export function parseRequestOrganizerDomainPayload(
  raw: unknown
): ParsedRequestPayload {
  if (!validateRequestOrganizerDomainCallablePayload(raw)) {
    return {error: "invalidPayload"};
  }
  const requested = normalizeRequestedHostname(raw.hostname);
  if ("rejected" in requested) return {error: requested.rejected};
  return {organizerId: raw.organizerId,
    served: {hostname: requested.hostname,
      registrableDomain: requested.registrableDomain},
    apexRedirect: requested.apexRedirect};
}

export function parseGetOrganizerDomainPayload(
  raw: unknown
): GetOrganizerDomainCallablePayload | null {
  return validateGetOrganizerDomainCallablePayload(raw) ? raw : null;
}

/** Check and remove name the exact hostname and generation they act on. */
export function parseCheckOrganizerDomainPayload(
  raw: unknown
): CheckOrganizerDomainCallablePayload | null {
  return validateCheckOrganizerDomainCallablePayload(raw) ? raw : null;
}

export function parseRemoveOrganizerDomainPayload(
  raw: unknown
): RemoveOrganizerDomainCallablePayload | null {
  return validateRemoveOrganizerDomainCallablePayload(raw) ? raw : null;
}

/**
 * Why a domain is not live, for the app's reason-and-fix copy. A fresh probe
 * that fails names the missing DNS record; otherwise the status decides.
 */
export function ownerProblemCode(record: CustomDomainRecord,
  nowMillis: number, probe: DomainProbe | null = null): OwnerDomainProblem {
  if (record.status === "suspended") return "suspended";
  if (record.review.state === "held") return "heldForReview";
  if (record.status === "expired" || isLeaseExpired(record, nowMillis)) {
    return "leaseExpired";
  }
  if (record.status === "failed") return "providerError";
  if (probe && !isTerminalStatus(record.status) &&
      ["pendingDns", "lapsed"].includes(record.status) &&
      !hasCurrentDomainOwnership(record, probe, nowMillis)) {
    if (!probe.txtValues.includes(record.ownershipChallenge)) {
      return "dnsTxtMissing";
    }
    return probe.cnameTarget === null ? "dnsCnameMissing" : "dnsCnameMismatch";
  }
  return null;
}

/** The bounded view: no provider ids, review reasons, actors or history. */
export function ownerDomainView(record: CustomDomainRecord, nowMillis: number,
  options: {probe?: DomainProbe | null;
    nextCheckAllowedAtMillis?: number | null} = {}): OwnerDomainView {
  return {
    hostname: record.hostname,
    registrableDomain: record.registrableDomain,
    status: record.status,
    generation: record.generation,
    dnsInstructions: record.dnsInstructions,
    apexRedirect: record.apexRedirect,
    reviewState: record.review.state,
    problemCode: ownerProblemCode(record, nowMillis, options.probe ?? null),
    liveUrl: record.status === "active" && record.review.state !== "held" ?
      `https://${record.hostname}/` : null,
    reservedAtMillis: record.reservedAtMillis,
    pendingExpiresAtMillis: record.pendingExpiresAtMillis,
    verifiedAtMillis: record.verifiedAtMillis,
    activatedAtMillis: record.activatedAtMillis,
    lastCheckedAtMillis: record.lastCheckedAtMillis,
    lapsedAtMillis: record.lapsedAtMillis,
    lapseRemovalAtMillis: record.lapsedAtMillis === null ? null :
      record.lapsedAtMillis + LAPSE_GRACE_MS,
    nextCheckAllowedAtMillis: options.nextCheckAllowedAtMillis ?? null,
  };
}

/**
 * One callable response, validated against its contract before it leaves
 * Functions. A removed or expired record is shown only when the caller just
 * removed it (so the app can list the DNS records to delete).
 */
export function organizerDomainResponse(input: {
  organizerId: string;
  role: OrganizerDomainCallableResponse["role"];
  manageBlockedReason: OrganizerDomainCallableResponse["manageBlockedReason"];
  record: CustomDomainRecord | null;
  nowMillis: number;
  showEnded?: boolean;
  probe?: DomainProbe | null;
  nextCheckAllowedAtMillis?: number | null;
}): OrganizerDomainCallableResponse {
  const record = input.record &&
    (input.showEnded || !isTerminalStatus(input.record.status)) ?
    input.record : null;
  const response: OrganizerDomainCallableResponse = {
    organizerId: input.organizerId,
    role: input.role,
    canManage: input.manageBlockedReason === "none",
    manageBlockedReason: input.manageBlockedReason,
    domain: record ? ownerDomainView(record, input.nowMillis, {
      probe: input.probe, nextCheckAllowedAtMillis:
        input.nextCheckAllowedAtMillis}) : null,
  };
  if (!validateOrganizerDomainCallableResponse(response)) {
    throw new Error("Organizer domain response breaks its contract");
  }
  return response;
}
