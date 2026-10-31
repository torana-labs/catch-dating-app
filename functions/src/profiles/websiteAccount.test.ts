import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FormPaymentTestStore} from
  "../payments/formPayments/formPaymentTestStore";
import {
  manageWebsiteAccountHandler as manage,
  accountBirthDate,
  newAccountProfile,
} from "./websiteAccount";
import {isSocialReadyUserProfile} from "../shared/profileReadiness";
import type {ManageWebsiteAccountCallableResponse} from
  "../shared/generated/manageWebsiteAccountCallableResponse";
import {contractValidator} from "../shared/contractTestValidators";

const validateManageWebsiteAccountCallableResponse =
  contractValidator<ManageWebsiteAccountCallableResponse>(
    "ManageWebsiteAccountCallableResponse"
  );

const today = new Date("2026-10-18T12:00:00.000Z");
const phone = "+919876543210";
function fixture() {
  const store = new FormPaymentTestStore();
  const authUser = {uid: "guest", disabled: false, phoneNumber: phone};
  const deps = {
    db: () => store as unknown as FirebaseFirestore.Firestore,
    now: () => today,
    loadUser: async () => authUser,
    rateLimit: async () => undefined,
  };
  const request = (data: unknown) =>
    ({
      auth: {uid: "guest", token: {phone_number: phone}},
      data,
    }) as CallableRequest<unknown>;
  const complete = {
    action: "complete",
    expectedUid: "guest",
    displayName: "Ada",
    expectedProfileRevision: 0,
  };
  return {store, authUser, deps, request, complete};
}

test("minimal verified account has no fabricated social fields", async () => {
  const h = fixture();
  const result = await manage(h.request(h.complete), h.deps);
  assert.equal(validateManageWebsiteAccountCallableResponse(result), true);
  assert.equal(result.accountReady, true);
  assert.equal(result.dateOfBirth, null);
  const stored = h.store.records.get("users/guest")!;
  assert.equal(stored.phoneNumber, phone);
  assert.equal(stored.dateOfBirth, undefined);
  assert.equal(stored.gender, undefined);
  assert.deepEqual(stored.profilePhotos, []);
  assert.equal(stored.profileComplete, false);
  assert.equal(
    isSocialReadyUserProfile(newAccountProfile("Ada", phone)),
    false
  );
});

test("optional birth date does not grant social capability", async () => {
  const h = fixture();
  const result = await manage(
    h.request({...h.complete, dateOfBirth: "2010-01-01"}),
    h.deps
  );
  assert.equal(result.accountReady, true);
  assert.equal(result.dateOfBirth, "2010-01-01");
});

test("completion preserves richer fields and omitted birthday", async () => {
  const h = fixture();
  const profile = {
    ...newAccountProfile("Ada", phone),
    gender: "woman",
    dateOfBirth: Timestamp.fromDate(new Date("1990-01-01")),
    occupation: "Architect",
    profileRevision: 4,
  };
  h.store.records.set("users/guest", profile);
  await manage(
    h.request({...h.complete, expectedProfileRevision: 4}),
    h.deps
  );
  const stored = h.store.records.get("users/guest")!;
  assert.equal(stored.occupation, "Architect");
  assert.equal(stored.gender, "woman");
  assert.equal(stored.dateOfBirth, profile.dateOfBirth);
  assert.equal(stored.profileRevision, 5);
});

test("CAS and UID fences reject stale saves without changes", async () => {
  const h = fixture();
  await manage(h.request(h.complete), h.deps);
  await assert.rejects(manage(h.request(h.complete), h.deps), {
    code: "aborted",
  });
  await assert.rejects(
    manage(h.request({...h.complete, expectedUid: "someone-else"}), h.deps),
    {code: "aborted"}
  );
  assert.equal(h.store.records.get("users/guest")?.profileRevision, 1);
});

test("disabled, deleted and unverified accounts are denied", async () => {
  const h = fixture();
  h.authUser.disabled = true;
  await assert.rejects(manage(h.request(h.complete), h.deps), {
    code: "permission-denied",
  });
  h.authUser.disabled = false;
  h.store.records.set("deletedUsers/guest", {});
  await assert.rejects(manage(h.request(h.complete), h.deps), {
    code: "permission-denied",
  });
  h.store.records.clear();
  h.authUser.phoneNumber = "+919999999999";
  await assert.rejects(manage(h.request(h.complete), h.deps), {
    code: "failed-precondition",
  });
  await assert.rejects(
    manage(h.request({...h.complete, phoneNumber: phone}), h.deps),
    {code: "invalid-argument"}
  );
  assert.equal(h.store.records.has("users/guest"), false);
});

test("read returns only this account's persisted follow edge", async () => {
  const h = fixture();
  await manage(h.request(h.complete), h.deps);
  h.store.records.set("organizerFollows/host_guest", {status: "active"});
  h.store.records.set("organizerFollows/other_else", {status: "active"});
  assert.equal(
    (await manage(h.request({action: "read", organizerId: "host"}), h.deps))
      .following,
    true
  );
  assert.equal(
    (await manage(h.request({action: "read", organizerId: "other"}), h.deps))
      .following,
    false
  );
});

test("calendar validation rejects impossible or future dates", () => {
  for (const date of ["2025-02-29", "2026-10-19", "1800-01-01"]) {
    assert.throws(() => accountBirthDate(date, today), {
      code: "invalid-argument",
    });
  }
  assert.equal(
    accountBirthDate("2024-02-29", today).toISOString(),
    "2024-02-29T00:00:00.000Z"
  );
});


test("partial identity gains defaults without social questions", async () => {
  const h = fixture();
  h.store.records.set("users/guest", {name: "Ada", phoneNumber: phone});
  const result = await manage(h.request(h.complete), h.deps);
  assert.equal(result.accountReady, true);
  const profile = h.store.records.get("users/guest")!;
  assert.equal(profile.dateOfBirth, undefined);
  assert.equal(profile.gender, undefined);
  assert.deepEqual(profile.profilePhotos, []);
  assert.equal(profile.prefsShowInCrossPaths, false);
});
