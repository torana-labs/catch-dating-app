/* eslint-disable max-len */
import assert from "node:assert/strict";
import type {Request} from "express";
import {HttpsError} from "firebase-functions/v2/https";
import {contractValidator} from "../shared/contractTestValidators";
import {schemaErrorMessages} from "../shared/generated/schemaValidationRuntime";
import {FakeFirestore} from "../shared/testing/fakeFirestore";
import type {ListingRequestDeps} from "./intake";
import type {RequestType} from "./model";

// Shared by the listing request tests: one valid body per type with
// fictional organisers and reserved domains, a fake Firestore, a fixed
// clock and recorded rate limits.

export const NOW = "2026-11-18T06:00:00.000Z";
export const ORIGIN = "https://catch.example";
export const STAFF_UID = "staff-mira";

const base = (requestType: RequestType, role: string, extra: Record<string, unknown>) => ({
  requestType,
  clientRequestId: "0f3c2a9e5b1d4c7e8a6b2d9f1e3c5a70",
  target: {kind: "organizer", organizerId: "lantern-lane-social"},
  requester: {name: "Asha Verma", role, email: "asha@lanternlane.example", organisation: "Lantern Lane Social"},
  declarations: {accurate: true, authorised: true, contactConsent: true},
  consent: {purpose: "listingRequest", version: "listing-request-v1"},
  sourcePage: "/listings/request/",
  ...extra,
});

/** One valid request per type, as the website form sends it. */
export const validRequests: Record<RequestType, Record<string, unknown>> = {
  claim: base("claim", "owner", {verification: {proofMethod: "instagramCode", officialHandle: "@lanternlanesocial"}}),
  correctFact: base("correctFact", "memberOfPublic", {verification: {field: "city", correction: "Pune, not Mumbai",
    evidenceUrl: "https://lanternlane.example/about"}, context: "Their site lists the Pune address."}),
  removeAndDoNotList: base("removeAndDoNotList", "owner", {verification: {proofMethod: "domainEmail", officialDomain: "lanternlane.example"}}),
  trademark: base("trademark", "rightsHolder", {verification: {basis: "registered", registrationNumber: "1234567",
    registrationClass: 41, jurisdiction: "IN", preferredRemedy: "relabel"},
  declarations: {accurate: true, authorised: true, contactConsent: true, goodFaith: true}}),
  copyright: base("copyright", "rightsHolder", {target: {kind: "url", url: `${ORIGIN}/events/ev-lantern-supper-7/`},
    verification: {workKind: "photo", originalWorkUrl: "https://photos.example/lantern-supper", ownershipBasis: "creator"},
    declarations: {accurate: true, authorised: true, contactConsent: true, goodFaith: true, notLicensed: true}}),
  privacy: base("privacy", "affectedIndividual", {verification: {relationship: "self", dataKinds: ["name", "photo"],
    identityMatch: "emailOnListing", preferredRemedy: "remove"}}),
  impersonation: base("impersonation", "owner", {verification: {proofMethod: "instagramCode", officialHandle: "lanternlanesocial"},
    declarations: {accurate: true, authorised: true, contactConsent: true, goodFaith: true}}),
  legalOrder: base("legalOrder", "authority", {requester: {name: "Registry Officer", role: "authority", email: "registry@court.example"},
    verification: {issuingBody: "court", orderReference: "CS(COMM) 0001/2026", orderDate: "2026-11-10"}}),
};

export function harness(options: {now?: string; appCheck?: boolean; limited?: string | null} = {}) {
  const db = new FakeFirestore();
  let now = new Date(options.now ?? NOW);
  const limits: Array<{key: string; action: string}> = [];
  const deps: ListingRequestDeps = {
    db: () => db.asFirestore(),
    now: () => now,
    enforceAppCheck: options.appCheck ?? true,
    verifyAppCheck: async (token) => {
      if (token !== "valid-app-check") throw new Error("invalid token");
    },
    checkRateLimit: (async (_db: unknown, key: string, action: string) => {
      limits.push({key, action});
      if (options.limited === action) throw new HttpsError("resource-exhausted", "limited");
    }) as never,
    origin: ORIGIN,
  };
  const request = (headers: Record<string, string> = {"x-firebase-appcheck": "valid-app-check"}, ip = "198.51.100.7") =>
    ({get: (name: string) => headers[name.toLowerCase()], ip, socket: {remoteAddress: ip}}) as unknown as Request;
  return {db, deps, limits, request, setNow: (value: string) => {
    now = new Date(value);
  }};
}

/** Asserts a value satisfies the named schema contract. */
export function assertContract(name: string, value: unknown, label = name): void {
  const validate = contractValidator(name);
  assert.equal(validate(value), true, `${label}: ${schemaErrorMessages(validate as never).join("; ")}`);
}
