import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {createHash, randomUUID} from "node:crypto";
import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import type {OrganizerDocument} from "../shared/generated/firestoreAdminTypes";
import {
  validateControlEventRehearsalCallablePayload,
} from "../shared/generated/validators/controlEventRehearsalInput";
import {
  buildRehearsalActors,
  applyRehearsalBehavior,
  applyRehearsalCues,
  applyRehearsalGuestAction,
  applyRehearsalSpatialAction,
  cuesBetween,
} from "./engine";
import {practiceSession} from "./assistanceTestFixtures";
import {
  practiceAccountabilityView as view,
  resolvePracticeAccountability,
  practiceAccountabilityProjection,
} from "./accountability";
import type {EventRehearsalBootstrapCallableResponse} from
  "../shared/generated/eventRehearsalBootstrapCallableResponse";
import {contractValidator} from "../shared/contractTestValidators";

const validateEventRehearsalBootstrapCallableResponse =
  contractValidator<EventRehearsalBootstrapCallableResponse>(
    "EventRehearsalBootstrapCallableResponse"
  );

function organizer(): OrganizerDocument {
  const fixture = JSON.parse(
    readFileSync("../contracts/fixtures/valid/organizer_doc.json", "utf8")
  );
  const schema = JSON.parse(
    readFileSync("../contracts/firestore/organizers.schema.json", "utf8")
  );
  return {
    ...Object.fromEntries(
      Object.entries(fixture).filter(([k]) => k in schema.properties)
    ),
    followerCount: 0,
    organizerPhotos: [],
    organizerType: "community",
    hostUserIds: ["host-1", "host-2"],
  } as unknown as OrganizerDocument;
}
function harness() {
  const session = practiceSession(1_000_000);
  session.setup.moduleIds.push("accountability");
  const actor = buildRehearsalActors(
    "practice-visit",
    2,
    1,
    session.virtualNow
  )[0];
  const arrived = applyRehearsalBehavior(
    actor,
    "arrive",
    [],
    Timestamp.fromMillis(9_000_000),
    session.virtualNow.toMillis()
  );
  return {
    session,
    actor,
    arrived,
    authority: {actorUid: "host-1", organizer: organizer()},
  };
}
function command(
  row: ReturnType<typeof view>,
  disposition: "returned" | "departed" | "unresolved" = "returned"
) {
  return {
    kind: "resolveAccountability" as const,
    actorId: row.attendeeId,
    expectedSourceHash: row.sourceHash,
    payload: {
      attendeeId: row.attendeeId,
      episodeId: row.episodeId,
      disposition,
    },
  };
}

test("physical arrivals record virtual time, not wall time", () => {
  const h = harness();
  assert.equal(view(h.session, h.actor).availability.kind, "unavailable");
  const row = view(h.session, h.arrived);
  assert.equal(row.checkedInAtMillis, 1_000_000);
  assert.equal(row.visitRevision, 1);
  assert.equal(row.canResolve, true);
  assert.equal(row.disposition, "unresolved");
  const repeated = applyRehearsalGuestAction(
    h.arrived,
    "checkIn",
    Timestamp.fromMillis(10_000_000),
    1_000_000
  );
  assert.deepEqual(repeated.visit, h.arrived.visit);
});

test("an epoch-zero check-in is recorded", () => {
  const session = practiceSession(0);
  const actor = buildRehearsalActors("zero", 2, 1, session.virtualNow)[0];
  const first = applyRehearsalGuestAction(
    actor,
    "checkIn",
    session.virtualNow,
    0
  );
  const second = applyRehearsalGuestAction(
    first,
    "checkIn",
    session.virtualNow,
    0
  );
  assert.equal(second.visit?.attendanceRevision, 1);
});

for (const disposition of ["returned", "departed", "unresolved"] as const) {
  test(disposition + " uses the live visit resolution semantics", () => {
    const h = harness();
    const prior = resolvePracticeAccountability(
      h.session,
      h.arrived,
      command(view(h.session, h.arrived), "returned"),
      h.authority
    );
    const next = resolvePracticeAccountability(
      h.session,
      prior,
      command(view(h.session, prior), disposition),
      h.authority
    );
    assert.equal(view(h.session, next).disposition, disposition);
    assert.equal(next.visit?.accountabilityRevision, 2);
    assert.equal(next.status, h.arrived.status);
    assert.equal(next.layoutUnitId, h.arrived.layoutUnitId);
    assert.equal(next.helpRequested, h.arrived.helpRequested);
    assert.equal(next.visit?.attendanceRevision, 1);
    if (disposition === "unresolved") {
      assert.equal(next.visit?.resolution, null);
    } else assert.equal(next.visit?.resolution?.resolvedBy, "host-1");
  });
}

test("a same-instant leave and return cannot revive old proof", () => {
  const h = harness();
  const original = command(view(h.session, h.arrived));
  const resolved = resolvePracticeAccountability(
    h.session,
    h.arrived,
    original,
    h.authority
  );
  const left = applyRehearsalBehavior(
    resolved,
    "leaveEarly",
    [],
    h.session.virtualNow,
    1_000_000
  );
  assert.equal(view(h.session, left).disposition, "unresolved");
  const returned = applyRehearsalBehavior(
    left,
    "return",
    [],
    h.session.virtualNow,
    1_000_000
  );
  assert.equal(returned.visit?.attendanceRevision, 3);
  assert.equal(
    returned.visit?.checkedInAtMillis,
    resolved.visit?.checkedInAtMillis
  );
  assert.deepEqual(returned.visit?.resolution, resolved.visit?.resolution);
  assert.equal(view(h.session, returned).disposition, "unresolved");
  assert.throws(
    () =>
      resolvePracticeAccountability(
        h.session,
        returned,
        original,
        h.authority
      ),
    {code: "aborted"}
  );
});

test("connectivity, flags and placement preserve visit proof", () => {
  const h = harness();
  const resolved = resolvePracticeAccountability(
    h.session,
    h.arrived,
    command(view(h.session, h.arrived)),
    h.authority
  );
  for (const behavior of [
    "disconnect",
    "reconnect",
    "optOut",
    "optIn",
    "keepApart",
    "arriveLate",
  ] as const) {
    const changed = applyRehearsalBehavior(
      resolved,
      behavior,
      ["actor-1"],
      h.session.virtualNow,
      1_000_000
    );
    assert.equal(
      view(h.session, changed).sourceHash,
      view(h.session, resolved).sourceHash
    );
    assert.equal(view(h.session, changed).disposition, "returned");
  }
  const moved = applyRehearsalSpatialAction(
    resolved,
    "reassign",
    "table-2",
    "pinned",
    2,
    h.session.virtualNow
  );
  assert.equal(
    view(h.session, moved).sourceHash,
    view(h.session, resolved).sourceHash
  );
});

test("legacy presence requires a physical observation", () => {
  const h = harness();
  const {visit, ...legacy} = h.arrived;
  assert.ok(visit);
  assert.deepEqual(view(h.session, legacy).availability, {
    kind: "unavailable",
    reason: "visitNotRecorded",
  });
  const offline = applyRehearsalBehavior(
    legacy,
    "disconnect",
    [],
    h.session.virtualNow
  );
  assert.equal(offline.visit, undefined);
  const observed = applyRehearsalBehavior(
    legacy,
    "arrive",
    [],
    h.session.virtualNow,
    1_000_000
  );
  assert.equal(view(h.session, observed).canResolve, true);
});

test("unavailable and invalid facts cannot be resolved", () => {
  const h = harness();
  const malformed = [
    {
      ...h.arrived,
      visit: {...h.arrived.visit!, checkedInAtMillis: 1_000_001},
    },
    {
      ...h.arrived,
      visit: {...h.arrived.visit!, checkedInAtMillis: null},
    },
    {...h.arrived, status: "disconnected" as const},
  ];
  for (const actor of malformed) {
    assert.deepEqual(view(h.session, actor).availability, {
      kind: "unavailable",
      reason: "invalidSource",
    });
    assert.throws(
      () =>
        resolvePracticeAccountability(
          h.session,
          actor,
          command(view(h.session, actor)),
          h.authority
        ),
      {code: "failed-precondition"}
    );
  }
  const noSweep = {
    ...h.session,
    setup: {...h.session.setup, moduleIds: ["arrival" as const]},
  };
  assert.equal(view(noSweep, h.arrived).canResolve, false);
  assert.throws(
    () =>
      resolvePracticeAccountability(
        noSweep,
        h.arrived,
        command(view(noSweep, h.arrived)),
        h.authority
      ),
    {code: "failed-precondition"}
  );
});

test("decisions require current authority, actor, clock and source", () => {
  const h = harness();
  const c = command(view(h.session, h.arrived));
  assert.throws(
    () =>
      resolvePracticeAccountability(h.session, h.arrived, c, {
        ...h.authority,
        actorUid: "stranger",
      }),
    {code: "permission-denied"}
  );
  for (const changed of [
    {...c, actorId: "other"},
    {...c, payload: {...c.payload, attendeeId: "other"}},
    {...c, payload: {...c.payload, episodeId: null}},
    {...c, expectedSourceHash: "f".repeat(64)},
  ]) {
    assert.throws(
      () =>
        resolvePracticeAccountability(
          h.session,
          h.arrived,
          changed,
          h.authority
        ),
      {code: "aborted"}
    );
  }
  assert.throws(
    () =>
      resolvePracticeAccountability(
        {...h.session, setupRevision: 1},
        h.arrived,
        c,
        h.authority
      ),
    {code: "aborted"}
  );
});

test("follow-up needs a started session and remaining action capacity", () => {
  const h = harness();
  for (const status of ["running", "paused", "complete"] as const) {
    assert.equal(
      view({...h.session, status}, h.arrived).canResolve,
      true
    );
  }
  for (const session of [
    {...h.session, status: "draft" as const},
    {...h.session, actionCount: 500},
  ]) {
    assert.equal(view(session, h.arrived).canResolve, false);
  }
});

test("crossed cues preserve virtual times and visit transitions", () => {
  const h = harness();
  for (let count = 2; count <= 50; count++) {
    const actors = buildRehearsalActors(
      "clock-cues",
      count,
      1,
      h.session.virtualNow
    ).map((a) =>
      applyRehearsalBehavior(
        a,
        "arrive",
        [],
        h.session.virtualNow,
        1_000_000
      )
    );
    const cues = cuesBetween(
      "earlyExitAndReturn",
      1_000_000,
      1_000_000,
      1_000_000 + 40 * 60000,
      count
    );
    const next = applyRehearsalCues(
      actors,
      cues,
      Timestamp.fromMillis(9_000_000),
      1_000_000
    );
    const returned = next[cues[1].actorIndex];
    assert.equal(returned.visit?.attendanceRevision, 3);
    assert.equal(returned.visit?.checkedInAtMillis, 1_000_000 + 32 * 60000);
  }
});

test("Host coverage and commands follow the canonical contract", () => {
  const h = harness();
  const actors = [h.arrived, {...h.actor, actorId: "actor-1"}];
  const projection = practiceAccountabilityProjection(
    "practice-visit",
    h.session,
    actors
  );
  assert.equal(projection.coverage, "boundedSession");
  assert.equal(projection.rows.length, 2);
  assert.throws(
    () =>
      practiceAccountabilityProjection("practice-visit", h.session, [
        h.arrived,
      ]),
    {code: "failed-precondition"}
  );
  assert.throws(
    () => practiceAccountabilityProjection("foreign", h.session, actors),
    {code: "failed-precondition"}
  );
  const input = {
    sessionId: "practice-visit",
    expectedRevision: 1,
    expectedSetupRevision: 0,
    clientActionId: "action-123456",
    action: "assistance",
    assistance: command(view(h.session, h.arrived)),
  };
  assert.equal(validateControlEventRehearsalCallablePayload(input), true);
  assert.equal(
    validateControlEventRehearsalCallablePayload({
      ...input,
      assistance: {
        ...input.assistance,
        payload: {...input.assistance.payload, disposition: "checkedIn"},
      },
    }),
    false
  );
});

test(
  "Firestore isolates visit decisions, retries, rejoining and reset",
  {
    skip: !process.env.FIRESTORE_EMULATOR_HOST,
  },
  async () => {
    const {
      getEventRehearsalGuestBootstrapHandler: guestBootstrap,
      submitEventRehearsalGuestActionHandler: guestAction,
      getEventRehearsalBootstrapHandler: bootstrap,
      injectEventRehearsalBehaviorHandler: behavior,
      controlEventRehearsalHandler: control,
      resetEventRehearsalHandler: reset,
      expireEventRehearsalsHandler: expire,
    } = await import("./handlers.js");
    if (!admin.apps.length) {
      admin.initializeApp({projectId: "demo-catch-rules"});
    }
    const db = getEmulatorFirestore();
    const id = randomUUID();
    const session = practiceSession();
    session.setup.moduleIds.push("accountability");
    session.organizerId = "practice-accountability-" + id;
    session.publicRehearsalId = "public-" + id;
    session.viewerTokenHash = createHash("sha256")
      .update(session.publicRehearsalId)
      .digest("hex");
    const sessionRef = db.collection("eventRehearsals").doc(id);
    const actors = buildRehearsalActors(id, 2, 1, session.virtualNow);
    const batch = db.batch();
    batch.set(
      db.collection("organizers").doc(session.organizerId),
      organizer()
    );
    batch.set(sessionRef, session);
    for (const actor of actors) {
      batch.set(
        db.collection("eventRehearsalActors").doc(id + "_" + actor.actorId),
        actor
      );
    }
    await batch.commit();
    const request = (data: unknown, uid = "host-1") =>
      ({data, auth: {uid, token: {}}}) as Parameters<typeof control>[0];
    const guest = await guestBootstrap(
      request({
        publicRehearsalId: session.publicRehearsalId,
        viewerToken: session.publicRehearsalId,
        clientInstanceId: randomUUID(),
        slotToken: null,
      })
    );
    const arrival = {
      publicRehearsalId: session.publicRehearsalId,
      slotToken: guest.slotToken,
      clientActionId: randomUUID(),
      action: "checkIn",
    };
    const guestView = await guestAction(request(arrival));
    assert.equal("visit" in guestView.actor, false);
    assert.equal("accountabilityReviews" in guestView, false);
    let current = await bootstrap(request({sessionId: id}));
    assert.equal(
      validateEventRehearsalBootstrapCallableResponse(current),
      true
    );
    const row = () =>
      current.accountabilityReviews!.rows.find(
        (r) => r.attendeeId === guest.actor.actorId
      )!;
    const prepare = (
      disposition: "returned" | "departed" | "unresolved"
    ) => ({
      sessionId: id,
      expectedRevision: current.session.runtimeRevision,
      expectedSetupRevision: current.session.setupRevision,
      clientActionId: randomUUID(),
      action: "assistance",
      assistance: command(row(), disposition),
    });
    const first = prepare("returned");
    const count = current.session.actionCount;
    const copies = await Promise.all([
      control(request(first)),
      control(request(first)),
    ]);
    assert.ok(copies.every((v) => v.session.actionCount === count + 1));
    current = copies[0];
    assert.equal(row().disposition, "returned");
    assert.equal(row().revision, 1);
    assert.equal(
      current.actors.find((a) => a.actorId === guest.actor.actorId)!.status,
      "present"
    );
    const stale = prepare("departed");
    current = await behavior(
      request({
        sessionId: id,
        expectedRevision: current.session.runtimeRevision,
        clientActionId: randomUUID(),
        actorId: guest.actor.actorId,
        behavior: "leaveEarly",
        faultId: "none",
      })
    );
    await guestAction(
      request({...arrival, clientActionId: randomUUID()})
    );
    current = await bootstrap(request({sessionId: id}));
    assert.equal(row().visitRevision, 3);
    assert.equal(row().disposition, "unresolved");
    await assert.rejects(
      control(
        request({
          ...stale,
          expectedRevision: current.session.runtimeRevision,
        })
      ),
      {code: "aborted"}
    );
    current = await control(request(first));
    assert.equal(row().disposition, "unresolved");
    assert.equal(row().revision, 1);
    await assert.rejects(
      control(
        request({
          ...first,
          assistance: {
            ...first.assistance,
            payload: {
              ...first.assistance.payload,
              disposition: "departed",
            },
          },
        })
      ),
      {code: "aborted"}
    );
    await assert.rejects(
      control(request(prepare("returned"), "stranger")),
      {code: "permission-denied"}
    );
    current = await control(
      request({
        sessionId: id,
        expectedRevision: current.session.runtimeRevision,
        clientActionId: randomUUID(),
        action: "complete",
      })
    );
    current = await control(request(prepare("departed")));
    assert.equal(row().disposition, "departed");
    current = await control(request(prepare("unresolved")));
    assert.equal(row().disposition, "unresolved");
    assert.equal(row().revision, 3);
    await sessionRef.update({actionCount: 500});
    await assert.rejects(control(request(prepare("returned"))), {
      code: "resource-exhausted",
    });
    await reset(request({sessionId: id, fork: false, seed: null}));
    current = await bootstrap(request({sessionId: id}));
    assert.ok(
      current.accountabilityReviews!.rows.every(
        (r) => r.revision === 0 && r.checkedInAtMillis === null
      )
    );
    await assert.rejects(control(request(first)), {code: "aborted"});
    await sessionRef.update({expiresAt: Timestamp.fromMillis(0)});
    await expire(db, Timestamp.fromMillis(0));
    assert.equal(
      (
        await db
          .collection("eventRehearsalActors")
          .where("sessionId", "==", id)
          .get()
      ).empty,
      true
    );
    await db.collection("organizers").doc(session.organizerId).delete();
  }
);
