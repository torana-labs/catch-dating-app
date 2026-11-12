import {addExistingOrganizerContactTag} from "./organizerContacts";
import {genericFormApplicationId} from "./organizerApplicationAccess";
import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {CallableRequest} from "firebase-functions/v2/https";
import type {
  OrganizerApplicationDocument,
  OrganizerFormResponseDocument,
  OrganizerContactEventEdgeDocument,
  OrganizerFormAutomationRuleDocument,
} from "../shared/generated/firestoreAdminTypes";
import {AudienceTestStore} from "./organizerAudienceTestStore";
import {
  AutomationDeps,
  createOrganizerFormAutomationHandler,
  dispatchOrganizerFormAutomations,
  dispatchOrganizerApplicationAutomations,
  dispatchOrganizerAttendanceAutomations,
  processOrganizerAutomationRun,
  processDueOrganizerAutomations,
  setOrganizerFormAutomationStateHandler,
} from "./organizerFormAutomations";

const time = 1800000000000;
const stamp = (offset = 0) => Timestamp.fromMillis(time + offset);
const action = (id: string) => ({
  actionId: id,
  kind: "signedWebhook" as const,
  webhookUrl: `https://example.com/${id}`,
  webhookSecret: "s".repeat(32),
  tagId: null,
  eventId: null,
  channel: null,
});
function harness() {
  let now = time;
  const response = {
    organizerId: "org",
    formId: "form",
    status: "submitted",
    submittedAt: stamp(),
    withdrawnAt: null,
    answers: {secret: "private"},
    answerSnapshots: [],
  } as unknown as OrganizerFormResponseDocument;
  const rule: OrganizerFormAutomationRuleDocument = {
    organizerId: "org",
    formId: "form",
    name: "Welcome",
    enabled: true,
    revision: 1,
    trigger: "responseSubmitted",
    condition: null,
    actions: [action("first"), action("second")],
    createdByUid: "host",
    updatedByUid: "host",
    createdAt: stamp(-1),
    updatedAt: stamp(-1),
  };
  const store = new AudienceTestStore({
    "organizers/org": {
      ownerUserId: "host",
      hostUserIds: ["host"],
      hostProfiles: [],
    },
    "organizerForms/form": {organizerId: "org"},
    "organizerFormResponses/response": {...response},
    "organizerFormAutomationRules/rule": {...rule},
  });
  const calls: string[] = [];
  const deps: AutomationDeps = {
    firestore: () => store.asFirestore(),
    timestamp: () => Timestamp.fromMillis(now),
    checkRateLimit: async () => undefined,
    identitySecret: () => "test",
    deliverWebhook: async (input) => {
      calls.push(input.deliveryId);
    },
  };
  const runs = () =>
    Object.entries(store.docs).filter(([key]) =>
      key.startsWith("organizerFormAutomationRuns/"),
    );
  return {
    store,
    response,
    rule,
    calls,
    deps,
    runs,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

async function partiallyFailedRunHarness() {
  const h = harness();
  h.deps.deliverWebhook = async (input) => {
    h.calls.push(input.deliveryId);
    if (input.url.endsWith("second")) throw new Error("Unavailable");
  };
  await dispatchOrganizerFormAutomations(
    "response",
    undefined,
    h.response,
    h.deps,
  );
  return h;
}

test("successful actions survive retries and duplicate triggers", async () => {
  const h = harness();
  let fail = true;
  h.deps.deliverWebhook = async (input) => {
    h.calls.push(input.deliveryId);
    if (input.url.endsWith("second") && fail) {
      throw new Error("Temporary network failure");
    }
  };
  await dispatchOrganizerFormAutomations(
    "response",
    undefined,
    h.response,
    h.deps,
  );
  const [path, run] = h.runs()[0];
  assert.equal(run.status, "partiallyFailed");
  assert.equal(h.calls.length, 2);
  await dispatchOrganizerFormAutomations(
    "response",
    undefined,
    h.response,
    h.deps,
  );
  assert.equal(h.calls.length, 2);
  fail = false;
  h.advance(120001);
  await processOrganizerAutomationRun(path.split("/")[1], h.deps);
  assert.equal(h.runs()[0][1].status, "succeeded");
  assert.equal(h.calls.length, 3);
  assert.equal(h.calls[1], h.calls[2]);
  assert.notEqual(h.calls[0], h.calls[1]);
});

test("a live lease prevents concurrent delivery", async () => {
  const h = harness();
  let release!: () => void;
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  h.deps.deliverWebhook = async (input) => {
    h.calls.push(input.deliveryId);
    entered();
    await blocked;
  };
  const first = dispatchOrganizerFormAutomations(
    "response",
    undefined,
    h.response,
    h.deps,
  );
  await started;
  await processOrganizerAutomationRun(h.runs()[0][0].split("/")[1], h.deps);
  assert.equal(h.calls.length, 1);
  release();
  await first;
  assert.equal(h.calls.length, 2);
});

test("retries recheck pause, withdrawal and manager authority", async () => {
  for (const mutation of ["pause", "withdraw", "remove-manager"]) {
    const h = harness();
    h.deps.deliverWebhook = async () => {
      throw new Error("Temporary failure");
    };
    await dispatchOrganizerFormAutomations(
      "response",
      undefined,
      h.response,
      h.deps,
    );
    if (mutation === "pause") {
      h.store.docs["organizerFormAutomationRules/rule"].enabled = false;
    }
    if (mutation === "withdraw") {
      h.store.docs["organizerFormResponses/response"].status = "withdrawn";
    }
    if (mutation === "remove-manager") {
      h.store.docs["organizers/org"] = {hostUserIds: [], hostProfiles: []};
    }
    h.deps.deliverWebhook = async () => {
      assert.fail("Should not deliver");
    };
    h.advance(120001);
    await processOrganizerAutomationRun(h.runs()[0][0].split("/")[1], h.deps);
    assert.equal(h.runs()[0][1].status, "skipped");
    assert.equal(h.runs()[0][1].dueAt, null);
  }
});

test("attendance waits for event end and ignores old projections", async () => {
  const h = harness();
  h.store.docs["organizerFormAutomationRules/rule"] = {
    ...h.rule,
    trigger: "eventAttended",
    formId: null,
    delayMinutes: 10,
  };
  h.store.docs["organizerContacts/person"] = {
    organizerId: "org",
    displayName: "Ada",
    identityState: "verified",
  };
  h.store.docs["events/event"] = {organizerId: "org", endTime: stamp(60000)};
  const edge = {
    organizerId: "org",
    contactId: "person",
    eventId: "event",
    checkedIn: true,
    cancelled: false,
    checkedInAt: stamp(),
  } as OrganizerContactEventEdgeDocument;
  h.store.docs["organizerContactEventEdges/edge"] = {...edge};
  await dispatchOrganizerAttendanceAutomations(
    "edge",
    undefined,
    edge,
    h.deps,
  );
  assert.equal(h.runs()[0][1].status, "pending");
  assert.equal(h.calls.length, 0);
  h.advance(660001);
  await processOrganizerAutomationRun(h.runs()[0][0].split("/")[1], h.deps);
  assert.equal(h.calls.length, 2);
  h.store.docs["organizerContactEventEdges/old"] = {
    ...edge,
    checkedInAt: stamp(-100000),
  };
  await dispatchOrganizerAttendanceAutomations(
    "old",
    undefined,
    edge,
    h.deps,
  );
  assert.equal(h.runs().length, 1);
});

test("retries stop after five attempts and remain visible", async () => {
  const h = harness();
  h.deps.deliverWebhook = async () => {
    throw new Error("Unavailable");
  };
  await dispatchOrganizerFormAutomations(
    "response",
    undefined,
    h.response,
    h.deps,
  );
  for (let attempt = 0; attempt < 6; attempt++) {
    h.advance(3600000);
    await processOrganizerAutomationRun(h.runs()[0][0].split("/")[1], h.deps);
  }
  const run = h.runs()[0][1];
  assert.equal(run.attemptCount, 5);
  assert.equal(run.status, "failed");
  assert.equal(run.dueAt, null);
});

test("an expired final lease stops without losing successful action receipts",
  async () => {
    const h = await partiallyFailedRunHarness();
    const [path, run] = h.runs()[0];
    const actionResults = structuredClone(run.actionResults);
    Object.assign(run, {
      status: "running",
      attemptCount: 5,
      leaseOwner: "crashed-final-worker",
      leaseExpiresAt: stamp(330000),
      dueAt: stamp(330000),
    });
    h.advance(330000);
    await processDueOrganizerAutomations(h.deps);
    const terminal = h.store.docs[path];
    assert.equal(terminal.status, "failed");
    assert.equal(terminal.errorCode, "attempt_limit_exhausted");
    assert.equal(terminal.attemptCount, 5);
    assert.equal(terminal.dueAt, null);
    assert.equal(terminal.leaseOwner, null);
    assert.equal(terminal.leaseExpiresAt, null);
    assert.deepEqual(terminal.completedAt, stamp(330000));
    assert.deepEqual(terminal.updatedAt, stamp(330000));
    assert.deepEqual(terminal.actionResults, actionResults);
    assert.equal(h.calls.length, 2);
    h.advance(60000);
    await processDueOrganizerAutomations(h.deps);
    assert.deepEqual(h.store.docs[path], terminal);
    assert.equal(h.calls.length, 2);
  });

test("a live fifth attempt can finish without a second worker terminating it",
  async () => {
    const h = await partiallyFailedRunHarness();
    const [path, run] = h.runs()[0];
    run.attemptCount = 4;
    h.advance(120001);
    let release!: () => void;
    let entered!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    h.deps.deliverWebhook = async (input) => {
      h.calls.push(input.deliveryId);
      entered();
      await blocked;
    };
    const worker = processOrganizerAutomationRun(path.split("/")[1], h.deps);
    await started;
    const leased = {...h.store.docs[path]};
    try {
      assert.equal(leased.attemptCount, 5);
      assert.equal(leased.status, "running");
      await processOrganizerAutomationRun(path.split("/")[1], h.deps);
      assert.deepEqual(h.store.docs[path], leased);
    } finally {
      release();
    }
    await worker;
    assert.equal(h.store.docs[path].status, "succeeded");
    assert.equal(h.store.docs[path].attemptCount, 5);
    assert.equal(h.calls.length, 3);
  });

test("terminal runs keep their recorded outcome after attempt exhaustion",
  async () => {
    const statuses = ["succeeded", "skipped", "failed", "partiallyFailed"];
    for (const status of statuses) {
      const h = await partiallyFailedRunHarness();
      const [path, run] = h.runs()[0];
      Object.assign(run, {
        status,
        attemptCount: 5,
        dueAt: null,
        completedAt: stamp(),
      });
      const terminal = {...run};
      h.advance(3600000);
      await processOrganizerAutomationRun(path.split("/")[1], h.deps);
      assert.deepEqual(h.store.docs[path], terminal);
      assert.equal(h.calls.length, 2);
    }
  });

test("exhausted runs wait for both their due time and worker lease to expire",
  async () => {
    for (const futureField of ["dueAt", "leaseExpiresAt"]) {
      const h = await partiallyFailedRunHarness();
      const [path, run] = h.runs()[0];
      Object.assign(run, {
        status: "running",
        attemptCount: 5,
        dueAt: stamp(),
        leaseExpiresAt: stamp(),
        [futureField]: stamp(1000),
      });
      const waiting = {...run};
      await processOrganizerAutomationRun(path.split("/")[1], h.deps);
      assert.deepEqual(h.store.docs[path], waiting);
      h.advance(1000);
      await processOrganizerAutomationRun(path.split("/")[1], h.deps);
      assert.equal(h.store.docs[path].status, "failed");
      assert.equal(h.store.docs[path].dueAt, null);
      assert.equal(h.store.docs[path].attemptCount, 5);
      assert.equal(h.calls.length, 2);
    }
  });

test("100 exhausted leases leave the due batch so later work can progress",
  async () => {
    const h = await partiallyFailedRunHarness();
    const [path, template] = h.runs()[0];
    delete h.store.docs[path];
    for (let index = 0; index < 100; index++) {
      const id = `exhausted-${String(index).padStart(3, "0")}`;
      h.store.docs[`organizerFormAutomationRuns/${id}`] = {
        ...template,
        status: "running",
        attemptCount: 5,
        dueAt: stamp(330000),
        leaseExpiresAt: stamp(330000),
        leaseOwner: `crashed-${index}`,
      };
    }
    const pendingPath = "organizerFormAutomationRuns/zz-runnable";
    h.store.docs[pendingPath] = {...template, dueAt: stamp(330001)};
    h.deps.deliverWebhook = async (input) => {
      h.calls.push(input.deliveryId);
    };
    h.advance(330002);
    await processDueOrganizerAutomations(h.deps);
    assert.equal(h.calls.length, 2, "the first pass keeps its 100-run bound");
    assert.equal(h.store.docs[pendingPath].attemptCount, 1);
    assert.equal(h.runs().filter(([, run]) => run.dueAt === null).length, 100);
    await processDueOrganizerAutomations(h.deps);
    assert.equal(h.store.docs[pendingPath].status, "succeeded");
    assert.equal(h.store.docs[pendingPath].attemptCount, 2);
    assert.equal(h.calls.length, 3, "only the unfinished action may execute");
  });

test("rule editing protects secrets, ids and organizer authority", async () => {
  const h = harness();
  const request = (data: Record<string, unknown>) =>
    ({
      auth: {uid: "host"},
      data: {
        organizerId: "org",
        formId: null,
        requestId: "request-one",
        ruleId: null,
        expectedRevision: null,
        trigger: "applicationAccepted",
        name: "Webhook",
        enabled: false,
        condition: null,
        actions: [action("webhook")],
        ...data,
      },
    }) as CallableRequest<unknown>;
  const saved = await createOrganizerFormAutomationHandler(
    request({}),
    h.deps,
  );
  assert.equal(saved.actions[0].webhookSecretConfigured, true);
  assert.equal("webhookSecret" in saved.actions[0], false);
  const edited = await createOrganizerFormAutomationHandler(
    request({
      ruleId: saved.ruleId,
      expectedRevision: saved.revision,
      name: "Renamed webhook",
      actions: [{...action("webhook"), webhookSecret: null}],
    }),
    h.deps,
  );
  assert.equal(edited.revision, 2);
  assert.equal(
    h.store.docs[`organizerFormAutomationRules/${saved.ruleId}`]
      .actions instanceof Array,
    true,
  );
  await assert.rejects(
    createOrganizerFormAutomationHandler(
      request({
        ruleId: edited.ruleId,
        expectedRevision: edited.revision,
        actions: [
          {
            ...action("webhook"),
            webhookUrl: "https://example.com/new",
            webhookSecret: null,
          },
        ],
      }),
      h.deps,
    ),
    {code: "invalid-argument"},
  );

  await assert.rejects(
    createOrganizerFormAutomationHandler(
      request({
        actions: [action("same"), action("same")],
      }),
      h.deps,
    ),
    {code: "invalid-argument"},
  );
  await assert.rejects(
    createOrganizerFormAutomationHandler(
      request({
        actions: [{...action("webhook"), webhookUrl: "https://127.0.0.1/"}],
      }),
      h.deps,
    ),
    {code: "invalid-argument"},
  );
  await assert.rejects(
    createOrganizerFormAutomationHandler(
      request({organizerId: "foreign"}),
      h.deps,
    ),
    {code: "not-found"},
  );
});

test("acceptance requires current reviewed source access", async () => {
  const h = harness();
  h.store.docs["organizerFormAutomationRules/rule"] = {
    ...h.rule,
    formId: null,
    trigger: "applicationAccepted",
  };
  const applicationId = genericFormApplicationId("response");
  const source = {kind: "native", externalResponseId: "response"};
  const application = {
    organizerId: "org",
    formId: "form",
    formVersionId: "version",
    source,
    latestResponseId: "response",
    linkedUid: null,
    contactId: "person",
    reviewStatus: "approved",
    reviewedAt: stamp(),
    updatedAt: stamp(),
  } as OrganizerApplicationDocument;
  h.store.docs[`organizerApplications/${applicationId}`] = {...application};
  h.store.docs["organizerContacts/person"] = {
    organizerId: "org",
    displayName: "Ada",
  };
  Object.assign(h.store.docs["organizerFormResponses/response"], {
    versionId: "version",
    respondentUid: null,
  });
  h.store.docs["organizerFormVersions/version"] = {
    organizerId: "org",
    formId: "form",
    definition: {sections: []},
  };
  await dispatchOrganizerApplicationAutomations(
    applicationId,
    undefined,
    application,
    h.deps,
  );
  assert.equal(h.calls.length, 2);
  await dispatchOrganizerApplicationAutomations(
    applicationId,
    application,
    application,
    h.deps,
  );
  assert.equal(h.calls.length, 2);
  h.store.docs["organizerFormResponses/response"].status = "withdrawn";
  h.store.docs["organizerFormAutomationRules/rule"].revision = 2;
  await dispatchOrganizerApplicationAutomations(
    applicationId,
    undefined,
    application,
    h.deps,
  );
  assert.equal(h.runs().length, 1);
});

test("scheduler recovers an expired worker lease at the due time", async () => {
  const h = harness();
  h.store.docs["organizerFormAutomationRules/rule"].delayMinutes = 1;
  await dispatchOrganizerFormAutomations(
    "response",
    undefined,
    h.response,
    h.deps,
  );
  assert.equal(h.calls.length, 0);
  await processDueOrganizerAutomations(h.deps);
  assert.equal(h.calls.length, 0);
  const [path, run] = h.runs()[0];
  Object.assign(run, {
    status: "running",
    leaseOwner: "crashed-worker",
    leaseExpiresAt: stamp(60000),
    attemptCount: 1,
  });
  h.advance(60001);
  await processDueOrganizerAutomations(h.deps);
  assert.equal(h.store.docs[path].status, "succeeded");
  assert.equal(h.calls.length, 2);
  await processDueOrganizerAutomations(h.deps);
  assert.equal(h.calls.length, 2);
});

test("answer rules reject stale versions and options", async () => {
  const h = harness();
  h.store.docs["organizerForms/form"].activeVersionId = "v1";
  h.store.docs["organizerFormVersions/v1"] = {
    organizerId: "org",
    formId: "form",
    definition: {
      sections: [
        {
          questions: [
            {
              questionId: "drink",
              kind: "singleChoice",
              hostPresentation: "filterable",
              privacyClass: "standard",
              options: [{value: "coffee", label: "Coffee"}],
            },
          ],
        },
      ],
    },
  };
  const request = (value: string) =>
    ({
      auth: {uid: "host"},
      data: {
        organizerId: "org",
        formId: "form",
        requestId: "answer-rule",
        ruleId: null,
        expectedRevision: null,
        trigger: "answerMatches",
        name: "Coffee lovers",
        enabled: true,
        condition: {
          questionId: "drink",
          operator: "contains",
          expectedValues: [value],
        },
        actions: [action("webhook")],
      },
    }) as CallableRequest<unknown>;
  await assert.rejects(
    createOrganizerFormAutomationHandler(request("tea"), h.deps),
    {code: "invalid-argument"},
  );
  const saved = await createOrganizerFormAutomationHandler(
    request("coffee"),
    h.deps,
  );
  assert.equal(
    h.store.docs[`organizerFormAutomationRules/${saved.ruleId}`]
      .conditionVersionId,
    "v1",
  );
  h.store.docs["organizerForms/form"].activeVersionId = "v2";
  h.store.docs["organizerFormVersions/v2"] = {
    ...h.store.docs["organizerFormVersions/v1"],
  };
  await assert.rejects(
    setOrganizerFormAutomationStateHandler(
      {
        auth: {uid: "host"},
        data: {
          organizerId: "org",
          ruleId: saved.ruleId,
          expectedRevision: 1,
          enabled: true,
        },
      } as CallableRequest<unknown>,
      h.deps,
    ),
    {code: "failed-precondition"},
  );
  h.store.docs["organizerFormAutomationRules/rule"].enabled = false;
  h.advance(1);
  const changed = {
    ...h.response,
    versionId: "v2",
    answers: {drink: "coffee"},
    submittedAt: stamp(1),
  };
  h.store.docs["organizerFormResponses/response"] = changed;
  await dispatchOrganizerFormAutomations(
    "response",
    undefined,
    changed,
    h.deps,
  );
  assert.equal(h.calls.length, 0);
});

test("moving a rule updates both form consequence projections", async () => {
  const h = harness();
  for (const id of ["form", "next"]) {
    h.store.docs[`organizerForms/${id}`] = {
      organizerId: "org",
      activeVersionId: id,
      consequenceProjection: {
        version: 1,
        coverage: "exact",
        identityPolicy: "emailVerified",
        enabledAutomationActionKinds: id === "form" ? ["signedWebhook"] : [],
        enabledAutomationActionKindCounts: {
          notifyTeam: 0,
          addOrganizerTag: 0,
          createCrmContact: 0,
          addApplicationQueue: 0,
          proposeEventAttendee: 0,
          signedWebhook: id === "form" ? 1 : 0,
          campaignHandoff: 0,
        },
      },
    };
    h.store.docs[`organizerFormVersions/${id}`] = {
      organizerId: "org",
      formId: id,
      definition: {sections: []},
    };
  }
  await createOrganizerFormAutomationHandler(
    {
      auth: {uid: "host"},
      data: {
        organizerId: "org",
        formId: "next",
        requestId: "move-rule",
        ruleId: "rule",
        expectedRevision: 1,
        name: "Moved rule",
        enabled: true,
        trigger: "responseSubmitted",
        condition: null,
        actions: [action("webhook")],
      },
    } as CallableRequest<unknown>,
    h.deps,
  );
  for (const [id, count] of [
    ["form", 0],
    ["next", 1],
  ]) {
    const projection = h.store.docs[`organizerForms/${id}`]
      .consequenceProjection as {
      enabledAutomationActionKindCounts: {signedWebhook: number};
    };
    assert.equal(
      projection.enabledAutomationActionKindCounts.signedWebhook,
      count,
    );
  }
});

test("tag appends preserve existing tags and are idempotent", async () => {
  const h = harness();
  h.store.docs["organizerContacts/person"] = {
    organizerId: "org",
    revision: 1,
    manualTagIds: ["existing"],
  };
  h.store.docs["organizerContactTagVocabularies/org"] = {
    organizerId: "org",
    tags: [{tagId: "existing"}, {tagId: "new"}],
  };
  const params = {
    db: h.store.asFirestore(),
    organizerId: "org",
    contactId: "person",
    tagId: "new",
    actorUid: "host",
    now: stamp(),
  };
  await addExistingOrganizerContactTag(params);
  await addExistingOrganizerContactTag(params);
  assert.deepEqual(h.store.docs["organizerContacts/person"].manualTagIds, [
    "existing",
    "new",
  ]);
  assert.equal(h.store.docs["organizerContacts/person"].revision, 2);
  h.store.docs["organizerContactTagVocabularies/org"].tags = [
    {tagId: "existing"},
  ];
  await assert.rejects(addExistingOrganizerContactTag(params), {
    code: "failed-precondition",
  });
});
