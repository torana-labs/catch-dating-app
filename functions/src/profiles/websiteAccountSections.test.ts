import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FormPaymentTestStore} from
  "../payments/formPayments/formPaymentTestStore";
import {manageWebsiteAccountHandler as manage} from "./websiteAccount";
import type {ManageWebsiteAccountCallableResponse} from
  "../shared/generated/manageWebsiteAccountCallableResponse";
import {contractValidator} from "../shared/contractTestValidators";
import {validateManageWebsiteAccountCallablePayload} from
  "../shared/generated/validators/manageWebsiteAccountInput";

const validateResponse =
  contractValidator<ManageWebsiteAccountCallableResponse>(
    "ManageWebsiteAccountCallableResponse"
  );
const today = new Date("2026-11-08T12:00:00.000Z");
const at = (iso: string) => Timestamp.fromDate(new Date(iso));

function fixture() {
  const store = new FormPaymentTestStore();
  const set = (path: string, data: Record<string, unknown>) =>
    store.records.set(path, data);
  set("organizers/run", {name: "Brindle Run Club", publicPage: {
    publishStatus: "published",
    canonicalPath: "/organizers/brindle-run-club/"}});
  set("organizers/quiz", {name: "Quiz Night", publicPage: {
    publishStatus: "draft", canonicalPath: "/organizers/quiz-night/"}});
  set("events/soon", {name: "Sunday 10K", organizerId: "run",
    startTime: at("2026-11-15T01:00:00Z"), endTime: at("2026-11-15T03:00:00Z"),
    meetingPoint: "Cubbon Park gate", status: "active"});
  set("events/done", {name: "Trivia", organizerId: "quiz",
    startTime: at("2026-10-01T14:00:00Z"), endTime: at("2026-10-01T16:00:00Z"),
    status: "active"});
  set("eventBookings/soon_guest", {eventId: "soon", organizerId: "run",
    uid: "guest", status: "signedUp"});
  set("eventBookings/done_guest", {eventId: "done", organizerId: "quiz",
    uid: "guest", status: "attended"});
  set("eventBookings/gone_guest", {eventId: "soon", organizerId: "run",
    uid: "guest", status: "deleted"});
  set("eventBookings/soon_other", {eventId: "soon", organizerId: "run",
    uid: "other", status: "signedUp"});
  set("organizerFollows/run_guest", {organizerId: "run", uid: "guest",
    status: "active", followedAt: at("2026-10-02T00:00:00Z")});
  set("organizerFollows/quiz_guest", {organizerId: "quiz", uid: "guest",
    status: "inactive", followedAt: at("2026-09-02T00:00:00Z")});
  set("organizerFollows/run_other", {organizerId: "run", uid: "other",
    status: "active", followedAt: at("2026-10-02T00:00:00Z")});
  set("reviews/r1", {organizerId: "quiz", eventId: "done",
    reviewerUserId: "guest", reviewerName: "Ada", rating: 5,
    comment: "Lovely night", verificationStatus: "verified",
    moderationStatus: "published", createdAt: at("2026-10-02T09:00:00Z"),
    ownerResponse: {message: "Thanks Ada"}});
  set("reviews/r2", {organizerId: "run", eventId: null,
    reviewerUserId: "guest", reviewerName: "Ada", rating: 4, comment: "Good",
    verificationStatus: "unverified", moderationStatus: "pending",
    createdAt: at("2026-10-05T09:00:00Z")});
  set("reviews/r3", {organizerId: "run", reviewerUserId: "other",
    reviewerName: "Bo", rating: 1, comment: "Not mine",
    createdAt: at("2026-10-05T09:00:00Z")});
  set("organizerCommunicationPreferences/run_guest", {organizerId: "run",
    uid: "guest", whatsapp: {status: "optedIn", evidenceStatus: "complete",
      currentReceiptId: "receipt1"},
    sms: {status: "optedIn", evidenceStatus: "incomplete",
      currentReceiptId: null}});
  set("organizerCommunicationPreferences/quiz_guest", {organizerId: "quiz",
    uid: "guest", whatsapp: {status: "optedOut", evidenceStatus: "complete",
      currentReceiptId: "receipt2"},
    sms: {status: "unknown", evidenceStatus: "notApplicable",
      currentReceiptId: null}});
  const deps = {
    db: () => store as unknown as FirebaseFirestore.Firestore,
    now: () => today,
    loadUser: async () => ({uid: "guest", disabled: false}),
    rateLimit: async () => undefined,
  };
  const request = (data: unknown) => ({
    auth: {uid: "guest", token: {}}, data,
  }) as CallableRequest<unknown>;
  return {store, deps, request};
}

test("identity-only read leaves every section out", async () => {
  const h = fixture();
  const result = await manage(h.request({action: "read"}), h.deps);
  assert.equal(validateResponse(result), true);
  for (const key of ["plans", "follows", "reviews", "messages"]) {
    assert.equal(key in result, false);
  }
});

test("messages read only the signed-in UID's own permissions", async () => {
  const h = fixture();
  const result = await manage(h.request({action: "read",
    sections: ["messages"]}), h.deps);
  assert.equal(validateResponse(result), true, JSON.stringify(result));
  assert.deepEqual(result.messages, [
    {organizerId: "run", organizerName: "Brindle Run Club", whatsapp: "optedIn",
      sms: "unknown", whatsappReceiptId: "receipt1"},
    {organizerId: "quiz", organizerName: "Quiz Night", whatsapp: "optedOut",
      sms: "unknown", whatsappReceiptId: "receipt2"},
  ]);
  for (const key of ["plans", "follows", "reviews"]) {
    assert.equal(key in result, false);
  }
});

test("sections are refused for an unavailable account", async () => {
  const h = fixture();
  h.store.records.set("deletedUsers/guest", {uid: "guest"});
  await assert.rejects(manage(h.request({action: "read",
    sections: ["messages"]}), h.deps), /unavailable/);
});

test("the payload contract allows only the messages section", () => {
  assert.equal(validateManageWebsiteAccountCallablePayload(
    {action: "read", sections: ["messages", "messages"]}), false);
  for (const section of ["plans", "following", "reviews", "matches"]) {
    assert.equal(validateManageWebsiteAccountCallablePayload(
      {action: "read", sections: [section]}), false, section);
  }
  assert.equal(validateManageWebsiteAccountCallablePayload(
    {action: "complete", sections: ["messages"], displayName: "Ada",
      expectedProfileRevision: 0, expectedUid: "guest"}), false);
  assert.equal(validateManageWebsiteAccountCallablePayload(
    {action: "read", sections: ["messages"]}), true);
});
