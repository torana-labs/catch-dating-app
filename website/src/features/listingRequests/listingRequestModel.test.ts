import Ajv from "ajv";
import addFormats from "ajv-formats";
import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";
import {
  declarationsFor,
  detailErrors,
  emptyDraft,
  listingRequestHref,
  prefillFromSearch,
  requestBody,
  requestTypes,
  type ListingRequestDraft,
  type RequestType,
} from "./listingRequestModel";

function contract() {
  const ajv = new Ajv({allErrors: true, strict: false});
  addFormats(ajv);
  ajv.addSchema(JSON.parse(readFileSync("../contracts/shared/takedown_request_common.schema.json", "utf8")));
  return ajv.compile(JSON.parse(readFileSync("../contracts/http/listing_request_request.schema.json", "utf8")));
}

const organiser = {kind: "organizer", id: "lantern-lane-social"} as const;

/** A complete draft per type, with fictional organisers and reserved domains. */
function complete(type: RequestType): ListingRequestDraft {
  const draft: ListingRequestDraft = {...emptyDraft(organiser, type), name: "Asha Verma", email: "asha@lanternlane.example",
    role: "owner"};
  switch (type) {
  case "claim":
  case "impersonation":
    return {...draft, proofMethod: "instagramCode", officialHandle: "@lanternlanesocial"};
  case "removeAndDoNotList":
    return {...draft, proofMethod: "domainEmail", officialDomain: "https://www.lanternlane.example/"};
  case "correctFact":
    return {...draft, role: "memberOfPublic", field: "city", correction: "Pune", evidenceUrl: "https://lanternlane.example/about"};
  case "trademark":
    return {...draft, role: "rightsHolder", basis: "registered", registrationNumber: "1234567", registrationClass: "41", jurisdiction: "in",
      trademarkRemedy: "relabel"};
  case "copyright":
    return {...draft, role: "rightsHolder", workKind: "photo", originalWorkUrl: "https://photos.example/supper", ownershipBasis: "creator"};
  case "privacy":
    return {...draft, role: "affectedIndividual", relationship: "self", dataKinds: ["name"], identityMatch: "emailOnListing",
      privacyRemedy: "remove"};
  case "legalOrder":
    return {...draft, role: "authority", issuingBody: "court", orderReference: "CS 0001/2026", orderDate: "2026-11-10"};
  }
}

describe("listing request model", () => {
  it("prefills the target from a listing link, and a type when one is named", () => {
    expect(prefillFromSearch("?organizer=lantern-lane-social")).toEqual({target: organiser, type: null});
    expect(prefillFromSearch("?event=ev-lantern-7&type=copyright")).toEqual({target: {kind: "event", id: "ev-lantern-7"}, type: "copyright"});
    expect(prefillFromSearch("?organizer=../../etc&type=demands")).toEqual({target: {kind: "url", url: ""}, type: null});
    expect(listingRequestHref({kind: "organizer", id: "lantern-lane-social"})).toBe("/listings/request/?organizer=lantern-lane-social");
  });

  it.each(requestTypes)("builds a %s body the contract accepts, with only that type's fields and declarations", (type) => {
    const draft = complete(type);
    expect(detailErrors(draft)).toEqual({});
    const body = {...requestBody(draft, "/listings/request/?organizer=x"), clientRequestId: "0".repeat(32)};
    const validate = contract();
    expect(validate(body), JSON.stringify(validate.errors)).toBe(true);
    expect(Object.keys(body.declarations).sort()).toEqual([...declarationsFor(type)].sort());
    expect(body.sourcePage).toBe("/listings/request/");
  });

  it("names what each type is missing", () => {
    expect(Object.keys(detailErrors(emptyDraft(organiser, "removeAndDoNotList"))).sort()).toEqual(["email", "name", "proofMethod", "role"]);
    expect(detailErrors({...complete("removeAndDoNotList"), email: "asha@mail.example"}).email).toMatch(/official domain/u);
    expect(detailErrors({...complete("claim"), officialHandle: ""}).officialHandle).toBeTruthy();
    expect(detailErrors({...complete("removeAndDoNotList"), role: "memberOfPublic"}).role).toBeTruthy();
    expect(Object.keys(detailErrors({...complete("trademark"), basis: "unregistered"})).sort()).toEqual(["evidenceUrl", "firstUseYear"]);
    expect(detailErrors({...complete("claim"), context: "x".repeat(281)}).context).toBeTruthy();
    expect(detailErrors({...complete("claim"), target: {kind: "url", url: "not a link"}}).target).toBeTruthy();
    expect(detailErrors(emptyDraft(organiser, null)).type).toBeTruthy();
  });

  it("asks IP and impersonation requests for the good-faith declaration, and copyright for not licensed", () => {
    expect(declarationsFor("claim")).toEqual(["accurate", "authorised", "contactConsent"]);
    expect(declarationsFor("trademark")).toContain("goodFaith");
    expect(declarationsFor("impersonation")).toContain("goodFaith");
    expect(declarationsFor("copyright")).toEqual(["accurate", "authorised", "contactConsent", "goodFaith", "notLicensed"]);
  });
});
