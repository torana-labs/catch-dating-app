import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import type {ImportEventAttendeesCallablePayload} from
  "../shared/generated/importEventAttendeesCallablePayload";
import {
  attendanceReceiptId,
  eventAttendeeId,
  importEventAttendeesForHost,
  mergeOrganizerCommunicationPreference,
  normalizeRosterPhone,
  onboardingDraftSeed,
  prepareImportRows,
  publicRegistrationStatus,
  registerPublicEventHandler,
  setEventAttendeeAttendanceHandler,
} from "./eventAttendees";
import {deriveEventSeatPolicy} from "./seatAuthority/firestoreAdapter";
import {seatIdentityAliasId, seatIdentityValueHash} from
  "./seatIdentityAuthority";

type FakeData = Record<string, unknown>;

class FakeSnapshot {
  constructor(
    readonly ref: FakeDocRef,
    private readonly value: FakeData | undefined
  ) {}
  get id() {
    return this.ref.path.split("/").at(-1)!;
  }
  get exists() {
    return this.value !== undefined;
  }
  data() {
    return this.value;
  }
}

class FakeDocRef {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}
  get id() {
    return this.path.split("/").at(-1)!;
  }
  async get() {
    return new FakeSnapshot(this, this.firestore.get(this.path));
  }
}

class FakeCollectionRef {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}
  doc(id: string) {
    return new FakeDocRef(this.firestore, `${this.path}/${id}`);
  }
  where(field: string, _operator: string, value: unknown) {
    return new FakeQuery(this.firestore, this.path, [[field, value]]);
  }
}

class FakeQuery {
  constructor(private readonly firestore: FakeFirestore,
    private readonly path: string,
    private readonly filters: Array<[string, unknown]>,
    private readonly max = Infinity) {}
  where(field: string, _operator: string, value: unknown) {
    return new FakeQuery(this.firestore, this.path,
      [...this.filters, [field, value]], this.max);
  }
  limit(max: number) {
    return new FakeQuery(this.firestore, this.path, this.filters, max);
  }
  docs() {
    return this.firestore.entries(this.path).filter(([, value]) =>
      this.filters.every(([field, expected]) => value[field] === expected))
      .slice(0, this.max).map(([id, value]) =>
        new FakeSnapshot(new FakeDocRef(this.firestore,
          `${this.path}/${id}`), value));
  }
}

class FakeTransaction {
  private readonly writes: Array<() => void> = [];
  private readonly reads = new Map<string, number>();
  constructor(private readonly firestore: FakeFirestore) {}
  async get(ref: FakeDocRef | FakeQuery): Promise<FakeSnapshot | {
    docs: FakeSnapshot[]; size: number}> {
    if (ref instanceof FakeQuery) {
      const docs = ref.docs();
      for (const doc of docs) {
        this.reads.set(doc.ref.path, this.firestore.version(doc.ref.path));
      }
      return {docs, size: docs.length};
    }
    const value = this.firestore.get(ref.path);
    this.reads.set(ref.path, this.firestore.version(ref.path));
    this.firestore.afterRead?.(ref.path);
    return new FakeSnapshot(ref, value);
  }
  update(ref: FakeDocRef, data: FakeData) {
    this.writes.push(() => this.firestore.update(ref.path, data));
  }
  create(ref: FakeDocRef, data: FakeData) {
    this.writes.push(() => this.firestore.create(ref.path, data));
  }
  set(ref: FakeDocRef, data: FakeData) {
    this.writes.push(() => this.firestore.set(ref.path, data));
  }
  commit() {
    for (const [path, version] of this.reads) {
      if (this.firestore.version(path) !== version) {
        throw new TransactionConflict();
      }
    }
    for (const write of this.writes) write();
  }
}

class TransactionConflict extends Error {}

class FakeFirestore {
  afterRead: ((path: string) => void) | null = null;
  private readonly versions = new Map<string, number>();
  constructor(private readonly docs: Record<string, FakeData | undefined>) {}
  collection(path: string) {
    return new FakeCollectionRef(this, path);
  }
  get(path: string) {
    return this.docs[path];
  }
  entries(collection: string): Array<[string, FakeData]> {
    return Object.entries(this.docs).filter(([path, value]) =>
      path.startsWith(`${collection}/`) &&
      !path.slice(collection.length + 1).includes("/") && value !== undefined)
      .map(([path, value]) => [path.slice(collection.length + 1),
        value as FakeData]);
  }
  version(path: string) {
    return this.versions.get(path) ?? 0;
  }
  private bump(path: string) {
    this.versions.set(path, this.version(path) + 1);
  }
  update(path: string, data: FakeData) {
    const existing = this.docs[path];
    if (!existing) throw new Error(`Document missing: ${path}`);
    this.docs[path] = {...existing, ...data};
    this.bump(path);
  }
  create(path: string, data: FakeData) {
    if (this.docs[path]) throw new Error(`Document exists: ${path}`);
    this.docs[path] = {...data};
    this.bump(path);
  }
  set(path: string, data: FakeData) {
    this.docs[path] = {...data};
    this.bump(path);
  }
  async runTransaction<T>(callback: (tx: FakeTransaction) => Promise<T>) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const tx = new FakeTransaction(this);
      const result = await callback(tx);
      try {
        tx.commit();
        return result;
      } catch (error) {
        if (!(error instanceof TransactionConflict)) throw error;
      }
    }
    throw new TransactionConflict();
  }
}

function attendanceRequest(data: Record<string, unknown>) {
  return {
    auth: {uid: "host-1", token: {}},
    data,
    rawRequest: {},
  } as CallableRequest<unknown>;
}

test("normalizeRosterPhone accepts E.164 and Indian local numbers", () => {
  assert.deepEqual(normalizeRosterPhone("+44 7700 900123"), {
    value: "+447700900123",
    issue: null,
  });
  assert.deepEqual(normalizeRosterPhone("98765 43210"), {
    value: "+919876543210",
    issue: null,
  });
  assert.equal(normalizeRosterPhone("123").value, null);
  assert.match(normalizeRosterPhone("123").issue ?? "", /country code/);
});

test("public registration fills open capacity then uses the waitlist", () => {
  assert.equal(publicRegistrationStatus({
    activeCount: 19,
    capacityLimit: 20,
    existingStatus: undefined,
  }), "registered");
  assert.equal(publicRegistrationStatus({
    activeCount: 20,
    capacityLimit: 20,
    existingStatus: undefined,
  }), "waitlisted");
  assert.equal(publicRegistrationStatus({
    activeCount: 20,
    capacityLimit: 20,
    existingStatus: "registered",
  }), "registered");
});

test("public OTP registration denies private basics before roster reads",
  async () => {
    const firestore = new FakeFirestore({
      "events/private-1": {organizerId: "organizer-1", status: "active",
        publicationState: "private", setupRevision: 1},
    });
    await assert.rejects(registerPublicEventHandler({
      auth: {uid: "guest-1", token: {phone_number: "+919876543210"}},
      data: {eventId: "private-1", displayName: "Example Guest"},
      rawRequest: {},
    } as CallableRequest<unknown>, {
      firestore: () => firestore as never,
      checkRateLimit: async () => undefined,
      timestamp: () => admin.firestore.Timestamp.now(),
    }), (error) => error instanceof HttpsError &&
      error.code === "failed-precondition" &&
      error.message.includes("not open for public registration"));
    assert.equal(firestore.get("onboarding_drafts/guest-1"), undefined);
  });

test("ready OTP links an imported external-ID guest at full capacity",
  async () => {
    const phone = "+919876543210";
    const attendeeId = eventAttendeeId("event-1", "external:guest-7");
    const startTime = admin.firestore.Timestamp.fromMillis(Date.now() +
      60_000);
    const endTime = admin.firestore.Timestamp.fromMillis(Date.now() +
      3_600_000);
    const event = {organizerId: "organizer-1",
      status: "active", startTime, endTime, capacityLimit: 1,
      priceInPaise: 0, publicRegistrationEnabled: true,
      eventFormat: {version: 1, activityKind: "running",
        interactionModel: "open"}, meetingPoint: "Park",
      meetingLocation: {name: "Park", latitude: 12, longitude: 77},
      constraints: {minAge: 0, maxAge: 99, maxMen: null, maxWomen: null}};
    const policy = deriveEventSeatPolicy(event);
    const canonicalKey = "guest_1";
    const alias = (kind: "phone" | "attendee" | "external",
      value: string) => ({eventId: "event-1", organizerId: "organizer-1",
      kind, valueHash: seatIdentityValueHash(kind, value),
      canonicalKey, identityRevision: 1, migrationRevision: 1,
      state: "ready"});
    const docs: Record<string, FakeData | undefined> = {
      "events/event-1": event,
      "organizers/organizer-1": {appVisibility: "discoverable",
        publicPage: {publishStatus: "published"},
        hostUserId: "host-1", ownerUserId: "host-1",
        hostUserIds: ["host-1"], hostProfiles: []},
      "eventSeatMigrationFences/event-1": {eventId: "event-1",
        migrationRevision: 1, state: "ready"},
      "eventSeatLedgers/event-1": {eventId: "event-1", capacity: 1,
        occupied: 1, revision: 1, capacityRevision: 1,
        policyVersion: policy.policyVersion, policyHash: policy.policyHash,
        migrationRevision: 1, state: "ready"},
      [`eventAttendees/${attendeeId}`]: {eventId: "event-1",
        organizerId: "organizer-1",
        source: "hostImport", status: "registered", linkedUid: null,
        phoneE164: phone, externalReference: "guest-7",
        displayName: "Imported Guest"},
      [`eventSeatReservations/${createHash("sha256")
        .update(`event-1\u001f${canonicalKey}`).digest("hex")}`]: {
        eventId: "event-1", canonicalKey, identityRevision: 1,
        active: true, revision: 1, reservedAtMillis: 100,
        releasedAtMillis: null},
    };
    for (const [kind, value] of [["phone", phone],
      ["attendee", attendeeId], ["external", "guest-7"]] as const) {
      docs[`eventSeatIdentityAliases/${seatIdentityAliasId(
        "event-1", kind, value)}`] = alias(kind, value);
    }
    const firestore = new FakeFirestore(docs);
    const response = await registerPublicEventHandler({
      auth: {uid: "user-1", token: {phone_number: phone}},
      data: {eventId: "event-1", displayName: "Guest"},
      rawRequest: {},
    } as CallableRequest<unknown>, {
      firestore: () => firestore as never,
      checkRateLimit: async () => undefined,
      timestamp: () => admin.firestore.Timestamp.fromMillis(1000),
    });
    assert.equal(response.attendeeId, attendeeId);
    assert.equal(response.status, "alreadyRegistered");
    assert.equal(firestore.get("eventSeatLedgers/event-1")?.occupied, 1);
    assert.equal(firestore.get(`eventAttendees/${attendeeId}`)?.source,
      "hostImport");
    assert.equal(firestore.get(`eventAttendees/${attendeeId}`)?.linkedUid,
      "user-1");
    assert.equal(firestore.get(`eventAttendees/${eventAttendeeId(
      "event-1", `phone:${phone}`)}`), undefined);

    const expandedEvent = {...event, capacityLimit: 2};
    const expandedPolicy = deriveEventSeatPolicy(expandedEvent);
    const fresh = new FakeFirestore({...docs,
      "events/event-1": expandedEvent,
      "eventSeatLedgers/event-1": {...firestore.get(
        "eventSeatLedgers/event-1"), capacity: 2, capacityRevision: 2,
      policyHash: expandedPolicy.policyHash}});
    const secondPhone = "+919876543211";
    const secondRequest = {auth: {uid: "user-2",
      token: {phone_number: secondPhone}},
    data: {eventId: "event-1", displayName: "New Guest"},
    rawRequest: {}} as CallableRequest<unknown>;
    const freshDeps = {firestore: () => fresh as never,
      checkRateLimit: async () => undefined,
      timestamp: () => admin.firestore.Timestamp.fromMillis(2000)};
    const held = new FakeFirestore({...docs,
      "events/event-1": expandedEvent,
      "eventSeatLedgers/event-1": {...docs["eventSeatLedgers/event-1"],
        capacity: 2, checkoutHeld: 1, capacityRevision: 2,
        policyHash: expandedPolicy.policyHash}});
    const heldResult = await registerPublicEventHandler(secondRequest,
      {...freshDeps, firestore: () => held as never});
    assert.equal(heldResult.status, "waitlisted");
    assert.equal(held.get("eventSeatLedgers/event-1")?.occupied, 1);
    assert.equal(held.get("eventSeatLedgers/event-1")?.checkoutHeld, 1);
    const newResult = await registerPublicEventHandler(secondRequest,
      freshDeps);
    assert.equal(newResult.status, "registered");
    assert.equal(fresh.get("eventSeatLedgers/event-1")?.occupied, 2);
    assert.equal((await registerPublicEventHandler(secondRequest,
      freshDeps)).status, "alreadyRegistered");
    assert.equal(fresh.get("eventSeatLedgers/event-1")?.occupied, 2);
    await setEventAttendeeAttendanceHandler(attendanceRequest({
      eventId: "event-1", attendeeId: newResult.attendeeId,
      desiredCheckedIn: true, expectedRevision: 0,
      clientOperationId: "otp-check-in-0001",
    }), freshDeps);
    assert.equal(fresh.get("eventSeatLedgers/event-1")?.occupied, 2);
    assert.equal(fresh.get(`eventAttendees/${newResult.attendeeId}`)?.status,
      "checkedIn");
  });

test("prepareImportRows deduplicates event-scoped contact identity", () => {
  const result = prepareImportRows({
    eventId: "event-1",
    importKey: "import-key-1",
    rows: [
      {
        rowId: "1",
        displayName: "  Asha   Shah ",
        phone: "+91 98765 43210",
        email: null,
        externalReference: null,
        arrivalGroup: null,
        ticketType: "General",
        status: "registered",
      },
      {
        rowId: "2",
        displayName: "Asha duplicate",
        phone: "9876543210",
        email: null,
        externalReference: null,
        arrivalGroup: null,
        ticketType: null,
        status: "registered",
      },
    ],
  });

  assert.equal(result.prepared.length, 1);
  assert.equal(result.prepared[0].displayName, "Asha Shah");
  assert.equal(result.prepared[0].phoneE164, "+919876543210");
  assert.deepEqual(result.errors.map((error) => error.code), [
    "duplicate-row",
  ]);
});

test(
  "prepareImportRows preserves group tickets with shared buyer contact",
  () => {
    const result = prepareImportRows({
      eventId: "event-1",
      importKey: "eventbrite-import",
      rows: [
        {
          rowId: "2",
          displayName: "Asha Shah",
          phone: null,
          email: "buyer@example.com",
          externalReference: "attendee-7a",
          arrivalGroup: "order-7",
          ticketType: "General",
          status: "registered",
        },
        {
          rowId: "3",
          displayName: "Ravi Rao",
          phone: null,
          email: "buyer@example.com",
          externalReference: "attendee-7b",
          arrivalGroup: "order-7",
          ticketType: "General",
          status: "registered",
        },
      ],
    });

    assert.equal(result.errors.length, 0);
    assert.equal(result.prepared.length, 2);
    assert.notEqual(
      result.prepared[0].attendeeId,
      result.prepared[1].attendeeId
    );
    assert.deepEqual(
      result.prepared.map((row) => row.arrivalGroup),
      ["order-7", "order-7"]
    );
  }
);

test("shared buyer phone requires review even with distinct references",
  () => {
    const rows = ["ticket-a", "ticket-b"].map((reference, index) => ({
      rowId: String(index + 2), displayName: `Guest ${index + 1}`,
      phone: "+919876543210", email: "buyer@example.com",
      externalReference: reference, arrivalGroup: null, ticketType: "General",
      status: "registered" as const,
    }));
    const result = prepareImportRows({eventId: "event-1",
      importKey: "two-tickets", format: "csv", rows});
    assert.equal(result.prepared.length, 0);
    assert.deepEqual(result.errors.map((error) => error.code),
      ["shared-phone-identity", "shared-phone-identity"]);
  });

test("email-only duplicate tickets require review instead of collapsing",
  () => {
    const rows = ["Asha", "Ravi"].map((displayName, index) => ({
      rowId: String(index + 2), displayName, phone: null,
      email: "buyer@example.com", externalReference: null,
      arrivalGroup: null, ticketType: "General",
      status: "registered" as const,
    }));
    const result = prepareImportRows({eventId: "event-1",
      importKey: "buyer-tickets", format: "csv", rows});
    assert.equal(result.prepared.length, 1);
    assert.deepEqual(result.errors.map((error) => error.code),
      ["duplicate-row"]);
  });

test("shared imported order totals are allocated once across guests", () => {
  const result = prepareImportRows({
    eventId: "event-1",
    importKey: "order-revenue-import",
    rows: [
      {
        rowId: "2",
        displayName: "Asha Shah",
        phone: null,
        email: "asha@example.com",
        externalReference: "attendee-a",
        arrivalGroup: "order-7",
        ticketType: "General",
        revenueAmountMinor: 10001,
        revenueCurrency: "INR",
        revenueSource: "hostImport",
        status: "registered",
      },
      {
        rowId: "3",
        displayName: "Ravi Rao",
        phone: null,
        email: "ravi@example.com",
        externalReference: "attendee-b",
        arrivalGroup: "order-7",
        ticketType: "General",
        revenueAmountMinor: 10001,
        revenueCurrency: "INR",
        revenueSource: "hostImport",
        status: "registered",
      },
    ],
  });

  assert.equal(result.errors.length, 0);
  assert.deepEqual(
    result.prepared.map((row) => row.revenueAmountMinor),
    [5001, 5000]
  );
  assert.deepEqual(
    result.prepared.map((row) => row.revenueAllocation),
    ["sharedOrder", "sharedOrder"]
  );
  assert.equal(
    result.prepared.reduce(
      (total, row) => total + (row.revenueAmountMinor ?? 0),
      0
    ),
    10001
  );
});

test("spreadsheet rows without stable identity are rejected", () => {
  const result = prepareImportRows({
    eventId: "event-1",
    importKey: "csv-import",
    format: "csv",
    rows: [{
      rowId: "2",
      displayName: "Name only",
      phone: null,
      email: null,
      externalReference: null,
      arrivalGroup: null,
      ticketType: null,
      status: "registered",
    }],
  });

  assert.equal(result.prepared.length, 0);
  assert.deepEqual(result.errors.map((error) => error.code), [
    "missing-stable-identity",
  ]);
});

test("manual rows may use an import-scoped row identity", () => {
  const result = prepareImportRows({
    eventId: "event-1",
    importKey: "manual-import",
    format: "manual",
    rows: [{
      rowId: "manual",
      displayName: "Walk in",
      phone: null,
      email: null,
      externalReference: null,
      arrivalGroup: null,
      ticketType: null,
      status: "registered",
    }],
  });

  assert.equal(result.errors.length, 0);
  assert.equal(result.prepared.length, 1);
});

test("host import cannot replace a Catch booking's roster facts", async () => {
  const now = admin.firestore.Timestamp.fromMillis(1000);
  const attendeeId = eventAttendeeId("event-1", "phone:+919876543210");
  const path = `eventAttendees/${attendeeId}`;
  const firestore = new FakeFirestore({
    "events/event-1": {organizerId: "organizer-1",
      status: "active"},
    "organizers/organizer-1": {hostUserId: "host-1",
      ownerUserId: "host-1", hostUserIds: ["host-1"], hostProfiles: []},
    [path]: {eventId: "event-1", organizerId: "organizer-1",
      displayName: "Booked Guest",
      source: "catchBooking", status: "registered",
      phoneE164: "+919876543210", email: "booked@example.com",
      revenueAmountMinor: 50000, revenueCurrency: "INR",
      revenueSource: "providerOrder", linkedUid: "person-1"},
  });
  const payload = {eventId: "event-1", importKey: "host-report",
    fileName: "guests.csv", format: "csv" as const, rows: [{
      rowId: "2", displayName: "Different Guest",
      phone: "+919876543210", email: "other@example.com",
      externalReference: null, arrivalGroup: null, ticketType: null,
      status: "waitlisted" as const,
    }]};
  await assert.rejects(importEventAttendeesForHost({hostUid: "host-1",
    payload}, {firestore: () => firestore as never,
    checkRateLimit: async () => undefined, timestamp: () => now}),
  /Catch booking needs separate review/u);
  assert.equal(firestore.get(path)?.displayName, "Booked Guest");
  assert.equal(firestore.get(path)?.status, "registered");
  assert.equal(firestore.get(path)?.revenueAmountMinor, 50000);
  assert.equal(firestore.entries("eventAttendeeImports").length, 0);
});

test("referenced host row cannot bypass a legacy phone-key booking",
  async () => {
    const now = admin.firestore.Timestamp.fromMillis(1000);
    const bookingId = eventAttendeeId("event-1", "phone:+919876543210");
    const path = `eventAttendees/${bookingId}`;
    const firestore = new FakeFirestore({
      "events/event-1": {organizerId: "organizer-1",
        status: "active"},
      "organizers/organizer-1": {hostUserId: "host-1",
        ownerUserId: "host-1", hostUserIds: ["host-1"], hostProfiles: []},
      [path]: {eventId: "event-1", organizerId: "organizer-1",
        source: "catchBooking", status: "registered",
        phoneE164: null, displayName: "Booked Guest"},
    });
    const payload = {eventId: "event-1", importKey: "new-ticket-id",
      fileName: "guests.csv", format: "csv" as const, rows: [{
        rowId: "2", displayName: "Host Guest", phone: "+919876543210",
        email: null, externalReference: "ticket-a", arrivalGroup: null,
        ticketType: null, status: "registered" as const,
      }]};
    await assert.rejects(importEventAttendeesForHost({hostUid: "host-1",
      payload}, {firestore: () => firestore as never,
      checkRateLimit: async () => undefined, timestamp: () => now}),
    /matches another event attendee/u);
    assert.equal(firestore.get(path)?.displayName, "Booked Guest");
    assert.equal(firestore.entries("eventAttendees").length, 1);
    assert.equal(firestore.entries("eventAttendeeImports").length, 0);
  });

test("phone-key upload cannot bypass an existing attendee reference",
  async () => {
    const now = admin.firestore.Timestamp.fromMillis(1000);
    const referencedId = eventAttendeeId("event-1", "external:ticket-a");
    const firestore = new FakeFirestore({
      "events/event-1": {organizerId: "organizer-1", status: "active"},
      "organizers/organizer-1": {hostUserId: "host-1",
        ownerUserId: "host-1", hostUserIds: ["host-1"], hostProfiles: []},
      [`eventAttendees/${referencedId}`]: {eventId: "event-1",
        organizerId: "organizer-1", source: "hostImport",
        status: "registered", phoneE164: "+919876543210",
        externalReference: "ticket-a", displayName: "Original Guest"},
    });
    const payload = {eventId: "event-1", importKey: "phone-only-retry",
      fileName: "guests.csv", format: "csv" as const, rows: [{
        rowId: "2", displayName: "Different Guest", phone: "+919876543210",
        email: null, externalReference: null, arrivalGroup: null,
        ticketType: null, status: "registered" as const,
      }]};
    await assert.rejects(importEventAttendeesForHost({hostUid: "host-1",
      payload}, {firestore: () => firestore as never,
      checkRateLimit: async () => undefined, timestamp: () => now}),
    /matches another event attendee/u);
    assert.equal(firestore.entries("eventAttendees").length, 1);
    assert.equal(firestore.entries("eventAttendeeImports").length, 0);
  });

test("email-only upload cannot overwrite an existing event attendee",
  async () => {
    const now = admin.firestore.Timestamp.fromMillis(1000);
    const attendeeId = eventAttendeeId("event-1",
      "email:buyer@example.com");
    const attendeePath = `eventAttendees/${attendeeId}`;
    const firestore = new FakeFirestore({
      "events/event-1": {organizerId: "organizer-1", status: "active"},
      "organizers/organizer-1": {hostUserId: "host-1",
        ownerUserId: "host-1", hostUserIds: ["host-1"], hostProfiles: []},
      [attendeePath]: {eventId: "event-1", organizerId: "organizer-1",
        source: "hostImport", status: "registered", phoneE164: null,
        email: "buyer@example.com", externalReference: null,
        displayName: "Earlier Guest"},
    });
    const payload = {eventId: "event-1", importKey: "later-email-ticket",
      fileName: "guests.csv", format: "csv" as const, rows: [{
        rowId: "2", displayName: "Different Guest", phone: null,
        email: "buyer@example.com", externalReference: null,
        arrivalGroup: null, ticketType: null, status: "registered" as const,
      }]};
    await assert.rejects(importEventAttendeesForHost({hostUid: "host-1",
      payload}, {firestore: () => firestore as never,
      checkRateLimit: async () => undefined, timestamp: () => now}),
    /Email-only identity needs separate review/u);
    assert.equal(firestore.get(attendeePath)?.displayName, "Earlier Guest");
    assert.equal(firestore.entries("eventAttendeeImports").length, 0);
  });

test("re-import cannot transfer a claimed attendee's verified endpoint",
  async () => {
    const now = admin.firestore.Timestamp.fromMillis(1000);
    const firestore = new FakeFirestore({
      "events/event-1": {organizerId: "organizer-1",
        status: "active"},
      "organizers/organizer-1": {hostUserId: "host-1",
        ownerUserId: "host-1", hostUserIds: ["host-1"], hostProfiles: []},
    });
    const deps = {firestore: () => firestore as unknown as
      FirebaseFirestore.Firestore, checkRateLimit: async () => undefined,
    timestamp: () => now};
    const row = {rowId: "2", displayName: "Asha Shah",
      phone: "+919876543210", email: "asha@example.com",
      cityMarketId: "in-ka-bengaluru",
      externalReference: "guest-7", arrivalGroup: "order-7",
      ticketType: "General", status: "registered" as const};
    const payload = {eventId: "event-1", importKey: "first-import",
      fileName: "roster.csv", format: "csv" as const, rows: [row]};
    const first = await importEventAttendeesForHost({hostUid: "host-1",
      payload}, deps);
    assert.equal(first.createdCount, 1);
    const attendeePath = `eventAttendees/${eventAttendeeId("event-1",
      "external:guest-7")}`;
    assert.equal(firestore.get(attendeePath)?.cityMarketId, "in-ka-bengaluru");
    assert.equal(firestore.get(attendeePath)?.citySource, "hostImport");
    firestore.update(attendeePath, {linkedUid: "person-1"});
    const same = await importEventAttendeesForHost({hostUid: "host-1",
      payload: {...payload, importKey: "same-contact-import"}}, deps);
    assert.equal(same.updatedCount, 1);
    assert.equal(firestore.get(attendeePath)?.cityMarketId, "in-ka-bengaluru");
    const changed = {eventId: "event-1", importKey: "changed-import",
      fileName: "roster.csv", format: "csv" as const,
      rows: [{...row, phone: "+919000000001"}]};
    await assert.rejects(importEventAttendeesForHost({hostUid: "host-1",
      payload: changed}, deps), /conflicts with a claimed attendee/u);
    assert.equal(firestore.get(attendeePath)?.phoneE164, "+919876543210");
    assert.equal(firestore.get(attendeePath)?.linkedUid, "person-1");
    await assert.rejects(importEventAttendeesForHost({hostUid: "host-1",
      payload: {...changed, importKey: "changed-email-import",
        rows: [{...row, email: "other@example.com"}]}}, deps),
    /conflicts with a claimed attendee/u);

    // The claim lands after the import transaction's first attendee read.
    // Firestore retries that transaction; its second read must reject it.
    firestore.update(attendeePath, {linkedUid: null});
    firestore.afterRead = (path) => {
      if (path !== attendeePath) return;
      firestore.afterRead = null;
      firestore.update(attendeePath, {linkedUid: "person-1"});
    };
    await assert.rejects(importEventAttendeesForHost({hostUid: "host-1",
      payload: changed}, deps), /conflicts with a claimed attendee/u);
    assert.equal(firestore.get(attendeePath)?.phoneE164, "+919876543210");
  });

test("host import preserves provider and accountability facts on update",
  async () => {
    const createdAt = admin.firestore.Timestamp.fromMillis(500);
    const checkedInAt = admin.firestore.Timestamp.fromMillis(700);
    const resolvedAt = admin.firestore.Timestamp.fromMillis(800);
    const providerSyncedAt = admin.firestore.Timestamp.fromMillis(900);
    const now = admin.firestore.Timestamp.fromMillis(1000);
    const attendeeId = eventAttendeeId("event-1", "external:guest-7");
    const attendeePath = `eventAttendees/${attendeeId}`;
    const firestore = new FakeFirestore({
      "events/event-1": {organizerId: "organizer-1", status: "active"},
      "organizers/organizer-1": {hostUserId: "host-1",
        ownerUserId: "host-1", hostUserIds: ["host-1"], hostProfiles: []},
      [attendeePath]: {eventId: "event-1", organizerId: "organizer-1",
        displayName: "Earlier Name",
        searchName: "earlier name", source: "providerSync",
        status: "checkedIn", linkedUid: null,
        phoneE164: "+919876543210", email: "guest@example.com",
        externalReference: "guest-7", arrivalGroup: null, ticketType: null,
        importId: null, sourceRowId: "guest-7", createdAt, updatedAt: createdAt,
        registeredAt: createdAt, waitlistedAt: null, checkedInAt,
        cancelledAt: null, checkedInBy: "host-1", linkedAt: null,
        attendanceRevision: 4, preCheckInStatus: "registered",
        accountabilityRevision: 2, accountabilityResolution: "returned",
        accountabilityResolvedForCheckInAt: checkedInAt,
        accountabilityResolvedAt: resolvedAt,
        accountabilityResolvedBy: "host-2", provider: "luma",
        providerConnectionId: "connection-1", providerGuestId: "luma-7",
        providerSyncedAt, providerDataRevision: 3},
    });
    const payload = {eventId: "event-1", importKey: "host-correction",
      fileName: "guests.csv", format: "csv" as const, rows: [{
        rowId: "2", displayName: "Corrected Name", phone: "+919876543210",
        email: null, externalReference: "guest-7", arrivalGroup: null,
        ticketType: null, status: "registered" as const,
      }]};

    const result = await importEventAttendeesForHost({hostUid: "host-1",
      payload}, {firestore: () => firestore as never,
      checkRateLimit: async () => undefined, timestamp: () => now});

    assert.equal(result.updatedCount, 1);
    const updated = firestore.get(attendeePath)!;
    assert.equal(updated.displayName, "Corrected Name");
    assert.equal(updated.source, "providerSync");
    assert.equal(updated.status, "checkedIn");
    assert.equal(updated.email, "guest@example.com");
    assert.equal(updated.provider, "luma");
    assert.equal(updated.providerConnectionId, "connection-1");
    assert.equal(updated.providerGuestId, "luma-7");
    assert.equal(updated.providerSyncedAt, providerSyncedAt);
    assert.equal(updated.providerDataRevision, 3);
    assert.equal(updated.accountabilityRevision, 2);
    assert.equal(updated.accountabilityResolution, "returned");
    assert.equal(updated.accountabilityResolvedForCheckInAt, checkedInAt);
    assert.equal(updated.accountabilityResolvedAt, resolvedAt);
    assert.equal(updated.accountabilityResolvedBy, "host-2");
  });

test("ready Host import reserves full batch or writes no attendee or receipt",
  async () => {
    const now = admin.firestore.Timestamp.fromMillis(1000);
    const event = {organizerId: "organizer-1",
      status: "active", capacityLimit: 2, bookedCount: 0,
      constraints: {minAge: 0, maxAge: 99, maxMen: null, maxWomen: null}};
    const policy = deriveEventSeatPolicy(event);
    const firestore = new FakeFirestore({
      "events/event-1": event,
      "organizers/organizer-1": {hostUserId: "host-1",
        ownerUserId: "host-1", hostUserIds: ["host-1"], hostProfiles: []},
      "eventSeatMigrationFences/event-1": {eventId: "event-1",
        migrationRevision: 1, state: "ready"},
      "eventSeatLedgers/event-1": {eventId: "event-1", capacity: 2,
        occupied: 0, revision: 1, capacityRevision: 1,
        policyVersion: policy.policyVersion, policyHash: policy.policyHash,
        migrationRevision: 1, state: "ready"},
    });
    const deps = {firestore: () => firestore as unknown as
      FirebaseFirestore.Firestore, checkRateLimit: async () => undefined,
    timestamp: () => now};
    const rows = ["+919876543210", "+919876543211"].map((phone, i) => ({
      rowId: String(i + 1), displayName: `Guest ${i + 1}`, phone,
      email: null, externalReference: `guest-${i + 1}`,
      arrivalGroup: `order-${i + 1}`, ticketType: null,
      status: "registered" as const,
    }));
    const payload = {eventId: "event-1", importKey: "ready-one",
      fileName: "roster.csv", format: "csv" as const, rows};
    const first = await importEventAttendeesForHost({hostUid: "host-1",
      payload}, deps);
    assert.equal(first.createdCount, 2);
    assert.equal(firestore.get("eventSeatLedgers/event-1")?.occupied, 2);
    assert.equal(firestore.get("events/event-1")?.bookedCount, 2);
    assert.equal((await importEventAttendeesForHost({hostUid: "host-1",
      payload}, deps)).replayed, true);
    assert.equal(firestore.get("eventSeatLedgers/event-1")?.occupied, 2);
    const third = {...payload, importKey: "ready-overflow",
      rows: [{...rows[0], rowId: "3", phone: "+919876543212",
        externalReference: "guest-3"}]};
    await assert.rejects(importEventAttendeesForHost({hostUid: "host-1",
      payload: third}, deps));
    assert.equal(firestore.get(`eventAttendees/${eventAttendeeId("event-1",
      "external:guest-3")}`), undefined);
    assert.equal(firestore.get("eventSeatLedgers/event-1")?.occupied, 2);
    assert.equal(firestore.get("events/event-1")?.bookedCount, 2);
  });

test("ready import rejects shared buyer phone without writing seats",
  async () => {
    const now = admin.firestore.Timestamp.fromMillis(1000);
    const event = {organizerId: "organizer-1",
      status: "active", capacityLimit: 2, bookedCount: 0,
      constraints: {minAge: 0, maxAge: 99, maxMen: null, maxWomen: null}};
    const policy = deriveEventSeatPolicy(event);
    const firestore = new FakeFirestore({
      "events/event-1": event,
      "organizers/organizer-1": {hostUserId: "host-1",
        ownerUserId: "host-1", hostUserIds: ["host-1"], hostProfiles: []},
      "eventSeatMigrationFences/event-1": {eventId: "event-1",
        migrationRevision: 1, state: "ready"},
      "eventSeatLedgers/event-1": {eventId: "event-1", capacity: 2,
        occupied: 0, revision: 1, capacityRevision: 1,
        policyVersion: policy.policyVersion, policyHash: policy.policyHash,
        migrationRevision: 1, state: "ready"},
    });
    const rows = ["ticket-a", "ticket-b"].map((reference, index) => ({
      rowId: String(index + 2), displayName: `Guest ${index + 1}`,
      phone: "+919876543210", email: "buyer@example.com",
      externalReference: reference, arrivalGroup: "order-a",
      ticketType: "General", status: "registered" as const,
    }));
    await assert.rejects(importEventAttendeesForHost({hostUid: "host-1",
      payload: {eventId: "event-1", importKey: "shared-buyer-phone",
        fileName: "tickets.csv", format: "csv", rows}},
    {firestore: () => firestore as never,
      checkRateLimit: async () => undefined, timestamp: () => now}),
    /Shared contact phone needs attendee-level review/u);
    assert.equal(firestore.entries("eventAttendees").length, 0);
    assert.equal(firestore.entries("eventAttendeeImports").length, 0);
    assert.equal(firestore.get("eventSeatLedgers/event-1")?.occupied, 0);
  });

test("import rejects unsupported city values before writing a row", () => {
  const result = prepareImportRows({eventId: "event-1",
    importKey: "city-import", format: "csv", rows: [{
      rowId: "2", displayName: "Asha Shah", phone: "+919876543210",
      email: null, cityMarketId: "in-zz-atlantis",
      externalReference: null, arrivalGroup: null, ticketType: null,
      status: "registered",
    }]});
  assert.equal(result.prepared.length, 0);
  assert.deepEqual(result.errors.map((error) => error.code), ["invalid-city"]);
});

test("pre-city import receipts replay but cannot acquire new city data",
  async () => {
    const now = admin.firestore.Timestamp.fromMillis(1000);
    const firestore = new FakeFirestore({
      "events/event-1": {organizerId: "organizer-1",
        status: "active"},
      "organizers/organizer-1": {hostUserId: "host-1",
        ownerUserId: "host-1", hostUserIds: ["host-1"], hostProfiles: []},
    });
    const deps = {firestore: () => firestore as unknown as
      FirebaseFirestore.Firestore, checkRateLimit: async () => undefined,
    timestamp: () => now};
    const row = {rowId: "2", displayName: "Asha Shah",
      phone: "+919876543210", email: null, externalReference: null,
      arrivalGroup: null, ticketType: null, status: "registered" as const};
    const payload = {eventId: "event-1", importKey: "legacy-import",
      fileName: "roster.csv", format: "csv" as const, rows: [row]};
    const imported = await importEventAttendeesForHost({hostUid: "host-1",
      payload}, deps);
    const oldRow = {rowId: row.rowId, displayName: row.displayName,
      phone: row.phone, email: null, externalReference: null,
      arrivalGroup: null, ticketType: null, revenueAmountMinor: null,
      revenueCurrency: null, revenueSource: null, status: row.status};
    const oldHash = createHash("sha256").update(JSON.stringify({
      eventId: payload.eventId, importKey: payload.importKey,
      fileName: payload.fileName, format: payload.format, rows: [oldRow],
    })).digest("hex");
    assert.equal(firestore.get(`eventAttendeeImports/${imported.importId}`)
      ?.payloadHash, oldHash);
    assert.equal((await importEventAttendeesForHost({hostUid: "host-1",
      payload}, deps)).replayed, true);
    await assert.rejects(importEventAttendeesForHost({hostUid: "host-1",
      payload: {...payload, rows: [{...row,
        cityMarketId: "in-ka-bengaluru"}]}}, deps),
    /already used for different roster data/u);
  });

test("eventAttendeeId is stable and event-isolated", () => {
  const stable = eventAttendeeId("event-1", "email:asha@example.com");
  assert.equal(stable, eventAttendeeId("event-1", "email:asha@example.com"));
  assert.notEqual(
    stable,
    eventAttendeeId("event-2", "email:asha@example.com")
  );
  assert.match(stable, /^att_[a-f0-9]{48}$/);
});

test("OTP registration seeds a private account draft without a profile", () => {
  assert.deepEqual(onboardingDraftSeed({
    displayName: "Asha Shah",
    phoneE164: "+919876543210",
  }), {
    step: 1,
    draftVersion: 2,
    firstName: "Asha Shah",
    lastName: "",
    phoneNumber: "9876543210",
    countryCode: "+91",
  });
});

test("registration consent only adds explicit channel grants", () => {
  const now = admin.firestore.Timestamp.fromMillis(10);
  assert.equal(mergeOrganizerCommunicationPreference({
    organizerId: "organizer-1",
    uid: "user-1",
    eventId: "event-1",
    now,
  }), null);

  const preference = mergeOrganizerCommunicationPreference({
    organizerId: "organizer-1",
    uid: "user-1",
    eventId: "event-1",
    organizerUpdates: {
      whatsapp: true,
      sms: false,
      termsVersion: "organizer-updates-v1",
    },
    now,
  });
  assert.equal(preference?.whatsapp.status, "optedIn");
  assert.equal(preference?.whatsapp.evidenceStatus, "complete");
  assert.match(preference?.whatsapp.currentReceiptId ?? "", /^ocpr_/);
  assert.equal(preference?.sms.status, "unknown");
  assert.equal(preference?.sms.evidenceStatus, "notApplicable");

  const replay = mergeOrganizerCommunicationPreference({
    existing: preference!,
    organizerId: "organizer-1",
    uid: "user-1",
    eventId: "event-2",
    organizerUpdates: {
      whatsapp: false,
      sms: false,
      termsVersion: "organizer-updates-v1",
    },
    now: admin.firestore.Timestamp.fromMillis(20),
  });
  assert.equal(replay, null);
  assert.equal(preference?.whatsapp.status, "optedIn");
});

test("absolute attendance replays and preserves prior state", async () => {
  const now = admin.firestore.Timestamp.fromMillis(1_000);
  const firestore = new FakeFirestore({
    "events/event-1": {
      organizerId: "organizer-1",
      status: "active",
    },
    "organizers/organizer-1": {
      hostUserId: "host-1",
      ownerUserId: "host-1",
      hostUserIds: ["host-1"],
      hostProfiles: [],
    },
    "eventAttendees/attendee-1": {
      eventId: "event-1",
      status: "waitlisted",
      attendanceRevision: 0,
      preCheckInStatus: null,
    },
  });
  const deps = {
    firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
    checkRateLimit: async () => undefined,
    timestamp: () => now,
  };
  const checkIn = attendanceRequest({
    eventId: "event-1",
    attendeeId: "attendee-1",
    desiredCheckedIn: true,
    expectedRevision: 0,
    clientOperationId: "operation-check-in-1",
  });

  assert.deepEqual(await setEventAttendeeAttendanceHandler(checkIn, deps), {
    attendeeId: "attendee-1",
    checkedIn: true,
    acceptedRevision: 1,
    replayed: false,
    changed: true,
  });
  assert.equal(firestore.get("eventAttendees/attendee-1")?.status, "checkedIn");
  assert.equal(
    firestore.get("eventAttendees/attendee-1")?.preCheckInStatus,
    "waitlisted"
  );
  assert.deepEqual(await setEventAttendeeAttendanceHandler(checkIn, deps), {
    attendeeId: "attendee-1",
    checkedIn: true,
    acceptedRevision: 1,
    replayed: true,
    changed: true,
  });
  await assert.rejects(
    setEventAttendeeAttendanceHandler(attendanceRequest({
      eventId: "event-1",
      attendeeId: "attendee-1",
      desiredCheckedIn: false,
      expectedRevision: 0,
      clientOperationId: "operation-stale-undo-1",
    }), deps),
    (error: unknown) =>
      error instanceof HttpsError && error.code === "aborted"
  );
  const undo = await setEventAttendeeAttendanceHandler(attendanceRequest({
    eventId: "event-1",
    attendeeId: "attendee-1",
    desiredCheckedIn: false,
    expectedRevision: 1,
    clientOperationId: "operation-current-undo-1",
  }), deps);
  assert.equal(undo.acceptedRevision, 2);
  assert.equal(
    firestore.get("eventAttendees/attendee-1")?.status,
    "waitlisted"
  );
  assert.equal(
    firestore.get("eventAttendees/attendee-1")?.preCheckInStatus,
    null
  );
  assert.match(attendanceReceiptId({
    eventId: "event-1",
    actorUid: "host-1",
    clientOperationId: "operation-check-in-1",
  }), /^ear_[a-f0-9]{48}$/u);
});

test("ready Host attendance reserves and releases one canonical guest seat",
  async () => {
    const now = admin.firestore.Timestamp.fromMillis(1_000);
    const event = {organizerId: "organizer-1",
      status: "active", capacityLimit: 1, checkedInCount: 0,
      constraints: {minAge: 0, maxAge: 99, maxMen: null, maxWomen: null}};
    const policy = deriveEventSeatPolicy(event);
    const attendeeId = "attendee-1";
    const canonicalKey = "guest_1";
    const firestore = new FakeFirestore({
      "events/event-1": event,
      "organizers/organizer-1": {hostUserId: "host-1",
        ownerUserId: "host-1", hostUserIds: ["host-1"], hostProfiles: []},
      "eventAttendees/attendee-1": {eventId: "event-1",
        organizerId: "organizer-1", source: "hostImport",
        status: "waitlisted", linkedUid: null, phoneE164: null,
        externalReference: null, attendanceRevision: 0,
        preCheckInStatus: null},
      "eventSeatMigrationFences/event-1": {eventId: "event-1",
        migrationRevision: 1, state: "ready"},
      "eventSeatLedgers/event-1": {eventId: "event-1", capacity: 1,
        occupied: 0, revision: 1, capacityRevision: 1,
        policyVersion: policy.policyVersion, policyHash: policy.policyHash,
        migrationRevision: 1, state: "ready"},
      [`eventSeatIdentityAliases/${seatIdentityAliasId("event-1",
        "attendee", attendeeId)}`]: {eventId: "event-1",
        organizerId: "organizer-1", kind: "attendee",
        valueHash: seatIdentityValueHash("attendee", attendeeId),
        canonicalKey, identityRevision: 1, migrationRevision: 1,
        state: "ready"},
    });
    const deps = {firestore: () => firestore as never,
      checkRateLimit: async () => undefined, timestamp: () => now};
    const checkIn = attendanceRequest({eventId: "event-1", attendeeId,
      desiredCheckedIn: true, expectedRevision: 0,
      clientOperationId: "ready-check-in-0001"});
    await setEventAttendeeAttendanceHandler(checkIn, deps);
    assert.equal(firestore.get("eventSeatLedgers/event-1")?.occupied, 1);
    assert.equal(firestore.get("eventAttendees/attendee-1")?.status,
      "checkedIn");
    await setEventAttendeeAttendanceHandler(attendanceRequest({
      eventId: "event-1", attendeeId, desiredCheckedIn: false,
      expectedRevision: 1, clientOperationId: "ready-check-out-0001",
    }), deps);
    assert.equal(firestore.get("eventSeatLedgers/event-1")?.occupied, 0);
    assert.equal(firestore.get("eventAttendees/attendee-1")?.status,
      "waitlisted");
    await setEventAttendeeAttendanceHandler(attendanceRequest({
      eventId: "event-1", attendeeId, desiredCheckedIn: true,
      expectedRevision: 2, clientOperationId: "ready-recheck-in-0001",
    }), deps);
    firestore.update("eventAttendees/attendee-1", {linkedUid: "user-1"});
    firestore.set("eventParticipations/event-1_user-1", {
      eventId: "event-1", organizerId: "organizer-1", uid: "user-1",
      status: "signedUp",
    });
    firestore.set(`eventSeatIdentityAliases/${seatIdentityAliasId(
      "event-1", "uid", "user-1")}`, {eventId: "event-1",
      organizerId: "organizer-1", kind: "uid",
      valueHash: seatIdentityValueHash("uid", "user-1"),
      canonicalKey, identityRevision: 1, migrationRevision: 1,
      state: "ready"});
    await setEventAttendeeAttendanceHandler(attendanceRequest({
      eventId: "event-1", attendeeId, desiredCheckedIn: false,
      expectedRevision: 3, clientOperationId: "catch-retained-undo-0001",
    }), deps);
    assert.equal(firestore.get("eventSeatLedgers/event-1")?.occupied, 1);
    assert.equal(firestore.get("eventAttendees/attendee-1")?.status,
      "registered");
    const noOp = (clientOperationId: string) =>
      setEventAttendeeAttendanceHandler(attendanceRequest({
        eventId: "event-1", attendeeId, desiredCheckedIn: false,
        expectedRevision: 4, clientOperationId,
      }), deps);
    const noOpReceipt = (clientOperationId: string) =>
      firestore.get(`eventAttendeeAttendanceReceipts/${attendanceReceiptId({
        eventId: "event-1", actorUid: "host-1", clientOperationId,
      })}`);
    const reservationPath = `eventSeatReservations/${createHash("sha256")
      .update("event-1\u001fguest_1").digest("hex")}`;
    firestore.update("eventParticipations/event-1_user-1", {
      organizerId: "organizer-2",
    });
    await assert.rejects(noOp("foreign-participation-noop-0001"),
      (error) => error instanceof HttpsError &&
        error.code === "failed-precondition");
    assert.equal(noOpReceipt("foreign-participation-noop-0001"), undefined);
    firestore.update("eventParticipations/event-1_user-1", {
      organizerId: "organizer-1",
    });
    firestore.update("eventSeatLedgers/event-1", {policyHash: "f".repeat(64)});
    await assert.rejects(noOp("bad-policy-noop-0001"),
      (error) => error instanceof HttpsError &&
        error.code === "failed-precondition");
    assert.equal(noOpReceipt("bad-policy-noop-0001"), undefined);
    firestore.update("eventSeatLedgers/event-1", {
      policyHash: policy.policyHash,
    });
    firestore.update(reservationPath, {identityRevision: 2});
    await assert.rejects(noOp("bad-reservation-noop-0001"),
      (error) => error instanceof HttpsError &&
        error.code === "failed-precondition");
    assert.equal(noOpReceipt("bad-reservation-noop-0001"), undefined);
    assert.equal(firestore.get("eventSeatLedgers/event-1")?.occupied, 1);
    assert.equal(firestore.get("eventAttendees/attendee-1")?.status,
      "registered");
  });


test("roster import retries current event and manager authority before writes",
  async () => {
    for (const change of ["cancel", "revoke", "move"] as const) {
      const firestore = new FakeFirestore({
        "events/event-1": {organizerId: "organizer-1",
          status: "active"},
        "organizers/organizer-1": {hostUserId: "host-1",
          ownerUserId: "host-1", hostUserIds: ["host-1"], hostProfiles: []},
        "organizers/organizer-2": {hostUserId: "other",
          ownerUserId: "other", hostUserIds: ["other"], hostProfiles: []},
      });
      const payload = {eventId: "event-1", importKey: `race-${change}`,
        fileName: "roster.csv", format: "csv" as const, rows: [{
          rowId: "guest-1", displayName: "Example Guest",
          phone: "+919876543210", email: null, externalReference: null,
          arrivalGroup: null, ticketType: null, status: "registered" as const,
        }]};
      const attendeePath = `eventAttendees/${eventAttendeeId("event-1",
        "phone:+919876543210")}`;
      let triggered = false;
      firestore.afterRead = (path) => {
        if (path !== attendeePath) return;
        firestore.afterRead = null;
        triggered = true;
        if (change === "cancel") {
          firestore.update("events/event-1", {status: "cancelled"});
        } else if (change === "move") {
          firestore.update("events/event-1", {organizerId: "organizer-2"});
        } else {
          firestore.update("organizers/organizer-1", {hostUserId: "other",
            ownerUserId: "other", hostUserIds: ["other"]});
        }
      };
      await assert.rejects(importEventAttendeesForHost({hostUid: "host-1",
        payload}, {firestore: () => firestore as never,
        checkRateLimit: async () => undefined,
        timestamp: () => admin.firestore.Timestamp.fromMillis(1000)}),
      (error) => error instanceof HttpsError &&
        error.code === (change === "cancel" ? "failed-precondition" :
          "permission-denied"));
      assert.equal(triggered, true);
      assert.equal(firestore.get(attendeePath), undefined);
    }
  });

function sourceImportFixture() {
  const now = admin.firestore.Timestamp.fromMillis(1000);
  const event = {organizerId: "organizer-1",
    status: "active", capacityLimit: 1, bookedCount: 0,
    constraints: {minAge: 0, maxAge: 99, maxMen: null, maxWomen: null}};
  const policy = deriveEventSeatPolicy(event);
  const firestore = new FakeFirestore({
    "events/event-1": event,
    "organizers/organizer-1": {ownerUserId: "host-1",
      hostUserIds: ["host-1"], hostProfiles: []},
    "organizerFormResponses/source": {status: "submitted", actorActive: true},
    "eventSeatMigrationFences/event-1": {eventId: "event-1",
      migrationRevision: 1, state: "ready"},
    "eventSeatLedgers/event-1": {eventId: "event-1", capacity: 1,
      occupied: 0, revision: 1, capacityRevision: 1,
      policyVersion: policy.policyVersion, policyHash: policy.policyHash,
      migrationRevision: 1, state: "ready"},
    "payments/control": {status: "captured"},
  });
  const db = firestore as unknown as FirebaseFirestore.Firestore;
  const payload = {eventId: "event-1", importKey: "source-import",
    fileName: "Source handoff", format: "manual" as const, rows: [{
      rowId: "source", displayName: "Synthetic Person",
      phone: null, email: "synthetic@example.com", externalReference: "source",
      arrivalGroup: null, ticketType: null, status: "registered" as const,
    }]};
  const checks: boolean[] = [];
  const authorizeSource = async (tx: FirebaseFirestore.Transaction,
    replayed: boolean) => {
    checks.push(replayed);
    const source = await tx.get(db.collection("organizerFormResponses")
      .doc("source"));
    if (!source.data()?.actorActive) {
      throw new HttpsError("permission-denied", "Actor revoked.");
    }
    if (!replayed && source.data()?.status !== "submitted") {
      throw new HttpsError("failed-precondition", "Source withdrawn.");
    }
  };
  const run = (changes: Partial<typeof payload> = {}, commitSource?: (
    tx: FirebaseFirestore.Transaction, importId: string,
    canonicalPayload: ImportEventAttendeesCallablePayload, payloadHash: string
  ) => void) =>
    importEventAttendeesForHost({hostUid: "host-1", authorizeSource,
      commitSource,
      payload: {...payload, ...changes}}, {firestore: () => db,
      checkRateLimit: async () => undefined, timestamp: () => now});
  return {firestore, run, checks};
}

test("private source completion shares the attendee and receipt commit",
  async () => {
    const h = sourceImportFixture();
    await assert.rejects(h.run({}, () => {
      throw new Error("draft revision changed");
    }), /draft revision changed/u);
    assert.equal(h.firestore.entries("eventAttendees").length, 0);
    assert.equal(h.firestore.entries("eventAttendeeImports").length, 0);
    const first = await h.run({}, (tx, importId, canonicalPayload,
      payloadHash) => {
      assert.equal(canonicalPayload.rows[0].displayName, "Synthetic Person");
      assert.match(payloadHash, /^[a-f0-9]{64}$/u);
      tx.set((h.firestore as unknown as FirebaseFirestore.Firestore)
        .collection("hostRosterIntakeSessions").doc("synthetic"),
      {state: "applied", importId});
    });
    assert.equal(h.firestore.get("hostRosterIntakeSessions/synthetic")
      ?.importId, first.importId);
    assert.equal(h.firestore.entries("eventAttendeeImports").length, 1);
    assert.equal(h.firestore.entries("eventAttendees").length, 1);
    assert.deepEqual(await h.run({}, () => {
      throw new Error("must not write on replay");
    }), {...first, replayed: true});
  });

test("source adapter retries authority before attendee and seat writes",
  async () => {
    const h = sourceImportFixture();
    h.firestore.afterRead = (path) => {
      if (!path.startsWith("eventAttendees/")) return;
      h.firestore.afterRead = null;
      h.firestore.update("organizerFormResponses/source",
        {status: "withdrawn"});
    };
    await assert.rejects(h.run(), {code: "failed-precondition"});
    assert.deepEqual(h.checks, [false, false]);
    assert.equal(h.firestore.entries("eventAttendees").length, 0);
    assert.equal(h.firestore.entries("eventAttendeeImports").length, 0);
    assert.equal(h.firestore.entries("eventSeatReservations").length, 0);
    assert.equal(h.firestore.entries("eventSeatRequestReceipts").length, 0);
    assert.equal(h.firestore.get("eventSeatLedgers/event-1")?.occupied, 0);
    assert.equal(h.firestore.get("events/event-1")?.bookedCount, 0);
    assert.deepEqual(h.firestore.get("payments/control"), {status: "captured"});
  });

test("source adapter preserves admitted replay without cancelling its seat",
  async () => {
    const h = sourceImportFixture();
    const admitted = await h.run();
    const attendees = h.firestore.entries("eventAttendees");
    const reservations = h.firestore.entries("eventSeatReservations");
    h.firestore.update("organizerFormResponses/source",
      {status: "withdrawn"});
    assert.deepEqual(await h.run(), {...admitted, replayed: true});
    assert.deepEqual(h.checks, [false, true]);
    await assert.rejects(h.run({importKey: "new-import"}),
      {code: "failed-precondition"});
    assert.deepEqual(h.firestore.entries("eventAttendees"), attendees);
    assert.deepEqual(h.firestore.entries("eventSeatReservations"),
      reservations);
    assert.equal(h.firestore.get("eventSeatLedgers/event-1")?.occupied, 1);
    assert.equal(h.firestore.get("events/event-1")?.bookedCount, 1);
    assert.deepEqual(h.firestore.get("payments/control"), {status: "captured"});
    h.firestore.update("organizerFormResponses/source", {actorActive: false});
    await assert.rejects(h.run(), {code: "permission-denied"});
    assert.deepEqual(h.firestore.entries("eventAttendees"), attendees);
    assert.deepEqual(h.firestore.entries("eventSeatReservations"),
      reservations);
  });
