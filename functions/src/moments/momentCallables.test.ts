import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {
  armOrganizerMomentHandler,
  listOrganizerMomentsHandler,
  pauseOrganizerMomentHandler,
  requireMomentManageAuthority,
  resumeOrganizerMomentHandler,
  runOrganizerMomentHandler,
  upsertOrganizerMomentHandler,
  type MomentCallablesDeps,
} from "./momentCallables";
import {MOMENTS_COLLECTION} from "./momentDocuments";

const ts = (millis: number) => admin.firestore.Timestamp.fromMillis(millis);
const NOW = 1_000_000;

const programScope = {kind: "program" as const, programId: "prog"};

const validPayload = {
  scope: programScope,
  name: "Sangeet starts soon",
  initiation: {
    kind: "anchored", anchorKind: "functionStart", anchorId: "sangeet",
    offsetMinutes: -15,
  },
  sense: "audience",
  audience: {
    kind: "functionGuests", functionId: "sangeet", rsvp: ["attending"],
    householdDedupe: true, travelTimeLead: false,
  },
  action: {
    kind: "sendTemplate", connectionId: "conn1", templateId: "tpl",
    variables: {},
  },
};

function makeDeps(db: FakeFirestore, authorized = true) {
  const calls: string[] = [];
  const deps: MomentCallablesDeps = {
    firestore: () => db as never,
    nowMillis: () => NOW,
    authorizeManage: async (_db, _scope, actorUid) => {
      calls.push(actorUid);
      if (!authorized) {
        throw new Error("denied");
      }
    },
  };
  return {deps, calls};
}

test("upsert creates a draft; list returns it scoped", async () => {
  const db = new FakeFirestore({});
  const {deps, calls} = makeDeps(db);
  const created = await upsertOrganizerMomentHandler(deps, {
    actorUid: "mgr", payload: {...validPayload},
  });
  assert.equal(created.moment.status, "draft");
  assert.equal(created.moment.approval, null);
  assert.equal(calls.length, 1);
  const doc = await db.doc(
    `${MOMENTS_COLLECTION}/${created.moment.momentId}`).get();
  assert.equal((doc.data() as Record<string, unknown>).scopeId, "prog");
  const list = await listOrganizerMomentsHandler(deps, {
    actorUid: "mgr", scope: programScope,
  });
  assert.equal(list.moments.length, 1);
  const other = await listOrganizerMomentsHandler(deps, {
    actorUid: "mgr", scope: {kind: "program", programId: "other"},
  });
  assert.equal(other.moments.length, 0);
});

test("a planner anchor is stored, kept on revise and listed", async () => {
  const db = new FakeFirestore({
    "programFunctions/sangeet": {functionId: "sangeet", programId: "prog"},
    "programFunctions/elsewhere": {functionId: "elsewhere",
      programId: "other"},
  });
  const {deps} = makeDeps(db);
  await assert.rejects(upsertOrganizerMomentHandler(deps, {
    actorUid: "mgr",
    payload: {...validPayload, anchor: {kind: "function", id: "elsewhere"}},
  }), /not part of this programme/);
  await assert.rejects(upsertOrganizerMomentHandler(deps, {
    actorUid: "mgr",
    payload: {...validPayload, anchor: {kind: "function", id: null}},
  }), /anchor needs/);
  const created = await upsertOrganizerMomentHandler(deps, {
    actorUid: "mgr",
    payload: {...validPayload, anchor: {kind: "function", id: "sangeet"}},
  });
  assert.deepEqual(created.moment.anchor, {kind: "function", id: "sangeet"});
  const revised = await upsertOrganizerMomentHandler(deps, {
    actorUid: "mgr",
    payload: {...validPayload, momentId: created.moment.momentId,
      name: "Sangeet tonight"},
  });
  assert.deepEqual(revised.moment.anchor, {kind: "function", id: "sangeet"});
  const list = await listOrganizerMomentsHandler(deps, {
    actorUid: "mgr", scope: programScope,
  });
  assert.deepEqual(list.plans, [{
    momentId: created.moment.momentId,
    anchor: {kind: "function", id: "sangeet"},
    sentCount: 0,
    nextRunAtMillis: null,
    state: "draft",
  }]);
});

test("programme lists carry the active WhatsApp sender", async () => {
  const db = new FakeFirestore({
    "organizerSenderConnections/old": {organizerId: "org",
      channel: "whatsapp", status: "disconnected"},
    "organizerSenderConnections/live": {organizerId: "org",
      channel: "whatsapp", status: "active"},
  });
  const deps: MomentCallablesDeps = {
    firestore: () => db as never,
    nowMillis: () => NOW,
    authorizeManage: async () => ({program: {organizerId: "org"}}) as never,
  };
  const list = await listOrganizerMomentsHandler(deps, {
    actorUid: "mgr", scope: programScope,
  });
  assert.equal(list.senderConnectionId, "live");
});

test("invalid axis combination is rejected at upsert", async () => {
  const db = new FakeFirestore({});
  const {deps} = makeDeps(db);
  await assert.rejects(
    upsertOrganizerMomentHandler(deps, {
      actorUid: "mgr",
      payload: {...validPayload, initiation: {kind: "manual"},
        sense: "individual"},
    }),
    /manualRequiresAudienceSense/);
});

test("travelTimeLead is rejected on non-functionGuests audiences",
  async () => {
    const db = new FakeFirestore({});
    const {deps} = makeDeps(db);
    await assert.rejects(
      upsertOrganizerMomentHandler(deps, {
        actorUid: "mgr",
        payload: {...validPayload, audience: {
          kind: "households", rsvpPendingOnly: false,
          travelTimeLead: true,
        }},
      }),
      /travelTimeLead applies to functionGuests/);
    // The flag rides through on the legal audience.
    const created = await upsertOrganizerMomentHandler(deps, {
      actorUid: "mgr",
      payload: {...validPayload, audience: {
        ...validPayload.audience, travelTimeLead: true,
      }},
    });
    assert.equal(created.moment.audience.kind === "functionGuests" &&
      created.moment.audience.travelTimeLead, true);
  });

test("arm records approval once; re-arm is rejected", async () => {
  const db = new FakeFirestore({});
  const {deps} = makeDeps(db);
  const created = await upsertOrganizerMomentHandler(deps, {
    actorUid: "mgr", payload: {...validPayload},
  });
  const armed = await armOrganizerMomentHandler(deps, {
    actorUid: "mgr", scope: programScope,
    momentId: created.moment.momentId,
  });
  assert.equal(armed.moment.status, "armed");
  assert.deepEqual(armed.moment.approval, {
    approvedByUid: "mgr", approvedAtMillis: NOW,
  });
  await assert.rejects(
    armOrganizerMomentHandler(deps, {
      actorUid: "mgr", scope: programScope,
      momentId: created.moment.momentId,
    }),
    /notArmable/);
});

test("calendar offsets round-trip through upsert and wire", async () => {
  const db = new FakeFirestore({});
  const {deps} = makeDeps(db);
  const created = await upsertOrganizerMomentHandler(deps, {
    actorUid: "mgr",
    payload: {...validPayload, initiation: {
      kind: "anchored", anchorKind: "functionStart", anchorId: "sangeet",
      offsetMinutes: -30, offsetDays: -2, offsetMonths: 0,
    }},
  });
  const initiation = created.moment.initiation;
  assert.equal(initiation.kind, "anchored");
  if (initiation.kind === "anchored") {
    assert.equal(initiation.offsetDays, -2);
    assert.equal(initiation.offsetMonths, 0);
    assert.equal(initiation.offsetMinutes, -30);
  }
});

test("arming replans inline; pausing supersedes without a sweep",
  async () => {
    const db = new FakeFirestore({});
    db.setDoc("organizerPrograms/prog", {
      organizerId: "org-1", kind: "wedding", title: "P",
      timezone: "Asia/Kolkata",
      startsAt: ts(1_000_000), endsAt: ts(9_000_000),
      status: "active", capabilities: ["messaging"],
      createdBy: "mgr", createdAt: ts(0), updatedAt: ts(0), revision: 3,
    });
    db.setDoc("programFunctions/sangeet", {
      programId: "prog", organizerId: "org-1", status: "scheduled",
      startsAt: ts(2_000_000), endsAt: ts(2_400_000), revision: 7,
    });
    const {deps} = makeDeps(db);
    const created = await upsertOrganizerMomentHandler(deps, {
      actorUid: "mgr", payload: {...validPayload},
    });
    const armed = await armOrganizerMomentHandler(deps, {
      actorUid: "mgr", scope: programScope,
      momentId: created.moment.momentId,
    });
    // No sweep ran — the lifecycle write planned the occurrence itself.
    const run = await db.doc(
      `organizerMomentRuns/${armed.moment.momentId}_7_1100000`).get();
    assert.equal((run.data() as Record<string, unknown>).status,
      "planned");
    // Pausing supersedes the pending run in the same write path.
    await pauseOrganizerMomentHandler(deps, {
      actorUid: "mgr", scope: programScope,
      momentId: armed.moment.momentId,
    });
    const paused = await db.doc(
      `organizerMomentRuns/${armed.moment.momentId}_7_1100000`).get();
    assert.equal((paused.data() as Record<string, unknown>).status,
      "superseded");
  });

test("editing an armed moment drops it back to draft", async () => {
  const db = new FakeFirestore({});
  const {deps} = makeDeps(db);
  const created = await upsertOrganizerMomentHandler(deps, {
    actorUid: "mgr", payload: {...validPayload},
  });
  const armed = await armOrganizerMomentHandler(deps, {
    actorUid: "mgr", scope: programScope,
    momentId: created.moment.momentId,
  });
  const revised = await upsertOrganizerMomentHandler(deps, {
    actorUid: "mgr",
    payload: {...validPayload, momentId: armed.moment.momentId,
      name: "Renamed"},
  });
  assert.equal(revised.moment.status, "draft");
  assert.equal(revised.moment.approval, null);
  assert.equal(revised.moment.name, "Renamed");
  assert.equal(revised.moment.revision, 3);
});

test("scope is immutable and pause/resume preserve approval", async () => {
  const db = new FakeFirestore({});
  const {deps} = makeDeps(db);
  const created = await upsertOrganizerMomentHandler(deps, {
    actorUid: "mgr", payload: {...validPayload},
  });
  await assert.rejects(
    upsertOrganizerMomentHandler(deps, {
      actorUid: "mgr",
      payload: {...validPayload, momentId: created.moment.momentId,
        scope: {kind: "program", programId: "other"}},
    }),
    /scope cannot change/);
  await armOrganizerMomentHandler(deps, {
    actorUid: "mgr", scope: programScope,
    momentId: created.moment.momentId,
  });
  const paused = await pauseOrganizerMomentHandler(deps, {
    actorUid: "mgr", scope: programScope,
    momentId: created.moment.momentId,
  });
  assert.equal(paused.moment.status, "paused");
  const resumed = await resumeOrganizerMomentHandler(deps, {
    actorUid: "mgr", scope: programScope,
    momentId: created.moment.momentId,
  });
  assert.equal(resumed.moment.status, "armed");
  assert.equal(resumed.moment.approval?.approvedByUid, "mgr");
});

test("runOrganizerMomentHandler requires armed + requestKey, fires once",
  async () => {
    const db = new FakeFirestore({});
    db.setDoc("organizerPrograms/prog", {
      organizerId: "org-1", status: "active", capabilities: ["messaging"],
      startsAt: ts(0), endsAt: ts(9_000_000),
    });
    const {deps} = makeDeps(db);
    const created = await upsertOrganizerMomentHandler(deps, {
      actorUid: "mgr",
      payload: {
        scope: programScope, name: "Send now",
        initiation: {kind: "manual"}, sense: "audience",
        audience: {kind: "households", rsvpPendingOnly: false},
        action: {kind: "sendTemplate", connectionId: "conn1",
          templateId: "tpl", variables: {}},
      },
    });
    const runner = {
      firestore: () => db as never,
      nowMillis: () => NOW,
      quietEndMillis: () => null,
      localDayKey: () => "d", localMinuteOfDay: () => 720,
      quietHoursFor: () => null, dailyCapFor: () => 0,
      pushCopyFor: async () => ({title: "t", body: "b"}),
      deliverProgramReminder: async () => ({kind: "sent" as const}),
      deliverAutomationMessage: async () =>
        ({kind: "suppressed" as const, reason: "hostReview" as const}),
      sendPushToUid: async () => {}, writeStaffAttention: async () => {},
      loadConsentFacts: async () => ({}),
    };
    await assert.rejects(
      runOrganizerMomentHandler(deps, runner, {
        actorUid: "mgr", scope: programScope,
        momentId: created.moment.momentId, requestKey: "r1",
      }),
      /armed/);
    await armOrganizerMomentHandler(deps, {
      actorUid: "mgr", scope: programScope,
      momentId: created.moment.momentId,
    });
    const run = await runOrganizerMomentHandler(deps, runner, {
      actorUid: "mgr", scope: programScope,
      momentId: created.moment.momentId, requestKey: "r1",
    });
    assert.ok(run.runId.length > 0);
    const retry = await runOrganizerMomentHandler(deps, runner, {
      actorUid: "mgr", scope: programScope,
      momentId: created.moment.momentId, requestKey: "r1",
    });
    assert.equal(retry.runId, run.runId);
    await assert.rejects(
      runOrganizerMomentHandler(deps, runner, {
        actorUid: "mgr", scope: programScope,
        momentId: created.moment.momentId, requestKey: "",
      }),
      /requestKey/);
  });

test("default authority: manager, communications staff; others denied",
  async () => {
    const grantExpiry = Date.now() + 3_600_000;
    const db = new FakeFirestore({
      "organizers/org-1": {
        hostUserId: "mgr", ownerUserId: "mgr", hostUserIds: ["mgr"],
        hostProfiles: [],
      },
      "organizerPrograms/prog": {
        organizerId: "org-1", status: "active", createdBy: "mgr",
      },
      "programStaffGrants/prog__comms": {
        programId: "prog", organizerId: "org-1", uid: "comms",
        createdBy: "mgr",
        status: "active", expiresAt: ts(grantExpiry),
        duties: [{
          duty: "communications", expiresAtMillis: grantExpiry,
          pickupPointIds: [], hotelIds: [],
        }],
      },
    });
    await requireMomentManageAuthority(
      db as never, programScope, "mgr");
    await requireMomentManageAuthority(
      db as never, programScope, "comms");
    await assert.rejects(
      requireMomentManageAuthority(db as never, programScope, "random"),
      /does not have active program access/);
    await assert.rejects(
      requireMomentManageAuthority(db as never,
        {kind: "event", eventId: "evt"}, "mgr"),
      /EventDocument/);
  });
