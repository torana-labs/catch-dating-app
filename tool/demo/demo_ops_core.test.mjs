import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  suvbotWorldBundlePath,
  suvbotWorldBundleSource,
} from "../../functions/scripts/generate-suvbot-worlds.mjs";
import {
  buildCheckInEventPlan,
  buildDemoChecklist,
  buildHostAccountPlan,
  buildLaunchCleanupPlan,
  buildStaleEventCleanupPlan,
  buildValidateDemoStateReport,
  isDemoOwned,
  matchIdFor,
  normalizePhone,
} from "./demo_ops_core.mjs";

const fakeAdmin = {
  firestore: {
    Timestamp: {
      fromDate: (date) => ({
        ...fakeTimestamp(date.toISOString()),
        iso: date.toISOString(),
      }),
    },
  },
};

test("normalizePhone requires E.164 input", () => {
  assert.equal(normalizePhone("+919876543210"), "+919876543210");
  assert.equal(normalizePhone("+91 98765 43210"), "+919876543210");
  assert.throws(() => normalizePhone("9876543210"), /Invalid E.164/);
});

test("matchIdFor is deterministic and rejects self matches", () => {
  assert.equal(matchIdFor("b", "a"), "a_b");
  assert.equal(matchIdFor("a", "b"), "a_b");
  assert.throws(() => matchIdFor("a", "a"), /distinct/);
});

test("validate report surfaces demo readiness gaps", async () => {
  const db = fakeFirestore({
    users: {
      uid_a: {phoneNumber: "+910000000001"},
    },
    publicProfiles: {
      uid_a: {name: "Asha"},
    },
    matches: {},
    eventParticipations: {},
    savedEvents: {},
    payments: {},
    profileDecisions: {uid_a: {outgoing: {}}},
    notifications: {uid_a: {items: {}}},
  });

  const report = await buildValidateDemoStateReport({db, phone: "+910000000001"});

  assert.equal(report.demoReady, false);
  assert.match(report.issues.join(" "), /Fewer than 3 active matches/);
});

test("buildDemoChecklist converts validation counts into capabilities", async () => {
  const db = fakeFirestore({
    users: {
      uid_a: {phoneNumber: "+910000000001"},
    },
    publicProfiles: {
      uid_a: {name: "Asha"},
    },
    matches: {
      match_1: {
        participantIds: ["uid_a", "uid_b"],
        status: "active",
        messages: {message_1: {text: "Hi"}},
      },
    },
    eventParticipations: {
      run_1_uid_a: {uid: "uid_a", eventId: "run_1", status: "attended"},
      run_checkin_uid_a: {
        uid: "uid_a",
        eventId: "run_checkin",
        status: "signedUp",
      },
    },
    events: {
      run_checkin: {
        status: "active",
        startTime: "2026-05-12T12:05:00.000Z",
        startingPointLat: 28.6129,
        startingPointLng: 77.2295,
      },
    },
    savedEvents: {
      saved_1: {uid: "uid_a"},
    },
    payments: {
      payment_1: {userId: "uid_a"},
    },
    profileDecisions: {uid_a: {outgoing: {}}},
    notifications: {uid_a: {items: {n1: {}}}},
  });
  for (const event of Object.values(db.data.events)) {
    event.startTime = fakeTimestamp(event.startTime);
  }

  const checklist = await buildDemoChecklist({
    db,
    phone: "+910000000001",
    now: new Date("2026-05-12T12:00:00.000Z"),
  });

  assert(checklist.canDemo.includes("chat thread"));
  assert(checklist.canDemo.includes("payment history"));
  assert(checklist.canDemo.includes("event map pins"));
  assert(checklist.canDemo.includes("location-gated self check-in"));
  assert.equal(checklist.gaps.length, 0);
});

test("buildLaunchCleanupPlan finds demo-owned top-level and nested docs", async () => {
  const db = fakeFirestore({
    users: {
      demo_ops_2026_user: {},
      real_user: {},
    },
    eventCrossPathsConsents: {
      demo_beta_2026_event_demo_beta_2026_candidate: {
        eventId: "demo_beta_2026_event",
        uid: "demo_beta_2026_candidate",
      },
      real_event_real_user: {eventId: "real_event", uid: "real_user"},
    },
    crossPathsShowcaseEligibility: {
      demo_beta_2026_candidate: {status: "eligible"},
      real_user: {status: "eligible"},
    },
    matches: {
      match_1: {
        demoOps: true,
        messages: {
          message_1: {},
        },
      },
    },
    profileDecisions: {
      real_user: {
        outgoing: {
          demo_ops_2026_user: {targetId: "demo_ops_2026_user"},
          other: {targetId: "other"},
        },
      },
    },
    notifications: {
      real_user: {
        items: {
          demo: {matchId: "demo_ops_2026_match"},
          real: {},
        },
      },
    },
  });

  const plan = await buildLaunchCleanupPlan({db});

  assert.deepEqual(plan.paths, [
    "crossPathsShowcaseEligibility/demo_beta_2026_candidate",
    "eventCrossPathsConsents/demo_beta_2026_event_demo_beta_2026_candidate",
    "matches/match_1",
    "matches/match_1/messages/message_1",
    "notifications/real_user/items/demo",
    "profileDecisions/real_user/outgoing/demo_ops_2026_user",
    "users/demo_ops_2026_user",
  ]);
});

test("buildLaunchCleanupPlan deletes synthetic organizers but preserves one QA seed", async () => {
  const db = fakeFirestore({
    users: {
      demo_beta_2026_user: {synthetic: true, seedPrefix: "demo_beta_2026"},
      cross_paths_mumbai_qa_user_002: {
        synthetic: true,
        seedPrefix: "cross_paths_mumbai_qa",
      },
    },
    organizers: {
      demo_beta_2026_club: {synthetic: true, seedPrefix: "demo_beta_2026"},
      cross_paths_mumbai_qa_club: {
        synthetic: true,
        seedPrefix: "cross_paths_mumbai_qa",
      },
    },
    eventCrossPathsConsents: {
      old: {synthetic: true, eventId: "demo_beta_2026_event"},
      kept: {synthetic: true, eventId: "cross_paths_mumbai_qa_event"},
    },
    notifications: {
      real_user: {
        items: {
          old: {synthetic: true, eventId: "demo_beta_2026_event"},
          kept: {synthetic: true, eventId: "cross_paths_mumbai_qa_event"},
        },
      },
    },
  });

  const plan = await buildLaunchCleanupPlan({
    db,
    keepSeedPrefixes: ["cross_paths_mumbai_qa"],
  });

  assert.deepEqual(plan.paths, [
    "eventCrossPathsConsents/old",
    "notifications/real_user/items/old",
    "organizers/demo_beta_2026_club",
    "users/demo_beta_2026_user",
  ]);
  assert.deepEqual(plan.keepSeedPrefixes, ["cross_paths_mumbai_qa"]);
});

test("buildStaleEventCleanupPlan removes stale seeded events and their edges", async () => {
  const db = fakeFirestore({
    events: {
      demo_past: {
        seedPrefix: "demo_beta_2026",
        status: "active",
        startTime: "2026-05-10T06:00:00.000Z",
      },
      demo_cancelled: {
        seedPrefix: "demo_beta_2026",
        status: "cancelled",
        startTime: "2026-05-20T06:00:00.000Z",
      },
      demo_future: {
        seedPrefix: "demo_beta_2026",
        status: "active",
        startTime: "2026-05-20T06:00:00.000Z",
      },
      real_past: {
        status: "active",
        startTime: "2026-05-10T06:00:00.000Z",
      },
    },
    eventParticipations: {
      p1: {eventId: "demo_past"},
      p2: {eventId: "demo_future"},
    },
    clubScheduleLocks: {
      club_lock: {eventId: "demo_past"},
    },
    userEventScheduleLocks: {
      user_lock: {eventId: "demo_cancelled"},
    },
    savedEvents: {
      saved: {eventId: "demo_past"},
    },
    payments: {
      payment: {eventId: "demo_past"},
    },
    reviews: {
      review: {eventId: "demo_past"},
    },
    matches: {
      match_1: {
        demoOps: true,
        eventIds: ["demo_past"],
        messages: {m1: {}},
      },
      match_2: {
        eventIds: ["demo_past"],
        messages: {m2: {}},
      },
    },
    profileDecisions: {
      uid_a: {
        outgoing: {
          uid_b: {eventId: "demo_past"},
          uid_c: {eventId: "demo_future"},
        },
      },
    },
    notifications: {
      uid_a: {
        items: {
          run_note: {eventId: "demo_past"},
          match_note: {matchId: "match_1"},
          future_note: {eventId: "demo_future"},
        },
      },
    },
  });
  for (const event of Object.values(db.data.events)) {
    event.startTime = fakeTimestamp(event.startTime);
  }

  const plan = await buildStaleEventCleanupPlan({
    db,
    now: new Date("2026-05-12T12:00:00.000Z"),
  });

  assert.deepEqual(plan.staleEventIds, ["demo_cancelled", "demo_past"]);
  assert.deepEqual([...plan.paths].sort(), [
    "clubScheduleLocks/club_lock",
    "eventParticipations/p1",
    "events/demo_cancelled",
    "events/demo_past",
    "matches/match_1",
    "matches/match_1/messages/m1",
    "notifications/uid_a/items/match_note",
    "notifications/uid_a/items/run_note",
    "payments/payment",
    "reviews/review",
    "savedEvents/saved",
    "profileDecisions/uid_a/outgoing/uid_b",
    "userEventScheduleLocks/user_lock",
  ].sort());
});

test("buildCheckInEventPlan creates a signed-up event inside the check-in window", async () => {
  const db = fakeFirestore({
    users: {
      uid_a: {
        phoneNumber: "+910000000001",
        city: "in-dl-delhi-ncr",
        gender: "woman",
      },
    },
    publicProfiles: {
      uid_a: {name: "Asha"},
    },
    eventParticipations: {},
    events: {},
  });

  const plan = await buildCheckInEventPlan({
    db,
    admin: fakeAdmin,
    phone: "+910000000001",
    latitude: 28.6129,
    longitude: 77.2295,
    meetingPoint: "India Gate",
    now: new Date("2026-05-12T12:00:00.000Z"),
  });

  assert.equal(plan.eventId, "demo_ops_2026_checkin_run_uid_a");
  assert.equal(plan.checkInWindowOpensAt, "2026-05-12T11:55:00.000Z");
  const eventDoc = plan.docs.find((doc) => doc.path === `events/${plan.eventId}`);
  assert.equal(eventDoc.data.startingPointLat, 28.6129);
  assert.equal(eventDoc.data.startingPointLng, 77.2295);
  assert.deepEqual(eventDoc.data.meetingLocation, {
    name: "India Gate",
    address: null,
    placeId: null,
    latitude: 28.6129,
    longitude: 77.2295,
    notes: "Demo check-in event. The check-in window is already open.",
  });
  assert.equal(eventDoc.data.bookedCount, 1);
  assert.equal(
    plan.docs.some((doc) => doc.path === `eventParticipations/${plan.eventId}_uid_a`),
    true
  );
});

test("buildHostAccountPlan requires and mirrors an exact event location", async () => {
  const db = fakeFirestore({
    users: {
      uid_a: {
        phoneNumber: "+910000000001",
        city: "in-dl-delhi-ncr",
        gender: "woman",
      },
    },
    publicProfiles: {uid_a: {name: "Asha"}},
  });

  const plan = await buildHostAccountPlan({
    db,
    admin: fakeAdmin,
    phone: "+910000000001",
    latitude: 28.6129,
    longitude: 77.2295,
    meetingPoint: " India Gate ",
    now: new Date("2026-05-12T12:00:00.000Z"),
  });
  const eventDoc = plan.docs.find((doc) => doc.path === `events/${plan.eventId}`);
  assert.equal(eventDoc.data.meetingPoint, "India Gate");
  assert.equal(eventDoc.data.startingPointLat, 28.6129);
  assert.equal(eventDoc.data.startingPointLng, 77.2295);
  assert.deepEqual(eventDoc.data.meetingLocation, {
    name: "India Gate",
    address: null,
    placeId: null,
    latitude: 28.6129,
    longitude: 77.2295,
    notes: "Demo host event created by demo ops.",
  });

  await assert.rejects(
    buildHostAccountPlan({
      db,
      admin: fakeAdmin,
      phone: "+910000000001",
      now: new Date("2026-05-12T12:00:00.000Z"),
    }),
    /requires valid --lat\/--lng/
  );
});

test("isDemoOwned recognizes all supported demo markers", () => {
  assert.equal(isDemoOwned({demoOps: true}), true);
  assert.equal(isDemoOwned({synthetic: true}), true);
  assert.equal(isDemoOwned({seedPrefix: "demo_beta_2026"}), true);
  assert.equal(isDemoOwned({demoOpsEntityType: "matchThread"}), false);
  assert.equal(isDemoOwned({}), false);
});

function fakeFirestore(initialData) {
  const data = structuredClone(initialData);
  return {
    data,
    collection: (collectionName) => collectionRef(data, collectionName),
    collectionGroup: (collectionId) => collectionGroupQuery(data, collectionId),
  };
}

function fakeTimestamp(iso) {
  const date = new Date(iso);
  return {
    toDate: () => new Date(date),
    toMillis: () => date.getTime(),
  };
}

function collectionRef(data, collectionName) {
  return {
    doc: (id) => documentRef(data, `${collectionName}/${id}`),
    where: (field, op, value) => query(data, collectionName, [{field, op, value}]),
    limit: () => collectionRef(data, collectionName),
    get: async () => querySnapshot(data, collectionName, []),
  };
}

function query(data, collectionName, filters) {
  return {
    where: (field, op, value) => query(data, collectionName, [...filters, {field, op, value}]),
    limit: () => query(data, collectionName, filters),
    get: async () => querySnapshot(data, collectionName, filters),
  };
}

function collectionGroupQuery(data, collectionId, filters = []) {
  return {
    where: (field, op, value) => collectionGroupQuery(data, collectionId, [...filters, {field, op, value}]),
    get: async () => {
      const entries = [];
      for (const [parentId, parent] of Object.entries(
        data.profileDecisions ?? {}
      )) {
        const nested = parent[collectionId] ?? {};
        for (const [docId, value] of Object.entries(nested)) {
          entries.push({
            id: docId,
            ref: {
              path: `profileDecisions/${parentId}/${collectionId}/${docId}`,
            },
            data: () => structuredClone(value),
          });
        }
      }
      return snapshot(entries.filter((doc) => matchesFilters(doc.data(), filters)));
    },
  };
}

function querySnapshot(data, collectionName, filters) {
  const docs = Object.entries(data[collectionName] ?? {})
    .map(([id, value]) => docSnapshot(`${collectionName}/${id}`, id, value))
    .filter((doc) => matchesFilters(doc.data(), filters));
  return snapshot(docs);
}

function documentRef(data, documentPath) {
  return {
    path: documentPath,
    get: async () => {
      const value = readPath(data, documentPath);
      return {
        exists: value !== undefined,
        id: documentPath.split("/").at(-1),
        ref: {path: documentPath},
        data: () => structuredClone(value),
      };
    },
    collection: (collectionName) => nestedCollectionRef(data, documentPath, collectionName),
  };
}

function nestedCollectionRef(data, documentPath, collectionName) {
  return {
    get: async () => {
      const parent = readPath(data, documentPath) ?? {};
      const docs = Object.entries(parent[collectionName] ?? {})
        .map(([id, value]) =>
          docSnapshot(`${documentPath}/${collectionName}/${id}`, id, value)
        );
      return snapshot(docs);
    },
  };
}

function docSnapshot(path, id, value) {
  return {
    id,
    ref: {
      path,
      collection: (collectionName) => nestedCollectionRefFromValue(path, value, collectionName),
    },
    data: () => cloneValue(value),
  };
}

function nestedCollectionRefFromValue(documentPath, value, collectionName) {
  return {
    get: async () => snapshot(
      Object.entries(value[collectionName] ?? {})
        .map(([id, doc]) =>
          docSnapshot(`${documentPath}/${collectionName}/${id}`, id, doc)
        )
    ),
  };
}

function snapshot(docs) {
  return {
    docs,
    size: docs.length,
    empty: docs.length === 0,
  };
}

function matchesFilters(value, filters) {
  return filters.every(({field, op, value: expected}) => {
    const actual = value[field];
    if (op === "==") return actual === expected;
    if (op === "array-contains") return Array.isArray(actual) && actual.includes(expected);
    throw new Error(`Unsupported fake query op ${op}`);
  });
}

function readPath(data, documentPath) {
  const parts = documentPath.split("/");
  let cursor = data;
  for (const part of parts) {
    cursor = cursor?.[part];
    if (cursor === undefined) return undefined;
  }
  return cursor;
}

function cloneValue(value) {
  try {
    return structuredClone(value);
  } catch (_) {
    return value;
  }
}

// Suvbot starts demo worlds from a copy bundled into Functions. A world or
// persona change must regenerate it, or Suvbot would start a stale world.
test("the Suvbot world bundle matches the scenario and persona files", async () => {
  assert.equal(
    fs.readFileSync(suvbotWorldBundlePath, "utf8"),
    await suvbotWorldBundleSource(),
    "Run: node functions/scripts/generate-suvbot-worlds.mjs"
  );
});
