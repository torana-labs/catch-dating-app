import assert from "node:assert/strict";
import test from "node:test";
import {
  PRODUCTION_CROSS_PATHS_FIXTURE,
  assertProductionCrossPathsFixtureRequest,
  buildCrossPathsDemoDocuments,
  ensureCrossPathsDemoTestLogin,
  verifyCrossPathsDemoPlan,
} from "./cross_paths_demo_core.mjs";
import {loadFirebaseAdmin} from "./demo_ops_core.mjs";

const admin = loadFirebaseAdmin();

test("production seeding accepts only the pinned Mumbai fixture", () => {
  const exact = PRODUCTION_CROSS_PATHS_FIXTURE;
  assert.doesNotThrow(() => assertProductionCrossPathsFixtureRequest({
    ...exact,
    apply: true,
    allowProd: true,
    allowProdCrossPathsFixture: true,
    configureTestLogin: true,
    testCode: "123456",
  }));
  assert.doesNotThrow(() => assertProductionCrossPathsFixtureRequest({
    ...exact,
    allowProdCrossPathsFixture: true,
  }));
  assert.throws(() => assertProductionCrossPathsFixtureRequest({
    ...exact,
    apply: true,
    viewerUid: "some-other-user",
    allowProd: true,
    allowProdCrossPathsFixture: true,
    configureTestLogin: true,
    testCode: "123456",
  }), /restricted to the exact Mumbai QA fixture/);
  assert.throws(() => assertProductionCrossPathsFixtureRequest({
    ...exact,
    projectId: "catchdates-staging",
  }), /supports only dev, the emulator, or the exact production/);
});

test("Cross Paths fixture writes only explicit synthetic consent and review", () => {
  const timestamp = admin.firestore.Timestamp.fromMillis(1_700_000_000_000);
  const helpers = {
    currentCrossPathsTermsVersion: 1,
    crossPathsShowcaseRuleVersion: 1,
  };
  const docs = buildCrossPathsDemoDocuments({
    viewer: user("viewer"),
    candidates: [candidate("candidate-a", "a".repeat(64)), candidate(
      "candidate-b",
      "b".repeat(64)
    )],
    eventId: "demo-event",
    nowTimestamp: timestamp,
    testPhone: "+16505550101",
    helpers,
  });

  assert.deepEqual(docs.map((doc) => doc.path), [
    "events/demo-event",
    "users/viewer",
    "users/candidate-a",
    "users/candidate-b",
    "eventCrossPathsConsents/demo-event_candidate-a",
    "crossPathsShowcaseEligibility/candidate-a",
    "eventCrossPathsConsents/demo-event_candidate-b",
    "crossPathsShowcaseEligibility/candidate-b",
  ]);
  assert.deepEqual(docs[0].data, {crossPathsDiscoveryEnabled: true});
  assert.deepEqual(docs[1].data, {
    prefsShowInCrossPaths: true,
    prefsCrossPathsInvitations: true,
    phoneNumber: "+16505550101",
  });
  assert.equal(docs[2].data.phoneNumber, undefined);
  assert.equal(docs[4].data.enabled, true);
  assert.equal(docs[4].data.termsVersion, 1);
  assert.equal(docs[5].data.status, "eligible");
  assert.equal(docs[5].data.profileFingerprint, "a".repeat(64));
  assert.equal(docs[5].data.reviewedByUid, "cross-paths-demo-seed");
});

test("fixture can bind the event and participations to one hidden organizer", () => {
  const timestamp = admin.firestore.Timestamp.fromMillis(1_700_000_000_000);
  const docs = buildCrossPathsDemoDocuments({
    viewer: user("viewer"),
    candidates: [candidate("candidate", "a".repeat(64))],
    eventId: "demo-event",
    organizerId: "courtside",
    nowTimestamp: timestamp,
    testPhone: null,
    helpers: {
      currentCrossPathsTermsVersion: 1,
      crossPathsShowcaseRuleVersion: 1,
    },
  });

  assert.deepEqual(docs[0], {
    path: "events/demo-event",
    data: {
      crossPathsDiscoveryEnabled: true,
      organizerId: "courtside",
    },
  });
  assert.deepEqual(
    docs.filter((doc) => doc.path.startsWith("eventParticipations/")),
    [
      {
        path: "eventParticipations/demo-event_viewer",
        data: {organizerId: "courtside"},
      },
      {
        path: "eventParticipations/demo-event_candidate",
        data: {organizerId: "courtside"},
      },
    ]
  );
});

test("unchanged eligible review remains idempotent", () => {
  const originalTimestamp =
    admin.firestore.Timestamp.fromMillis(1_700_000_000_000);
  const rerunTimestamp =
    admin.firestore.Timestamp.fromMillis(1_700_000_100_000);
  const fingerprint = "c".repeat(64);
  const path = "crossPathsShowcaseEligibility/candidate";
  const docs = buildCrossPathsDemoDocuments({
    viewer: user("viewer"),
    candidates: [candidate("candidate", fingerprint)],
    eventId: "demo-event",
    nowTimestamp: rerunTimestamp,
    testPhone: null,
    helpers: {
      currentCrossPathsTermsVersion: 1,
      crossPathsShowcaseRuleVersion: 1,
    },
    existingRecords: new Map([[path, {
      status: "eligible",
      ruleVersion: 1,
      reviewVersion: 4,
      profileFingerprint: fingerprint,
      reviewedAt: originalTimestamp,
    }]]),
  });
  const review = docs.find((doc) => doc.path === path).data;

  assert.equal(review.reviewVersion, 4);
  assert.equal(review.reviewedAt.toMillis(), originalTimestamp.toMillis());
  assert.equal(review.updatedAt.toMillis(), rerunTimestamp.toMillis());
});

test("read-back verification ignores Firestore map key ordering", async () => {
  const timestamp = admin.firestore.Timestamp.fromMillis(1_700_000_000_000);
  const db = {
    doc: () => ({
      get: async () => ({
        exists: true,
        data: () => ({
          nested: {
            timestamp,
            items: [{second: 2, first: 1}],
            alpha: true,
          },
        }),
      }),
    }),
  };

  const result = await verifyCrossPathsDemoPlan({
    db,
    plan: {
      docs: [{
        path: "events/demo-event",
        data: {
          nested: {
            alpha: true,
            items: [{first: 1, second: 2}],
            timestamp,
          },
        },
      }],
    },
  });

  assert.deepEqual(result, {
    ready: true,
    missingPaths: [],
    mismatchedPaths: [],
  });
});

test("test login merges Identity config and creates only the named Auth user",
  async () => {
    const requests = [];
    const auth = fakeAuth();
    const adminStub = {
      auth: () => auth,
      app: () => ({
        options: {
          credential: {
            getAccessToken: async () => ({access_token: "token"}),
          },
        },
      }),
    };
    const fetchImpl = async (url, options = {}) => {
      requests.push({url, options});
      if (!options.method) {
        return response({signIn: {
          phoneNumber: {
            testPhoneNumbers: {"+16505550100": "111111"},
          },
        }});
      }
      return response({});
    };

    const result = await ensureCrossPathsDemoTestLogin({
      admin: adminStub,
      projectId: "catchdates-dev",
      viewerUid: "demo-viewer",
      phoneNumber: "+16505550101",
      smsCode: "604219",
      fetchImpl,
    });

    assert.equal(result.viewerUid, "demo-viewer");
    assert.equal(result.phoneSuffix, "0101");
    assert.equal(result.testPhoneConfigChanged, true);
    assert.deepEqual(auth.created, [{
      uid: "demo-viewer",
      phoneNumber: "+16505550101",
      displayName: "Cross Paths Demo Viewer",
      disabled: false,
    }]);
    assert.equal(requests.length, 2);
    const patch = JSON.parse(requests[1].options.body);
    assert.deepEqual(patch.signIn.phoneNumber.testPhoneNumbers, {
      "+16505550100": "111111",
      "+16505550101": "604219",
    });
    assert.match(
      requests[1].url,
      /updateMask=signIn\.phoneNumber\.testPhoneNumbers$/
    );
    assert.equal(
      requests[1].options.headers["x-goog-user-project"],
      "catchdates-dev"
    );
  }
);

test("test login falls back to the active gcloud principal for config access",
  async () => {
    const requests = [];
    const auth = existingAuthUser();
    const adminStub = {
      auth: () => auth,
      app: () => ({
        options: {
          credential: {
            getAccessToken: async () => ({access_token: "admin-token"}),
          },
        },
      }),
    };
    const fetchImpl = async (url, options = {}) => {
      requests.push({url, options});
      if (options.headers.Authorization === "Bearer admin-token") {
        return response({}, 403);
      }
      if (!options.method) {
        return response({signIn: {phoneNumber: {testPhoneNumbers: {}}}});
      }
      return response({});
    };

    const result = await ensureCrossPathsDemoTestLogin({
      admin: adminStub,
      projectId: "catchdates-dev",
      viewerUid: "demo-viewer",
      phoneNumber: "+16505550101",
      smsCode: "604219",
      fetchImpl,
      getFallbackAccessToken: async () => "gcloud-token",
    });

    assert.equal(result.testPhoneConfigChanged, true);
    assert.deepEqual(requests.map((request) => ({
      method: request.options.method ?? "GET",
      authorization: request.options.headers.Authorization,
    })), [
      {method: "GET", authorization: "Bearer admin-token"},
      {method: "GET", authorization: "Bearer gcloud-token"},
      {method: "PATCH", authorization: "Bearer gcloud-token"},
    ]);
    assert.deepEqual(auth.updates, [
      {phoneNumber: null},
      {phoneNumber: "+16505550101"},
    ]);
  }
);

test("test login refuses to replace an existing Auth phone", async () => {
  const adminStub = {
    auth: () => ({
      getUser: async () => ({
        uid: "demo-viewer",
        phoneNumber: "+16505550109",
      }),
    }),
  };

  await assert.rejects(
    ensureCrossPathsDemoTestLogin({
      admin: adminStub,
      projectId: "catchdates-dev",
      viewerUid: "demo-viewer",
      phoneNumber: "+16505550101",
      smsCode: "604219",
    }),
    /already uses a different phone number/
  );
});

test("test login restores an existing phone when config update fails",
  async () => {
    const auth = existingAuthUser();
    const adminStub = {
      auth: () => auth,
      app: () => ({
        options: {
          credential: {
            getAccessToken: async () => ({access_token: "admin-token"}),
          },
        },
      }),
    };
    const fetchImpl = async (_url, options = {}) => {
      if (!options.method) {
        return response({signIn: {phoneNumber: {testPhoneNumbers: {}}}});
      }
      return response({}, 400);
    };

    await assert.rejects(
      ensureCrossPathsDemoTestLogin({
        admin: adminStub,
        projectId: "catchdates-dev",
        viewerUid: "demo-viewer",
        phoneNumber: "+16505550101",
        smsCode: "604219",
        fetchImpl,
      }),
      /test-phone update failed \(400\)/
    );
    assert.deepEqual(auth.updates, [
      {phoneNumber: null},
      {phoneNumber: "+16505550101"},
    ]);
  }
);

test("test login refuses phone numbers outside the fictional fixture range",
  async () => {
    await assert.rejects(
      ensureCrossPathsDemoTestLogin({
        admin: {},
        projectId: "catchdates-dev",
        viewerUid: "demo-viewer",
        phoneNumber: "+14155550100",
        smsCode: "604219",
      }),
      /fictional \+1 650-555-01xx range/
    );
  }
);

function user(uid) {
  return {uid, data: {synthetic: true, profileComplete: true}};
}

function candidate(uid, profileFingerprint) {
  return {
    ...user(uid),
    publicProfile: {name: uid},
    readiness: {automaticStatus: "ready", profileFingerprint},
  };
}

function fakeAuth() {
  return {
    created: [],
    async getUser() {
      const error = new Error("missing");
      error.code = "auth/user-not-found";
      throw error;
    },
    async createUser(input) {
      this.created.push(input);
      return {
        ...input,
        metadata: {creationTime: "2026-08-09T00:00:00.000Z"},
      };
    },
  };
}

function existingAuthUser() {
  return {
    updates: [],
    async getUser() {
      return {
        uid: "demo-viewer",
        phoneNumber: "+16505550101",
        metadata: {creationTime: "2026-08-09T00:00:00.000Z"},
      };
    },
    async updateUser(uid, input) {
      this.updates.push(input);
      return {
        uid,
        phoneNumber: input.phoneNumber,
        metadata: {creationTime: "2026-08-09T00:00:00.000Z"},
      };
    },
  };
}

function response(value, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => value,
  };
}
