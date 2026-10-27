import * as admin from "firebase-admin";
import type {firestore} from "firebase-admin";
import {defineString} from "firebase-functions/params";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from
  "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import type {ManageOrganizerFormDomainCallablePayload} from
  "../shared/generated/manageOrganizerFormDomainCallablePayload";
import type {ManageOrganizerFormDomainCallableResponse} from
  "../shared/generated/manageOrganizerFormDomainCallableResponse";
import {validateManageOrganizerFormDomainCallablePayload} from
  "../shared/generated/validators/manageOrganizerFormDomainInput";
import {requireOrganizerManager} from
  "../shared/organizerManagerAuthority";
import {normalizeCustomFormHost, parseOrganizerFormDomain} from
  "./organizerFormDomains";
import {
  probeFormDomain, reserveOrganizerFormDomain,
  revokeOrganizerFormDomain, verifyOrganizerFormDomain,
} from "./organizerFormDomainRegistry";

// Deployment configuration, never a client-controlled CNAME target. An empty
// value keeps reservations disabled until the hosting operator configures it.
const hostingTarget = defineString("FORM_DOMAIN_CNAME_TARGET", {default: ""});

interface DomainDeps {
  firestore: () => firestore.Firestore;
  checkLimit: typeof checkRateLimit;
  assertManager: typeof requireOrganizerManager;
  loadProbe: typeof probeFormDomain;
  target: () => string;
  now: () => number;
}
const defaultDeps: DomainDeps = {
  firestore: () => admin.firestore(), checkLimit: checkRateLimit,
  assertManager: requireOrganizerManager, loadProbe: probeFormDomain,
  target: () => hostingTarget.value(), now: Date.now,
};

export function parseDomainRequest(
  value: unknown
): ManageOrganizerFormDomainCallablePayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpsError("invalid-argument", "Invalid domain request.");
  }
  const data = value as Record<string, unknown>;
  const action = data.action;
  const allowed = action === "reserve" ?
    ["action", "hostname", "organizerId", "formId"] :
    ["action", "hostname", "organizerId"];
  if (!(["reserve", "verify", "revoke"] as unknown[]).includes(action) ||
      Object.keys(data).some((key) => !allowed.includes(key)) ||
      typeof data.hostname !== "string" ||
      normalizeCustomFormHost(data.hostname) !== data.hostname ||
      typeof data.organizerId !== "string" || !data.organizerId ||
      (action === "reserve" ?
        typeof data.formId !== "string" || !data.formId :
        data.formId !== undefined)) {
    throw new HttpsError("invalid-argument", "Invalid domain request.");
  }
  if (!validateManageOrganizerFormDomainCallablePayload(value)) {
    throw new HttpsError("invalid-argument", "Invalid domain request.");
  }
  return value;
}

/** Manager ownership operations. Certificate readiness stays operator-only. */
export async function manageOrganizerFormDomainHandler(
  request: CallableRequest<unknown>, deps: DomainDeps = defaultDeps
): Promise<ManageOrganizerFormDomainCallableResponse> {
  const actorUid = requireAuth(request);
  const input = parseDomainRequest(request.data);
  const db = deps.firestore();
  await deps.checkLimit(db, actorUid, "manageOrganizerFormDomain", {
    maxRequests: 10, windowMs: 60 * 60 * 1000,
  });
  await deps.assertManager({db, organizerId: input.organizerId, actorUid});
  if (input.action === "revoke") {
    await revokeOrganizerFormDomain(db, input.hostname, input.organizerId,
      actorUid, deps.assertManager);
    return {hostname: input.hostname, status: "revoked"};
  }
  if (input.action === "reserve") {
    // Key by organizer as well as caller so several managers cannot multiply
    // the pending-host reservation budget.
    await deps.checkLimit(db, input.organizerId,
      "reserveOrganizerFormDomain", {
        maxRequests: 3, windowMs: 24 * 60 * 60 * 1000,
      });
    const record = await reserveOrganizerFormDomain(db, {
      hostname: input.hostname, organizerId: input.organizerId,
      formId: input.formId, actorUid,
    }, deps.now(), deps.target(), deps.assertManager);
    return {hostname: record.hostname, status: "pending",
      ownershipChallenge: record.ownershipChallenge,
      expectedCname: record.expectedCname};
  }
  const current = parseOrganizerFormDomain((await db.collection(
    "organizerFormDomains").doc(input.hostname).get()).data());
  if (!current || current.organizerId !== input.organizerId ||
      current.status !== "pending") {
    throw new HttpsError("failed-precondition", "Domain is not pending.");
  }
  const probe = await deps.loadProbe(input.hostname);
  const record = await verifyOrganizerFormDomain(db, input.hostname,
    probe, deps.now(), input.organizerId, {expected: current, actorUid,
      assertManager: deps.assertManager});
  return {hostname: record.hostname, status: "verified"};
}

export const manageOrganizerFormDomain = onCall(
  appCheckCallableOptionsWithLimits({maxInstances: 10, timeoutSeconds: 30}),
  (request) => manageOrganizerFormDomainHandler(request)
);
