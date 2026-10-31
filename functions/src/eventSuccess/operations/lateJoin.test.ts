import assert from "node:assert/strict";
import {test} from "node:test";
import type {
  EventAssistanceLateJoinInput,
} from "../../shared/generated/eventAssistanceLateJoinInput";
import type {
  EventAssistanceCommand,
} from "../../shared/generated/eventAssistanceCommand";
import {
  validateEventAssistancePolicy,
} from "../../shared/generated/validators/eventAssistancePolicy";
import {
  validateEventAssistanceCommand,
} from "../../shared/generated/validators/eventAssistanceCommand";
import {evaluateLateJoin, parseLateJoinInput} from "./lateJoin";
import {
  assertCommandContext,
  assertCommandRole,
  COMMAND_AUTHORITY,
} from "./commands";
import {
  workflowDefinitions,
  isApplicable,
  OperatingCapabilities,
} from "./catalog";
import type {EventAssistanceLateJoinDecision} from
  "../../shared/generated/eventAssistanceLateJoinDecision";
import {contractValidator} from "../../shared/contractTestValidators";

const validateEventAssistanceLateJoinDecision =
  contractValidator<EventAssistanceLateJoinDecision>(
    "EventAssistanceLateJoinDecision"
  );

function input(): EventAssistanceLateJoinInput {
  return {
    context: {mode: "live", eventId: "event-1", organizerId: "organizer-1"},
    eventId: "event-1",
    eventOpen: true,
    departureConfirmed: true,
    now: 1000000,
    setting: {
      kind: "enabled",
      authority: "executeWithinPolicy",
      policyVersion: "v1",
    },
    policy: {
      destination: {
        kind: "itineraryStop",
        itineraryId: "itinerary-1",
        permittedStopIds: ["stop-1", "stop-2"],
      },
      cutoff: {kind: "time", at: 2000000},
      maxMessagesPerEpisode: 4,
      minimumMinutesBetweenMessages: 5,
      updateOn: "materialGuidanceChange",
      unanswered: "keepUnknownUntilCutoff",
    },
    guest: {
      attendeeId: "guest-1",
      episodeId: "episode-1",
      admission: "admitted",
      attendance: {
        kind: "known",
        value: {checkedIn: false},
        revision: 1,
        observedAt: 900000,
        source: "host",
      },
      intention: {kind: "unknown"},
      participation: "active", deliveryEligibility: "eligible",
    },
    guidance: {
      kind: "known",
      revision: 1,
      observedAt: 900000,
      source: "host",
      value: {
        revision: 1,
        destination: {
          kind: "itineraryStop",
          itineraryId: "itinerary-1",
          stopId: "stop-1",
        },
        materialKey: "stop-1-revision-1",
        text: "Meet us at the first stop.",
        validUntil: 2000000,
      },
    },
    lastMessage: null,
    messagesThisEpisode: 0,
  };
}

function command(): EventAssistanceCommand {
  return {
    kind: "checkInGuest",
    context: input().context,
    eventId: "event-1",
    operationId: "operation-1",
    payload: {
      attendeeId: "guest-1",
      checkedIn: true,
      expectedAttendanceRevision: 1,
    },
  };
}

test("wire contracts reject invalid payloads and scope", () => {
  const p = {
    kind: "lateJoin",
    version: 1,
    scope: {
      kind: "guest",
      eventId: "event-1",
      attendeeId: "guest-1",
      episodeId: "episode-1",
    },
    config: input().policy,
    setting: input().setting,
  };
  assert.equal(validateEventAssistancePolicy(p), true);
  assert.equal(
    validateEventAssistancePolicy({...p, kind: "guestCheckIn"}),
    false
  );
  assert.equal(
    validateEventAssistancePolicy({
      ...p,
      scope: {kind: "event", eventId: "event-1"},
    }),
    false
  );
  assert.equal(
    validateEventAssistancePolicy({
      ...p,
      config: {...p.config, maxMessagesPerEpisode: -1},
    }),
    false
  );
  assert.equal(validateEventAssistanceCommand(command()), true);
  assert.equal(
    validateEventAssistanceCommand({...command(), kind: "setJoinIntent"}),
    false
  );
  assert.equal(
    validateEventAssistanceCommand({...command(), trusted: true}),
    false
  );
  const invalid = input();
  invalid.policy.destination = {
    kind: "itineraryStop",
    itineraryId: "x",
    permittedStopIds: [],
  };
  assert.throws(() => parseLateJoinInput(invalid));
  const negativeInterval = input();
  negativeInterval.policy.minimumMinutesBetweenMessages = -1;
  assert.throws(() => parseLateJoinInput(negativeInterval));
  const missingDeadline = input();
  missingDeadline.policy.unanswered = "hostReviewAtDeadline";
  assert.throws(() => parseLateJoinInput(missingDeadline));
});

test("attendance and reported intent remain distinct", () => {
  const i = input();
  i.guest.intention = {kind: "onMyWay", claimedEta: null};
  assert.equal(evaluateLateJoin(i).kind, "update");
  i.guest.intention = {kind: "notComing"};
  assert.deepEqual(evaluateLateJoin(i), {kind: "resolved", reason: "declined"});
  i.guest.attendance = {
    kind: "known",
    value: {checkedIn: true},
    revision: 2,
    observedAt: i.now,
    source: "host",
  };
  assert.deepEqual(evaluateLateJoin(i), {kind: "resolved", reason: "joined"});
});

test("outreach respects event, policy and admission gates", () => {
  const cases: Array<[Partial<EventAssistanceLateJoinInput>, string, string]> =
    [
      [{eventOpen: false}, "cancelled", "eventClosed"],
      [
        {setting: {kind: "disabled", reason: "hostChoice"}},
        "cancelled",
        "policyDisabled",
      ],
      [{now: 2000000}, "expired", "cutoff"],
      [{departureConfirmed: false}, "wait", "departureUnconfirmed"],
      [
        {guest: {...input().guest, admission: "pending"}},
        "cancelled",
        "notAdmitted",
      ],
    ];
  for (const [patch, kind, reason] of cases) {
    assert.deepEqual(evaluateLateJoin({...input(), ...patch}), {kind, reason});
  }
});

test("unknown attendance and expired guidance block outreach", () => {
  const i = input();
  i.guest.attendance = {kind: "unknown", reason: "sourceUnavailable"};
  assert.deepEqual(evaluateLateJoin(i), {
    kind: "wait",
    reason: "attendanceUnknown",
  });
  i.guest = input().guest;
  if (i.guidance.kind === "known") i.guidance.value.validUntil = i.now;
  assert.deepEqual(evaluateLateJoin(i), {
    kind: "wait",
    reason: "guidanceUnavailable",
  });
});

test("cooldown, caps and observe-only policy prevent sends", () => {
  const i = input();
  i.lastMessage = {materialKey: "earlier", at: i.now - 10000};
  const result = evaluateLateJoin(i);
  assert.equal(result.kind, "update");
  if (result.kind !== "update") return;
  assert.equal(result.shouldSend, false);
  assert.equal(result.nextEvaluationAt, 1290000);
  i.now = 1290000;
  const due = evaluateLateJoin(i);
  assert.ok(due.kind === "update" && due.shouldSend);
  i.messagesThisEpisode = 4;
  const capped = evaluateLateJoin(i);
  assert.ok(
    capped.kind === "update" &&
      !capped.shouldSend &&
      capped.nextEvaluationAt === null
  );
  i.messagesThisEpisode = 0;
  i.setting = {kind: "enabled", authority: "observe", policyVersion: "v1"};
  const observed = evaluateLateJoin(i);
  assert.ok(observed.kind === "update" && !observed.shouldSend);
});

test("joining guidance respects the selected target and route", () => {
  const i = input();
  i.guest.intention = {
    kind: "joinLater",
    target: {
      kind: "itineraryStop",
      itineraryId: "itinerary-1",
      stopId: "stop-2",
    },
  };
  assert.deepEqual(evaluateLateJoin(i), {
    kind: "wait",
    reason: "guidanceUnavailable",
  });
  i.guest.intention.target = {
    kind: "itineraryStop",
    itineraryId: "another-itinerary",
    stopId: "stop-2",
  };
  assert.equal(evaluateLateJoin(i).kind, "hostDecision");
});

test("message identity distinguishes episodes and material changes", () => {
  const i = input();
  const a = evaluateLateJoin(i);
  assert.equal(a.kind, "update");
  if (a.kind !== "update") return;
  i.guest.episodeId = "episode-2";
  const b = evaluateLateJoin(i);
  assert.ok(b.kind === "update" && b.messageKey !== a.messageKey);
  i.lastMessage = {materialKey: "stop-1-revision-1", at: 0};
  if (i.guidance.kind === "known") i.guidance.value.revision = 2;
  const c = evaluateLateJoin(i);
  assert.ok(c.kind === "update" && !c.shouldSend);
});

test("rehearsal parity preserves context and command authority", () => {
  const live = input();
  const rehearsal = {
    ...live,
    context: {
      mode: "rehearsal" as const,
      rehearsalId: "rehearsal-1",
      virtualEventId: live.eventId,
      clockId: "clock-1",
    },
  };
  const liveResult = evaluateLateJoin(live);
  const rehearsalResult = evaluateLateJoin(rehearsal);
  assert.ok(liveResult.kind === "update");
  assert.ok(rehearsalResult.kind === "update");
  assert.notEqual(liveResult.messageKey, rehearsalResult.messageKey);
  const reordered = evaluateLateJoin({...live, context: {
    organizerId: "organizer-1", eventId: "event-1", mode: "live",
  }});
  assert.ok(reordered.kind === "update");
  assert.equal(reordered.messageKey, liveResult.messageKey);
  assert.deepEqual(
    {...liveResult, messageKey: rehearsalResult.messageKey},
    rehearsalResult
  );
  assert.throws(
    () => evaluateLateJoin({...live, eventId: "other-event"}),
    /context/
  );
  assert.throws(
    () => assertCommandContext(command(), rehearsal.context),
    /mode/
  );
  assert.throws(
    () =>
      assertCommandContext(command(), {
        mode: "live", eventId: "event-1", organizerId: "other",
      }),
    /organizer/
  );
  assert.throws(
    () => assertCommandRole(command(), ["systemWithinPolicy"]),
    /authority/
  );
  assert.doesNotThrow(() => assertCommandRole(command(), ["checkIn"]));
  for (const kind of [
    "checkInGuest",
    "confirmDeparture",
    "publishAllocation",
    "recordOutcome",
    "changeRoute",
    "recordNoShow",
  ] as const) {
    assert.ok(
      !(COMMAND_AUTHORITY[kind] as readonly string[]).includes(
        "systemWithinPolicy"
      )
    );
  }
});

test("catalog applicability follows capabilities", () => {
  assert.equal(
    new Set(workflowDefinitions.map((d) => d.kind)).size,
    workflowDefinitions.length
  );
  const caps: OperatingCapabilities = {
    moving: false,
    movingSubgroups: false,
    groups: false,
    resources: false,
    rounds: false,
    independentUnits: false,
    outcomes: false,
    accountability: false,
    paid: false,
    requiredData: false,
    roles: false,
    admission: false,
    tracking: false,
  };
  for (const d of workflowDefinitions) {
    assert.equal(typeof isApplicable(d.applicability, caps), "boolean");
  }
  assert.equal(
    isApplicable("movingSubgroups", {...caps, movingSubgroups: true}),
    false
  );
  assert.equal(
    isApplicable("groupsOrResources", {...caps, resources: true}),
    true
  );
  assert.equal(isApplicable("tracking", {...caps, tracking: true}), false);
});

test("decisions satisfy the wire contract", () => {
  for (const patch of [
    {},
    {eventOpen: false},
    {departureConfirmed: false},
    {now: 2000000},
  ]) {
    assert.equal(
      validateEventAssistanceLateJoinDecision(
        evaluateLateJoin({...input(), ...patch})
      ),
      true
    );
  }
});


test("late joining requires an active participation", () => {
  for (const participation of ["temporaryBreak", "departed"] as const) {
    const value = input();
    value.guest.participation = participation;
    assert.deepEqual(evaluateLateJoin(value), {
      kind: "cancelled", reason: "participationInactive"});
  }
  const unknown = input();
  unknown.guest.participation = "unknown";
  assert.deepEqual(evaluateLateJoin(unknown), {
    kind: "wait", reason: "participationUnknown"});
  const {participation, ...missing} = input().guest;
  assert.throws(() => parseLateJoinInput({...input(), guest: missing}));
  void participation;
});
