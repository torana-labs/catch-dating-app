import {describe, expect, it} from "vitest";
import type {AccountAction} from "../api/accountSafetyRepository";
import {
  accountActionFacts,
  accountActionRows,
  dueLabel,
  filterSafetyCases,
  safetyCaseCounts,
  safetyCaseRows,
} from "./safetyCases";
import type {SafetyTriageRow} from "./useSafetyTriageController";

const now = Date.parse("2026-11-01T12:00:00.000Z");
const hour = 3600_000;

function triage(id: string, queueKind: SafetyTriageRow["queueKind"],
  hoursAgo: number): SafetyTriageRow {
  return {id, title: `Case ${id}`, detail: `Detail ${id}`, status: "open",
    createdAt: new Date(now - hoursAgo * hour).toISOString(),
    targetPath: `reports/${id}`, queueKind, queueLabel: queueKind};
}

describe("safety cases", () => {
  it("lists every queue with launch access, due soonest first", () => {
    const rows = safetyCaseRows([
      triage("fresh", "reports", 1),
      triage("late", "moderation", 30),
      triage("event", "event", 20),
    ], [{id: "a1", title: "Maya Shah wants to host", detail: "Delhi",
      status: "pending", createdAt: new Date(now - 72 * hour).toISOString(),
      targetPath: "accessApplications/a1"}], now);
    expect(rows.map((row) => row.key)).toEqual([
      "reports/late", "reports/event", "reports/fresh",
      "access:accessApplications/a1"]);
    expect(rows[0].due).toEqual({text: "Overdue by 6h", tone: "danger"});
    expect(rows[1].due).toEqual({text: "Due in 4 hours", tone: "danger"});
    expect(rows[3].due.text).toBe("Waiting 3 days");
    expect(safetyCaseCounts(rows)).toEqual(
      {all: 4, report: 1, flag: 1, event: 1, access: 1});
    expect(filterSafetyCases(rows, "access", "").map((row) => row.kind))
      .toEqual(["access"]);
    expect(filterSafetyCases(rows, "all", "maya")).toHaveLength(1);
  });

  it("words deadlines as the board does", () => {
    expect(dueLabel(now + 12 * hour, now))
      .toEqual({text: "Due today", tone: "warning"});
    expect(dueLabel(now + 30 * hour, now)).toEqual({text: "Due tomorrow"});
  });
});

describe("account action rows", () => {
  const ban: AccountAction = {
    actionId: "a1", uid: "user_412", displayName: "Vikram S.", kind: "ban",
    reasonCode: "unwanted_contact", reasonLabel: "Unwanted contact",
    messageToUser: "x", durationDays: null,
    startsAtMillis: Date.parse("2026-10-12T10:00:00Z"), endsAtMillis: null,
    status: "active", decidedByUid: "owner", decidedByRole: "owner",
    automatic: false, appealable: true, caseTargetPaths: [],
    appeal: {status: "open", text: "Please", submittedAtMillis: now,
      reviewerUid: null, decidedAtMillis: null, decisionNote: null},
    bookings: {cancelled: 1, needsOrganizer: 1, failed: 0},
    blockedSignupAttempts: 1, canReviewAppeal: true,
  };

  it("shows what was done, until when and where it stands", () => {
    const [row] = accountActionRows([ban]);
    expect(row.action.label).toBe("Ban");
    expect(row.until).toBe("Permanent");
    expect(row.state).toEqual({text: "Appealed", tone: "warning"});
    const restrict = accountActionRows([{...ban, kind: "restrict",
      appeal: null, automatic: true,
      endsAtMillis: Date.parse("2026-11-08T09:00:00Z")}])[0];
    expect(restrict.until).toBe("Until 8 Nov");
    expect(restrict.state.text).toBe("Pending review");
  });

  it("lists bookings and blocked sign-ups for a ban", () => {
    const facts = accountActionFacts(ban);
    expect(facts.find((fact) => fact.label === "Bookings")?.value)
      .toBe("1 cancelled · 1 for the organizer to refund");
    expect(facts.find((fact) => fact.label === "New accounts"))
      .toEqual({label: "New accounts", value: "1 blocked", tone: "danger"});
  });
});
