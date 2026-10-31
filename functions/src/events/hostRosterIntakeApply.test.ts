import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import type {Transaction} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {EventAttendeeDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  applyHostRosterIntake,
  currentRow,
  HostRosterIntakeApplyDeps,
  HostRosterIntakeManageDeps,
  manageHostRosterIntakeHandler,
} from "./hostRosterIntakeApply";
import {
  createHostRosterIntakeDraft,
  previewHostRosterIntake,
  reviseHostRosterIntakeDraft,
} from "./hostRosterIntakeCore";
import type {HostRosterAppliedReview} from
  "./hostRosterIntakeSessionStore";

function fixture() {
  return createHostRosterIntakeDraft({hostUid: "host-1",
    organizerId: "organizer-1", eventId: "event-1",
    fileFingerprint: "d".repeat(64), fileName: "guests.csv",
    format: "csv", headers: ["Name", "Attendee ID"],
    mapping: {displayName: 0, externalReference: 1}, rows: [{
      value: {rowId: "2", displayName: "Asha Shah",
        externalReference: "ticket-7", status: "registered"},
      sourceRowNumber: 2,
      fields: {displayName: {column: 0, header: "Name", origin: "upload",
        confidence: null}, externalReference: {column: 1,
        header: "Attendee ID", origin: "upload", confidence: null}},
      rawCells: ["Asha Shah", "ticket-7"],
    }]});
}

test("one approval applies once and a lost response replays its receipt",
  async () => {
    let draft = fixture();
    const preview = previewHostRosterIntake({draft, currentRows: new Map()});
    let receipt: HostRosterAppliedReview | null = null;
    let writes = 0;
    const tx = {} as Transaction;
    const deps: HostRosterIntakeApplyDeps = {
      store: {
        get: async () => draft,
        getAppliedReview: async () => receipt,
        prepareCompletion: async (input) => {
          assert.equal(input.expectedReviewHash, preview.reviewHash);
          assert.deepEqual(await input.loadCurrentRows(tx, draft), new Map());
          if (input.replayed) {
            assert.equal(input.importId, "imp-1");
            assert.equal(draft.state, "applied");
            return () => {};
          }
          return () => {
            writes += 1;
            const appliedAtMillis = 10;
            receipt = {importId: input.importId, appliedAtMillis, preview,
              payload: input.committedPayload};
            draft = {...draft, state: "applied",
              appliedImportId: input.importId};
          };
        },
      },
      authorize: async () => undefined,
      loadInitialCurrentRows: async () => new Map(),
      loadTransactionCurrentRows: async () => new Map(),
      importCanonical: async (input) => {
        if (draft.state === "applied") {
          await input.authorizeSource(tx, true, "imp-1");
          return {importId: "imp-1", status: "completed", rowCount: 1,
            createdCount: 1, updatedCount: 0, skippedCount: 0,
            errors: [], replayed: true};
        }
        await input.authorizeSource(tx, false, "imp-1");
        await input.commitSource(tx, "imp-1", input.payload,
          "e".repeat(64));
        return {importId: "imp-1", status: "completed", rowCount: 1,
          createdCount: 1, updatedCount: 0, skippedCount: 0,
          errors: [], replayed: false};
      },
    };
    const first = await applyHostRosterIntake({hostUid: "host-1",
      sessionId: draft.sessionId, reviewHash: preview.reviewHash}, deps);
    assert.equal(first.replayed, false);
    assert.equal(writes, 1);
    const replay = await applyHostRosterIntake({hostUid: "host-1",
      sessionId: draft.sessionId, reviewHash: preview.reviewHash}, deps);
    assert.equal(replay.replayed, true);
    assert.equal(writes, 1);
    const savedReceipt = receipt as unknown as HostRosterAppliedReview;
    assert.equal(savedReceipt.payload.rows[0].displayName, "Asha Shah");
  });

test("roster document conversion retains authority and reported revenue",
  () => {
    const now = admin.firestore.Timestamp.fromMillis(1234);
    const source = {eventId: "event-1", organizerId: "organizer-1", displayName: "Asha Shah",
      searchName: "asha shah", source: "catchBooking" as const,
      status: "registered" as const, linkedUid: null, phoneE164: null,
      email: null, externalReference: "booking-1", arrivalGroup: null,
      ticketType: "General", revenueAmountMinor: 5000,
      revenueCurrency: "INR", revenueSource: "providerOrder" as const,
      importId: null, sourceRowId: null, createdAt: now, updatedAt: now,
      registeredAt: now, waitlistedAt: null, checkedInAt: null,
      cancelledAt: null, checkedInBy: null, linkedAt: null,
      inviteLinkId: null, inviteCapturedAt: null, attendanceRevision: 0,
      preCheckInStatus: null} satisfies EventAttendeeDocument;
    const converted = currentRow("attendee-1", source);
    assert.equal(converted.source, "catchBooking");
    assert.equal(converted.phoneE164, null);
    assert.equal(converted.revenueSource, "providerOrder");
    assert.equal(converted.updatedAtMillis, 1234);
  });

test("authenticated callable starts and previews a resumable session",
  async () => {
    let saved = fixture();
    let created = false;
    const rateLimited: string[] = [];
    const deps: HostRosterIntakeManageDeps = {
      rateLimit: async (hostUid) => {
        rateLimited.push(hostUid);
      },
      store: {
        createOrResume: async (input) => {
          if (!created) {
            saved = createHostRosterIntakeDraft(input);
            created = true;
          }
          return saved;
        },
        get: async () => saved,
        getAppliedReview: async () => null,
        revise: async (params) => {
          saved = reviseHostRosterIntakeDraft({draft: saved,
            expectedRevision: params.expectedRevision, rows: params.rows,
            excludedRowIds: params.excludedRowIds,
            mapping: params.mapping});
          return saved;
        },
        prepareCompletion: async () => {
          throw new Error("not used");
        },
      },
      authorize: async () => undefined,
      loadInitialCurrentRows: async () => new Map(),
      loadTransactionCurrentRows: async () => new Map(),
      importCanonical: async () => {
        throw new Error("not used");
      },
    };
    const response = await manageHostRosterIntakeHandler({
      auth: {uid: "host-1"},
      data: {action: "start", organizerId: "organizer-1",
        eventId: "event-1", fileFingerprint: "d".repeat(64),
        fileName: "guests.csv", format: "csv",
        headers: ["Name", "Attendee ID"],
        mapping: {displayName: 0, externalReference: 1},
        rows: fixture().rows},
    } as unknown as CallableRequest<unknown>, deps);
    assert.equal(response.draft.hostUid, "host-1");
    assert.deepEqual(rateLimited, ["host-1"]);
    assert.equal(response.preview?.counts.add, 1);
    assert.equal(response.preview?.eligibleForApply, true);
    saved = reviseHostRosterIntakeDraft({draft: saved,
      expectedRevision: 1, rows: saved.rows, excludedRowIds: ["2"]});
    const remappedRows = fixture().rows.map((row) => ({...row,
      value: {...row.value, displayName: "Asha Remapped"}}));
    const remapped = await manageHostRosterIntakeHandler({
      auth: {uid: "host-1"},
      data: {action: "start", organizerId: "organizer-1",
        eventId: "event-1", fileFingerprint: "d".repeat(64),
        fileName: "guests.csv", format: "csv",
        headers: ["Name", "Attendee ID"],
        mapping: {displayName: 0, externalReference: 1},
        rows: remappedRows},
    } as unknown as CallableRequest<unknown>, deps);
    assert.equal(remapped.draft.revision, 3);
    assert.deepEqual(remapped.draft.excludedRowIds, []);
    assert.equal(remapped.draft.rows[0].value.displayName, "Asha Remapped");
  });
