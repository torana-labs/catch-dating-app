import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import {FirestoreOperationsRepository} from
  "../operations/firestoreRepository";
import {FakeFirestore} from "../operations/testFirestore";
import {operationCollections} from "../operations/collections";
import {OperationWorkItem} from "../operations/models";
import {operationRun, operationWorkItem,
  organizerPublicationPacketWorkItem} from
  "../operations/testFixtures";
import {
  adminListIntakeOperationsHandler,
  loadOrganizerDraftLinks,
} from "./intakeOperations";

const now = "2026-07-14T09:00:00.000Z";

async function harness() {
  const firestore = new FakeFirestore();
  const repository = new FirestoreOperationsRepository(
    firestore as unknown as FirebaseFirestore.Firestore
  );
  const rateLimitCalls: string[] = [];
  await repository.createRun(operationRun({
    runId: "run:mumbai:2026-07-07",
    createdAt: "2026-07-07T08:00:00.000Z",
    updatedAt: "2026-07-07T08:00:00.000Z",
    metadata: {projection: {
      workItemCount: 1,
      activeItems: 1,
      terminalItems: 0,
      humanReviewCount: 0,
      stageCounts: {incoming: 1, verify: 0, resolve: 0, ready: 0},
    }},
  }));
  await repository.createRun(operationRun({
    runId: "run:mumbai:2026-07-14",
    metadata: {projection: {
      workItemCount: 1,
      activeItems: 1,
      terminalItems: 0,
      humanReviewCount: 1,
      stageCounts: {incoming: 0, verify: 0, resolve: 1, ready: 0},
    }},
  }));
  await repository.createRun(operationRun({
    runId: "run:zz-lexically-high-but-old",
    createdAt: "2026-06-01T08:00:00.000Z",
    updatedAt: "2026-06-01T08:00:00.000Z",
    metadata: {projection: {
      workItemCount: 0,
      activeItems: 0,
      terminalItems: 0,
      humanReviewCount: 0,
      stageCounts: {incoming: 0, verify: 0, resolve: 0, ready: 0},
    }},
  }));
  await repository.createWorkItem(operationWorkItem({
    workItemId: "work:event:old",
    runId: "run:mumbai:2026-07-07",
  }));
  await repository.createWorkItem(operationWorkItem({
    workItemId: "work:event:new",
    runId: "run:mumbai:2026-07-14",
    primaryStage: "resolve",
    lifecycleStatus: "waiting",
    taskFlags: ["human_review_required"],
    blockerCodes: ["official_source_required"],
    normalizedPayload: {title: "Current event", owner: "human"},
  }));
  return {
    repository,
    firestore,
    rateLimitCalls,
    deps: {
      firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
      repository,
      now: () => new Date(now),
      checkRateLimit: async (
        _db: FirebaseFirestore.Firestore,
        uid: string,
        action: string
      ) => {
        rateLimitCalls.push(`${uid}:${action}`);
      },
    },
  };
}

test("adminListIntakeOperations returns the latest run inventory", async () => {
  const h = await harness();
  const result = await adminListIntakeOperationsHandler(
    callableRequest("admin-1", {}, {support: true}),
    h.deps
  );

  assert.deepEqual(result.runs.map((run) => run.runId), [
    "run:mumbai:2026-07-14",
    "run:mumbai:2026-07-07",
    "run:zz-lexically-high-but-old",
  ]);
  assert.equal(result.summary.loadedRunCount, 3);
  assert.deepEqual(result.workItems.map((item) => item.workItemId), [
    "work:event:new",
  ]);
  assert.deepEqual(result.summary.stages, {
    incoming: 0,
    verify: 0,
    resolve: 1,
    ready: 0,
  });
  assert.equal(result.summary.humanReviewCount, 1);
  assert.deepEqual(h.rateLimitCalls, [
    "admin-1:adminListIntakeOperations",
  ]);
  assert.deepEqual(result.capabilities, {
    requestRuns: false,
    networkFetches: false,
    modelCalls: false,
    publicWrites: false,
    ruleDeployment: false,
  });
});

test("labels the run summary as loaded inventory when another page exists",
  async () => {
    const h = await harness();
    const result = await adminListIntakeOperationsHandler(
      callableRequest("admin-1", {runLimit: 2}, {admin: true}),
      h.deps
    );
    assert.equal(result.runs.length, 2);
    assert.equal(result.summary.loadedRunCount, 2);
    assert.ok(result.nextRunCursor);
  });

test("can inspect an exact historical operations run", async () => {
  const h = await harness();
  const result = await adminListIntakeOperationsHandler(
    callableRequest("admin-1", {
      runId: " run:mumbai:2026-07-07 ",
    }, {admin: true}),
    h.deps
  );
  assert.deepEqual(result.runs.map((run) => run.runId), [
    "run:mumbai:2026-07-07",
  ]);
  assert.deepEqual(result.workItems.map((item) => item.workItemId), [
    "work:event:old",
  ]);
});

test("can page the canonical human-review exception inventory", async () => {
  const h = await harness();
  const result = await adminListIntakeOperationsHandler(
    callableRequest("admin-1", {
      runId: "run:mumbai:2026-07-14",
      humanReviewRequired: true,
    }, {admin: true}),
    h.deps
  );
  assert.deepEqual(result.workItems.map((item) => item.workItemId), [
    "work:event:new",
  ]);
  assert.ok(result.workItems.every((item) =>
    item.taskFlags.includes("human_review_required")));
});

test("uses persisted full-run aggregates beyond the returned item page",
  async () => {
    const h = await harness();
    const run = await h.repository.getRun("run:mumbai:2026-07-14");
    assert.ok(run);
    await h.repository.saveRun({
      ...run,
      revision: 1,
      budgets: {...run.budgets, maxWorkItems: 2_500},
      metadata: {
        projection: {
          workItemCount: 2_500,
          activeItems: 2_500,
          terminalItems: 0,
          humanReviewCount: 12,
          stageCounts: {
            incoming: 400,
            verify: 1_800,
            resolve: 12,
            ready: 288,
          },
        },
      },
    }, 0);
    const result = await adminListIntakeOperationsHandler(
      callableRequest("admin-1", {}, {admin: true}),
      h.deps
    );
    assert.equal(result.workItems.length, 1);
    assert.equal(result.summary.workItemCount, 2_500);
    assert.equal(result.summary.humanReviewCount, 12);
    assert.deepEqual(result.summary.stages, {
      incoming: 400,
      verify: 1_800,
      resolve: 12,
      ready: 288,
    });
  });

test("fails closed when projection aggregates exceed the frozen run budget",
  async () => {
    const h = await harness();
    const run = await h.repository.getRun("run:mumbai:2026-07-14");
    assert.ok(run);
    await h.repository.saveRun({
      ...run,
      revision: 1,
      metadata: {projection: {
        workItemCount: run.budgets.maxWorkItems + 1,
        activeItems: run.budgets.maxWorkItems + 1,
        terminalItems: 0,
        humanReviewCount: 0,
        stageCounts: {
          incoming: run.budgets.maxWorkItems + 1,
          verify: 0,
          resolve: 0,
          ready: 0,
        },
      }},
    }, 0);
    await assert.rejects(
      adminListIntakeOperationsHandler(
        callableRequest("admin-1", {}, {admin: true}),
        h.deps
      ),
      (error: unknown) => {
        assert.equal((error as {code?: string}).code, "failed-precondition");
        return true;
      }
    );
  });

test("fails closed without authoritative full-run projection aggregates",
  async () => {
    const h = await harness();
    const run = await h.repository.getRun("run:mumbai:2026-07-14");
    assert.ok(run);
    await h.repository.saveRun({
      ...run,
      revision: 1,
      metadata: {},
    }, 0);
    await assert.rejects(
      adminListIntakeOperationsHandler(
        callableRequest("admin-1", {}, {admin: true}),
        h.deps
      ),
      (error: unknown) => {
        assert.equal(
          (error as {code?: string}).code,
          "failed-precondition"
        );
        return true;
      }
    );
  });

test("reports a non-Supply stage as unavailable in the read projection",
  async () => {
    const h = await harness();
    const item = await h.repository.getWorkItem("work:event:new");
    assert.ok(item);
    await h.repository.saveWorkItem({
      ...item, revision: item.revision + 1, primaryStage: "approve",
      updatedAt: now,
    }, item.revision);
    const result = await adminListIntakeOperationsHandler(
      callableRequest("admin-1", {}, {admin: true}), h.deps
    );
    assert.deepEqual(result.workItems, []);
    assert.equal(result.workItemPage.scannedCount, 1);
    assert.deepEqual(result.workItemPage.unavailableRecords, [{
      documentId: item.workItemId, reason: "unsupported_stage",
      issues: [{path: "primaryStage", code: "unsupported_stage"}],
      issuesTruncated: false,
    }]);
    assert.equal(result.summary.workItemCount, 1);
  });

test("adminListIntakeOperations rejects non-operator admin roles", async () => {
  const h = await harness();
  await assert.rejects(
    adminListIntakeOperationsHandler(
      callableRequest("viewer-1", {}, {salesStaff: true}),
      h.deps
    ),
    (error: unknown) => {
      assert.equal((error as {code?: string}).code, "permission-denied");
      return true;
    }
  );
});

test("rejects lifecycle values as operations stages", async () => {
  const h = await harness();
  await assert.rejects(
    adminListIntakeOperationsHandler(
      callableRequest("admin-1", {primaryStage: "published"}, {admin: true}),
      h.deps
    ),
    (error: unknown) => {
      assert.equal((error as {code?: string}).code, "invalid-argument");
      return true;
    }
  );
});

test("rejects unindexed human-review filter combinations", async () => {
  const h = await harness();
  await assert.rejects(
    adminListIntakeOperationsHandler(
      callableRequest("admin-1", {
        humanReviewRequired: true,
        primaryStage: "resolve",
      }, {admin: true}),
      h.deps
    ),
    (error: unknown) => {
      assert.equal((error as {code?: string}).code, "invalid-argument");
      return true;
    }
  );
});

test("keeps organizer draft links across immutable operation runs",
  async () => {
    const candidateId = "candidate-courtside";
    const normalizedKey = "domain:courtside.example";
    const currentWorkItemId = "work:courtside:2026-07-26";
    const item = operationWorkItem({
      workItemId: currentWorkItemId,
      entityKind: "organizer",
      externalKey: candidateId,
      normalizedPayload: {
        intake: {
          recordType: "organizer_search_candidate",
          candidate: {
            candidateId,
            canonicalUrl: "https://courtside.example/",
            normalizedKey,
          },
        },
      },
    });
    const db = {
      collection: (collectionId: string) => ({
        doc: (documentId: string) => ({
          id: documentId,
          path: `${collectionId}/${documentId}`,
        }),
      }),
      getAll: async (...refs: Array<{id: string; path: string}>) =>
        refs.map((ref) => ({
          id: ref.id,
          exists: true,
          data: () => ({
            operationType: "create_entity_draft",
            sourceWorkItemId: "work:courtside:prior-run",
            sourceCandidateId: candidateId,
            sourceNormalizedKey: normalizedKey,
            entityId: "courtside",
          }),
          ref: {path: ref.path},
        })),
    } as unknown as FirebaseFirestore.Firestore;

    const links = await loadOrganizerDraftLinks(db, [item]);
    assert.equal(links.length, 1);
    assert.deepEqual({
      ...links[0],
      curationPath: undefined,
    }, {
      workItemId: currentWorkItemId,
      candidateId,
      organizerId: "courtside",
      curationPath: undefined,
    });
    assert.match(
      links[0].curationPath,
      /^organizerIntakeCurationDecisions\/create-draft-[a-f0-9]{64}$/
    );
  });

function callableRequest(
  uid: string | null,
  data: Record<string, unknown>,
  token: Record<string, unknown> = {}
): CallableRequest<unknown> {
  return {
    auth: uid ? {uid, token} as CallableRequest["auth"] : undefined,
    data,
    rawRequest: {headers: {}} as CallableRequest["rawRequest"],
  } as CallableRequest<unknown>;
}

function packet(item: OperationWorkItem) {
  return (item.normalizedPayload.intake as {packet: {
    publicPresence: Record<string, unknown>;
    adminDecision: Record<string, unknown>;
  }}).packet;
}

function legacyPacket(id: string, variant: "presence" | "decision") {
  const item = organizerPublicationPacketWorkItem({workItemId: id});
  if (variant === "presence") {
    delete packet(item).publicPresence.publishStatus;
  } else {
    packet(item).adminDecision.currentDecision = {
      decision: "hold", decidedAt: now, appVisibility: "hidden",
    };
  }
  return item;
}

test("mixed malformed packets retain healthy rows and full-run summaries",
  async () => {
    const h = await harness();
    const records = [legacyPacket("work:a", "presence"),
      legacyPacket("work:b", "decision")];
    for (const item of records) {
      h.firestore.write(`${operationCollections.workItems}/${item.workItemId}`,
        {...item});
    }
    const run = (await h.repository.getRun("run:mumbai:2026-07-14"))!;
    await h.repository.saveRun({...run, revision: 1, metadata: {projection: {
      workItemCount: 3, activeItems: 3, terminalItems: 0, humanReviewCount: 1,
      stageCounts: {incoming: 2, verify: 0, resolve: 1, ready: 0},
    }}}, 0);
    const before = h.firestore.entries();
    const read = (workItemCursor?: string | null) =>
      adminListIntakeOperationsHandler(callableRequest("admin-1", {
        workItemLimit: 2, workItemCursor,
      }, {admin: true}), h.deps);
    const first = await read();
    assert.deepEqual(first.workItems, []);
    assert.equal(first.workItemPage.scannedCount, 2);
    assert.equal(first.nextWorkItemCursor, "work:b");
    assert.deepEqual(first.workItemPage.unavailableRecords.map((row) =>
      [row.documentId, row.reason]), [
      ["work:a", "invalid_record"], ["work:b", "invalid_record"],
    ]);
    assert.ok(first.workItemPage.unavailableRecords[0].issues.some((issue) =>
      issue.path.endsWith("/publicPresence/publishStatus") &&
      issue.code === "schema_required"));
    for (const field of ["publishStatus", "indexStatus"]) {
      assert.ok(first.workItemPage.unavailableRecords[1].issues.some((issue) =>
        issue.path.endsWith(`/currentDecision/${field}`) &&
        issue.code === "schema_required"));
    }
    const second = await read(first.nextWorkItemCursor);
    assert.deepEqual(second.workItems.map((item) => item.workItemId),
      ["work:event:new"]);
    assert.equal(second.workItemPage.scannedCount, 1);
    assert.deepEqual(second.workItemPage.unavailableRecords, []);
    assert.equal(second.nextWorkItemCursor, null);
    for (const page of [first, second]) {
      assert.equal(page.summary.workItemCount, 3);
      assert.equal(page.summary.humanReviewCount, 1);
      assert.deepEqual(page.summary.stages,
        {incoming: 2, verify: 0, resolve: 1, ready: 0});
      assert.deepEqual(page.organizerDraftLinks, []);
    }
    assert.deepEqual(h.firestore.entries(), before);
  });

test("human-review filtering reports invalid exceptions without ordinary rows",
  async () => {
    const h = await harness();
    const item = legacyPacket("work:a", "decision");
    item.taskFlags = ["human_review_required"];
    h.firestore.write(`${operationCollections.workItems}/${item.workItemId}`,
      {...item});
    const ordinary = legacyPacket("work:b", "presence");
    h.firestore.write(
      `${operationCollections.workItems}/${ordinary.workItemId}`,
      {...ordinary});
    const result = await adminListIntakeOperationsHandler(
      callableRequest("admin-1", {humanReviewRequired: true}, {support: true}),
      h.deps
    );
    assert.deepEqual(result.workItems.map((row) => row.workItemId),
      ["work:event:new"]);
    assert.equal(result.workItemPage.scannedCount, 2);
    assert.deepEqual(result.workItemPage.unavailableRecords.map((row) =>
      row.documentId), ["work:a"]);
  });

test("explicit nulls remain valid and missing nullable fields are unavailable",
  async () => {
    const h = await harness();
    const healthy = organizerPublicationPacketWorkItem({workItemId: "work:a"});
    await h.repository.createWorkItem(healthy);
    const nullableFields = ["canonicalPath", "claimTargetPath",
      "currentDecision"] as const;
    for (const field of nullableFields) {
      const invalid = organizerPublicationPacketWorkItem({
        workItemId: `work:missing:${field}`,
      });
      const value = packet(invalid);
      delete (field === "currentDecision" ? value.adminDecision :
        value.publicPresence)[field];
      h.firestore.write(
        `${operationCollections.workItems}/${invalid.workItemId}`,
        {...invalid});
    }
    const linkedItems: string[] = [];
    const result = await adminListIntakeOperationsHandler(
      callableRequest("admin-1", {}, {admin: true}), {
        ...h.deps, loadOrganizerDraftLinks: async (_db, items) => {
          linkedItems.push(...items.map((row) => row.workItemId));
          return [];
        },
      }
    );
    assert.deepEqual(result.workItems.map((row) => row.workItemId),
      ["work:a", "work:event:new"]);
    assert.deepEqual(linkedItems, ["work:a", "work:event:new"]);
    assert.equal(result.workItemPage.scannedCount, 5);
    assert.equal(result.workItemPage.unavailableRecords.length, 3);
    assert.deepEqual(result.workItems[0], healthy);
  });

test("callable auth, input, rate-limit and query failures still propagate",
  async () => {
    const h = await harness();
    await assert.rejects(adminListIntakeOperationsHandler(
      callableRequest(null, {}, {}), h.deps
    ), {code: "unauthenticated"});
    await assert.rejects(adminListIntakeOperationsHandler(
      callableRequest("viewer", {}, {salesStaff: true}), h.deps
    ), {code: "permission-denied"});
    await assert.rejects(adminListIntakeOperationsHandler(
      callableRequest("admin-1", {workItemLimit: 201}, {admin: true}), h.deps
    ), {code: "invalid-argument"});
    const failure = new Error("synthetic transport failure");
    await assert.rejects(adminListIntakeOperationsHandler(
      callableRequest("admin-1", {}, {admin: true}), {
        ...h.deps, checkRateLimit: async () => {
          throw failure;
        },
      }
    ), (error) => error === failure);
    h.repository.listWorkItemsForAdmin = async () => {
      throw failure;
    };
    await assert.rejects(adminListIntakeOperationsHandler(
      callableRequest("admin-1", {}, {admin: true}), h.deps
    ), (error) => error === failure);
  });


test("callable preserves healthy rows beside identity and scope mismatches",
  async () => {
    for (const [field, value, reason] of [
      ["workItemId", "work:alias", "document_id_mismatch"],
      ["workflowId", "another-workflow", "scope_mismatch"],
      ["runId", "run:other", "scope_mismatch"],
    ]) {
      const h = await harness();
      const healthy = (await h.repository.getWorkItem("work:event:new"))!;
      const query = {
        where: () => query, orderBy: () => query, limit: () => query,
        get: async () => ({docs: [
          {id: "work:a", data: () => ({...healthy, workItemId: "work:a",
            [field]: value})},
          {id: healthy.workItemId, data: () => healthy},
        ]}),
      };
      const db = {collection: (path: string) =>
        path === operationCollections.workItems ? query :
          h.firestore.collection(path)} as unknown as
            FirebaseFirestore.Firestore;
      const result = await adminListIntakeOperationsHandler(
        callableRequest("admin-1", {}, {admin: true}), {
          ...h.deps, firestore: () => db,
          repository: new FirestoreOperationsRepository(db),
        }
      );
      assert.deepEqual(result.workItems, [healthy]);
      assert.equal(result.workItemPage.scannedCount, 2);
      assert.deepEqual(result.workItemPage.unavailableRecords, [{
        documentId: "work:a", reason,
        issues: [{path: field, code: reason}], issuesTruncated: false,
      }]);
    }
  });

test("missing runs produce an empty scanned page without invented totals",
  async () => {
    const h = await harness();
    const result = await adminListIntakeOperationsHandler(
      callableRequest("admin-1", {runId: "run:missing"}, {admin: true}), h.deps
    );
    assert.deepEqual(result.workItemPage,
      {scannedCount: 0, unavailableRecords: []});
    assert.deepEqual(result.workItems, []);
    assert.equal(result.summary.workItemCount, 0);
    assert.equal(result.nextWorkItemCursor, null);
  });

test("missing packet fields remain rejected by strict repository writes",
  async () => {
    for (const variant of ["presence", "decision"] as const) {
      const h = await harness();
      const item = legacyPacket("work:malformed", variant);
      const before = h.firestore.entries();
      await assert.rejects(h.repository.createWorkItem(item),
        {code: "invalid_entity"});
      await assert.rejects(h.repository.saveWorkItem({...item, revision: 1}, 0),
        {code: "invalid_entity"});
      assert.deepEqual(h.firestore.entries(), before);
    }
  });


test("raw document cursors preserve leading, trailing and standalone spaces",
  async () => {
    for (const id of [" work:a", "work:a ", " "]) {
      const h = await harness();
      h.firestore.write(`${operationCollections.workItems}/${id}`,
        {...operationWorkItem({workItemId: "work:a"})});
      const read = (workItemCursor?: string | null) =>
        adminListIntakeOperationsHandler(callableRequest("admin-1", {
          workItemLimit: 1, workItemCursor,
        }, {admin: true}), h.deps);
      const first = await read();
      assert.equal(first.nextWorkItemCursor, id);
      assert.deepEqual(first.workItems, []);
      assert.equal(first.workItemPage.unavailableRecords[0].documentId, id);
      const second = await read(first.nextWorkItemCursor);
      assert.deepEqual(second.workItems.map((row) => row.workItemId),
        ["work:event:new"]);
      assert.equal(second.workItemPage.scannedCount, 1);
      assert.equal(second.nextWorkItemCursor, null);
    }
  });
