import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {communityMembershipFixture} from "./communityMembershipFixture";
import {readCommunityMembership} from "./communityMembershipAuthority";
import {
  responseId,
  org,
  actorUid,
  Row,
} from "../organizerFormAdmission/admissionTestFixture";

test("phone-verified application grants without a profile", async () => {
  const h = communityMembershipFixture();
  const responseBefore = {
    ...h.store.get(`organizerFormResponses/${responseId}`),
  };
  assert.equal(h.store.get(`users/${h.uid}`), undefined);
  const result = await h.decide();
  assert.equal(result.currentState, "active");
  assert.equal(result.currentRevision, 1);
  assert.equal(result.replayed, false);
  assert.deepEqual(
    h.store.get(`organizerFormResponses/${responseId}`),
    responseBefore
  );
  assert.deepEqual(
    h.store.writes.sort(),
    [
      `organizerCommunityMembershipDecisions/${result.decisionId}`,
      `organizerCommunityMemberships/${result.membershipId}`,
    ].sort()
  );
  assert.equal(
    (
      await h.store
        .db()
        .runTransaction((tx) =>
          readCommunityMembership({
            db: h.store.db(),
            tx,
            organizerId: org,
            uid: h.uid,
            nowMillis: 2000,
          })
        )
    )?.state,
    "active"
  );
});

for (const kind of ["catchAccount", "emailVerified"] as const) {
  test(`${kind} UID-backed community application can grant`, async () => {
    const h = communityMembershipFixture();
    h.store.get(`organizerFormResponses/${responseId}`)!.identityKind = kind;
    (
      h.store.get("organizerFormVersions/version1")!.definition as Row
    ).identityPolicy = kind;
    assert.equal((await h.decide()).currentState, "active");
  });
}

test("grant replay retains revocation and historical evidence", async () => {
  const h = communityMembershipFixture();
  const granted = await h.decide();
  const revoked = await h.decide({
    requestId: "revoke1",
    action: "revoke",
    expectedRevision: 1,
    applicationId: null,
    expectedApplicationRevision: null,
    reason: "Host revoked future access",
  });
  h.store.get(`organizerFormResponses/${responseId}`)!.status = "withdrawn";
  const replayed = await h.decide();
  assert.equal(replayed.replayed, true);
  assert.equal(replayed.decisionRevision, 1);
  assert.equal(replayed.currentRevision, 2);
  assert.equal(replayed.currentState, "revoked");
  assert.ok(
    h.store.get(`organizerCommunityMembershipDecisions/${granted.decisionId}`)
  );
  assert.ok(
    h.store.get(`organizerCommunityMembershipDecisions/${revoked.decisionId}`)
  );
  assert.equal(
    h.store.get(`organizerApplications/${h.applicationId}`)!.reviewStatus,
    "approved"
  );
});

test("stale, changed and unauthorized decisions are denied", async () => {
  const h = communityMembershipFixture();
  await h.decide();
  const count = h.store.writes.length;
  await assert.rejects(h.decide({reason: "Different content"}));
  await assert.rejects(h.decide({requestId: "newRequest"}));
  await assert.rejects(h.decide({}, "outsider"));
  h.store.put(`deletedUsers/${actorUid}`, {status: "processing"});
  await assert.rejects(h.decide());
  assert.equal(h.store.writes.length, count);
});

const deniedSources: Array<
  [string, (h: ReturnType<typeof communityMembershipFixture>) => void]
> = [
  [
    "pending review",
    (h) => {
      h.store.get(`organizerApplications/${h.applicationId}`)!.reviewStatus =
        "submitted";
    },
  ],
  [
    "event-specific approval",
    (h) => {
      Object.assign(h.store.get(`organizerApplications/${h.applicationId}`)!, {
        targetKind: "event",
        targetId: "event1",
      });
    },
  ],
  [
    "imported source",
    (h) => {
      (
        h.store.get(`organizerApplications/${h.applicationId}`)!.source as Row
      ).kind = "connector";
    },
  ],
  [
    "linked UID without submitted identity",
    (h) => {
      h.store.get(`organizerFormResponses/${responseId}`)!.respondentUid = null;
    },
  ],
  [
    "anonymous identity",
    (h) => {
      h.store.get(`organizerFormResponses/${responseId}`)!.identityKind =
        "anonymous";
    },
  ],
  [
    "withdrawn response",
    (h) => {
      Object.assign(h.store.get(`organizerFormResponses/${responseId}`)!, {
        status: "withdrawn",
        withdrawnAt: Timestamp.fromMillis(1900),
      });
    },
  ],
  [
    "foreign immutable form",
    (h) => {
      h.store.get("organizerFormVersions/version1")!.organizerId = "foreign";
    },
  ],
  [
    "non-application immutable version",
    (h) => {
      (
        h.store.get("organizerFormVersions/version1")!.definition as Row
      ).purpose = "registration";
    },
  ],
  [
    "changed reviewed application",
    (h) => {
      h.store.get(`organizerApplications/${h.applicationId}`)!.revision = 3;
    },
  ],
  [
    "foreign response envelope",
    (h) => {
      h.store.get(`organizerFormResponses/${responseId}`)!.respondentUid =
        "other";
    },
  ],
  [
    "deleted respondent",
    (h) => {
      h.store.put(`deletedUsers/${h.uid}`, {status: "processing"});
    },
  ],
];
for (const [label, change] of deniedSources) {
  test(`${label} cannot create community entitlement`, async () => {
    const h = communityMembershipFixture();
    change(h);
    await assert.rejects(
      h.decide(),
      (error: unknown) =>
        (error as {code?: string}).code === "failed-precondition"
    );
    assert.equal(h.store.writes.length, 0);
  });
}

test("interrupted commit leaves no grant; exact retry succeeds", async () => {
  const h = communityMembershipFixture();
  h.store.failNextCommit = true;
  await assert.rejects(h.decide(), /Interrupted commit/);
  assert.equal(
    h.store.get(`organizerCommunityMemberships/${h.membershipId}`),
    undefined
  );
  assert.equal(h.store.writes.length, 0);
  assert.equal((await h.decide()).currentRevision, 1);
});

test("active projection without its decision is unavailable", async () => {
  const h = communityMembershipFixture();
  const result = await h.decide();
  h.store.rows.delete(
    `organizerCommunityMembershipDecisions/${result.decisionId}`
  );
  await assert.rejects(
    h.store
      .db()
      .runTransaction((tx) =>
        readCommunityMembership({
          db: h.store.db(),
          tx,
          organizerId: org,
          uid: h.uid,
          nowMillis: 2000,
        })
      )
  );
});

for (const [policy, kind] of [
  ["phoneVerified", "emailVerified"],
  ["phoneVerified", "catchAccount"],
  ["emailVerified", "catchAccount"],
  ["anonymous", "phoneVerified"],
]) {
  test(`policy ${policy} cannot use ${kind} evidence`, async () => {
    const h = communityMembershipFixture();
    (
      h.store.get("organizerFormVersions/version1")!.definition as Row
    ).identityPolicy = policy;
    h.store.get(`organizerFormResponses/${responseId}`)!.identityKind = kind;
    await assert.rejects(h.decide());
    assert.equal(h.store.writes.length, 0);
  });
}
for (const policy of [
  "emailVerified",
  "emailOrPhoneVerified",
  "catchAccount",
]) {
  test(`${policy} permits the writer's verified phone kind`, async () => {
    const h = communityMembershipFixture();
    (
      h.store.get("organizerFormVersions/version1")!.definition as Row
    ).identityPolicy = policy;
    assert.equal((await h.decide()).currentState, "active");
  });
}
test("impossible previous-state decision fails closed", async () => {
  const h = communityMembershipFixture();
  const result = await h.decide();
  h.store.get(
    `organizerCommunityMembershipDecisions/${result.decisionId}`
  )!.previousState = "active";
  await assert.rejects(
    h.store
      .db()
      .runTransaction((tx) =>
        readCommunityMembership({
          db: h.store.db(),
          tx,
          organizerId: org,
          uid: h.uid,
          nowMillis: 2000,
        })
      )
  );
});

test("unrelated native source origin cannot grant", async () => {
  const h = communityMembershipFixture();
  (h.store.get(`organizerApplications/${h.applicationId}`)!.source as Row)
    .externalResponseId = "otherResponse";
  await assert.rejects(h.decide());
  assert.equal(h.store.writes.length, 0);
});
