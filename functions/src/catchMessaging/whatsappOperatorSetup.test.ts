import assert from "node:assert/strict";
import {test} from "node:test";
import {assertPlannedSetupIdentity, desiredOperatorClaims, planOperatorSetup,
  setupHash,
  validateSetupRequest, validateSetupPlan} from "./whatsappOperatorSetup";
import type {OperatorSetupScope, OperatorSetupSnapshot} from
  "./whatsappOperatorSetup";

function fixture() {
  const now = 1800000000000;
  const scope: OperatorSetupScope = {projectId: "demo-catch-setup",
    actorUid: "operator", actorEmailSha256: "a".repeat(64),
    recipientUid: "recipient", endpointHash: "b".repeat(64), appId: "10001",
    wabaId: "10002", phoneNumberId: "10003",
    credentialVersionSha256: "c".repeat(64)};
  const auth = (uid: string) => ({projectId: scope.projectId, uid,
    creationTimeMillis: 1001, observedAtMillis: now, disabled: false,
    relevantRoles: [], tokensValidAfterMillis: 0,
    endpointHash: uid === "recipient" ? scope.endpointHash : null});
  const snapshot: OperatorSetupSnapshot = {actor: {auth: auth("operator"),
    session: {projectId: scope.projectId, uid: "operator",
      authTimeSeconds: now / 1000 - 1, expiresAtSeconds: now / 1000 + 1800},
    emailSha256: scope.actorEmailSha256, googleSubjectSha256: "d".repeat(64),
    claims: {tenantLabel: "synthetic", nested: {flag: true}}},
  recipient: {auth: auth("recipient"), claims: {}}, existingOwnerUids: [],
  authorityExists: false, bootstrapExists: false, actorAssignmentExists: false};
  const options = {planId: "reviewed-plan", sourceSha: "e".repeat(40),
    grantNonce: "f".repeat(64), createReviewRef: "review-create",
    revokeReviewRef: "review-revoke", now};
  return {scope, snapshot, options};
}
test("read-only plan is exact, detached and contains only hashed account facts",
  () => {
    const f = fixture();
    const before = structuredClone(f);
    const plan = planOperatorSetup(f.scope, f.snapshot, f.options);
    assert.deepEqual(f, before);
    assert.equal(plan.expectedActorRevision, 0);
    assert.equal(plan.desiredClaimsSha256,
      setupHash({...f.snapshot.actor.claims, adminOwner: true}));
    f.scope.appId = "99999";
    f.snapshot.actor.claims.tenantLabel = "changed";
    assert.equal(plan.scope.appId, "10001");
    assert.ok(!JSON.stringify(plan).includes("tenantLabel"));
    validateSetupPlan(plan);
  });
test("planning rejects current identity, role, " +
  "freshness and existing-state drift",
() => {
  const changes: Array<(f: ReturnType<typeof fixture>) => void> = [
    (f) => {
      f.snapshot.actor.auth.projectId = "other-project";
    },
    (f) => {
      f.snapshot.actor.auth.uid = "other";
    },
    (f) => {
      f.snapshot.actor.emailSha256 = "1".repeat(64);
    },
    (f) => {
      f.snapshot.actor.auth.disabled = true;
    },
    (f) => {
      f.snapshot.recipient.auth.endpointHash = "1".repeat(64);
    },
    (f) => {
      f.snapshot.recipient.auth.disabled = true;
    },
    (f) => {
      f.snapshot.recipient.auth.relevantRoles = ["support"];
    },
    (f) => {
      f.snapshot.recipient.claims.adminOwner = true;
    },
    (f) => {
      f.snapshot.actor.session.authTimeSeconds -= 901;
    },
    (f) => {
      f.snapshot.actor.auth.tokensValidAfterMillis = f.options.now;
    },
    (f) => {
      f.snapshot.actor.auth.observedAtMillis -= 30000;
    },
    (f) => {
      f.snapshot.existingOwnerUids = ["owner-one", "owner-two"];
    },
    (f) => {
      f.snapshot.authorityExists = true;
    },
    (f) => {
      f.snapshot.bootstrapExists = true;
    },
    (f) => {
      f.snapshot.actorAssignmentExists = true;
    },
    (f) => {
      f.snapshot.recipient.claims.salesStaff = true;
    },
    (f) => {
      f.scope.actorUid = f.scope.recipientUid;
    },
  ];
  for (const change of changes) {
    const f = fixture();
    change(f);
    assert.throws(() => planOperatorSetup(f.scope, f.snapshot, f.options),
      /Protected Catch operator setup unavailable/u);
  }
});
test("reviewed plan preserves the exact legacy recipient admin fingerprint",
  () => {
    const f = fixture();
    f.snapshot.recipient.claims = {admin: true};
    const before = structuredClone(f);
    const plan = planOperatorSetup(f.scope, f.snapshot, f.options);
    assert.deepEqual(f, before);
    assert.equal(plan.recipientClaimsSha256, setupHash({admin: true}));
    assert.equal(plan.scope.recipientUid, f.scope.recipientUid);
    assert.equal(plan.sourceSha, f.options.sourceSha);
    assert.notEqual(setupHash(plan), setupHash({...plan,
      recipientClaimsSha256: setupHash({})}));
    assertPlannedSetupIdentity(plan, f.snapshot, f.options.now);
  });
test("legacy recipient admin is not a privileged-recipient or actor allowance",
  () => {
    for (const claims of [{adminOwner: true}, {support: true},
      {admin: true, adminOwner: true}, {admin: true, support: true},
      {admin: true, finance: true}, {admin: true, safetyReviewer: true},
      {admin: true, analyticsViewer: true},
      {admin: true, extra: "unreviewed"}]) {
      const f = fixture();
      f.snapshot.recipient.claims = claims;
      const roles = ["adminOwner", "support"] as const;
      f.snapshot.recipient.auth.relevantRoles = roles.filter((role) =>
        claims[role as keyof typeof claims] === true);
      assert.throws(() => planOperatorSetup(f.scope, f.snapshot, f.options));
    }
    const f = fixture();
    f.snapshot.actor.claims = {admin: true};
    f.snapshot.recipient.claims = {admin: true};
    assert.throws(() => planOperatorSetup(f.scope, f.snapshot, f.options));
    for (const state of ["authorityExists", "bootstrapExists",
      "actorAssignmentExists"] as const) {
      const existing = fixture();
      existing.snapshot.recipient.claims = {admin: true};
      existing.snapshot[state] = true;
      assert.throws(() => planOperatorSetup(existing.scope, existing.snapshot,
        existing.options));
    }
  });
test("legacy preservation rejects claim, incarnation, endpoint and owner drift",
  () => {
    const changes: Array<(f: ReturnType<typeof fixture>) => void> = [
      (f) => {
        f.snapshot.recipient.claims = {};
      },
      (f) => {
        f.snapshot.recipient.claims.admin = false;
      },
      (f) => {
        f.snapshot.recipient.claims.extra = true;
      },
      (f) => {
        f.snapshot.recipient.claims.support = true;
        f.snapshot.recipient.auth.relevantRoles = ["support"];
      },
      (f) => {
        f.snapshot.recipient.auth.creationTimeMillis++;
      },
      (f) => {
        f.snapshot.recipient.auth.tokensValidAfterMillis++;
      },
      (f) => {
        f.snapshot.recipient.auth.endpointHash = "9".repeat(64);
      },
      (f) => {
        f.snapshot.recipient.auth.uid = "other-recipient";
      },
      (f) => {
        f.snapshot.existingOwnerUids = ["new-owner"];
      },
    ];
    for (const change of changes) {
      const f = fixture();
      f.snapshot.recipient.claims = {admin: true};
      const plan = planOperatorSetup(f.scope, f.snapshot, f.options);
      change(f);
      assert.throws(() => assertPlannedSetupIdentity(plan, f.snapshot,
        f.options.now));
    }
  });
test("claim projection adds only owner and preserves unrelated values exactly",
  () => {
    const claims = {analyticsViewer: false, feature: ["a", "b"],
      settings: {allow: true}, counter: 7};
    assert.deepEqual(desiredOperatorClaims(claims),
      {...claims, adminOwner: true});
    assert.ok(!Object.hasOwn(claims, "adminOwner"));
    assert.throws(() => desiredOperatorClaims({huge: "x".repeat(1000)}));
    assert.throws(() => desiredOperatorClaims({unsupported: undefined}));
  });
test("apply accepts only reviewed identifier, digest and replay key", () => {
  const request = {planId: "reviewed-plan", planSha256: "a".repeat(64),
    replayKey: "b".repeat(64)};
  assert.deepEqual(validateSetupRequest(request), request);
  for (const field of ["roles", "scope", "archiveBytes", "credential",
    "evidence", "actorUid", "projectId", "nonce", "capabilities"]) {
    assert.throws(() => validateSetupRequest({...request,
      [field]: "invented"}));
  }
  assert.throws(() => validateSetupRequest({...request, replayKey: "short"}));
});

test("setup authentication accepts through fifteen minutes " +
  "without extending the plan", () => {
  for (const age of [301, 899, 900]) {
    const f = fixture();
    f.snapshot.actor.session.authTimeSeconds = f.options.now / 1000 - age;
    const plan = planOperatorSetup(f.scope, f.snapshot, f.options);
    assert.equal(plan.expiresAtMillis, f.options.now + 15 * 60 * 1000);
    assertPlannedSetupIdentity(plan, f.snapshot, f.options.now);
    assert.throws(() => validateSetupPlan({...plan,
      expiresAtMillis: plan.expiresAtMillis + 1}));
  }
  const stale = fixture();
  stale.snapshot.actor.session.authTimeSeconds = stale.options.now / 1000 - 901;
  assert.throws(() => planOperatorSetup(stale.scope, stale.snapshot,
    stale.options));
});

function consolidatedFixture() {
  const f = fixture();
  f.scope.recipientUid = f.scope.actorUid;
  f.snapshot.actor.auth.endpointHash = f.scope.endpointHash;
  f.snapshot.actor.claims = {admin: true};
  f.snapshot.recipient = {auth: structuredClone(f.snapshot.actor.auth),
    claims: {admin: true}};
  f.snapshot.actorAssignmentExists = true;
  f.snapshot.actorAssignment = {targetUid: f.scope.actorUid, disabled: false,
    status: "active", roles: ["admin"], displayName: "Existing operator"};
  return f;
}
test("consolidated plan binds the existing Admin projection and one identity",
  () => {
    const f = consolidatedFixture();
    const plan = planOperatorSetup(f.scope, f.snapshot, f.options);
    assert.equal(plan.actorAssignmentSha256,
      setupHash(f.snapshot.actorAssignment));
    assert.equal(plan.beforeClaimsSha256, plan.recipientClaimsSha256);
    assertPlannedSetupIdentity(plan, f.snapshot, f.options.now);
    f.snapshot.actor.claims = {admin: true, adminOwner: true};
    f.snapshot.actor.auth.relevantRoles = ["adminOwner"];
    f.snapshot.recipient = {auth: structuredClone(f.snapshot.actor.auth),
      claims: structuredClone(f.snapshot.actor.claims)};
    f.snapshot.existingOwnerUids = [f.scope.actorUid];
    assertPlannedSetupIdentity(plan, f.snapshot, f.options.now);
    f.snapshot.recipient.claims.extra = true;
    assert.throws(() => assertPlannedSetupIdentity(plan, f.snapshot,
      f.options.now));
  });
test("consolidated planning rejects missing, drifted and broader Admin state",
  () => {
    const changes: Array<(f: ReturnType<typeof consolidatedFixture>) =>
      void> = [
        (f) => {
          delete f.snapshot.actorAssignment;
        },
        (f) => {
          f.snapshot.actorAssignmentExists = false;
        },
        (f) => {
 f.snapshot.actorAssignment!.roles = ["admin", "support"];
        },
        (f) => {
 f.snapshot.actorAssignment!.disabled = true;
        },
        (f) => {
 f.snapshot.actorAssignment!.targetUid = "another";
        },
        (f) => {
 f.snapshot.actorAssignment!.status = "revoked";
        },
        (f) => {
          f.snapshot.recipient.auth.creationTimeMillis++;
        },
        (f) => {
          f.snapshot.actor.auth.endpointHash = null;
        },
        (f) => {
          f.snapshot.actor.claims.extra = true;
        },
      ];
    for (const change of changes) {
      const f = consolidatedFixture();
      change(f);
      assert.throws(() => planOperatorSetup(f.scope, f.snapshot, f.options));
    }
  });
