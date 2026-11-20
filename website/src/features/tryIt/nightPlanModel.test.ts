import {describe, expect, it} from "vitest";
import {eventRuntimeSocialMissionCopy} from "@content/eventRuntime";
import {nightPlanTryItCopy as copy} from "@content/nightPlanTryIt";
import {fixtureOrganizerId} from "../../stories/fixtures/tryItCommands";
import {nightPlanFixtures} from "../../stories/fixtures/nightPlanCommands";
import {
  nightPlanCapacityLine,
  nightPlanGroupLines,
  nightPlanGuestCount,
  nightPlanHeadline,
  nightPlanMissions,
  nightPlanMixingLine,
  nightPlanRunOfShow,
  nightRehearsalGuestUrl,
  nightRehearsalPayload,
  nightRehearsalSeed,
  type NightPlan,
} from "./nightPlanModel";

const run = nightPlanFixtures.previewed.result.plan;
const courts = nightPlanFixtures.courtsLimited.result.plan;
const withGroups = (groups: Partial<NightPlan["groups"]>, extra: Partial<NightPlan> = {}): NightPlan => ({...run, ...extra, groups: {...run.groups, ...groups}});

describe("plan-a-night model", () => {
  it("takes a whole head count from 2 to 1,000, as night.plan does", () => {
    expect(nightPlanGuestCount(" 32 ")).toBe(32);
    expect(nightPlanGuestCount("1,000")).toBe(1000);
    for (const typed of ["", "1", "1001", "12.5", "-4", "thirty", "1e2"]) expect(nightPlanGuestCount(typed), typed).toBeNull();
  });

  it("names the night by format and head count", () => {
    expect(nightPlanHeadline(run)).toBe("Run for 32");
  });

  it("shows pace group labels as the server wrote them, and says paces are unset while any is null", () => {
    const lines = nightPlanGroupLines(run);
    expect(lines.title).toBe("4 pace groups");
    expect(lines.labels).toEqual(["~5:30/km", "Pace group 2", "Pace group 3", "Pace group 4"]);
    expect(lines.notes).toContain(copy.groups.paceUnset);
    expect(lines.limited).toBeNull();
    const allSet = withGroups({paceBands: run.groups.paceBands.map((band, index) => ({...band, targetPaceSecondsPerKm: 300 + index * 30}))});
    expect(nightPlanGroupLines(allSet).notes).not.toContain(copy.groups.paceUnset);
  });

  it("lists twelve pace groups, then how many more", () => {
    const labels = Array.from({length: 30}, (_, index) => `Pace group ${index + 1}`);
    const lines = nightPlanGroupLines(withGroups({count: 30, labels, paceBands: labels.map((label) => ({label, targetPaceSecondsPerKm: null}))}));
    expect(lines.labels).toHaveLength(12);
    expect(lines.moreLabels).toBe(18);
  });

  it("says plainly when the count stopped at the plan's limit: a longer bench for courts, bigger groups otherwise", () => {
    const lines = nightPlanGroupLines(courts);
    expect(lines.title).toBe("200 courts, 4 players on each");
    expect(lines.notes).toEqual(["200 waiting their turn on the bench"]);
    expect(lines.limited).toBe(copy.groups.countLimitedCourts);
    const tables = withGroups({kind: "units", count: 200, size: 5, unitKind: "tables", labels: [], paceBands: [], countLimited: true});
    expect(nightPlanGroupLines(tables).title).toBe("200 tables of about 5");
    expect(nightPlanGroupLines(tables).limited).toBe(copy.groups.countLimitedGroups);
  });

  it("words units, the whole group and a crawl's stops", () => {
    expect(nightPlanGroupLines(withGroups({kind: "units", count: 1, size: 6, unitKind: "teams", labels: [], paceBands: []})).title).toBe("1 team of about 6");
    expect(nightPlanGroupLines(withGroups({kind: "units", count: 3, size: 4, unitKind: null, labels: [], paceBands: []})).title).toBe("3 groups of about 4");
    const crawl = nightPlanGroupLines(withGroups({kind: "wholeGroup", count: 1, size: 20, unitKind: "wholeGroup", labels: [], paceBands: []}, {stops: 3}));
    expect(crawl.title).toBe(copy.groups.wholeGroup);
    expect(crawl.notes).toEqual(["3 stops"]);
  });

  it("says where the head count sits against the format's range", () => {
    expect(nightPlanCapacityLine(run)).toBe("Right for this format, which works best for 6 to 80 guests.");
    expect(nightPlanCapacityLine(courts)).toBe("More than this format works best for: 8 to 64 guests.");
    expect(nightPlanCapacityLine({...run, capacity: {min: 6, max: 80, fit: "below"}})).toMatch(/^Fewer than/u);
  });

  it("words each kind of mixing moment", () => {
    expect(nightPlanMixingLine(run)).toBe("15 minutes set aside for people to mix.");
    expect(nightPlanMixingLine(courts)).toBe("People move on every 15 minutes during the games.");
    expect(nightPlanMixingLine({...run, format: "quiz", mixingMoment: {kind: "teamRevealAtRoundBreak", stage: "activity", durationMinutes: 60,
      rotationIntervalMinutes: null}})).toBe(copy.mixing.teamReveal);
  });

  it("lists the run of show with the activity named for the format, leaving out a stage it has no name for", () => {
    const shown = nightPlanRunOfShow({...run, runOfShow: [...run.runOfShow, {stage: "encore", durationMinutes: 5}], durationMinutes: 85});
    expect(shown.steps.map((step) => step.label)).toEqual(["Arrival", "Opening", "The run", "Mixing", "Close"]);
    expect(shown.steps[2].minutes).toBe("45 min");
    expect(shown.total).toBe("85 minutes in all");
  });

  it("writes each mission from the event runtime's words by promptId, and skips one with no words here", () => {
    expect(nightPlanMissions(run)).toEqual([
      {promptId: "pacePods.light", title: eventRuntimeSocialMissionCopy.titles.light, body: eventRuntimeSocialMissionCopy.prompts["pacePods.light"]},
      {promptId: "shared.personal", title: eventRuntimeSocialMissionCopy.titles.personal, body: eventRuntimeSocialMissionCopy.prompts["shared.personal"]},
      {promptId: "shared.reflective", title: eventRuntimeSocialMissionCopy.titles.reflective, body: eventRuntimeSocialMissionCopy.prompts["shared.reflective"]},
    ]);
    expect(nightPlanMissions(courts).map((mission) => mission.promptId)).toEqual(["shared.personal", "shared.reflective"]);
  });

  it("starts a practice session for the workspace with the plan's setup, simulated guests sized 2 to 50", () => {
    const setup = nightPlanFixtures.previewed.result.rehearsalSetup;
    expect(nightRehearsalPayload({organizerId: fixtureOrganizerId, plan: run, setup, seed: 7})).toEqual({
      organizerId: fixtureOrganizerId, sourceEventId: null, scenarioId: "smoothRun", seed: 7, actorCount: 32, setup,
      guestSource: "simulated", startImmediately: true,
    });
    expect(nightRehearsalPayload({organizerId: fixtureOrganizerId, plan: courts, setup, seed: 7}).actorCount).toBe(50);
    expect(nightRehearsalSeed(() => 0)).toBe(1);
    expect(nightRehearsalSeed(() => 0.999999999)).toBeLessThanOrEqual(2_147_483_647);
  });

  it("shows a guest link only when it is a web address", () => {
    expect(nightRehearsalGuestUrl("https://catch.example/rehearse/abc")).toBe("https://catch.example/rehearse/abc");
    for (const value of ["javascript:alert(1)", "not a link", 42, null]) expect(nightRehearsalGuestUrl(value), String(value)).toBeNull();
  });
});
