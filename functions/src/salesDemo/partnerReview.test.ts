import assert from "node:assert/strict";
import test from "node:test";
import {hash, PARTNER_TERMS_VERSION, type PartnerDeps} from "../partners/model";
import {FakeFirestore} from "../operations/testFirestore";
import {
  getPartnerDemoReview,
  partnerDemoPreviewMaterial,
  projectPartnerDemoReview,
  type PartnerDemoReviewGrant,
} from "./partnerReview";
const at = new Date("2026-10-04T12:00:00.000Z");
const scope = {
  actorUid: "partner-one",
  organizerId: "synthetic-organizer",
  assignmentRevision: 3,
};
const gate = {
  capability: "synthetic_forms_v1",
  enabled: true,
  revision: "cap-v1",
  evidenceRevision: "evidence-v1",
};
function fixture() {
  const source = {
    schemaVersion: 1,
    classification: "sales_private",
    blueprintId: "synthetic-blueprint",
    organizerId: scope.organizerId,
    candidateId: null,
    revision: 7,
    state: "reviewed",
    capability: gate.capability,
    capabilityRevision: gate.revision,
    evidenceRevision: gate.evidenceRevision,
    reviewedByUid: "owner-private",
    reviewedAt: "2026-10-04T10:00:00.000Z",
    updatedByUid: "staff-private",
    setupPlan: {private: "Never project"},
    fieldMappings: [{private: "Never project"}],
    preview: {
      brandName: "Synthetic organizer",
      headline: "Practice a reviewed application flow",
      scenario: "A sample application for a sample event",
      steps: ["Review", "Prepare reply", "Admit sample guest"],
      retainedTools: [],
      limitations: [
        "Synthetic sample; no real guests, messaging or organizer control.",
      ],
      cta: "Discuss a pilot",
    },
  };
  const grant: PartnerDemoReviewGrant = {
    revision: 1,
    state: "active",
    partnerUid: scope.actorUid,
    assignmentRevision: scope.assignmentRevision,
    blueprintRevision: source.revision,
    previewHash: hash(partnerDemoPreviewMaterial(source)),
    expiresAt: "2026-10-05T12:00:00.000Z",
    ownerReviewedByUid: "owner-private",
    ownerReviewedAt: "2026-10-04T11:00:00.000Z",
  };
  return {source, grant};
}
test(
  "projects only an exact separately shared synthetic preview, without " +
    "private metadata or control",
  () => {
    const {source, grant} = fixture();
    const result = projectPartnerDemoReview(source, grant, scope, gate, at);
    assert.equal(result.synthetic, true);
    assert.equal(result.interactiveAvailable, false);
    assert.equal(result.organizerControlAuthority, false);
    assert.equal(result.sendAuthority, false);
    assert.equal(result.capabilityApprovalAuthority, false);
    assert.equal(result.previewHash, grant.previewHash);
    const text = JSON.stringify(result);
    assert.ok(!text.includes("owner-private"));
    assert.ok(!text.includes("staff-private"));
    assert.ok(!text.includes("Never project"));
    assert.ok(!text.includes("partner-one"));
  },
);
test(
  "assignment and blueprint approval alone do not authorize preview sharing",
  () => {
    const {source} = fixture();
    assert.throws(() =>
      projectPartnerDemoReview(source, undefined, scope, gate, at),
    );
  },
);
test(
  "rejects changed assignment, foreign partner, expired grant or missing " +
    "owner review",
  () => {
    for (const changed of [
      {assignmentRevision: 4},
      {partnerUid: "partner-two"},
      {expiresAt: at.toISOString()},
      {ownerReviewedByUid: ""},
      {ownerReviewedAt: "unknown"},
    ]) {
      const {source, grant} = fixture();
      assert.throws(() =>
        projectPartnerDemoReview(
          source,
          {...grant, ...changed},
          scope,
          gate,
          at,
        ),
      );
    }
  },
);
test(
  "rejects changed wording, blueprint revision, organizer and capability " +
    "evidence",
  () => {
    const {source, grant} = fixture();
    for (const changed of [
      {...source, preview: {...source.preview, headline: "Changed wording"}},
      {...source, revision: 8},
      {...source, organizerId: "other-organizer"},
      {...source, evidenceRevision: "evidence-v2"},
      {...source, state: "draft"},
    ]) {
      assert.throws(() =>
        projectPartnerDemoReview(changed, grant, scope, gate, at),
      );
    }
    assert.throws(() =>
      projectPartnerDemoReview(
        source,
        grant,
        scope,
        {...gate, enabled: false},
        at,
      ),
    );
  },
);

test(
  "withholds preview if Auth is revoked while the final membership read is " +
    "pending",
  async () => {
    const fake = new FakeFirestore();
    const {source, grant} = fixture();
    fake.write("organizers/" + scope.organizerId, {
      name: "Synthetic organizer",
      archived: false,
    });
    fake.write("organizerSalesAccounts/" + scope.organizerId, {
      classification: "sales_private",
      organizerId: scope.organizerId,
      researchStatus: "qualified",
      suppressionStatus: "clear",
      duplicateReviewRequired: false,
    });
    fake.write("salesPartnerMemberships/" + scope.actorUid, {
      uid: scope.actorUid,
      schemaVersion: 1,
      classification: "sales_private",
      status: "active",
      termsVersion: PARTNER_TERMS_VERSION,
      expiresAt: "2026-10-06T12:00:00.000Z",
    });
    fake.write("salesPartnerAssignments/" + scope.organizerId, {
      schemaVersion: 1,
      classification: "sales_private",
      organizerId: scope.organizerId,
      partnerUid: scope.actorUid,
      revision: scope.assignmentRevision,
      status: "accepted",
      expiresAt: "2026-10-06T12:00:00.000Z",
    });
    fake.write("salesDemoBlueprints/" + source.blueprintId, {
      ...source,
      partnerReviewGrant: grant,
    });
    fake.write("salesDemoCapabilities/synthetic_forms_v1", gate);
    const before = fake.entries();
    let revoked = false;
    let membershipReads = 0;
    let entered!: () => void;
    const pendingRead = new Promise<void>((resolve) => {
      entered = resolve;
    });
    let release!: () => void;
    const delayed = new Promise<void>((resolve) => {
      release = resolve;
    });
    const collection = fake.collection.bind(fake);
    fake.collection = (path) => {
      const result = collection(path);
      const doc = result.doc.bind(result);
      result.doc = (docId) => {
        const ref = doc(docId);
        const read = ref.get.bind(ref);
        ref.get = async () => {
          const snapshot = await read();
          if (
            ref.path === "salesPartnerMemberships/" + scope.actorUid &&
          ++membershipReads === 3
          ) {
            entered();
            await delayed;
          }
          return snapshot;
        };
        return ref;
      };
      return result;
    };
    const deps: PartnerDeps = {
      db: fake as unknown as FirebaseFirestore.Firestore,
      now: () => at,
      checkAuth: async () => {
        if (revoked) throw new Error("revoked Auth");
      },
    };
    const rejected = assert.rejects(
      getPartnerDemoReview(
        deps,
        {uid: scope.actorUid, roles: []},
        {
          organizerId: scope.organizerId,
          expectedAssignmentRevision: scope.assignmentRevision,
          blueprintId: source.blueprintId,
        },
      ),
      /revoked Auth/u,
    );
    await pendingRead;
    revoked = true;
    release();
    await rejected;
    assert.equal(membershipReads, 3);
    assert.deepEqual(fake.entries(), before);
  },
);

import {
  getOwnerPartnerDemoReview,
  sharePartnerDemoReview,
  type DemoDeps,
} from "./service";
import {
  listPartnerDemoReviews,
  proposePartnerDemoWording,
} from "./partnerReview";
import type {Identity} from "./model";
const ownerIdentity: Identity = {
  uid: "owner-private",
  token: {auth_time: at.getTime() / 1000},
};
function transactionFixture(shared = false) {
  const fake = new FakeFirestore();
  const {source, grant} = fixture();
  let now = at;
  let ownerActive = true;
  let partnerActive = true;
  fake.write("organizers/" + scope.organizerId, {
    name: "Synthetic organizer",
    claim: {state: "unclaimed"},
    publication: {state: "hidden"},
  });
  fake.write("organizerSalesAccounts/" + scope.organizerId, {
    classification: "sales_private",
    organizerId: scope.organizerId,
    researchStatus: "qualified",
    suppressionStatus: "clear",
    duplicateReviewRequired: false,
  });
  fake.write("salesPartnerMemberships/" + scope.actorUid, {
    uid: scope.actorUid,
    schemaVersion: 1,
    classification: "sales_private",
    status: "active",
    termsVersion: PARTNER_TERMS_VERSION,
    expiresAt: "2026-10-06T12:00:00.000Z",
  });
  fake.write("salesPartnerAssignments/" + scope.organizerId, {
    schemaVersion: 1,
    classification: "sales_private",
    organizerId: scope.organizerId,
    partnerUid: scope.actorUid,
    revision: scope.assignmentRevision,
    status: "accepted",
    expiresAt: "2026-10-06T12:00:00.000Z",
  });
  fake.write("salesDemoBlueprints/" + source.blueprintId, {
    ...source,
    ...(shared ? {partnerReviewGrant: grant} : {}),
  });
  fake.write("salesDemoCapabilities/synthetic_forms_v1", gate);
  const db = fake as unknown as FirebaseFirestore.Firestore;
  const demoDeps: DemoDeps = {
    db,
    now: () => now,
    getUser: async (uid) => ({
      disabled: uid === scope.actorUid ? !partnerActive : !ownerActive,
      customClaims:
        uid === ownerIdentity.uid && ownerActive ? {adminOwner: true} : {},
      tokensValidAfterTime: "2026-10-04T10:00:00.000Z",
    }),
    tokenKey: () => {
      throw new Error("Static sharing must not request credentials");
    },
  };
  const deps: PartnerDeps = {
    db,
    now: () => now,
    checkAuth: async (actor) => {
      if (!partnerActive || actor.uid !== scope.actorUid) {
        throw new Error("revoked partner");
      }
    },
  };
  const actor = {uid: scope.actorUid, roles: []};
  const listInput = {
    organizerId: scope.organizerId,
    expectedAssignmentRevision: scope.assignmentRevision,
  };
  const shareInput = {
    requestId: "share-source-001",
    blueprintId: source.blueprintId,
    expectedBlueprintRevision: source.revision,
    expectedSharingRevision: shared ? 1 : 0,
    partnerUid: scope.actorUid,
    expectedAssignmentRevision: scope.assignmentRevision,
    expectedPreviewHash: grant.previewHash,
    decision: "share",
    expiresAt: grant.expiresAt,
  };
  const proposalInput = {
    requestId: "propose-source-001",
    ...listInput,
    blueprintId: source.blueprintId,
    expectedPreviewHash: grant.previewHash,
    expectedProposalRevision: 0,
    wording: {
      headline: "A clear sample",
      scenario: "Explore a sample application",
      cta: "Discuss a pilot",
    },
  };
  return {
    fake,
    source,
    grant,
    demoDeps,
    deps,
    actor,
    shareInput,
    listInput,
    proposalInput,
    setClock: (v: Date) => {
      now = v;
    },
    revokeOwner: () => {
      ownerActive = false;
    },
    revokePartner: () => {
      partnerActive = false;
    },
  };
}
test(
  "owner sharing changes only its independent grant and recovers exactly; " +
    "never claims, publishes or issues credentials",
  async () => {
    const f = transactionFixture();
    const before = f.fake.read("organizers/" + scope.organizerId);
    assert.deepEqual(
      (await listPartnerDemoReviews(f.deps, f.actor, f.listInput)).rows,
      [],
    );
    const reviewed = await getOwnerPartnerDemoReview(
      f.demoDeps,
      ownerIdentity,
      {blueprintId: f.source.blueprintId},
    );
    assert.equal(reviewed.sharingState, "none");
    assert.equal(reviewed.previewHash, f.shareInput.expectedPreviewHash);
    const first = await sharePartnerDemoReview(
      f.demoDeps,
      ownerIdentity,
      f.shareInput,
    );
    const writes = f.fake.entries();
    assert.deepEqual(
      await sharePartnerDemoReview(f.demoDeps, ownerIdentity, f.shareInput),
      first,
    );
    assert.deepEqual(f.fake.entries(), writes);
    assert.equal(first.sharingRevision, 1);
    assert.equal(
      f.fake.read("salesDemoBlueprints/" + f.source.blueprintId)?.revision,
      7,
    );
    assert.deepEqual(f.fake.read("organizers/" + scope.organizerId), before);
    assert.equal(
      (
        await listPartnerDemoReviews(f.deps, f.actor, f.listInput)
      ).rows instanceof Array,
      true,
    );
    assert.equal(
      f.fake
        .entries()
        .filter(([p]) => /salesDemo(?:Invitations|Sessions)/u.test(p)).length,
      0,
    );
    await assert.rejects(
      sharePartnerDemoReview(f.demoDeps, ownerIdentity, {
        ...f.shareInput,
        expiresAt: "2026-10-05T13:00:00.000Z",
      }),
      /different material/u,
    );
  },
);
test(
  "withdrawal hides preview and superseded receipt cannot restore it",
  async () => {
    const f = transactionFixture();
    await sharePartnerDemoReview(f.demoDeps, ownerIdentity, f.shareInput);
    await sharePartnerDemoReview(f.demoDeps, ownerIdentity, {
      ...f.shareInput,
      requestId: "withdraw-source-001",
      expectedSharingRevision: 1,
      decision: "withdraw",
      expiresAt: null,
    });
    assert.deepEqual(
      (await listPartnerDemoReviews(f.deps, f.actor, f.listInput)).rows,
      [],
    );
    const before = f.fake.entries();
    await assert.rejects(
      sharePartnerDemoReview(f.demoDeps, ownerIdentity, f.shareInput),
      /no longer current/u,
    );
    assert.deepEqual(f.fake.entries(), before);
  },
);
test(
  "partner wording is pending, minimal and idempotent; interrupted " +
    "transaction leaves no proposal or receipt",
  async () => {
    const f = transactionFixture(true);
    f.fake.failNextCommit = true;
    await assert.rejects(
      proposePartnerDemoWording(f.deps, f.actor, f.proposalInput),
      /interruption/u,
    );
    assert.equal(
      f.fake.read("salesDemoBlueprints/" + f.source.blueprintId)
        ?.partnerPreviewProposal,
      undefined,
    );
    const result = await proposePartnerDemoWording(
      f.deps,
      f.actor,
      f.proposalInput,
    );
    const committed = f.fake.entries();
    assert.deepEqual(
      await proposePartnerDemoWording(f.deps, f.actor, f.proposalInput),
      result,
    );
    assert.deepEqual(f.fake.entries(), committed);
    assert.equal(result.state, "pending_owner_review");
    const source = f.fake.read("salesDemoBlueprints/" + f.source.blueprintId)!;
    assert.deepEqual(source.preview, f.source.preview);
    assert.equal(source.revision, f.source.revision);
    const list = await listPartnerDemoReviews(f.deps, f.actor, f.listInput);
    const rows = list.rows as Array<Record<string, unknown>>;
    assert.deepEqual(rows[0].proposedWording, f.proposalInput.wording);
    assert.ok(!JSON.stringify(list).includes("owner-private"));
    assert.ok(!JSON.stringify(list).includes("partner-one"));
    await assert.rejects(
      proposePartnerDemoWording(f.deps, f.actor, {
        ...f.proposalInput,
        wording: {...f.proposalInput.wording, cta: "Changed"},
      }),
      /different partner work/u,
    );
  },
);
test(
  "proposal receipt cannot recover after source drift; foreign private " +
    "proposal cannot be read or overwritten",
  async () => {
    const f = transactionFixture(true);
    await proposePartnerDemoWording(f.deps, f.actor, f.proposalInput);
    const path = "salesDemoBlueprints/" + f.source.blueprintId;
    const source = f.fake.read(path)!;
    f.fake.write(path, {
      ...source,
      preview: {...f.source.preview, headline: "Source changed"},
    });
    await assert.rejects(
      proposePartnerDemoWording(f.deps, f.actor, f.proposalInput),
    );
    f.fake.write(path, {
      ...source,
      partnerPreviewProposal: {
        ...(source.partnerPreviewProposal as object),
        partnerUid: "foreign-partner",
      },
    });
    const list = await listPartnerDemoReviews(f.deps, f.actor, f.listInput);
    assert.equal(
      (list.rows as Array<Record<string, unknown>>)[0].proposedWording,
      null,
    );
    const before = f.fake.entries();
    await assert.rejects(
      proposePartnerDemoWording(f.deps, f.actor, {
        ...f.proposalInput,
        requestId: "new-proposal-001",
        expectedProposalRevision: 1,
      }),
      /earlier private proposal/u,
    );
    assert.deepEqual(f.fake.entries(), before);
  },
);
test(
  "reassignment, suppression, capability drift, expired membership and " +
    "grant each withhold access and mutation",
  async () => {
    const changes: Array<[string, Record<string, unknown>]> = [
      [
        "salesPartnerAssignments/" + scope.organizerId,
        {partnerUid: "foreign-partner", revision: 4},
      ],
      [
        "organizerSalesAccounts/" + scope.organizerId,
        {suppressionStatus: "suppressed"},
      ],
      [
        "salesDemoCapabilities/synthetic_forms_v1",
        {evidenceRevision: "evidence-changed"},
      ],
      [
        "salesPartnerMemberships/" + scope.actorUid,
        {expiresAt: at.toISOString()},
      ],
      [
        "salesDemoBlueprints/synthetic-blueprint",
        {partnerReviewGrant: {...fixture().grant, expiresAt: at.toISOString()}},
      ],
    ];
    for (const [path, patch] of changes) {
      const f = transactionFixture(true);
      f.fake.write(path, {...f.fake.read(path), ...patch});
      const before = f.fake.entries();
      await assert.rejects(
        proposePartnerDemoWording(f.deps, f.actor, f.proposalInput),
      );
      await assert.rejects(
        getPartnerDemoReview(f.deps, f.actor, {
          ...f.listInput,
          blueprintId: f.source.blueprintId,
        }),
      );
      assert.deepEqual(f.fake.entries(), before);
    }
  },
);
test(
  "owner sharing interruption recovers once, while revoked owner and expiry " +
    "are rejected without changes",
  async () => {
    const f = transactionFixture();
    f.fake.failNextCommit = true;
    await assert.rejects(
      sharePartnerDemoReview(f.demoDeps, ownerIdentity, f.shareInput),
      /interruption/u,
    );
    assert.equal(
      f.fake.read("salesDemoBlueprints/" + f.source.blueprintId)
        ?.partnerReviewGrant,
      undefined,
    );
    await sharePartnerDemoReview(f.demoDeps, ownerIdentity, f.shareInput);
    f.revokeOwner();
    const before = f.fake.entries();
    await assert.rejects(
      sharePartnerDemoReview(f.demoDeps, ownerIdentity, f.shareInput),
    );
    assert.deepEqual(f.fake.entries(), before);
    const expired = transactionFixture();
    expired.setClock(new Date("2026-10-06T12:00:00.000Z"));
    await assert.rejects(
      sharePartnerDemoReview(
        expired.demoDeps,
        ownerIdentity,
        expired.shareInput,
      ),
    );
  },
);

import Ajv from "ajv";
import addFormats from "ajv-formats";
import {contractFile} from "../shared/contractFixtures";
import {
  validateProposeSalesPartnerDemoWordingCallablePayload,
} from "../shared/generated/validators/proposeSalesPartnerDemoWordingInput";
test(
  "canonical and generated wording validators accept approachable prose and " +
    "reject controls; stored receipts fit their existing families",
  async () => {
    const f = transactionFixture(true);
    const ajv = new Ajv({strict: false});
    addFormats(ajv);
    const input = ajv.compile(
      contractFile(
        "callables/propose_sales_partner_demo_wording_payload.schema.json"),
    );
    const good = {
      ...f.proposalInput,
      wording: {
        headline: "Useful future flow",
        scenario: "Review form answers",
        cta: "Discuss a pilot",
      },
    };
    assert.equal(input(good), true);
    assert.equal(
      validateProposeSalesPartnerDemoWordingCallablePayload(good),
      true,
    );
    const bad = {...good, wording: {...good.wording, headline: "a\u0001b"}};
    assert.equal(input(bad), false);
    assert.equal(
      validateProposeSalesPartnerDemoWordingCallablePayload(bad),
      false,
    );
    await proposePartnerDemoWording(f.deps, f.actor, good);
    const receipt = f.fake
      .entries()
      .find(([p]) => p.startsWith("salesActionReceipts/"))![1];
    const receiptValidator = ajv.compile(
      contractFile("firestore/sales_action_receipts.schema.json"),
    );
    assert.equal(
      receiptValidator(receipt),
      true,
      JSON.stringify(receiptValidator.errors),
    );
    const owner = transactionFixture();
    await sharePartnerDemoReview(
      owner.demoDeps,
      ownerIdentity,
      owner.shareInput,
    );
    const demoReceipt = owner.fake
      .entries()
      .find(([p]) => p.startsWith("salesDemoReceipts/"))![1];
    const demoReceiptValidator = ajv.compile(
      contractFile("firestore/sales_demo_receipts.schema.json"),
    );
    assert.equal(
      demoReceiptValidator(demoReceipt),
      true,
      JSON.stringify(demoReceiptValidator.errors),
    );
  },
);

test(
  "owner authority and access expiry are checked after delayed recipient " +
    "Auth lookup",
  async () => {
    for (const changed of ["owner", "expiry"] as const) {
      const f = transactionFixture();
      const getUser = f.demoDeps.getUser;
      let entered!: () => void;
      const waiting = new Promise<void>((resolve) => {
        entered = resolve;
      });
      let release!: () => void;
      const delayed = new Promise<void>((resolve) => {
        release = resolve;
      });
      f.demoDeps.getUser = async (uid) => {
        const value = await getUser(uid);
        if (uid === scope.actorUid) {
          entered();
          await delayed;
        }
        return value;
      };
      const before = f.fake.entries();
      const rejected = assert.rejects(
        sharePartnerDemoReview(f.demoDeps, ownerIdentity, f.shareInput),
      );
      await waiting;
      if (changed === "owner") f.revokeOwner();
      else f.setClock(new Date("2026-10-06T12:00:00.000Z"));
      release();
      await rejected;
      assert.deepEqual(f.fake.entries(), before);
    }
  },
);
