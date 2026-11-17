/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {contractValidator} from "../shared/contractTestValidators";
import {instantDraftId, parseGetInstantDraftPayload, parseRequestInstantDraftPayload, tokenMatches, accessTokenHash} from "./model";

// The payloads are checked by hand until their names are registered in
// contracts/functions/runtime_modules.json; these cases prove the hand check
// and the schema agree.

const validRequest = {
  requestId: "web-0f3c2a9e-5b1d-4c7e", requestKind: "event_link", entry: "event_page_tool",
  link: "https://lu.ma/afterfly", accessToken: "A".repeat(43),
  whatsapp: {phone: "+919000000001", consentVersion: "instant-draft-whatsapp-v1", followUpConsent: true},
  city: "Mumbai",
};

const requestCases: Array<[string, Record<string, unknown>]> = [
  ["valid", validRequest],
  ["no city", (({city: _city, ...rest}) => rest)(validRequest)], // eslint-disable-line @typescript-eslint/no-unused-vars
  ["null city", {...validRequest, city: null}],
  ["form link from a demo request", {...validRequest, requestKind: "form_link", entry: "demo_request"}],
  ["short request id", {...validRequest, requestId: "short"}],
  ["unknown kind", {...validRequest, requestKind: "page_link"}],
  ["unknown entry", {...validRequest, entry: "footer"}],
  ["not a web link", {...validRequest, link: "mailto:hi@example.com"}],
  ["short token", {...validRequest, accessToken: "A".repeat(42)}],
  ["token with padding", {...validRequest, accessToken: `${"A".repeat(42)}=`}],
  ["local number", {...validRequest, whatsapp: {...validRequest.whatsapp, phone: "9000000001"}}],
  ["number left to the verified phone", {...validRequest, whatsapp: {consentVersion: "instant-draft-whatsapp-v1",
    followUpConsent: true}}],
  ["old consent", {...validRequest, whatsapp: {...validRequest.whatsapp, consentVersion: "v0"}}],
  ["consent not ticked", {...validRequest, whatsapp: {...validRequest.whatsapp, followUpConsent: false}}],
  ["extra whatsapp field", {...validRequest, whatsapp: {...validRequest.whatsapp, marketing: true}}],
  ["extra field", {...validRequest, name: "Asha"}],
  ["one-letter city", {...validRequest, city: "M"}],
  ["no whatsapp", (({whatsapp: _whatsapp, ...rest}) => rest)(validRequest)], // eslint-disable-line @typescript-eslint/no-unused-vars
];

test("the requestInstantDraft check accepts and refuses exactly what its schema does", () => {
  const schema = contractValidator("RequestInstantDraftCallablePayload");
  for (const [label, payload] of requestCases) {
    let accepted = true;
    try {
      parseRequestInstantDraftPayload(payload);
    } catch {
      accepted = false;
    }
    assert.equal(accepted, schema(payload), label);
  }
});

test("the getInstantDraft check accepts and refuses exactly what its schema does", () => {
  const schema = contractValidator("GetInstantDraftCallablePayload");
  const draftId = instantDraftId("web-0f3c2a9e-5b1d-4c7e");
  for (const [label, payload] of [
    ["valid", {draftId, accessToken: "B".repeat(43)}],
    ["with a chosen city", {draftId, accessToken: "B".repeat(43), city: "in-mh-mumbai"}],
    ["one-letter city", {draftId, accessToken: "B".repeat(43), city: "M"}],
    ["intake id", {draftId: "nom-" + "a".repeat(40), accessToken: "B".repeat(43)}],
    ["no token", {draftId}],
    ["extra", {draftId, accessToken: "B".repeat(43), uid: "x"}],
  ] as Array<[string, Record<string, unknown>]>) {
    let accepted = true;
    try {
      parseGetInstantDraftPayload(payload);
    } catch {
      accepted = false;
    }
    assert.equal(accepted, schema(payload), label);
  }
});

test("a draft id is stable for its request id and a token matches only its own hash", () => {
  assert.match(instantDraftId("web-0f3c2a9e-5b1d-4c7e"), /^draft-[a-f0-9]{40}$/);
  assert.equal(instantDraftId("web-0f3c2a9e-5b1d-4c7e"), instantDraftId("web-0f3c2a9e-5b1d-4c7e"));
  assert.notEqual(instantDraftId("web-0f3c2a9e-5b1d-4c7e"), instantDraftId("web-0f3c2a9e-5b1d-4c7f"));
  const hash = accessTokenHash("C".repeat(43));
  assert.equal(tokenMatches("C".repeat(43), hash), true);
  assert.equal(tokenMatches("D".repeat(43), hash), false);
  assert.equal(tokenMatches("C".repeat(43), "not-a-hash"), false);
});
