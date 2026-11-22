import type {CheckInEventRuntimeCallablePayload} from "../../../../functions/src/shared/generated/checkInEventRuntimeCallablePayload";
import type {CheckInEventRuntimeCallableResponse} from "../../../../functions/src/shared/generated/checkInEventRuntimeCallableResponse";
import type {ClaimEventRuntimeAccessCallablePayload} from "../../../../functions/src/shared/generated/claimEventRuntimeAccessCallablePayload";
import type {ClaimEventRuntimeAccessCallableResponse} from "../../../../functions/src/shared/generated/claimEventRuntimeAccessCallableResponse";
import type {CompleteEventSuccessFirstHelloMissionCallablePayload} from "../../../../functions/src/shared/generated/completeEventSuccessFirstHelloMissionCallablePayload";
import type {CreateEventInviteLinkCallablePayload} from "../../../../functions/src/shared/generated/createEventInviteLinkCallablePayload";
import type {EventIdCallablePayload} from "../../../../functions/src/shared/generated/eventIdCallablePayload";
import type {EventRehearsalGuestBootstrapCallableResponse} from "../../../../functions/src/shared/generated/eventRehearsalGuestBootstrapCallableResponse";
import type {EventSuccessAssignmentDocument} from "../../../../functions/src/shared/generated/eventSuccessAssignmentDocument";
import type {EventSuccessLateArrivalDocument} from "../../../../functions/src/shared/generated/eventSuccessLateArrivalDocument";
import type {EventSuccessStandingsDocument} from "../../../../functions/src/shared/generated/eventSuccessStandingsDocument";
import type {FetchEventSuccessWingmanCandidatesCallableResponse} from "../../../../functions/src/shared/generated/fetchEventSuccessWingmanCandidatesCallableResponse";
import type {GetEventRehearsalGuestBootstrapCallablePayload} from "../../../../functions/src/shared/generated/getEventRehearsalGuestBootstrapCallablePayload";
import type {GetEventRuntimeBootstrapCallablePayload} from "../../../../functions/src/shared/generated/getEventRuntimeBootstrapCallablePayload";
import type {GetEventRuntimeBootstrapCallableResponse} from "../../../../functions/src/shared/generated/getEventRuntimeBootstrapCallableResponse";
import type {GetEventSuccessConversationGraphCallableResponse} from "../../../../functions/src/shared/generated/getEventSuccessConversationGraphCallableResponse";
import type {HeartbeatEventSuccessPresenceCallableResponse} from "../../../../functions/src/shared/generated/heartbeatEventSuccessPresenceCallableResponse";
import type {RecordEventShareIntentCallablePayload} from "../../../../functions/src/shared/generated/recordEventShareIntentCallablePayload";
import type {RequestEventRuntimeHostHelpCallablePayload} from "../../../../functions/src/shared/generated/requestEventRuntimeHostHelpCallablePayload";
import type {RequestEventRuntimeHostHelpCallableResponse} from "../../../../functions/src/shared/generated/requestEventRuntimeHostHelpCallableResponse";
import type {StartEventSuccessFirstHelloMissionCallablePayload} from "../../../../functions/src/shared/generated/startEventSuccessFirstHelloMissionCallablePayload";
import type {SubmitEventRehearsalGuestActionCallablePayload} from "../../../../functions/src/shared/generated/submitEventRehearsalGuestActionCallablePayload";
import type {SubmitEventRuntimeProfileCallablePayload} from "../../../../functions/src/shared/generated/submitEventRuntimeProfileCallablePayload";
import type {SubmitEventRuntimeProfileCallableResponse} from "../../../../functions/src/shared/generated/submitEventRuntimeProfileCallableResponse";
import type {SubmitEventSuccessConversationGraphCallablePayload} from "../../../../functions/src/shared/generated/submitEventSuccessConversationGraphCallablePayload";
import type {SubmitEventSuccessConversationGraphCallableResponse} from "../../../../functions/src/shared/generated/submitEventSuccessConversationGraphCallableResponse";
import type {SubmitEventSuccessWingmanRequestCallablePayload} from "../../../../functions/src/shared/generated/submitEventSuccessWingmanRequestCallablePayload";
import {eventRuntimeFirebaseConfigured} from "../../firebaseConfig";
import {getFirebaseRuntime, invokeWebsiteCallable, isRecord} from "./runtime";

/**
 * The no-download event runtime and event rehearsal guest views.
 */
export {
  deriveEventSuccessMomentSeed,
  eventSuccessMomentPresentationCatalog,
  eventSuccessMomentPresentationFor,
  eventSuccessSocialMissionPromptFor,
  resolveEventSuccessCeremonyTimeline,
} from "../../../../functions/src/shared/generated/eventSuccessMomentPresentations";
export type {
  EventSuccessCeremonyTimeline,
  EventSuccessMomentPresentationContract,
  EventSuccessDisclosureLevel,
  EventSuccessInteractionModel,
  EventSuccessSocialMissionPromptContract,
} from "../../../../functions/src/shared/generated/eventSuccessMomentPresentations";
export type EventRuntimeBootstrap = GetEventRuntimeBootstrapCallableResponse;
export type EventRehearsalGuestBootstrap =
  EventRehearsalGuestBootstrapCallableResponse;
// Single-step controls. Assistance replies and required-data submissions need
// their own structured payloads and cannot use the generic action button.
export type EventRehearsalGuestAction = Exclude<
  SubmitEventRehearsalGuestActionCallablePayload["action"],
  "respondToAssistance" | "submitRequiredData"
>;
export type EventSuccessConversationGraph =
  GetEventSuccessConversationGraphCallableResponse;

export interface EventRuntimeAttendeeInviteLink {
  inviteLinkId: string;
  inviteToken: string;
  eventId: string;
  label: string;
  source: string | null;
}

export interface EventRuntimeMission {
  observerUid: string;
  targetUid: string;
  targetDisplayName: string;
  targetContext: string;
  question: string;
  answerOptions: Array<{id: string; label: string}>;
  status: "active" | "completed" | "expired";
  selectedAnswerId?: string | null;
}

export interface EventRuntimeLiveState {
  assignments: EventSuccessAssignmentDocument[];
  compatibilityAnswerIds: string[];
  feedback: EventRuntimeFeedback | null;
  mission: EventRuntimeMission | null;
  lateArrival: EventSuccessLateArrivalDocument | null;
  plan: EventRuntimePlanState | null;
  standings: EventSuccessStandingsDocument | null;
  wingmanTargetUid: string | null;
}

export interface EventRuntimePlanState {
  attendeePrompt: string | null;
  activeStepIndex: number;
  activeRevealRoundIndex: number;
  publishedRevealRoundIndex: number;
  publishedRotationRoundIndex: number;
  revealCountdownSeconds: number | null;
  revealStartedAtMillis: number | null;
  revealStatus: "idle" | "countingDown" | "revealed";
  status: "setup" | "live" | "complete";
}

export interface EventRuntimeFeedback {
  welcomeRating: number;
  structureRating: number;
  metNewPeopleCount: number;
  safetyConcern: boolean;
  privateNote: string | null;
}

export interface EventRuntimeContext {
  eventId: string;
  organizerId: string;
  uid: string;
}

export async function getEventRuntimeBootstrap(
  payload: GetEventRuntimeBootstrapCallablePayload
): Promise<GetEventRuntimeBootstrapCallableResponse> {
  return invokeWebsiteCallable(
    "getEventRuntimeBootstrap",
    payload,
    eventRuntimeFirebaseConfigured
  );
}

export async function claimEventRuntimeAccess(
  payload: ClaimEventRuntimeAccessCallablePayload
): Promise<ClaimEventRuntimeAccessCallableResponse> {
  return invokeWebsiteCallable(
    "claimEventRuntimeAccess",
    payload,
    eventRuntimeFirebaseConfigured
  );
}

export async function submitEventRuntimeProfile(
  payload: SubmitEventRuntimeProfileCallablePayload
): Promise<SubmitEventRuntimeProfileCallableResponse> {
  return invokeWebsiteCallable(
    "submitEventRuntimeProfile",
    payload,
    eventRuntimeFirebaseConfigured
  );
}

export async function checkInEventRuntime(
  payload: CheckInEventRuntimeCallablePayload
): Promise<CheckInEventRuntimeCallableResponse> {
  return invokeWebsiteCallable(
    "checkInEventRuntime",
    payload,
    eventRuntimeFirebaseConfigured
  );
}

/** Opens a host-help case the live console sees; a retry with the same requestId returns it. */
export async function requestEventRuntimeHostHelp(
  payload: RequestEventRuntimeHostHelpCallablePayload
): Promise<RequestEventRuntimeHostHelpCallableResponse> {
  return invokeWebsiteCallable(
    "requestEventRuntimeHostHelp",
    payload,
    eventRuntimeFirebaseConfigured
  );
}

export async function heartbeatEventRuntimePresence(
  eventId: string
): Promise<HeartbeatEventSuccessPresenceCallableResponse> {
  return invokeWebsiteCallable(
    "heartbeatEventSuccessPresence",
    {eventId, surface: "web"},
    eventRuntimeFirebaseConfigured
  );
}

export async function getEventSuccessConversationGraph(
  eventId: string
): Promise<GetEventSuccessConversationGraphCallableResponse> {
  return invokeWebsiteCallable(
    "getEventSuccessConversationGraph",
    {eventId},
    eventRuntimeFirebaseConfigured
  );
}

export async function submitEventSuccessConversationGraph(
  payload: SubmitEventSuccessConversationGraphCallablePayload
): Promise<SubmitEventSuccessConversationGraphCallableResponse> {
  return invokeWebsiteCallable(
    "submitEventSuccessConversationGraph",
    payload,
    eventRuntimeFirebaseConfigured
  );
}

export async function createEventRuntimeAttendeeInviteLink(
  eventId: string,
  label: string
): Promise<EventRuntimeAttendeeInviteLink> {
  const payload: CreateEventInviteLinkCallablePayload = {
    eventId,
    label,
    source: "runtime_web",
    linkKind: "attendeeReferrer",
  };
  return invokeWebsiteCallable(
    "createAttendeeInviteLink",
    payload,
    eventRuntimeFirebaseConfigured
  );
}

export async function recordEventRuntimeShareIntent(
  payload: Pick<
    RecordEventShareIntentCallablePayload,
    "eventId" | "inviteLinkId" | "channelHint"
  >
): Promise<{recorded: boolean}> {
  return invokeWebsiteCallable(
    "recordEventShareIntent",
    {...payload, surface: "runtimeWeb"},
    eventRuntimeFirebaseConfigured
  );
}

export async function startEventRuntimeFirstHello(
  payload: StartEventSuccessFirstHelloMissionCallablePayload
): Promise<{missionId: string; attended?: boolean}> {
  return invokeWebsiteCallable(
    "startEventSuccessFirstHelloMission",
    payload,
    eventRuntimeFirebaseConfigured
  );
}

export async function completeEventRuntimeFirstHello(
  payload: CompleteEventSuccessFirstHelloMissionCallablePayload
): Promise<{attended: boolean}> {
  return invokeWebsiteCallable(
    "completeEventSuccessFirstHelloMission",
    payload,
    eventRuntimeFirebaseConfigured
  );
}

export async function fetchEventRuntimeWingmanCandidates(
  payload: EventIdCallablePayload
): Promise<FetchEventSuccessWingmanCandidatesCallableResponse> {
  return invokeWebsiteCallable(
    "fetchEventSuccessWingmanCandidates",
    payload,
    eventRuntimeFirebaseConfigured
  );
}

export async function submitEventRuntimeWingmanRequest(
  payload: SubmitEventSuccessWingmanRequestCallablePayload
): Promise<{saved: boolean}> {
  return invokeWebsiteCallable(
    "submitEventSuccessWingmanRequest",
    payload,
    eventRuntimeFirebaseConfigured
  );
}

export async function withdrawEventRuntimeWingmanRequest(
  payload: EventIdCallablePayload
): Promise<{withdrawn: boolean}> {
  return invokeWebsiteCallable(
    "withdrawEventSuccessWingmanRequest",
    payload,
    eventRuntimeFirebaseConfigured
  );
}

export async function watchEventRuntimeLiveState(
  context: EventRuntimeContext,
  onValue: (state: EventRuntimeLiveState) => void,
  onError: (error: Error) => void
): Promise<() => void> {
  const runtime = await getFirebaseRuntime();
  if (!runtime || !eventRuntimeFirebaseConfigured) {
    throw new Error("Event runtime is not configured for this build.");
  }
  const {doc, onSnapshot} = await import("firebase/firestore");
  const state: EventRuntimeLiveState = {
    assignments: [],
    compatibilityAnswerIds: [],
    feedback: null,
    mission: null,
    lateArrival: null,
    plan: null,
    standings: null,
    wingmanTargetUid: null,
  };
  const assignmentByModule = new Map<string, EventSuccessAssignmentDocument>();
  const emit = () => onValue({
    ...state,
    assignments: [...assignmentByModule.values()],
    compatibilityAnswerIds: [...state.compatibilityAnswerIds],
  });
  const subscriptions = ["micro_pods", "guided_rotations"].map((moduleId) =>
    onSnapshot(
      doc(
        runtime.firestore,
        "eventSuccessAssignments",
        `${context.eventId}_${moduleId}_${context.uid}`
      ),
      (snapshot) => {
        if (snapshot.exists()) {
          assignmentByModule.set(
            moduleId,
            snapshot.data() as EventSuccessAssignmentDocument
          );
        } else {
          assignmentByModule.delete(moduleId);
        }
        emit();
      },
      (error) => onError(error)
    ));
  subscriptions.push(onSnapshot(
    doc(runtime.firestore, "eventSuccessPlans", context.eventId),
    (snapshot) => {
      const data = snapshot.data();
      const structureConfig = isRecord(data?.structureConfig) ?
        data.structureConfig : null;
      state.plan = data ? {
        attendeePrompt: typeof data.attendeePrompt === "string" ?
          data.attendeePrompt : null,
        activeStepIndex: Number.isInteger(data.activeStepIndex) ?
          Number(data.activeStepIndex) : 0,
        activeRevealRoundIndex: Number.isInteger(data.activeRevealRoundIndex) ?
          Number(data.activeRevealRoundIndex) : 0,
        publishedRevealRoundIndex: Number.isInteger(data.publishedRevealRoundIndex) ?
          Number(data.publishedRevealRoundIndex) : -1,
        publishedRotationRoundIndex: Number.isInteger(
          data.publishedRotationRoundIndex
        ) ? Number(data.publishedRotationRoundIndex) : -1,
        revealCountdownSeconds: Number.isInteger(
          structureConfig?.revealCountdownSeconds
        ) ? Number(structureConfig?.revealCountdownSeconds) : null,
        revealStartedAtMillis: eventRuntimeTimestampMillis(
          data.revealStartedAt
        ),
        revealStatus: data.revealStatus === "countingDown" ||
          data.revealStatus === "revealed" ? data.revealStatus : "idle",
        status: data.status === "live" || data.status === "complete" ?
          data.status : "setup",
      } : null;
      emit();
    },
    (error) => onError(error)
  ));
  subscriptions.push(onSnapshot(
    doc(
      runtime.firestore,
      "eventSuccessLateArrivals",
      `${context.eventId}_${context.uid}`
    ),
    (snapshot) => {
      state.lateArrival = snapshot.exists() ?
        snapshot.data() as EventSuccessLateArrivalDocument : null;
      emit();
    },
    (error) => onError(error)
  ));
  subscriptions.push(onSnapshot(
    doc(runtime.firestore, "eventSuccessStandings", context.eventId),
    (snapshot) => {
      state.standings = snapshot.exists() ?
        snapshot.data() as EventSuccessStandingsDocument : null;
      emit();
    },
    (error) => onError(error)
  ));
  subscriptions.push(onSnapshot(
    doc(
      runtime.firestore,
      "eventSuccessArrivalMissions",
      `${context.eventId}_${context.uid}`
    ),
    (snapshot) => {
      state.mission = snapshot.exists() ?
        snapshot.data() as EventRuntimeMission : null;
      emit();
    },
    (error) => onError(error)
  ));
  subscriptions.push(onSnapshot(
    doc(
      runtime.firestore,
      "eventSuccessFeedback",
      `${context.eventId}_${context.uid}`
    ),
    (snapshot) => {
      const data = snapshot.data();
      state.feedback = data ? {
        welcomeRating: Number(data.welcomeRating),
        structureRating: Number(data.structureRating),
        metNewPeopleCount: Number(data.metNewPeopleCount),
        safetyConcern: data.safetyConcern === true,
        privateNote: typeof data.privateNote === "string" ? data.privateNote : null,
      } : null;
      emit();
    },
    (error) => onError(error)
  ));
  subscriptions.push(onSnapshot(
    doc(
      runtime.firestore,
      "eventSuccessCompatibilityResponses",
      `${context.eventId}_${context.uid}`
    ),
    (snapshot) => {
      const answerIds = snapshot.data()?.answerIds;
      state.compatibilityAnswerIds = Array.isArray(answerIds) ?
        answerIds.filter((value): value is string => typeof value === "string") :
        [];
      emit();
    },
    (error) => onError(error)
  ));
  subscriptions.push(onSnapshot(
    doc(
      runtime.firestore,
      "eventSuccessWingmanRequests",
      `${context.eventId}_${context.uid}`
    ),
    (snapshot) => {
      const data = snapshot.data();
      state.wingmanTargetUid = data?.status === "active" &&
        typeof data.targetUid === "string" ? data.targetUid : null;
      emit();
    },
    (error) => onError(error)
  ));
  return () => subscriptions.forEach((unsubscribe) => unsubscribe());
}

export function eventRuntimeTimestampMillis(value: unknown): number | null {
  if (!isRecord(value)) return null;
  const toMillis = value.toMillis;
  if (typeof toMillis === "function") {
    const millis = Number(toMillis.call(value));
    return Number.isFinite(millis) ? millis : null;
  }
  const seconds = value.seconds ?? value._seconds;
  const nanoseconds = value.nanoseconds ?? value._nanoseconds ?? 0;
  if (typeof seconds !== "number" || typeof nanoseconds !== "number") {
    return null;
  }
  const millis = seconds * 1000 + Math.floor(nanoseconds / 1_000_000);
  return Number.isFinite(millis) ? millis : null;
}

export async function saveEventRuntimeCompatibilityAnswers(
  context: EventRuntimeContext,
  answerIds: string[]
): Promise<void> {
  const runtime = await getFirebaseRuntime();
  if (!runtime || !eventRuntimeFirebaseConfigured) {
    throw new Error("Event runtime is not configured for this build.");
  }
  const {doc, getDoc, serverTimestamp, setDoc} = await import(
    "firebase/firestore"
  );
  const ref = doc(
    runtime.firestore,
    "eventSuccessCompatibilityResponses",
    `${context.eventId}_${context.uid}`
  );
  const existing = await getDoc(ref);
  await setDoc(ref, {
    eventId: context.eventId,
    organizerId: context.organizerId,
    uid: context.uid,
    answerIds,
    createdAt: existing.data()?.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function saveEventRuntimeFeedback(
  context: EventRuntimeContext,
  feedback: EventRuntimeFeedback
): Promise<void> {
  const runtime = await getFirebaseRuntime();
  if (!runtime || !eventRuntimeFirebaseConfigured) {
    throw new Error("Event runtime is not configured for this build.");
  }
  const {doc, getDoc, serverTimestamp, setDoc} = await import(
    "firebase/firestore"
  );
  const ref = doc(
    runtime.firestore,
    "eventSuccessFeedback",
    `${context.eventId}_${context.uid}`
  );
  const existing = await getDoc(ref);
  await setDoc(ref, {
    eventId: context.eventId,
    organizerId: context.organizerId,
    uid: context.uid,
    ...feedback,
    createdAt: existing.data()?.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getEventRehearsalGuestBootstrap(
  payload: GetEventRehearsalGuestBootstrapCallablePayload
): Promise<EventRehearsalGuestBootstrapCallableResponse> {
  return invokeWebsiteCallable(
    "getEventRehearsalGuestBootstrap",
    payload,
    eventRuntimeFirebaseConfigured,
    "Event rehearsal"
  );
}

export async function submitEventRehearsalGuestAction(
  payload: SubmitEventRehearsalGuestActionCallablePayload
): Promise<EventRehearsalGuestBootstrapCallableResponse> {
  return invokeWebsiteCallable(
    "submitEventRehearsalGuestAction",
    payload,
    eventRuntimeFirebaseConfigured,
    "Event rehearsal"
  );
}
