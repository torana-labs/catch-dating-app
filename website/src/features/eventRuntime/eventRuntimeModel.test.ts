import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {
  eventRuntimeTimestampMillis,
  eventSuccessMomentPresentationCatalog,
  eventSuccessMomentPresentationFor,
  type EventRuntimeLiveState,
} from "../../firebase";
import {
  eventRuntimeStageForParticipant,
  eventRuntimePreEventFieldId,
  eventVenueSessionTokenFromFragment,
  normalizeEventRuntimeLayoutUnits,
  resolveEventRuntimeCeremony,
  resolveEventRuntimeQuestionnaire,
  resolveEventRuntimeSocialMission,
  shouldRenderEventRuntimeRoomMap,
  visibleEventRuntimeStandingRound,
  type EventRuntimeAssignment,
  type EventRuntimeLayout,
  type EventRuntimeParticipant,
  type EventRuntimeBootstrap,
} from "./eventRuntimeModel";

const layoutCatalog = JSON.parse(fs.readFileSync(path.resolve(
  process.cwd(),
  "../contracts/catalogs/event_success_layout.json"
), "utf8")) as {
  shapes: string[];
  parityFixture: EventRuntimeLayout & {
    normalizedUnits: ReturnType<typeof normalizeEventRuntimeLayoutUnits>;
  };
};

const momentPresentationCatalog = JSON.parse(fs.readFileSync(path.resolve(
  process.cwd(),
  "../contracts/catalogs/event_success_moment_presentations.json"
), "utf8")) as typeof eventSuccessMomentPresentationCatalog;

describe("eventRuntimeModel", () => {
  it("round-trips the generated moment presentation contract", () => {
    expect(eventSuccessMomentPresentationCatalog)
      .toEqual(momentPresentationCatalog);
    for (const presentation of eventSuccessMomentPresentationCatalog.moments) {
      expect(presentation.paletteTokenId.length).toBeGreaterThan(0);
      expect(presentation.motifId.length).toBeGreaterThan(0);
      expect(presentation.phaseDurationsMs.anticipation).toBeGreaterThanOrEqual(0);
      expect(presentation.phaseDurationsMs.climax).toBeGreaterThanOrEqual(0);
      expect(presentation.phaseDurationsMs.settle).toBeGreaterThanOrEqual(0);
      expect(presentation.tempoBpm).toBeGreaterThan(0);
      expect(presentation.idlePulsePeriodMs).toBeGreaterThan(0);
      expect(presentation.particleDensity).toBeGreaterThanOrEqual(0);
      expect(presentation.seedDerivationRuleId)
        .toBe("fnv1a32-utf8-fields-v1");
      expect(presentation.ambientBedId.length).toBeGreaterThan(0);
    }
    const reveal = eventSuccessMomentPresentationFor("liveReveal");
    expect(reveal.clockReferenceId)
      .toBe("revealStartedAtPlusStructureRevealCountdown");
    expect(reveal.particleDensity).toBeGreaterThan(0);
    expect(eventSuccessMomentPresentationCatalog.moments
      .filter((presentation) => presentation.momentKind !== "liveReveal")
      .every((presentation) =>
        presentation.clockReferenceId === "none" &&
        presentation.particleDensity === 0
      )).toBe(true);
  });

  it("derives the shared server-anchored phase boundaries and seed", () => {
    const fixture = momentPresentationCatalog.parityFixture;
    const ceremony = resolveEventRuntimeCeremony(fixture.eventId, {
      attendeePrompt: null,
      activeStepIndex: 1,
      activeRevealRoundIndex: fixture.activeRevealRoundIndex,
      publishedRevealRoundIndex: -1,
      publishedRotationRoundIndex: -1,
      revealCountdownSeconds: fixture.revealCountdownMs / 1000,
      revealStartedAtMillis: fixture.serverAnchorMillis,
      revealStatus: "countingDown",
      status: "live",
    });

    expect(ceremony).not.toBeNull();
    expect({...ceremony!.timeline, seed: ceremony!.seed})
      .toEqual(fixture.expected);
  });

  it("retains the Firestore server anchor at millisecond precision", () => {
    expect(eventRuntimeTimestampMillis({
      seconds: 1786703400,
      nanoseconds: 123_000_000,
    })).toBe(1786703400123);
    expect(eventRuntimeTimestampMillis({
      toMillis: () => 1786703400456,
    })).toBe(1786703400456);
  });

  it("keeps the reveal countdown configurable with a contract fallback", () => {
    const configured = resolveEventRuntimeCeremony("event-config", {
      attendeePrompt: null,
      activeStepIndex: 1,
      activeRevealRoundIndex: 0,
      publishedRevealRoundIndex: -1,
      publishedRotationRoundIndex: -1,
      revealCountdownSeconds: 18,
      revealStartedAtMillis: 1000,
      revealStatus: "countingDown",
      status: "live",
    });
    const fallback = resolveEventRuntimeCeremony("event-config", {
      attendeePrompt: null,
      activeStepIndex: 1,
      activeRevealRoundIndex: 0,
      publishedRevealRoundIndex: -1,
      publishedRotationRoundIndex: -1,
      revealCountdownSeconds: null,
      revealStartedAtMillis: 1000,
      revealStatus: "countingDown",
      status: "live",
    });

    expect(configured?.timeline.climaxStartsAtMillis).toBe(19000);
    expect(fallback?.timeline.climaxStartsAtMillis).toBe(
      1000 + eventSuccessMomentPresentationFor("liveReveal")
        .phaseDurationsMs.anticipation
    );
  });

  it("keeps unknown questionnaire templates on the safe balanced pack", () => {
    const questionnaire = resolveEventRuntimeQuestionnaire({
      templateId: "unknown-template",
    });
    expect(questionnaire.questions[0]?.id).toBe("event_energy");
  });

  it("accepts exactly one server-selected pre-event payload", () => {
    const event = {
      requiredFieldIds: ["displayName", "paceBand"],
    } as EventRuntimeBootstrap["event"];
    expect(eventRuntimePreEventFieldId(event)).toBe("paceBand");
    expect(() => eventRuntimePreEventFieldId({
      ...event,
      requiredFieldIds: ["displayName", "paceBand", "skillBand"],
    })).toThrow(/more than one pre-event payload/u);
  });

  it("walks every social mission from light to reflective disclosure", () => {
    for (const promptSet of momentPresentationCatalog.socialMissionPromptSets) {
      expect([0, 1, 2, 3].map((activeStepIndex) =>
        resolveEventRuntimeSocialMission(
          promptSet.interactionModel,
          activeStepIndex
        ).disclosureLevel
      )).toEqual(["light", "personal", "reflective", "reflective"]);
    }
  });

  it("routes pending access to Host approval", () => {
    expect(eventRuntimeStageForParticipant({
      accessStatus: "pendingApproval",
    } as EventRuntimeParticipant)).toBe("approval");
  });

  it("reads venue authority only from the URL fragment", () => {
    expect(eventVenueSessionTokenFromFragment(
      "#eventId=event-1&venueSession=signed-live-session"
    )).toBe("signed-live-session");
    expect(eventVenueSessionTokenFromFragment("")).toBeNull();
  });

  it("derives the shared normalized room-map contract for all five shapes", () => {
    expect(new Set(layoutCatalog.parityFixture.units.map((unit) => unit.shape)))
      .toEqual(new Set(layoutCatalog.shapes));
    expect(normalizeEventRuntimeLayoutUnits(layoutCatalog.parityFixture.units))
      .toEqual(layoutCatalog.parityFixture.normalizedUnits);
  });

  it("omits a room map for wholeGroup and missing spatial assignments", () => {
    const spatialAssignment = {
      layoutUnitId: "round",
      unitKind: "pods",
    } as EventRuntimeAssignment;
    expect(shouldRenderEventRuntimeRoomMap(layoutCatalog.parityFixture, spatialAssignment))
      .toBe(true);
    expect(shouldRenderEventRuntimeRoomMap(layoutCatalog.parityFixture, {
      ...spatialAssignment,
      unitKind: "wholeGroup",
    })).toBe(false);
    expect(shouldRenderEventRuntimeRoomMap(null, spatialAssignment)).toBe(false);
    expect(shouldRenderEventRuntimeRoomMap(layoutCatalog.parityFixture, {
      ...spatialAssignment,
      layoutUnitId: undefined,
    })).toBe(false);
  });

  it("reveals only the standings snapshot released by the shared ceremony", () => {
    const standings = {
      unitOutcome: "score",
      rounds: [
        {roundIndex: 0, entries: [{unitId: "a", value: 4}]},
        {roundIndex: 1, entries: [{unitId: "a", value: 9}]},
      ],
    } as unknown as NonNullable<EventRuntimeLiveState["standings"]>;
    const plan = {
      revealStatus: "revealed",
      publishedRevealRoundIndex: 0,
    } as NonNullable<EventRuntimeLiveState["plan"]>;

    expect(visibleEventRuntimeStandingRound(plan, standings)?.roundIndex).toBe(0);
    expect(visibleEventRuntimeStandingRound({
      ...plan,
      revealStatus: "countingDown",
    }, standings)).toBeNull();
  });
});
