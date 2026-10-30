import {strict as assert} from "node:assert";
import {describe, it} from "node:test";
import type {firestore} from "firebase-admin";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {manageOrganizerFormDomainHandler, parseDomainRequest} from
  "./organizerFormDomainCallables";
import {BRAND} from "../shared/generated/brand";

describe("organizer form domain management input", () => {
  it("accepts exact action-specific fields", () => {
    assert.deepEqual(parseDomainRequest({action: "reserve",
      hostname: "apply.client.example", organizerId: "organizer-a",
      formId: "form-a"}), {action: "reserve",
      hostname: "apply.client.example", organizerId: "organizer-a",
      formId: "form-a"});
    assert.deepEqual(parseDomainRequest({action: "verify",
      hostname: "apply.client.example", organizerId: "organizer-a"}),
    {action: "verify", hostname: "apply.client.example",
      organizerId: "organizer-a"});
  });

  it("rejects client-supplied hosting or certificate authority", () => {
    for (const request of [
      {action: "reserve", hostname: "apply.client.example",
        organizerId: "organizer-a", formId: "form-a",
        expectedCname: "attacker.example"},
      {action: "certificateReady", hostname: "apply.client.example",
        organizerId: "organizer-a"},
      {action: "verify", hostname: `app.${BRAND.web.domain}`,
        organizerId: "organizer-a"},
      {action: "revoke", hostname: "apply.client.example",
        organizerId: "organizer-a", formId: "form-a"},
    ]) assert.throws(() => parseDomainRequest(request));
  });

  it("denies outsiders before lookup or DNS", async () => {
    let touched = false;
    const request = {auth: {uid: "outsider"}, data: {
      action: "verify", hostname: "apply.client.example",
      organizerId: "organizer-a",
    }} as CallableRequest<unknown>;
    await assert.rejects(manageOrganizerFormDomainHandler(request, {
      firestore: () => ({} as firestore.Firestore),
      checkLimit: async () => undefined,
      assertManager: async () => {
        throw new HttpsError("permission-denied", "Denied");
      },
      loadProbe: async () => {
        touched = true;
        return null;
      },
      target: () => `custom.${BRAND.web.domain}`, now: () => 1,
    }), {code: "permission-denied"});
    assert.equal(touched, false);
  });

  it("denies a manager of another organizer before DNS", async () => {
    let touched = false;
    const request = {auth: {uid: "manager-b"}, data: {
      action: "verify", hostname: "apply.client.example",
      organizerId: "organizer-b",
    }} as CallableRequest<unknown>;
    const db = {collection: () => ({doc: () => ({get: async () => ({
      data: () => ({hostname: "apply.client.example",
        organizerId: "organizer-a", formId: "form-a",
        publicFormId: "ABCDEFGHIJKLMNOPQRST",
        ownershipChallenge: "catch-verification=" +
          "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        expectedCname: `custom.${BRAND.web.domain}`, status: "pending",
        certificateStatus: "pending", verifiedAtMillis: null,
        generation: 1, reservedAtMillis: 1,
        pendingExpiresAtMillis: 48 * 60 * 60 * 1000}),
    })})})} as unknown as firestore.Firestore;
    await assert.rejects(manageOrganizerFormDomainHandler(request, {
      firestore: () => db, checkLimit: async () => undefined,
      assertManager: async () => undefined,
      loadProbe: async () => {
        touched = true;
        return null;
      },
      target: () => `custom.${BRAND.web.domain}`, now: () => 1,
    }), {code: "failed-precondition"});
    assert.equal(touched, false);
  });

  for (const change of ["unchanged", "manager", "generation"] as const) {
    it(`rechecks ${change} after a held manager DNS request`, async () => {
      const hostname = "apply.client.example";
      const record = {hostname, organizerId: "organizer-a", formId: "form-a",
        publicFormId: "public-a", ownershipChallenge:
          "catch-verification=" + "A".repeat(32),
        expectedCname: "forms-site.web.app", status: "pending",
        certificateStatus: "pending", verifiedAtMillis: null,
        generation: 1, reservedAtMillis: 1, pendingExpiresAtMillis: 100_000};
      let current = {...record};
      let authorized = true;
      let writes = 0;
      let transactionChecks = 0;
      const snap = () => ({exists: true, data: () => ({...current})});
      const db = {collection: () => ({doc: () => ({get: async () => snap()})}),
        runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({
          get: async () => snap(),
          set: (_ref: unknown, value: typeof record) => {
            writes++; current = value;
          },
        }),
      } as unknown as firestore.Firestore;
      let release!: () => void;
      let started!: () => void;
      const began = new Promise<void>((resolve) => {
        started = resolve;
      });
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      const request = {auth: {uid: "manager"}, data: {action: "verify",
        hostname, organizerId: record.organizerId},
      } as CallableRequest<unknown>;
      const result = manageOrganizerFormDomainHandler(request, {
        firestore: () => db, checkLimit: async () => undefined,
        assertManager: async ({transaction}) => {
          if (transaction) transactionChecks++;
          if (!authorized) {
            throw new HttpsError("permission-denied", "Removed");
          }
        },
        loadProbe: async () => {
          started(); await held;
          return {hostname, txtValues: [record.ownershipChallenge],
            cnameTarget: record.expectedCname, checkedAtMillis: 2};
        }, target: () => record.expectedCname, now: () => 2,
      });
      await began;
      if (change === "manager") authorized = false;
      if (change === "generation") current = {...current, generation: 2};
      release();
      if (change === "unchanged") {
        assert.equal((await result).status, "verified");
        assert.equal(writes, 1);
        assert.equal(transactionChecks, 1);
      } else {
        await assert.rejects(result, change === "manager" ?
          {code: "permission-denied"} : /reservation changed/);
        assert.equal(writes, 0);
        assert.equal(current.status, "pending");
      }
    });
  }
});
