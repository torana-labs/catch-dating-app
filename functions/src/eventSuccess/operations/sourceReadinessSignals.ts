import type {SourceWork, ReadinessSourceScope} from "./sourceWorkRecords";
import {rcsSubscriptionId} from "./rcsSubscriptions";

type Collection = SourceWork["source"]["collection"];
type Value = Record<string, unknown>;

export function readinessScope(collection: Collection, documentId: string,
  value: Value): ReadinessSourceScope | null {
  switch (collection) {
  case "eventAssistanceRcsSenders":
    return sender("catchEventRcs", documentId);
  case "eventAssistanceBudgets":
    return sender(budgetRoute(value.channel), value.senderId);
  case "eventAssistanceRcsSubscriptions": {
    if (typeof value.agentId !== "string" ||
        typeof value.endpointHash !== "string") return null;
    const subscriptionId = rcsSubscriptionId(value.agentId, value.endpointHash);
    if (value.subscriptionId !== subscriptionId ||
        documentId !== subscriptionId) return null;
    return {kind: "rcsSubscription", subscriptionId};
  }
  case "eventAssistanceSmsSenders":
    return sender("catchEventSms", documentId);
  case "organizerSenderConnections":
    return value.channel === "whatsapp" ?
      sender("organizerEventWhatsapp", documentId) : null;
  case "eventAssistanceWhatsappPolicies":
    return sender("organizerEventWhatsapp", documentId);
  case "organizerMessageTemplates":
    return sender("organizerEventWhatsapp", value.connectionId);
  case "organizerContactChannelStates":
    if (value.channel !== "whatsapp") return null;
    // Falls through to the same organizer/endpoint scope as provider STOP.
  case "organizerWhatsappEndpointStops":
    if (typeof value.organizerId !== "string" ||
        typeof value.endpointHash !== "string" ||
        !/^[a-f0-9]{64}$/.test(value.endpointHash)) return null;
    return {kind: "whatsappEndpoint", organizerId: value.organizerId,
      recipientEndpointId: "whatsapp:" + value.endpointHash};
  default: return null;
  }
}

type SenderRoute = Extract<ReadinessSourceScope, {kind: "sender"}>["routeId"];

/** One budgets collection holds every channel; `channel` picks the route. */
function budgetRoute(channel: unknown): SenderRoute | null {
  switch (channel) {
  case "sms": return "catchEventSms";
  case "rcs": return "catchEventRcs";
  case "whatsapp": return "organizerEventWhatsapp";
  default: return null;
  }
}

function sender(routeId: SenderRoute | null,
  senderId: unknown): ReadinessSourceScope | null {
  return routeId && typeof senderId === "string" ? {kind: "sender", routeId,
    senderId} : null;
}

/** Dispatch debits and inbox counters are not repair notifications. */
export function readinessFields(collection: Collection): string[] | null {
  switch (collection) {
  case "eventAssistanceRcsSubscriptions":
    return ["subscriptionId", "agentId", "endpointHash", "lastStop"];
  case "eventAssistanceBudgets":
    // agentId exists on RCS budgets only; it reads as null for the others.
    return ["channel", "senderId", "agentId", "scope", "status", "approvalId",
      "currency", "limitMicros", "startsAt", "endsAt"];
  case "organizerContactChannelStates":
    return ["organizerId", "contactId", "channel", "endpointHash",
      "adminSuppressed", "suppressionStatus", "suppressionSource"];
  default: return null;
  }
}

export function spendingReleased(collection: Collection,
  before: Value | undefined, after: Value | undefined) {
  return collection === "eventAssistanceBudgets" &&
    typeof before?.chargedMicros === "number" &&
    typeof after?.chargedMicros === "number" &&
    after.chargedMicros < before.chargedMicros;
}
