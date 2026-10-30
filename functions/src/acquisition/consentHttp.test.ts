import {strict as assert} from "node:assert";
import {test} from "node:test";
import {Timestamp, type Firestore} from "firebase-admin/firestore";
import {
  expireHostConsentRecords, hostAcquisitionConsent, hostConsentAllowedOrigin,
} from "./consentHttp";
import {newHostConsentAuthority} from "./consentPolicy";
import {BRAND} from "../shared/generated/brand";

test("privacy origin is exact and production custom hosts are project scoped",
  () => {
    assert.equal(hostConsentAllowedOrigin(BRAND.web.origin,
      "catch-dating-app-64e51"), BRAND.web.origin);
    for (const origin of [undefined, "null", `http://${BRAND.web.domain}`,
      `${BRAND.web.origin}.attacker.example`, "http://localhost:5175"]) {
      assert.equal(hostConsentAllowedOrigin(origin, "catch-dating-app-64e51"),
        null);
    }
    assert.equal(hostConsentAllowedOrigin(BRAND.web.origin,
      "catchdates-dev"), null);
    assert.equal(hostConsentAllowedOrigin("https://catchdates-dev.web.app",
      "catchdates-dev"), "https://catchdates-dev.web.app");
  });

test("disabled HTTP handshake rejects invalid requests without DB writes",
  async (t) => {
    const previous = process.env.GCLOUD_PROJECT;
    process.env.GCLOUD_PROJECT = "catch-dating-app-64e51";
    t.after(() => {
      if (previous === undefined) delete process.env.GCLOUD_PROJECT;
      else process.env.GCLOUD_PROJECT = previous;
    });
    const submit = async (method: string, body: unknown,
      origin: string = BRAND.web.origin, size = 0) => {
      const headers = new Map<string, string>();
      let status = 0;
      let result: unknown;
      const response = {
        set: (key: string, value: string) => headers.set(key, value),
        status: (value: number) => {
          status = value; return response;
        },
        json: (value: unknown) => {
          result = value;
        },
        send: (value: unknown) => {
          result = value;
        },
      };
      await hostAcquisitionConsent({method, body,
        rawBody: Buffer.alloc(size), ip: "synthetic-consent-http",
        get: (key: string) => key === "origin" ? origin : undefined,
      } as never, response as never);
      return {status, result, headers};
    };
    assert.equal((await submit("POST", {}, "https://attacker.example")).status,
      403);
    assert.equal((await submit("GET", {})).status, 405);
    assert.equal((await submit("OPTIONS", {})).status, 204);
    assert.equal((await submit("POST", {marketing: true})).status, 400);
    const request = {action: "grant", capability: "a".repeat(64),
      choice: {version: 1, purpose: "host_acquisition_measurement",
        analytics: true, advertising: true, chosenAt: Date.now()}};
    assert.equal((await submit("POST", request, undefined, 2049)).status, 400);
    const result = await submit("POST", request);
    assert.equal(result.status, 200);
    assert.deepEqual(result.result,
      {ok: true, status: "disabled", expiresAt: null});
    assert.equal(result.headers.get("Cache-Control"), "no-store");
  });

test("expiry rechecks current row and retains a concurrent withdrawal",
  async () => {
    const now = 1792512000000;
    const authority = newHostConsentAuthority({version: 1,
      purpose: "host_acquisition_measurement", analytics: true,
      advertising: true, chosenAt: now}, now);
    const row = (id: string, expiry: number) => ({
      schemaVersion: 1, classification: "sales_private", consentId: id,
      status: "revoked", authority: {...authority, revokedAt: now},
      createdAt: Timestamp.fromMillis(now),
      updatedAt: Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(expiry),
      attributionCleanupPending: false,
    });
    const expired = "a".repeat(64);
    const extended = "b".repeat(64);
    const malformed = "c".repeat(64);
    const rows = new Map<string, unknown>([
      [expired, row(expired, now - 1)],
      [extended, row(extended, now + 1000)],
      [malformed, {status: "revoked"}],
    ]);
    const deleted: string[] = [];
    const db = {
      collection: () => ({
        where: () => ({
          limit: (limit: number) => {
            assert.equal(limit, 500);
            return {get: async () => ({
              // The query observed both valid rows as expired before the
              // second row's concurrent withdrawal extended its tombstone.
              docs: [...rows.keys()].map((id) => ({id, ref: {id}})),
            })};
          },
        }),
      }),
      runTransaction: async (run: (tx: unknown) => Promise<unknown>) =>
        run({
          get: async (ref: {id: string}) => ({exists: true,
            data: () => rows.get(ref.id)}),
          delete: (ref: {id: string}) => deleted.push(ref.id),
        }),
    } as unknown as Firestore;
    assert.equal(await expireHostConsentRecords(db, now), 1);
    assert.deepEqual(deleted, [expired]);
  });
