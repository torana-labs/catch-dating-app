import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {organizerCommunicationPreferenceId} from
  "../shared/organizerCommunicationPreferences";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {getOrganizerContactDetailHandler} from "./organizerContacts";
import {AudienceTestStore} from "./organizerAudienceTestStore";

const operationalCollections = [
  "organizerCampaignRecipients", "organizerBroadcastSummaries",
  "organizerManualSendTasks", "organizerWhatsappMessages",
  "organizerContactMergeReceipts", "organizerContactOutreach",
];

function harness(includeHistory?: boolean) {
  const collections: string[] = [];
  const store = new AudienceTestStore({
    "organizers/org-1": {ownerUserId: "host-1", hostUserIds: ["host-1"],
      hostProfiles: []},
    "organizerContacts/person": {organizerId: "org-1", contactId: "person",
      displayName: "Ananya", displayNameOverride: null, linkedUid: null,
      phoneE164: null, email: null, identityState: "unlinked",
      identityConfidence: "eventOnly", ambiguousCandidateContactIds: [],
      manualTagIds: [], deletedAt: null, hiddenAt: null, revision: 1},
    "organizerContactTraits/person": {organizerId: "org-1",
      expectedEventCount: 0, attendedEventCount: 0, cancelledEventCount: 0,
      noShowCount: 0, importedEventCount: 0, attendanceRate: null,
      segmentIds: [], whatsappStatus: "unknown", smsStatus: "unknown",
      sourceCoverage: "exact"},
  });
  const collection = store.collection.bind(store);
  store.collection = (name) => {
    collections.push(name);
    return collection(name);
  };
  const request = {auth: {uid: "host-1"}, data: {organizerId: "org-1",
    contactId: "person", ...(includeHistory === undefined ? {} :
      {includeHistory})}} as CallableRequest<unknown>;
  const deps = {firestore: () => store.asFirestore(),
    checkRateLimit: async () => undefined, identitySecret: () => "unused"};
  return {store, collections, request, deps};
}

test("overview skips history reads and retains customer facts", async () => {
  const h = harness(false);
  const result = await getOrganizerContactDetailHandler(h.request, h.deps);
  assert.equal(result.displayName, "Ananya");
  assert.equal(result.historyLoaded, false);
  assert.deepEqual(result.timeline, []);
  assert.equal(result.timelineCoverage.events, "unavailable");
  for (const name of operationalCollections) {
    assert.equal(h.collections.includes(name), false, `${name} was read`);
  }
  assert.ok(h.collections.includes("organizerContactEventEdges"));
  assert.ok(h.collections.includes("organizerContactNotes"));
});

test("legacy and explicit history requests read operations", async () => {
  for (const includeHistory of [undefined, true]) {
    const h = harness(includeHistory);
    const result = await getOrganizerContactDetailHandler(h.request, h.deps);
    assert.equal(result.historyLoaded, true);
    for (const name of operationalCollections) {
      assert.ok(h.collections.includes(name), `${name} was omitted`);
    }
  }
});

test("deferred overview keeps cross-organizer access closed", async () => {
  const h = harness(false);
  h.store.docs["organizerContacts/person"].organizerId = "other";
  await assert.rejects(getOrganizerContactDetailHandler(h.request, h.deps),
    (error: unknown) => error instanceof HttpsError &&
      error.code === "not-found");
});

// Observe actual reads on this fixture only, including query limits. Wrapping
// chain results leaves the shared store and its query semantics unchanged.
type ContactRead = {kind: "document" | "query"; path: string;
  cap?: number; returned?: number} |
  {kind: "getAll"; paths: string[]};

function observeReads(store: AudienceTestStore,
  beforeRead: (read: ContactRead) => void | Promise<void> = () => undefined
): ContactRead[] {
  const reads: ContactRead[] = [];
  const invoke = <T>(read: ContactRead, operation: () => Promise<T>) => {
    reads.push(read);
    const pending = beforeRead(read);
    return pending ? pending.then(operation) : operation();
  };
  const wrap = <T extends object>(target: T): T => new Proxy(target, {
    get(object, key) {
      const value: unknown = Reflect.get(object, key);
      if (typeof value !== "function") return value;
      if (key === "get") {
        return () => {
          const query = "cap" in object;
          const read: ContactRead = {
            kind: query ? "query" : "document",
            path: String(Reflect.get(object, "path")),
            ...(query ? {cap: Number(Reflect.get(object, "cap"))} : {}),
          };
          return invoke(read, async () => {
            const snapshot = await Reflect.apply(value, object, []);
            if (read.kind === "query") read.returned = snapshot.size;
            return snapshot;
          });
        };
      }
      if (["doc", "where", "orderBy", "limit", "startAfter"]
        .includes(String(key))) {
        return (...args: unknown[]) => wrap(Reflect.apply(value, object, args));
      }
      return value.bind(object);
    },
  });
  const collection = store.collection.bind(store);
  store.collection = (name) => wrap(collection(name));
  const getAll = store.getAll.bind(store);
  store.getAll = (...refs) => invoke({kind: "getAll",
    paths: refs.map((ref) => ref.path)}, () => getAll(...refs));
  return reads;
}

function linkedHarness(includeHistory?: boolean) {
  const h = harness(includeHistory);
  const now = Timestamp.fromMillis(1000);
  Object.assign(h.store.docs["organizerContacts/person"], {
    linkedUid: "guest-1", identityState: "verified",
  });
  const edge = {organizerId: "org-1", contactId: "person", eventId: "event-1",
    attendeeId: "attendee-1", source: "catch", status: "checkedIn",
    expected: true, registered: true, cancelled: false, checkedIn: true,
    eventStartAt: now, eventEndAt: now, registeredAt: now,
    cancelledAt: null, checkedInAt: now};
  h.store.docs["organizerContactEventEdges/edge-1"] = edge;
  h.store.docs["organizerContactEventEdges/edge-2"] = {
    ...edge, attendeeId: "attendee-2",
  };
  h.store.docs["events/event-1"] = {organizerId: "org-1", name: "Morning Run"};
  h.store.docs["guestPayments/payment-1"] = {purpose: "booking",
    userId: "guest-1", eventId: "event-1",
    status: "completed", amountMinor: 5000, currency: "INR"};
  const preferencePath = "organizerCommunicationPreferences/" +
    organizerCommunicationPreferenceId("org-1", "guest-1");
  h.store.docs[preferencePath] = {organizerId: "org-1", uid: "guest-1",
    whatsapp: {status: "optedOut", evidenceStatus: "complete",
      currentReceiptId: null, source: "publicRegistration", updatedAt: now}};
  return {...h, preferencePath, now, edge};
}

for (const includeHistory of [false, true, undefined]) {
  test(`contact enrichment starts independent reads: ${includeHistory}`,
    async () => {
      const h = linkedHarness(includeHistory);
      let release!: () => void;
      let entered!: () => void;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      const started = new Promise<void>((resolve) => {
        entered = resolve;
      });
      const reads = observeReads(h.store, (read) => {
        if (read.kind === "getAll") {
          entered();
          return held;
        }
        return undefined;
      });
      const pending = getOrganizerContactDetailHandler(h.request, h.deps);
      try {
        await Promise.race([started, pending.then(() => {
          throw new Error("Contact completed without event hydration");
        })]);
        assert.ok(reads.some((read) => read.kind === "query" &&
          read.path === "guestPayments"), "payment query did not start");
        assert.ok(reads.some((read) => read.kind === "document" &&
          read.path === h.preferencePath), "preference read did not start");
      } finally {
        release();
        await pending;
      }
    });
}

test("overview and history preserve enrichment payloads and read budgets",
  async () => {
    const results = [];
    for (const mode of [false, true, undefined]) {
      const h = linkedHarness(mode);
      const reads = observeReads(h.store);
      const result = await getOrganizerContactDetailHandler(h.request, h.deps);
      results.push(result);
      assert.equal(reads.filter((read) => read.kind === "document").length, 6);
      assert.equal(reads.filter((read) => read.kind === "query").length,
        mode === false ? 4 : 11);
      assert.deepEqual(reads.filter((read) => read.kind === "getAll"),
        [{kind: "getAll", paths: ["events/event-1"]}]);
      assert.equal(result.events.length, 2);
      assert.equal(result.events[0].displayName, "Morning Run");
      assert.equal(result.revenue.amounts[0].amountMinor, 5000);
      assert.equal(result.events[0].revenues[0].amountMinor, 5000);
      assert.deepEqual(result.whatsappPermission, {status: "optedOut",
        evidenceStatus: "complete", receiptId: null,
        source: "publicRegistration", sourceFormId: null,
        sourceFormTitle: null, decisionAtMillis: 1000,
        identityStrength: null, purposes: {}});
      assert.equal(result.timeline.length, mode === false ? 0 : 2);
    }
    assert.deepEqual(results[1], results[2]);
    for (const key of ["events", "revenue", "whatsappPermission", "origins",
      "notes", "traits"] as const) {
      assert.deepEqual(results[0][key], results[1][key], key);
    }
  });

test("contact enrichment retains bounded queries and truncation markers",
  async () => {
    const h = linkedHarness(false);
    for (let index = 0; index < 501; index++) {
      h.store.docs[`guestPayments/payment-${index}`] = {
        ...h.store.docs["guestPayments/payment-1"],
      };
      if (index < 101) {
        h.store.docs[`organizerContactEventEdges/edge-${index}`] = h.edge;
        h.store.docs[`organizerContactNotes/note-${index}`] = {
          organizerId: "org-1", contactId: "person", body: "Memory",
          authorUid: "host-1", createdAt: h.now, updatedAt: h.now, revision: 1,
        };
      }
      if (index < 51) {
        h.store.docs[`organizerContactOrigins/origin-${index}`] = {
          organizerId: "org-1", currentContactId: "person",
          sourceKind: "hostManual", sourceEntityKind: "contact",
          formId: null, eventId: null, observedAt: h.now,
        };
      }
    }
    const reads = observeReads(h.store);
    const result = await getOrganizerContactDetailHandler(h.request, h.deps);
    assert.deepEqual(reads.flatMap((read) => read.kind === "query" ?
      [[read.path, read.cap, read.returned]] : []).sort(), [
      ["guestPayments", 501, 501],
      ["organizerContactEventEdges", 101, 101],
      ["organizerContactNotes", 101, 101],
      ["organizerContactOrigins", 51, 51],
    ]);
    assert.equal(reads.length, 11);
    assert.deepEqual(reads.filter((read) => read.kind === "getAll"),
      [{kind: "getAll", paths: ["events/event-1"]}]);
    assert.equal(result.events.length, 100);
    assert.equal(result.notes?.length, 100);
    assert.equal(result.origins.length, 50);
    assert.equal(result.eventsTruncated, true);
    assert.equal(result.notesTruncated, true);
    assert.equal(result.originsTruncated, true);
    assert.equal(result.revenue.coverage, "partial");
    assert.equal(result.revenue.amounts[0].amountMinor, 500 * 5000);
  });

test("authorization and inactive or foreign contacts cannot start enrichment",
  async () => {
    for (const failure of ["auth", "manager", "scope", "traits", "hidden",
      "deleted", "merged"] as const) {
      const h = linkedHarness(false);
      if (failure === "auth") delete h.request.auth;
      if (failure === "manager") h.request.auth!.uid = "outsider";
      const contact = h.store.docs["organizerContacts/person"];
      if (failure === "scope") contact.organizerId = "other";
      if (failure === "traits") {
        h.store.docs["organizerContactTraits/person"].organizerId = "other";
      }
      if (failure === "hidden") contact.hiddenAt = h.now;
      if (failure === "deleted") contact.deletedAt = h.now;
      if (failure === "merged") contact.identityState = "merged";
      const reads = observeReads(h.store);
      await assert.rejects(getOrganizerContactDetailHandler(h.request, h.deps),
        (error: unknown) => error instanceof HttpsError &&
          error.code === (failure === "auth" ? "unauthenticated" :
            failure === "manager" ? "permission-denied" : "not-found"));
      assert.equal(reads.some((read) => read.kind === "getAll" ||
        read.path === "guestPayments" ||
        read.path === h.preferencePath), false);
      if (failure === "auth") assert.deepEqual(reads, []);
      if (failure === "manager") {
        assert.deepEqual(reads, [{kind: "document", path: "organizers/org-1"}]);
      }
    }
  });

test("optional permission failure preserves detail; payment failure is fatal",
  async () => {
    const h = linkedHarness(false);
    observeReads(h.store, (read) => {
      if (read.kind === "document" && read.path === h.preferencePath) {
        return Promise.reject(new Error("preference unavailable"));
      }
      return undefined;
    });
    const result = await getOrganizerContactDetailHandler(h.request, h.deps);
    assert.equal(result.whatsappPermission.evidenceStatus, "unavailable");
    assert.equal(result.revenue.amounts[0].amountMinor, 5000);
    assert.equal(result.events.length, 2);

    const fatal = linkedHarness(false);
    const paymentError = new Error("payment unavailable");
    observeReads(fatal.store, (read) => {
      if (read.kind === "query" && read.path === "guestPayments") {
        return Promise.reject(paymentError);
      }
      return undefined;
    });
    await assert.rejects(
      getOrganizerContactDetailHandler(fatal.request, fatal.deps),
      (error: unknown) => error === paymentError);
  });
