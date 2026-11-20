import type {TryItResponse} from "../../shared/api/tryItCommands";
import {fixtureEventId, fixtureOrganizerId} from "./tryItCommands";

/**
 * night.plan envelopes as the callable answers them, for the plan-a-night
 * tool's tests and stories. nightPlanFlow.test.ts checks every one against
 * contracts/callable_responses/plan_night_response.schema.json. The plans
 * follow the shared playbook-shape catalog for each format.
 */

type PlanResponse = TryItResponse<"night.plan">;
type Plan = NonNullable<PlanResponse["result"]["plan"]>;

const hash = (seed: string) => seed.repeat(64).slice(0, 64);
const base = {commandId: "night.plan" as const, effects: [] as PlanResponse["effects"], next: [] as PlanResponse["next"], receiptId: null};

const runPlan: Plan = {
  format: "run", guestCount: 32, playbookId: "social_run_light", activityKind: "running", interactionModel: "pacePods",
  capacity: {min: 6, max: 80, fit: "within"},
  groups: {kind: "paceGroups", count: 4, size: null, unitKind: null,
    labels: ["~5:30/km", "Pace group 2", "Pace group 3", "Pace group 4"],
    paceBands: [{label: "~5:30/km", targetPaceSecondsPerKm: 330}, {label: "Pace group 2", targetPaceSecondsPerKm: null},
      {label: "Pace group 3", targetPaceSecondsPerKm: null}, {label: "Pace group 4", targetPaceSecondsPerKm: null}],
    benchCount: 0, countLimited: false},
  mixingMoment: {kind: "runOfShowStage", stage: "mixing", durationMinutes: 15, rotationIntervalMinutes: null},
  runOfShow: [{stage: "arrival", durationMinutes: 10}, {stage: "opening", durationMinutes: 5}, {stage: "activity", durationMinutes: 45},
    {stage: "mixing", durationMinutes: 15}, {stage: "closing", durationMinutes: 5}],
  durationMinutes: 80, stops: null,
  missions: [{promptId: "pacePods.light", disclosureLevel: "light"}, {promptId: "shared.personal", disclosureLevel: "personal"},
    {promptId: "shared.reflective", disclosureLevel: "reflective"}],
};

const courtsPlan: Plan = {
  format: "courts", guestCount: 1000, playbookId: "pickleball_rotations", activityKind: "pickleball", interactionModel: "pairedRotations",
  capacity: {min: 8, max: 64, fit: "above"},
  groups: {kind: "courts", count: 200, size: 4, unitKind: "pairs", labels: [], paceBands: [], benchCount: 200, countLimited: true},
  mixingMoment: {kind: "rotation", stage: "activity", durationMinutes: 90, rotationIntervalMinutes: 15},
  runOfShow: [{stage: "arrival", durationMinutes: 15}, {stage: "activity", durationMinutes: 90}, {stage: "closing", durationMinutes: 15}],
  durationMinutes: 120, stops: null,
  // The first mission names a prompt this site has no words for: the tool leaves it out.
  missions: [{promptId: "courtside.light", disclosureLevel: "light"}, {promptId: "shared.personal", disclosureLevel: "personal"},
    {promptId: "shared.reflective", disclosureLevel: "reflective"}],
};

const runSetup = {
  title: "Run practice", locationName: "Practice venue", durationMinutes: 80, hostGoal: "Run the night once before your guests arrive.",
  attendeePrompt: "Say hello to someone in your group.",
  moduleIds: ["arrival", "firstHello", "pods", "conversationCues", "afterglow", "accountability"],
} satisfies NonNullable<PlanResponse["result"]["rehearsalSetup"]>;

const courtsSetup = {
  ...runSetup, title: "Court night practice", durationMinutes: 120,
  moduleIds: ["arrival", "firstHello", "rotations", "conversationCues", "afterglow"],
} satisfies NonNullable<PlanResponse["result"]["rehearsalSetup"]>;

export const nightPlanFixtures = {
  noWorkspace: {
    ...base, status: "needs_input", previewHash: hash("6"),
    summary: {headline: "Set up your organizer profile first.", lines: ["Add your brand name and city, then plan your night."]},
    next: [{commandId: "workspace.ensure", label: "Set up your organizer profile"}],
    result: {organizerId: null, eventId: null, plan: null, rehearsalSetup: null, reasons: ["no_workspace"]},
  },
  previewed: {
    ...base, status: "previewed", previewHash: hash("7"),
    summary: {headline: "Run for 32.", lines: ["4 pace groups.", "80 minutes, with three missions."]},
    result: {organizerId: fixtureOrganizerId, eventId: null, plan: runPlan, rehearsalSetup: runSetup, reasons: []},
  },
  /** A refused answer that still carries the plan: the visitor has no draft event to save it to. */
  refusedNoDraft: {
    ...base, status: "refused", previewHash: hash("7"),
    summary: {headline: "We can't save this plan yet.", lines: ["Import or create a draft event first, then save this plan to it."]},
    next: [{commandId: "event.import-from-link", label: "Import an event to plan"}],
    result: {organizerId: fixtureOrganizerId, eventId: null, plan: runPlan, rehearsalSetup: runSetup, reasons: ["no_draft_event"]},
  },
  courtsLimited: {
    ...base, status: "previewed", previewHash: hash("8"),
    summary: {headline: "Court night for 1000.", lines: ["200 courts of 4, 200 on the bench.", "120 minutes, with three missions.",
      "This format works best for 8 to 64 guests."]},
    result: {organizerId: fixtureOrganizerId, eventId: null, plan: courtsPlan, rehearsalSetup: courtsSetup, reasons: []},
  },
  applied: {
    ...base, status: "applied", previewHash: hash("7"), receiptId: `nightPlan_${"c".repeat(64)}`,
    summary: {headline: "Your run plan is saved on your draft.", lines: ["Try it in a practice session before the night."]},
    effects: [{kind: "draft_plan", ref: `eventSuccessPlans/${fixtureEventId}`, label: "Night plan: Run for 32"}],
    result: {organizerId: fixtureOrganizerId, eventId: fixtureEventId, plan: runPlan, rehearsalSetup: runSetup, reasons: []},
  },
  formatMismatch: {
    ...base, status: "refused", previewHash: hash("7"),
    summary: {headline: "We can't save this plan yet.", lines: ["The event's activity doesn't match this format. Change one of them first."]},
    result: {organizerId: fixtureOrganizerId, eventId: fixtureEventId, plan: runPlan, rehearsalSetup: runSetup, reasons: ["event_format_mismatch"]},
  },
} satisfies Record<string, PlanResponse>;

/** The practice session link createEventRehearsal answers, on a reserved domain. */
export const fixtureRehearsalUrl = "https://catch.example/rehearse/pubRehearsalDriftwood0001";
