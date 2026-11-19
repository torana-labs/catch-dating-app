import {
  deriveEventSuccessMomentSeed,
  eventSuccessMomentPresentationFor,
  eventSuccessSocialMissionPromptFor,
  resolveEventSuccessCeremonyTimeline,
  type EventSuccessCeremonyTimeline,
  type EventRuntimeBootstrap,
  type EventRuntimeLiveState,
  type EventSuccessMomentPresentationContract,
  type EventSuccessDisclosureLevel,
  type EventSuccessInteractionModel,
} from "../../firebase";
import {
  eventRuntimeCopy,
  eventRuntimeQuestionnairePacks,
  eventRuntimeSocialMissionCopy,
} from "../../content/eventRuntime";

export type {EventRuntimeBootstrap};
export type EventRuntimeParticipant = NonNullable<EventRuntimeBootstrap["participant"]>;
export type EventRuntimeLayout = NonNullable<EventRuntimeBootstrap["event"]["layout"]>;
export type EventRuntimeLayoutUnit = EventRuntimeLayout["units"][number];
export type EventRuntimeAssignment = EventRuntimeLiveState["assignments"][number];
export type EventRuntimeStandings = NonNullable<EventRuntimeLiveState["standings"]>;
export type EventRuntimeStandingRound = EventRuntimeStandings["rounds"][number];
export type EventRuntimeGender = NonNullable<
  EventRuntimeParticipant["runtimeProfile"]["gender"]
>;
export type EventRuntimePaceBand = NonNullable<
  EventRuntimeParticipant["runtimeProfile"]["paceBand"]
>;
export type EventRuntimeSkillBand = NonNullable<
  EventRuntimeParticipant["runtimeProfile"]["skillBand"]
>;

export interface EventRuntimeQuestion {
  id: string;
  prompt: string;
  options: Array<{id: string; label: string}>;
}

export interface EventRuntimeQuestionnaire {
  title: string;
  questions: EventRuntimeQuestion[];
}

export interface NormalizedEventRuntimeLayoutUnit {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface EventRuntimeCeremony {
  presentation: EventSuccessMomentPresentationContract;
  timeline: EventSuccessCeremonyTimeline;
  seed: number;
}

export type EventRuntimePreEventFieldId =
  | "paceBand"
  | "skillBand"
  | "dietaryAndSeatingNotes"
  | "questionnaireAnswerIds"
  | "teamName";

export interface EventRuntimeSocialMission {
  title: string;
  body: string;
  disclosureLabel: string;
  disclosureLevel: EventSuccessDisclosureLevel;
}

export function eventRuntimePreEventFieldId(
  event: EventRuntimeBootstrap["event"]
): EventRuntimePreEventFieldId | null {
  const fields = event.requiredFieldIds.filter(isPreEventFieldId);
  if (fields.length > 1) {
    throw new Error("Event runtime exposes more than one pre-event payload.");
  }
  return fields[0] ?? null;
}

export function resolveEventRuntimeSocialMission(
  interactionModel: EventSuccessInteractionModel,
  activeStepIndex: number
): EventRuntimeSocialMission {
  const prompt = eventSuccessSocialMissionPromptFor({
    interactionModel,
    activeStepIndex,
  });
  const body = eventRuntimeSocialMissionCopy.prompts[
    prompt.promptId as keyof typeof eventRuntimeSocialMissionCopy.prompts
  ];
  if (!body) throw new Error(`Missing social mission copy: ${prompt.promptId}`);
  return {
    title: eventRuntimeSocialMissionCopy.titles[prompt.disclosureLevel],
    body,
    disclosureLabel:
      eventRuntimeSocialMissionCopy.labels[prompt.disclosureLevel],
    disclosureLevel: prompt.disclosureLevel,
  };
}

export function resolveEventRuntimeCeremony(
  eventId: string,
  plan: EventRuntimeLiveState["plan"]
): EventRuntimeCeremony | null {
  if (!plan || plan.revealStartedAtMillis === null) return null;
  const presentation = eventSuccessMomentPresentationFor("liveReveal");
  const serverAnchorMillis = plan.revealStartedAtMillis;
  const timeline = resolveEventSuccessCeremonyTimeline({
    presentation,
    serverAnchorMillis,
    revealCountdownMs: plan.revealCountdownSeconds === null ?
      null : plan.revealCountdownSeconds * 1000,
  });
  return {
    presentation,
    timeline,
    seed: deriveEventSuccessMomentSeed({
      presentation,
      eventId,
      activeRevealRoundIndex: plan.activeRevealRoundIndex,
      serverAnchorMillis,
    }),
  };
}

export function eventVenueSessionTokenFromFragment(
  fragment: string
): string | null {
  const normalized = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  const token = new URLSearchParams(normalized).get("venueSession")?.trim();
  return token || null;
}

export function normalizeEventRuntimeLayoutUnits(
  units: readonly EventRuntimeLayoutUnit[]
): NormalizedEventRuntimeLayoutUnit[] {
  const stableUnits = [...units].sort((left, right) =>
    left.order - right.order || left.id.localeCompare(right.id)
  );
  if (!stableUnits.length) return [];
  const columns = Math.max(...stableUnits.map((unit) => unit.gridX)) + 1;
  const rows = Math.max(...stableUnits.map((unit) => unit.gridY)) + 1;
  return stableUnits.map((unit) => ({
    id: unit.id,
    left: rounded(unit.gridX / columns),
    top: rounded(unit.gridY / rows),
    width: rounded(1 / columns),
    height: rounded(1 / rows),
  }));
}

export function shouldRenderEventRuntimeRoomMap(
  layout: EventRuntimeBootstrap["event"]["layout"],
  assignment: EventRuntimeAssignment
): layout is EventRuntimeLayout {
  return Boolean(
    layout &&
    assignment.unitKind !== "wholeGroup" &&
    assignment.layoutUnitId &&
    layout.units.some((unit) => unit.id === assignment.layoutUnitId)
  );
}

export function visibleEventRuntimeStandingRound(
  plan: EventRuntimeLiveState["plan"],
  standings: EventRuntimeLiveState["standings"]
): EventRuntimeStandingRound | null {
  if (!plan || !standings || plan.revealStatus !== "revealed") return null;
  const revealedThrough = plan.publishedRevealRoundIndex;
  return [...standings.rounds]
    .filter((round) => round.roundIndex <= revealedThrough)
    .sort((left, right) => right.roundIndex - left.roundIndex)[0] ?? null;
}

export function resolveEventRuntimeQuestionnaire(
  config: EventRuntimeBootstrap["event"]["questionnaireConfig"]
): EventRuntimeQuestionnaire {
  if (config?.customQuestions?.length) {
    return {
      title: config.customTitle?.trim() || eventRuntimeCopy.compatibilityTitle,
      questions: config.customQuestions,
    };
  }
  const templateId = config?.templateId ?? "balanced";
  const pack = eventRuntimeQuestionnairePacks[
    templateId as keyof typeof eventRuntimeQuestionnairePacks
  ] ?? eventRuntimeQuestionnairePacks.balanced;
  return {
    title: pack.title,
    questions: pack.questions.map((question) => ({
      ...question,
      options: [...question.options],
    })),
  };
}

export function eventRuntimeStageForParticipant(
  participant: EventRuntimeBootstrap["participant"]
): "profile" | "approval" | "runtime" | "unavailable" {
  if (!participant || ["needsClaim", "needsInput"].includes(participant.accessStatus)) {
    return "profile";
  }
  if (participant.accessStatus === "pendingApproval") return "approval";
  if (participant.accessStatus === "ready") return "runtime";
  return "unavailable";
}

export function eventRuntimeError(error: unknown): string {
  switch (errorCode(error)) {
    case "auth/invalid-verification-code":
      return eventRuntimeCopy.invalidCode;
    case "auth/code-expired":
    case "auth/session-expired":
      return eventRuntimeCopy.verificationExpired;
    case "auth/too-many-requests":
    case "auth/quota-exceeded":
    case "functions/resource-exhausted":
      return eventRuntimeCopy.tooManyRequests;
    case "functions/failed-precondition":
    case "functions/not-found":
      return eventRuntimeCopy.eventUnavailable;
    default:
      return eventRuntimeCopy.genericError;
  }
}

function errorCode(error: unknown): string {
  if (typeof error !== "object" || error === null || !("code" in error)) return "";
  return typeof error.code === "string" ? error.code : "";
}

function rounded(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function isPreEventFieldId(value: string): value is EventRuntimePreEventFieldId {
  return value === "paceBand" || value === "skillBand" ||
    value === "dietaryAndSeatingNotes" ||
    value === "questionnaireAnswerIds" || value === "teamName";
}
