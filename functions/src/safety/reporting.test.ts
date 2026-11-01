import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError} from "firebase-functions/v2/https";
import {Timestamp} from "firebase-admin/firestore";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {normalizeReportText, reportUserHandler} from "./reporting";

test("normalizeReportText trims and bounds optional text", () => {
  assert.equal(normalizeReportText("  harassment  ", 64), "harassment");
  assert.equal(normalizeReportText("   ", 64), undefined);
  assert.equal(normalizeReportText("abcdef", 3), "abc");
});

test("reportUserHandler rejects self reports", async () => {
  await assert.rejects(
    reportUserHandler(
      {
        auth: {uid: "user-1"},
        data: {targetUserId: "user-1"},
      } as never,
      createReportingDeps()
    ),
    (error) =>
      error instanceof HttpsError && error.code === "invalid-argument"
  );
});

test("reportUserHandler files an acknowledged report with deadlines",
  async () => {
    const db = new FakeFirestore({});
    const now = Timestamp.fromMillis(Date.UTC(2026, 10, 1));
    const result = await reportUserHandler(
      {
        auth: {uid: "reporter-1"},
        data: {
          targetUserId: " target-1 ",
          source: " chat ",
          reasonCode: " harassment ",
          contextId: " match-1 ",
          notes: "   ",
        },
      } as never,
      createReportingDeps(db, now)
    );

    assert.deepEqual(result, {reported: true});
    const [[path, report]] = [...db.docs.entries()]
      .filter(([key]) => key.startsWith("reports/"));
    assert.equal(report.reporterUserId, "reporter-1");
    assert.equal(report.targetUserId, "target-1");
    assert.equal(report.source, "chat");
    assert.equal(report.status, "open");
    assert.equal(report.severity, "standard");
    assert.equal(report.reasonCode, "harassment");
    assert.equal(report.contextId, "match-1");
    assert.equal("notes" in report, false);
    assert.equal((report.acknowledgedAt as Timestamp).toMillis(),
      now.toMillis());
    assert.equal((report.firstLookDueAt as Timestamp).toMillis(),
      now.toMillis() + 24 * 3600_000);
    assert.equal(report.takedownDueAt, null);
    const reportId = path.split("/")[1];
    assert.equal(db.getDoc(
      `accountSafetyNotices/reporter-1/items/report-received-${reportId}`
    )?.kind, "reportReceived");
  }
);

test("reportUserHandler keeps an unknown source as a profile report",
  async () => {
    const db = new FakeFirestore({});
    await reportUserHandler(
      {
        auth: {uid: "reporter-1"},
        data: {targetUserId: "target-1", source: "elsewhere",
          notes: "x".repeat(2000)},
      } as never,
      createReportingDeps(db, Timestamp.now())
    );
    const [report] = [...db.docs.entries()]
      .filter(([key]) => key.startsWith("reports/")).map(([, doc]) => doc);
    assert.equal(report.source, "profile");
    assert.equal(String(report.notes).length, 1000);
  }
);

function createReportingDeps(db: FakeFirestore = new FakeFirestore({}),
  now: Timestamp = Timestamp.now()) {
  return {
    firestore: () => db,
    now: () => now,
    accountActions: {} as never,
  } as never;
}
