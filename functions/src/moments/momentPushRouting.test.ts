import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import test from "node:test";
import type {Message} from "firebase-admin/messaging";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {buildFcmMessage} from "../shared/notifications";
import {ensureEventDefaultMoments} from "./momentDefaults";
import {momentToDocument} from "./momentDocuments";
import type {MomentDefinition} from "./momentModel";
import {runMomentSweep} from "./momentRunner";
import {buildMomentRunnerDeps} from "./momentWiring";

const NOW = 1_700_000_000_000;
const fixture = JSON.parse(readFileSync(resolve(__dirname,
  "../../../test/chats/fixtures/moment_push_payloads.json"), "utf8")) as
  Record<string, Record<string, string>>;

// The shared program fake intentionally models flat collections. Add only
// the SDK's nested notification reference spelling for this boundary test.
class NotificationFirestore extends FakeFirestore {
  override collection(path: string) {
    const collection = super.collection(path);
    const doc = collection.doc.bind(collection);
    collection.doc = (id) => {
      const ref = doc(id);
      return Object.assign(ref, {
        collection: (child: string) => this.collection(`${ref.path}/${child}`),
      });
    };
    return collection;
  }
}

function setup(event: Record<string, unknown> = {
  organizerId: "canonical-org",
}) {
  const db = new NotificationFirestore({
    "events/evt": {status: "active", startTime: NOW + 900_000,
      endTime: NOW + 4_500_000, revision: 1, ...event},
    "eventParticipations/one":
      {eventId: "evt", uid: "one", status: "signedUp"},
    "users/one": {fcmToken: "token-one"},
  });
  const messages: Message[] = [];
  const deps = buildMomentRunnerDeps({firestore: () => db as never,
    nowMillis: () => NOW, quietEndMillis: () => null,
    quietHoursFor: () => null, dailyCapFor: () => 0,
    localDayKey: () => "day", localMinuteOfDay: () => 720,
    sendNotification: async (params) => {
      messages.push(buildFcmMessage(params));
    }});
  const provisionAndSweep = async () => {
    const provision = await ensureEventDefaultMoments({
      firestore: () => db as never, nowMillis: () => NOW,
      timestampFromMillis: (millis) => millis,
    });
    assert.equal(provision.created, 1);
    const result = await runMomentSweep(deps);
    assert.equal(result.runsFired, 1);
    assert.equal(result.runsFailed + result.momentsFailed, 0);
  };
  const activity = (uid = "one") => [...db.docs.entries()].filter(([path]) =>
    path.startsWith(`notifications/${uid}/items/`)).map(([, row]) => row);
  return {db, deps, messages, provisionAndSweep, activity};
}

test("provisioned event reminder encodes the Consumer's canonical route",
  async () => {
    const h = setup();
    await h.provisionAndSweep();
    assert.equal(h.messages.length, 1);
    assert.deepEqual(h.messages[0].data, fixture.canonical);
    assert.equal((h.messages[0] as {token: string}).token, "token-one");
    assert.equal(h.activity()[0].organizerId, "canonical-org");
    assert.equal(h.activity()[0].eventId, "evt");
  });

test("only absent canonical organizer permits legacy fallback", async () => {
  const h = setup({organizerId: "legacy-org"});
  await h.provisionAndSweep();
  assert.deepEqual(h.messages[0].data, fixture.legacy);
  assert.equal(h.activity()[0].organizerId, "legacy-org");
});

for (const invalid of [null, 7, "", " ", ".", "..", "a/b", "a\\b",
  "a?b", "a#b", "%2e%2e", "a%2fb", "a:b", " a", "a ",
  "org\n", "org\r", "org\t"]) {
  test(`invalid canonical organizer ${JSON.stringify(invalid)} withholds FCM`,
    async () => {
      const h = setup({organizerId: invalid});
      await h.provisionAndSweep();
      assert.deepEqual(h.messages, []);
      assert.equal(h.activity().length, 1);
      assert.equal(h.activity()[0].organizerId, undefined);
      assert.equal(h.activity()[0].eventId, undefined);
    });
}

for (const event of [{}, {organizerId: "unsafe/legacy"}]) {
  test(`unroutable legacy context ${JSON.stringify(event)} retains activity`,
    async () => {
      const h = setup(event);
      await h.provisionAndSweep();
      assert.deepEqual(h.messages, []);
      assert.equal(h.activity().length, 1);
    });
}

for (const length of [180, 181]) {
  for (const field of ["organizerId", "eventId"]) {
    test(`${field} routing obeys activity contract at length ${length}`,
      async () => {
        const value = "a".repeat(length);
        const organizerId = field === "organizerId" ? value : "canonical-org";
        const eventId = field === "eventId" ? value : "evt";
        const h = setup({organizerId});
        h.db.setDoc(`events/${eventId}`, {organizerId});
        await h.deps.sendPushToUid({uid: "one", appRole: "consumer",
          title: "Reminder", body: "Soon", notificationType: "eventReminder",
          preferenceKey: "eventReminders", scope: {kind: "event", eventId},
          runId: "bounded-run", recipientKey: "uid:one"});
        assert.equal(h.activity().length, 1);
        if (length === 180) {
          assert.equal(h.messages.length, 1);
          assert.equal(h.messages[0].data?.[field], value);
          assert.equal(h.activity()[0][field], value);
        } else {
          assert.deepEqual(h.messages, []);
          assert.equal(h.activity()[0].organizerId, undefined);
          assert.equal(h.activity()[0].eventId, undefined);
        }
      });
  }
}

for (const user of [{fcmToken: "token-one", prefsEventReminders: false}, {}]) {
  test(`push eligibility ${JSON.stringify(user)} does not erase activity`,
    async () => {
      const h = setup();
      h.db.setDoc("users/one", user);
      await h.provisionAndSweep();
      assert.deepEqual(h.messages, []);
      assert.equal(h.activity().length, 1);
      assert.equal(h.activity()[0].organizerId, "canonical-org");
    });
}

test("each participant payload belongs only to its resolved UID and token",
  async () => {
    const h = setup();
    h.db.setDoc("eventParticipations/two",
      {eventId: "evt", uid: "two", status: "signedUp"});
    h.db.setDoc("users/two", {fcmToken: "token-two"});
    h.db.setDoc("eventParticipations/foreign",
      {eventId: "other-event", uid: "foreign", status: "signedUp"});
    h.db.setDoc("users/foreign", {fcmToken: "foreign-token"});
    await h.provisionAndSweep();
    assert.deepEqual(h.messages.map((message) => [message.data?.recipientUid,
      (message as {token: string}).token]),
    [["one", "token-one"], ["two", "token-two"]]);
    assert.equal(h.activity("foreign").length, 0);
  });

for (const eventId of ["missing", "../evt", "evt?next=x", "evt#other",
  "%2e%2e", "evt\\other", ".", "..", "", "evt\n", "evt\r", "evt\t"]) {
  test(`missing or unsafe event ${JSON.stringify(eventId)} retains activity`,
    async () => {
      const h = setup();
      await h.deps.sendPushToUid({uid: "one", appRole: "consumer",
        title: "Reminder", body: "Soon", notificationType: "eventReminder",
        preferenceKey: "eventReminders", scope: {kind: "event", eventId},
        runId: "synthetic-run", recipientKey: "uid:one"});
      assert.deepEqual(h.messages, []);
      assert.equal(h.activity().length, 1);
      assert.equal(h.activity()[0].eventId, undefined);
    });
}

for (const kind of ["push", "staffAttention"] as const) {
  test(`event-scoped staff ${kind} stays Host through actual runner`,
    async () => {
      const h = setup();
      h.db.setDoc("users/staff", {fcmToken: "token-staff"});
      h.db.setDoc("eventStaffGrants/staff", {eventId: "evt", uid: "staff",
        status: "active", duties: [{duty: "functionCheckIn"}]});
      const staff: MomentDefinition = {
        momentId: kind === "push" ? "staff_push" : "staff_attention",
        scope: {kind: "event", eventId: "evt"}, name: "Staff reminder",
        initiation: {kind: "scheduled", atMillis: NOW}, sense: "audience",
        audience: {kind: "staffDuty", duty: "functionCheckIn", scopeIds: null},
        action: kind === "push" ? {kind: "push",
          notificationType: "eventReminder", preferenceKey: "eventReminders"} :
          {kind: "staffAttention", duty: "functionCheckIn", severity: "warning",
            titleTemplate: "Staff reminder"},
        status: "armed", approval: {approvedByUid: "manager",
          approvedAtMillis: NOW}, origin: "organizer", revision: 1,
      };
      h.db.setDoc(`organizerMoments/${staff.momentId}`,
        momentToDocument(staff, NOW, true));
      assert.equal((await runMomentSweep(h.deps)).runsFired, 1);
      assert.equal(h.messages.length, 1);
      assert.deepEqual(h.messages[0].data,
        fixture[kind === "push" ? "staffPush" : "staffAttention"]);
      assert.equal((h.messages[0] as {token: string}).token, "token-staff");
      assert.equal(h.activity("staff").length, 1);
      assert.equal(h.activity("one").length, 0);
    });
}
