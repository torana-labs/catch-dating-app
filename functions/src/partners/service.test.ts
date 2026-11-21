import {listSalesInboundIntents} from "../admin/sales/intents";
import type {Timestamp} from "firebase-admin/firestore";
import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import {FakeFirestore} from "../operations/testFirestore";
import {
  assignPartner,
  decideAssignment,
  getPartnerAccess,
  getPartnerWorkspace,
  nominateOrganizer,
  registerPartner,
  revokePartnerAccess,
  requireAssignment,
  updateAssignment,
  previewPartnerMarketingGrant,
  reviewPartnerMarketingGrant,
  revokePartnerMarketingGrant,
  getPartnerMarketingAssets,
} from "./service";
import {
  PARTNER_TERMS_VERSION,
  type PartnerActor,
  type PartnerDeps,
} from "./model";

const partner: PartnerActor = {uid: "partner-one", roles: []};
const employee: PartnerActor = {uid: "employee-one", roles: ["admin"]};
const initial = "2026-10-04T00:00:00.000Z";
function fixture() {
  const fake = new FakeFirestore();
  let now = new Date(initial);
  let revoked = false;
  const deps: PartnerDeps = {
    db: fake as unknown as FirebaseFirestore.Firestore,
    now: () => now,
    checkAuth: async () => {
      if (revoked) throw new Error("revoked Auth");
    },
  };
  fake.write("organizers/organizer-one", {
    name: "Synthetic organizer",
    cityName: "Mumbai",
    appVisibility: "hidden",
    publicPage: {publicationStatus: "draft"},
    claim: {state: "unclaimed"},
  });
  fake.write("organizerSalesAccounts/organizer-one", {
    schemaVersion: 1,
    classification: "sales_private",
    organizerId: "organizer-one",
    researchStatus: "new",
    suppressionStatus: "clear",
    duplicateReviewRequired: false,
    summary: "Private employee note",
  });
  return {
    fake,
    deps,
    advance: (ms: number) => {
      now = new Date(now.getTime() + ms);
    },
    revokeAuth: () => {
      revoked = true;
    },
  };
}
const registration = {
  requestId: "registration-one",
  displayName: "Prospective collaborator",
  termsVersion: PARTNER_TERMS_VERSION,
};
const offer = {
  requestId: "assignment-one",
  organizerId: "organizer-one",
  partnerUid: "partner-one",
  expectedRevision: 0,
  nextAction: "Review introduction fit",
  reviewAt: "2026-10-05T00:00:00.000Z",
  expiresAt: "2026-10-10T00:00:00.000Z",
  reason: "Reviewed official identity",
  originatorUid: null,
};
const accept = {
  requestId: "acceptance-one",
  organizerId: "organizer-one",
  expectedRevision: 1,
  decision: "accept",
  channel: "whatsapp",
  relationshipContext: "I know the organizer through a prior event.",
};

test(
  "self-serve membership never grants employee, organizer, or marketing " +
    "authority",
  async () => {
    const {fake, deps} = fixture();
    const before = fake.read("organizers/organizer-one");
    await registerPartner(deps, partner, registration);
    assert.deepEqual(await registerPartner(deps, partner, registration), {
      uid: partner.uid,
      status: "active",
      revision: 1,
    });
    assert.deepEqual(
      fake.read("salesPartnerMemberships/partner-one")?.marketingGrants,
      [],
    );
    assert.deepEqual(fake.read("organizers/organizer-one"), before);
    await assert.rejects(assignPartner(deps, partner, offer), {
      code: "permission-denied",
    });
  },
);

test(
  "nomination is immutable own self-report and cannot assert verified " +
    "canonical identity",
  async () => {
    const {fake, deps} = fixture();
    await registerPartner(deps, partner, registration);
    const nomination = {
      requestId: "nomination-one",
      name: "Synthetic events",
      city: "Mumbai",
      url: "https://synthetic.example/events",
      relationshipContext: "We have not met.",
    };
    const result = await nominateOrganizer(deps, partner, nomination);
    assert.equal(result.organizerId, null);
    assert.deepEqual(
      await nominateOrganizer(deps, partner, nomination),
      result,
    );
    await assert.rejects(
      nominateOrganizer(deps, partner, {...nomination, name: "Different"}),
      {code: "already-exists"},
    );
    await assert.rejects(
      nominateOrganizer(deps, partner, {...nomination, verifiedAt: initial}),
      {code: "invalid-argument"},
    );
    const rows = fake
      .entries()
      .filter(([p]) => p.startsWith("salesInboundIntents/"));
    assert.equal(rows.length, 1);
    assert.equal(rows[0][1].source, "partner");
    assert.equal(rows[0][1].evidenceStatus, "self_reported");
    assert.equal(rows[0][1].organizerId, null);
    assert.equal(
      fake.entries().filter(([p]) => p.startsWith("organizers/")).length,
      1,
    );
  },
);

test(
  "assignment acceptance shares the canonical ID and withholds employee " +
    "notes",
  async () => {
    const {fake, deps} = fixture();
    await registerPartner(deps, partner, registration);
    const before = fake.read("organizers/organizer-one");
    await assignPartner(deps, employee, offer);
    await decideAssignment(deps, partner, accept);
    const workspace = await getPartnerWorkspace(deps, partner, {});
    assert.equal((workspace.leads as unknown[]).length, 1);
    assert.ok(!JSON.stringify(workspace).includes("Private employee note"));
    assert.ok(
      !JSON.stringify(workspace).includes("Reviewed official identity"),
    );
    assert.ok(!JSON.stringify(workspace).includes("employee-one"));
    assert.deepEqual(fake.read("organizers/organizer-one"), before);
    assert.deepEqual(await decideAssignment(deps, partner, accept), {
      organizerId: "organizer-one",
      revision: 2,
      status: "accepted",
    });
    await assert.rejects(
      deps.db.runTransaction((tx) =>
        requireAssignment(
          deps,
          {uid: "partner-two", roles: []},
          tx,
          "organizer-one",
        ),
      ),
      {code: "permission-denied"},
    );
  },
);

test(
  "foreign reservations require explicit resolution rather than " +
    "first-submission credit",
  async () => {
    const {deps} = fixture();
    await registerPartner(deps, partner, registration);
    await registerPartner(
      deps,
      {uid: "partner-two", roles: []},
      {...registration, requestId: "registration-two"},
    );
    await assignPartner(deps, employee, offer);
    await assert.rejects(
      assignPartner(deps, employee, {
        ...offer,
        requestId: "assignment-two",
        partnerUid: "partner-two",
        expectedRevision: 1,
      }),
      {code: "failed-precondition"},
    );
  },
);

test(
  "replay rechecks revocation, suppression, expiry and permanent privacy " +
    "fence",
  async () => {
    for (const gate of [
      "membership",
      "assignment",
      "suppression",
      "expiry",
      "privacy",
      "auth",
    ]) {
      const f = fixture();
      await registerPartner(f.deps, partner, registration);
      await assignPartner(f.deps, employee, offer);
      await decideAssignment(f.deps, partner, accept);
      if (gate === "membership") {
        await revokePartnerAccess(f.deps, employee, {
          requestId: "revoke-membership",
          organizerId: null,
          partnerUid: partner.uid,
          expectedRevision: 1,
          reason: "Access revoked",
        });
      }
      if (gate === "assignment") {
        await revokePartnerAccess(f.deps, employee, {
          requestId: "revoke-assignment",
          organizerId: "organizer-one",
          partnerUid: partner.uid,
          expectedRevision: 2,
          reason: "Host preference",
        });
      }
      if (gate === "suppression") {
        f.fake.write("organizerSalesAccounts/organizer-one", {
          ...f.fake.read("organizerSalesAccounts/organizer-one"),
          suppressionStatus: "suppressed",
        });
      }
      if (gate === "privacy") {
        f.fake.write("salesPrivacyRestrictions/organizer-one", {
          status: "restricted",
        });
      }
      if (gate === "expiry") f.advance(7 * 86400000);
      if (gate === "auth") f.revokeAuth();
      await assert.rejects(decideAssignment(f.deps, partner, accept));
    }
  },
);

test(
  "interrupted transaction does not partially join or reserve; exact retry " +
    "recovers",
  async () => {
    const {fake, deps} = fixture();
    fake.failNextCommit = true;
    await assert.rejects(registerPartner(deps, partner, registration));
    assert.equal(fake.read("salesPartnerMemberships/partner-one"), undefined);
    await registerPartner(deps, partner, registration);
    fake.failNextCommit = true;
    await assert.rejects(assignPartner(deps, employee, offer));
    assert.equal(fake.read("salesPartnerAssignments/organizer-one"), undefined);
    await assignPartner(deps, employee, offer);
    assert.equal(
      fake.read("salesPartnerAssignments/organizer-one")?.revision,
      1,
    );
  },
);

test(
  "decline receipt recovers exactly but cannot authorize fresh work or a " +
    "later reassignment",
  async () => {
    const {fake, deps} = fixture();
    await registerPartner(deps, partner, registration);
    await assignPartner(deps, employee, offer);
    const decline = {...accept, decision: "decline", channel: null};
    const result = await decideAssignment(deps, partner, decline);
    assert.deepEqual(await decideAssignment(deps, partner, decline), result);
    await assert.rejects(
      decideAssignment(deps, partner, {...decline, requestId: "fresh-decline"}),
      {code: "permission-denied"},
    );
    fake.write("salesPartnerAssignments/organizer-one", {
      ...fake.read("salesPartnerAssignments/organizer-one"),
      partnerUid: "different-partner",
      revision: 3,
      status: "offered",
    });
    await assert.rejects(decideAssignment(deps, partner, decline), {
      code: "permission-denied",
    });
  },
);

test(
  "linked submissions are withheld immediately after organizer privacy " +
    "restriction",
  async () => {
    const {fake, deps} = fixture();
    await registerPartner(deps, partner, registration);
    fake.write("salesInboundIntents/nomination-one", {
      partnerUid: partner.uid,
      status: "linked",
      organizerId: "organizer-one",
      hostApplication: {organizationName: "Private nominee"},
    });
    assert.equal(
      (await getPartnerWorkspace(deps, partner, {})).submissions instanceof
        Array,
      true,
    );
    fake.write("salesPrivacyRestrictions/organizer-one", {restricted: true});
    assert.deepEqual(
      (await getPartnerWorkspace(deps, partner, {})).submissions,
      [],
    );
  },
);

test(
  "partner nomination uses Firestore timestamps through the existing " +
    "employee pagination path",
  async () => {
    const {deps} = fixture();
    await registerPartner(deps, partner, registration);
    const original = deps.db;
  type NominationRow = Record<string, unknown> & {
    intentId: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };
  const captured: NominationRow[] = [];
  deps.db = new Proxy(original, {
    get(target, key) {
      if (key === "runTransaction") {
        return (
          callback: (tx: FirebaseFirestore.Transaction) => Promise<unknown>,
        ) =>
          target.runTransaction((tx) =>
            callback(
              new Proxy(tx, {
                get(t, member) {
                  if (member === "create") {
                    return (
                      ref: FirebaseFirestore.DocumentReference,
                      row: Record<string, unknown>,
                    ) => {
                      if (ref.path.startsWith("salesInboundIntents/")) {
                        captured.push(row as NominationRow);
                      }
                      return t.create(ref, row);
                    };
                  }
                  const value = Reflect.get(t, member);
                  return typeof value === "function" ? value.bind(t) : value;
                },
              }),
            ),
          );
      }
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  await nominateOrganizer(deps, partner, {
    requestId: "timestamp-nomination",
    name: "Synthetic events",
    city: "Mumbai",
    url: "https://synthetic.example/events",
    relationshipContext: null,
  });
  const created = captured[0];
  assert.ok(created);
  assert.equal(created.createdAt.toDate().toISOString(), initial);
  assert.equal(created.updatedAt.toDate().toISOString(), initial);
  let cursor: unknown[] = [];
  const document = {
    id: created.intentId,
    data: () => created!,
    get: (key: string) => created![key],
  };
  const query = {
    orderBy() {
      return this;
    },
    limit() {
      return this;
    },
    startAfter(...args: unknown[]) {
      cursor = args;
      return this;
    },
    get: async () => ({docs: [document, document], size: 2}),
  };
  const db = {
    collection: () => query,
  } as unknown as FirebaseFirestore.Firestore;
  const principal: Parameters<typeof listSalesInboundIntents>[1] = {
    uid: employee.uid,
    roles: ["admin"],
  };
  const page = await listSalesInboundIntents(db, principal, {limit: 1});
  assert.equal(
    (page.rows as Array<Record<string, unknown>>)[0].createdAt,
    initial,
  );
  assert.equal(
    (page.rows as Array<Record<string, unknown>>)[0].source,
    "partner",
  );
  await listSalesInboundIntents(db, principal, {
    limit: 1,
    cursor: page.nextCursor,
  });
  assert.equal(
    (cursor[0] as { toDate(): Date }).toDate().toISOString(),
    initial,
  );
  assert.equal(cursor[1], created.intentId);
  },
);

test(
  "own accepted lead next steps are versioned self-report without claim, " +
    "publication or send",
  async () => {
    const {fake, deps} = fixture();
    await registerPartner(deps, partner, registration);
    await assignPartner(deps, employee, offer);
    await decideAssignment(deps, partner, accept);
    const before = fake.read("organizers/organizer-one");
    const input = {
      requestId: "next-action-one",
      organizerId: "organizer-one",
      expectedRevision: 2,
      relationshipContext: "We have not established a personal relationship.",
      channel: "email",
      nextAction:
      "Review the private preparation before considering an introduction.",
      reviewAt: "2026-10-06T00:00:00.000Z",
    };
    const saved = await updateAssignment(deps, partner, input);
    assert.deepEqual(await updateAssignment(deps, partner, input), saved);
    assert.deepEqual(fake.read("organizers/organizer-one"), before);
    assert.equal(
      fake
        .entries()
        .some(([path]) =>
          /^(salesOutreachDrafts|salesActivities|organizerForms)\//u.test(path),
        ),
      false,
    );
    await assert.rejects(
      updateAssignment(deps, {uid: "foreign", roles: []}, input),
      {code: "permission-denied"},
    );
    await assert.rejects(
      updateAssignment(deps, partner, {...input, nextAction: "Different"}),
      {code: "already-exists"},
    );
    await assert.rejects(
      updateAssignment(deps, partner, {
        ...input,
        requestId: "past-review-one",
        expectedRevision: 3,
        reviewAt: initial,
      }),
      {code: "invalid-argument"},
    );
    fake.write("salesPrivacyRestrictions/organizer-one", {
      status: "restricted",
    });
    await assert.rejects(updateAssignment(deps, partner, input), {
      code: "failed-precondition",
    });
  },
);

const marketingScope = {
  partnerUid: partner.uid,
  organizerId: "organizer-one",
  campaignId: "synthetic-introduction-campaign",
  channel: "email",
  assetIds: ["asset-one"],
};
async function marketingFixture() {
  const f = fixture();
  await registerPartner(f.deps, partner, registration);
  await assignPartner(f.deps, employee, offer);
  await decideAssignment(f.deps, partner, accept);
  f.fake.write("salesIntelligenceClauses/asset-one", {
    schemaVersion: 1,
    classification: "sales_private",
    clauseId: "asset-one",
    organizerId: "organizer-one",
    revision: 1,
    kind: "capability",
    state: "approved",
    text: "Synthetic reviewed wording for a bounded preview.",
    evidenceIds: [],
    validUntil: "2026-10-09T00:00:00.000Z",
    permission: "not_required",
    reviewedAt: initial,
    reviewedBy: employee.uid,
    updatedAt: initial,
    updatedBy: employee.uid,
  });
  const preview = await previewPartnerMarketingGrant(
    f.deps,
    employee,
    marketingScope,
  );
  const review = {
    ...marketingScope,
    requestId: "marketing-review-one",
    expectedMembershipRevision: preview.expectedMembershipRevision,
    expectedGrantRevision: preview.expectedGrantRevision,
    sourceHash: preview.sourceHash,
    expiresAt: "2026-10-08T00:00:00.000Z",
    reason: "Private staff review of this exact scope.",
  };
  return {...f, preview, review};
}

test(
  "marketing review grants exact wording scope without employee, claim, " +
    "publication or send rights",
  async () => {
    const f = await marketingFixture();
    const canonical = f.fake.read("organizers/organizer-one");
    await assert.rejects(
      reviewPartnerMarketingGrant(f.deps, partner, f.review),
      {code: "permission-denied"},
    );
    const saved = await reviewPartnerMarketingGrant(f.deps, employee, f.review);
    assert.deepEqual(
      await reviewPartnerMarketingGrant(f.deps, employee, f.review),
      saved,
    );
    const result = await getPartnerMarketingAssets(f.deps, partner, {
      grantId: saved.grantId,
      expectedGrantRevision: 1,
    });
    assert.equal(result.campaignId, marketingScope.campaignId);
    assert.equal(result.channel, "email");
    assert.deepEqual(
      (result.assets as Array<Record<string, unknown>>).map((a) => a.assetId),
      ["asset-one"],
    );
    for (const key of [
      "sendAuthority",
      "publicationAuthority",
      "guestAuthority",
      "providerAuthority",
    ]) {
      assert.equal(result[key], false);
    }
    assert.ok(!JSON.stringify(result).includes(employee.uid));
    assert.ok(!JSON.stringify(result).includes("Private staff review"));
    assert.ok(!JSON.stringify(result).includes("Private employee note"));
    assert.deepEqual(f.fake.read("organizers/organizer-one"), canonical);
    assert.equal(
      f.fake
        .entries()
        .some(([path]) =>
          new RegExp(
            "^(events|organizerCampaigns|eventAttendees|organizerContacts|" +
            "salesOutreachDrafts)/",
            "u",
          ).test(path),
        ),
      false,
    );
    await assert.rejects(
      getPartnerMarketingAssets(f.deps, partner, {
        grantId: saved.grantId,
        expectedGrantRevision: 1,
        channel: "whatsapp",
      }),
      {code: "invalid-argument"},
    );
  },
);

test(
  "marketing source fences detect equal-text revision drift, private proof " +
    "and changed assignment",
  async () => {
    for (const change of [
      "revision",
      "wording",
      "private-proof",
      "withdrawal",
      "assignment",
    ]) {
      const f = await marketingFixture();
      const saved = await reviewPartnerMarketingGrant(
        f.deps,
        employee,
        f.review,
      );
      const asset = f.fake.read("salesIntelligenceClauses/asset-one")!;
      if (change === "revision") {
        f.fake.write("salesIntelligenceClauses/asset-one", {
          ...asset,
          revision: 2,
        });
      }
      if (change === "wording") {
        f.fake.write("salesIntelligenceClauses/asset-one", {
          ...asset,
          text: "Changed synthetic wording.",
        });
      }
      if (change === "private-proof") {
        f.fake.write("salesIntelligenceClauses/asset-one", {
          ...asset,
          permission: "private_mention",
        });
      }
      if (change === "withdrawal") {
        f.fake.write("salesIntelligenceClauses/asset-one", {
          ...asset,
          state: "withdrawn",
        });
      }
      if (change === "assignment") {
        f.fake.write("salesPartnerAssignments/organizer-one", {
          ...f.fake.read("salesPartnerAssignments/organizer-one"),
          revision: 3,
        });
      }
      await assert.rejects(
        getPartnerMarketingAssets(f.deps, partner, {
          grantId: saved.grantId,
          expectedGrantRevision: 1,
        }),
        {code: "failed-precondition"},
      );
      await assert.rejects(
        reviewPartnerMarketingGrant(f.deps, employee, f.review),
        {code: "failed-precondition"},
      );
    }
  },
);

test(
  "marketing read is isolated and immediately rechecks membership, " +
    "suppression, privacy, expiry and Auth",
  async () => {
    for (const gate of [
      "foreign",
      "membership",
      "suppression",
      "privacy",
      "expiry",
      "auth",
    ]) {
      const f = await marketingFixture();
      const saved = await reviewPartnerMarketingGrant(
        f.deps,
        employee,
        f.review,
      );
      let actor = partner;
      if (gate === "foreign") {
        actor = {uid: "different-partner", roles: []};
        await registerPartner(f.deps, actor, {
          ...registration,
          requestId: "different-partner-register",
        });
      }
      if (gate === "membership") {
        await revokePartnerAccess(f.deps, employee, {
          requestId: "marketing-member-revoke",
          organizerId: null,
          partnerUid: partner.uid,
          expectedRevision: 2,
          reason: "Access withdrawn.",
        });
      }
      if (gate === "suppression") {
        f.fake.write("organizerSalesAccounts/organizer-one", {
          ...f.fake.read("organizerSalesAccounts/organizer-one"),
          suppressionStatus: "suppressed",
        });
      }
      if (gate === "privacy") {
        f.fake.write("salesPrivacyRestrictions/organizer-one", {
          status: "restricted",
        });
      }
      if (gate === "expiry") f.advance(5 * 86400000);
      if (gate === "auth") f.revokeAuth();
      await assert.rejects(
        getPartnerMarketingAssets(f.deps, actor, {
          grantId: saved.grantId,
          expectedGrantRevision: 1,
        }),
      );
    }
  },
);

test(
  "marketing review cannot extend source or assignment validity or select " +
    "another organizer's asset",
  async () => {
    const f = await marketingFixture();
    await assert.rejects(
      reviewPartnerMarketingGrant(f.deps, employee, {
        ...f.review,
        expiresAt: "2026-10-10T00:00:00.000Z",
      }),
      {code: "failed-precondition"},
    );
    f.fake.write("salesIntelligenceClauses/asset-two", {
      ...f.fake.read("salesIntelligenceClauses/asset-one"),
      clauseId: "asset-two",
      organizerId: "foreign-organizer",
    });
    await assert.rejects(
      previewPartnerMarketingGrant(f.deps, employee, {
        ...marketingScope,
        assetIds: ["asset-two"],
      }),
      {code: "failed-precondition"},
    );
    await assert.rejects(
      previewPartnerMarketingGrant(f.deps, employee, {
        ...marketingScope,
        assetIds: [],
      }),
      {code: "invalid-argument"},
    );
    assert.deepEqual(
      f.fake.read("salesPartnerMemberships/partner-one")?.marketingGrants,
      [],
    );
  },
);

test(
  "interrupted marketing review preserves no partial grant; exact retry " +
    "recovers and changed material does not",
  async () => {
    const f = await marketingFixture();
    f.fake.failNextCommit = true;
    await assert.rejects(
      reviewPartnerMarketingGrant(f.deps, employee, f.review),
    );
    assert.deepEqual(
      f.fake.read("salesPartnerMemberships/partner-one")?.marketingGrants,
      [],
    );
    assert.equal(
      f.fake.read("salesPartnerMemberships/partner-one")?.revision,
      1,
    );
    const saved = await reviewPartnerMarketingGrant(f.deps, employee, f.review);
    assert.deepEqual(
      await reviewPartnerMarketingGrant(f.deps, employee, f.review),
      saved,
    );
    await assert.rejects(
      reviewPartnerMarketingGrant(f.deps, employee, {
        ...f.review,
        reason: "Changed review.",
      }),
      {code: "already-exists"},
    );
    await assert.rejects(
      getPartnerMarketingAssets(f.deps, partner, {
        grantId: saved.grantId,
        expectedGrantRevision: 0,
      }),
      {code: "aborted"},
    );
  },
);

test(
  "marketing revocation recovers exactly and is still possible after " +
    "suppression or expired access",
  async () => {
    const f = await marketingFixture();
    const saved = await reviewPartnerMarketingGrant(f.deps, employee, f.review);
    f.fake.write("organizerSalesAccounts/organizer-one", {
      ...f.fake.read("organizerSalesAccounts/organizer-one"),
      suppressionStatus: "suppressed",
    });
    f.advance(7 * 86400000);
    const revoke = {
      requestId: "marketing-revoke-one",
      partnerUid: partner.uid,
      grantId: saved.grantId,
      expectedMembershipRevision: 2,
      expectedGrantRevision: 1,
      reason: "Campaign permission withdrawn.",
    };
    const result = await revokePartnerMarketingGrant(f.deps, employee, revoke);
    assert.deepEqual(
      await revokePartnerMarketingGrant(f.deps, employee, revoke),
      result,
    );
    await assert.rejects(
      getPartnerMarketingAssets(f.deps, partner, {
        grantId: saved.grantId,
        expectedGrantRevision: 2,
      }),
      {code: "permission-denied"},
    );
  },
);

test(
  "marketing reviewer authorizes its own Firebase identity without " +
    "impersonating the assigned partner",
  async () => {
    const f = await marketingFixture();
    const seen: Array<{ uid: string; staff: boolean }> = [];
    const original = f.deps.checkAuth;
    f.deps.checkAuth = async (actor, staff) => {
      seen.push({uid: actor.uid, staff});
      if (staff) assert.equal(actor.uid, employee.uid);
      await original(actor, staff);
    };
    await previewPartnerMarketingGrant(f.deps, employee, marketingScope);
    await reviewPartnerMarketingGrant(f.deps, employee, f.review);
    assert.ok(seen.length >= 4);
    assert.ok(seen.every((entry) => entry.uid === employee.uid && entry.staff));
  },
);

test(
  "marketing underlying evidence edit, withdrawal and expiry invalidate " +
    "the reviewed fingerprint",
  async () => {
    for (const gate of ["edit", "withdrawal", "expiry", "missing"]) {
      const f = await marketingFixture();
      const source = {
        classification: "sales_private",
        organizerId: "organizer-one",
        reviewerUid: employee.uid,
        reviewedAt: initial,
        observedAt: initial,
        validThrough: "2026-10-09T00:00:00.000Z",
        summary: "Reviewed synthetic capability source",
      };
      f.fake.write("salesEvidence/source-one", source);
      f.fake.write("salesIntelligenceClauses/asset-one", {
        ...f.fake.read("salesIntelligenceClauses/asset-one"),
        evidenceIds: ["source-one"],
      });
      const preview = await previewPartnerMarketingGrant(
        f.deps,
        employee,
        marketingScope,
      );
      const review = {...f.review, sourceHash: preview.sourceHash};
      const saved = await reviewPartnerMarketingGrant(f.deps, employee, review);
      if (gate === "edit") {
        f.fake.write("salesEvidence/source-one", {
          ...source,
          summary: "Changed same-ID source",
        });
      }
      if (gate === "withdrawal") {
        f.fake.write("salesEvidence/source-one", {
          ...source,
          reviewerUid: null,
        });
      }
      if (gate === "expiry") {
        f.fake.write("salesEvidence/source-one", {
          ...source,
          validThrough: initial,
        });
      }
      if (gate === "missing") f.fake.write("salesEvidence/source-one", {});
      await assert.rejects(
        getPartnerMarketingAssets(f.deps, partner, {
          grantId: saved.grantId,
          expectedGrantRevision: 1,
        }),
        {code: "failed-precondition"},
      );
      await assert.rejects(
        reviewPartnerMarketingGrant(f.deps, employee, review),
        {code: "failed-precondition"},
      );
    }
  },
);

test(
  "marketing final access and expiry fences reject changes across the last " +
    "await and roll back grants",
  async () => {
    for (const operation of ["review", "replay", "read", "preview"]) {
      for (const gate of ["auth", "expiry"]) {
        const f = await marketingFixture();
        const saved =
        operation === "replay" || operation === "read" ?
          await reviewPartnerMarketingGrant(f.deps, employee, f.review) :
          null;
        const before = f.fake.read("salesPartnerMemberships/partner-one");
        let checks = 0;
        const last =
          operation === "review" ? 3 : operation === "preview" ? 2 : 3;
        f.deps.checkAuth = async () => {
          if (++checks !== last) return;
          if (gate === "auth") {
            throw new Error("Auth revoked at final boundary");
          }
          f.advance(10 * 86400000);
        };
        const action =
        operation === "read" ?
          getPartnerMarketingAssets(f.deps, partner, {
            grantId: saved!.grantId,
            expectedGrantRevision: 1,
          }) :
          operation === "preview" ?
            previewPartnerMarketingGrant(f.deps, employee, marketingScope) :
            reviewPartnerMarketingGrant(f.deps, employee, f.review);
        await assert.rejects(
          action,
          gate === "auth" ?
            /Auth revoked at final boundary/u :
            {code: "permission-denied"},
        );
        assert.deepEqual(
          f.fake.read("salesPartnerMemberships/partner-one"),
          before,
        );
      }
    }
  },
);

test(
  "persisted marketing grant material must match its immutable employee " +
    "approval receipt",
  async () => {
    for (const field of [
      "reason",
      "expiresAt",
      "reviewedBy",
      "approvedMembershipRevision",
      "approvalReceiptId",
    ]) {
      const f = await marketingFixture();
      const saved = await reviewPartnerMarketingGrant(
        f.deps,
        employee,
        f.review,
      );
      const membership = f.fake.read("salesPartnerMemberships/partner-one")!;
      const grants =
        membership.marketingGrants as Array<Record<string, unknown>>;
      const change =
      field === "expiresAt" ?
        "2026-10-07T00:00:00.000Z" :
        field === "approvedMembershipRevision" ?
          99 :
          field === "approvalReceiptId" ?
            "a".repeat(64) :
            "Changed reviewer material";
      f.fake.write("salesPartnerMemberships/partner-one", {
        ...membership,
        marketingGrants: grants.map((g) => ({...g, [field]: change})),
      });
      await assert.rejects(
        getPartnerMarketingAssets(f.deps, partner, {
          grantId: saved.grantId,
          expectedGrantRevision: 1,
        }),
        {code: "failed-precondition"},
      );
    }
  },
);

test(
  "marketing approval and revocation receipts and membership satisfy " +
    "canonical source schemas",
  async () => {
    const f = await marketingFixture();
    const saved = await reviewPartnerMarketingGrant(f.deps, employee, f.review);
    const ajv = new Ajv({strict: false, allErrors: true});
    addFormats(ajv);
    const root = path.resolve(__dirname, "../../../contracts/firestore");
    const receipt = ajv.compile(
      JSON.parse(
        readFileSync(
          path.join(root, "sales_action_receipts.schema.json"),
          "utf8",
        ),
      ),
    );
    const membership = ajv.compile(
      JSON.parse(
        readFileSync(
          path.join(root, "sales_partner_memberships.schema.json"),
          "utf8",
        ),
      ),
    );
    assert.equal(
      membership(f.fake.read("salesPartnerMemberships/partner-one")),
      true,
      JSON.stringify(membership.errors),
    );
    await revokePartnerMarketingGrant(f.deps, employee, {
      requestId: "schema-marketing-revoke",
      partnerUid: partner.uid,
      grantId: saved.grantId,
      expectedMembershipRevision: 2,
      expectedGrantRevision: 1,
      reason: "Synthetic permission withdrawal",
    });
    assert.equal(
      membership(f.fake.read("salesPartnerMemberships/partner-one")),
      true,
      JSON.stringify(membership.errors),
    );
    const rows = f.fake
      .entries()
      .filter(
        ([p, row]) =>
          p.startsWith("salesActionReceipts/") &&
        String(row.action).startsWith("partner.marketing."),
      );
    assert.equal(rows.length, 2);
    for (const [, row] of rows) {
      assert.equal(receipt(row), true, JSON.stringify(receipt.errors));
    }
  },
);

test(
  "access read gives an administrator the revisions a revoke or re-offer " +
    "names, and nothing private",
  async () => {
    const f = fixture();
    const read = () =>
      getPartnerAccess(f.deps, employee, {organizerId: "organizer-one"});
    assert.deepEqual(await read(), {organizerId: "organizer-one",
      assignment: null, membership: null, evaluatedAt: initial});
    await assert.rejects(
      getPartnerAccess(f.deps, partner, {organizerId: "organizer-one"}),
      {code: "permission-denied"});
    await assert.rejects(
      getPartnerAccess(f.deps, employee, {organizerId: "organizer-one",
        extra: true}),
      {code: "invalid-argument"});
    await registerPartner(f.deps, partner, registration);
    await assignPartner(f.deps, employee, offer);
    await decideAssignment(f.deps, partner, accept);
    const accepted = await read();
    assert.deepEqual(accepted.assignment, {partnerUid: partner.uid,
      state: "accepted", revision: 2, reviewAt: offer.reviewAt,
      expiresAt: offer.expiresAt, updatedAt: initial});
    assert.deepEqual(accepted.membership, {partnerUid: partner.uid,
      displayName: registration.displayName, state: "active", revision: 1,
      expiresAt: "2027-01-02T00:00:00.000Z"});
    assert.doesNotMatch(JSON.stringify(accepted),
      /Review introduction fit|Reviewed official identity|prior event/u);

    await revokePartnerAccess(f.deps, employee, {
      requestId: "revoke-assignment-read",
      organizerId: "organizer-one",
      partnerUid: partner.uid,
      expectedRevision: accepted.assignment ?
        (accepted.assignment as {revision: number}).revision : -1,
      reason: "Host asked to deal with Catch directly",
    });
    assert.equal(
      ((await read()).assignment as {state: string}).state, "revoked");
    await revokePartnerAccess(f.deps, employee, {
      requestId: "revoke-membership-read",
      organizerId: null,
      partnerUid: partner.uid,
      expectedRevision: 1,
      reason: "Partner left the programme",
    });
    assert.deepEqual((await read()).membership, {partnerUid: partner.uid,
      displayName: registration.displayName, state: "revoked", revision: 2,
      expiresAt: "2027-01-02T00:00:00.000Z"});

    const g = fixture();
    await registerPartner(g.deps, partner, registration);
    await assignPartner(g.deps, employee, offer);
    g.advance(7 * 86400000);
    const lapsed = await getPartnerAccess(g.deps, employee,
      {organizerId: "organizer-one"});
    assert.equal((lapsed.assignment as {state: string}).state, "expired");
    assert.equal((lapsed.membership as {state: string}).state, "active");
  },
);

test("access read and revoke receipts satisfy their response contracts",
  async () => {
    const f = fixture();
    await registerPartner(f.deps, partner, registration);
    await assignPartner(f.deps, employee, offer);
    const ajv = new Ajv({strict: false, allErrors: true});
    addFormats(ajv);
    const root = path.resolve(__dirname,
      "../../../contracts/callable_responses");
    const compile = (name: string) => ajv.compile(JSON.parse(
      readFileSync(path.join(root, name), "utf8")));
    const access = compile(
      "admin_get_sales_partner_access_response.schema.json");
    const revoke = compile(
      "admin_revoke_sales_partner_access_response.schema.json");
    for (const organizerId of ["organizer-one", "organizer-two"]) {
      const value = await getPartnerAccess(f.deps, employee, {organizerId});
      assert.equal(access(value), true, JSON.stringify(access.errors));
    }
    for (const input of [
      {requestId: "schema-revoke-assignment", organizerId: "organizer-one",
        partnerUid: partner.uid, expectedRevision: 1, reason: "Synthetic"},
      {requestId: "schema-revoke-membership", organizerId: null,
        partnerUid: partner.uid, expectedRevision: 1, reason: "Synthetic"},
    ]) {
      const value = await revokePartnerAccess(f.deps, employee, input);
      assert.equal(revoke(value), true, JSON.stringify(revoke.errors));
    }
  });
