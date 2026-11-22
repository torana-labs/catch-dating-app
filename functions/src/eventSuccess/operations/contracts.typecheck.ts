import type {
  EventAssistancePolicy,
} from "../../shared/generated/eventAssistancePolicy";
import type {
  EventAssistanceCommand,
} from "../../shared/generated/eventAssistanceCommand";
import type {EventAssistanceDeliveryAttempt} from
  "../../shared/generated/eventAssistanceDeliveryAttempt";
import type {EventAssistanceGuestResponse} from
  "../../shared/generated/eventAssistanceGuestResponse";
import type {EventAssistanceMessageIntent} from
  "../../shared/generated/eventAssistanceMessageIntent";
import type {EventAssistanceSmsConfig} from
  "../../shared/generated/eventAssistanceSmsConfig";
import type {EventWhatsappPolicyDocument} from
  "../../shared/generated/eventWhatsappPolicyDocument";
import type {communicationRoutes} from
  "../../platform/delivery/communicationRoutes";

type LateJoin = Extract<EventAssistancePolicy, {kind: "lateJoin"}>;
type JoinIntentPayload = Extract<
  EventAssistanceCommand, {kind: "setJoinIntent"}
>["payload"];
type CheckIn = Extract<EventAssistanceCommand, {kind: "checkInGuest"}>;

/** These rejected pairings must remain impossible after code generation. */
export function assertCorrelatedWireTypes(
  lateJoinConfig: LateJoin["config"],
  checkInPayload: CheckIn["payload"]
): void {
  // @ts-expect-error A check-in request cannot carry a late-joining policy.
  const invalidCheckIn: CheckIn["payload"] = lateJoinConfig;
  // @ts-expect-error Physical attendance cannot become a guest joining intent.
  const invalidIntent: JoinIntentPayload = checkInPayload;
  // @ts-expect-error Late joining requires an individual participation episode.
  const invalidScope: LateJoin["scope"] = {kind: "event", eventId: "event-1"};
  void [invalidCheckIn, invalidIntent, invalidScope];
}

export function assertEventTemplatePurposeCoverage(): void {
  type Purpose = "joiningUpdate" | Extract<EventAssistanceMessageIntent,
    {kind: "operationalNotice"}>["noticeKind"];
  type Sms = EventAssistanceSmsConfig["templates"][number]["purpose"];
  type Whatsapp = EventWhatsappPolicyDocument["templates"][number]["purpose"];
  const sms: [Purpose] extends [Sms] ?
    [Sms] extends [Purpose] ? true : never : never = true;
  const whatsapp: [Purpose] extends [Whatsapp] ?
    [Whatsapp] extends [Purpose] ? true : never : never = true;
  void [sms, whatsapp];
}

export function assertCorrelatedMessagingTypes(
  liveContext: Extract<EventAssistanceDeliveryAttempt, {mode: "live"}>[
    "context"],
  smsBinding: Extract<Extract<EventAssistanceDeliveryAttempt,
    {mode: "live"}>["binding"], {routeId: "catchEventSms"}>
): void {
  type RegisteredRoutes = {
    [K in keyof typeof communicationRoutes]:
      typeof communicationRoutes[K]["deliveryMode"] extends "eventService" ?
        K : never
  }[keyof typeof communicationRoutes];
  type IntentRoutes = EventAssistanceMessageIntent["permittedRoutes"][number];
  const routeCoverage: [RegisteredRoutes] extends [IntentRoutes] ?
    [IntentRoutes] extends [RegisteredRoutes] ? true : never : never = true;
  type Practice = Extract<EventAssistanceDeliveryAttempt, {mode: "rehearsal"}>;
  type Whatsapp = Extract<Extract<EventAssistanceDeliveryAttempt,
    {mode: "live"}>["binding"], {routeId: "organizerEventWhatsapp"}>;
  // @ts-expect-error Rehearsal never carries a production event context.
  const invalidPractice: Practice["context"] = liveContext;
  // @ts-expect-error SMS sender authority cannot become organizer WhatsApp.
  const invalidSender: Whatsapp = smsBinding;
  type ResponseValue = EventAssistanceGuestResponse["value"];
  // @ts-expect-error A guest choice cannot manufacture physical attendance.
  const invalidResponse: ResponseValue = {kind: "checkIn"};
  void [invalidPractice, invalidSender, invalidResponse, routeCoverage];
}


export function assertParticipationCommandsAreCorrelated(): void {
  type Payload = Extract<EventAssistanceCommand,
    {kind: "setParticipation"}>["payload"];
  // @ts-expect-error A state change must fence both the episode and revision.
  const missingRevision: Payload = {attendeeId: "a", state: "active",
    resumeAtUnit: null};
  // @ts-expect-error A departed guest cannot have a pending return point.
  const contradictory: Payload = {attendeeId: "a", state: "departed",
    episodeId: "e", expectedParticipationRevision: 1, resumeAtUnit: "unit"};
  void [missingRevision, contradictory];
}
