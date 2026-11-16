import type {EventWhatsappBudgetDocument as WhatsappBudget} from
  "../../shared/generated/eventWhatsappBudgetDocument";
import {validateEventWhatsappBudgetDocument} from
  "../../shared/generated/validators/eventWhatsappBudgetDocument";
import {operationContentHash} from "../../operations/durableActions";
import {EVENT_ASSISTANCE_BUDGETS} from
  "./messageConsentCollections";

export type {WhatsappBudget};
export const WHATSAPP_BUDGETS = EVENT_ASSISTANCE_BUDGETS;
export const WHATSAPP_DISPATCHES = "eventAssistanceWhatsappDispatches";
type Context = Extract<WhatsappBudget["scope"], {kind: "event"}>["context"];

export function whatsappBudgetScopes(context: Context, now: number):
  [WhatsappBudget["scope"], WhatsappBudget["scope"]] {
  return [{kind: "event", context}, {kind: "senderDay",
    day: new Date(now).toISOString().slice(0, 10)}];
}

export function whatsappBudgetId(senderId: string, currency: string,
  scope: WhatsappBudget["scope"]): string {
  return "wa-budget:" + operationContentHash([senderId, currency, scope]);
}

export function parseWhatsappBudget(value: unknown): WhatsappBudget {
  if (!validateEventWhatsappBudgetDocument(value) ||
      value.budgetId !== whatsappBudgetId(value.senderId, value.currency,
        value.scope) || value.endsAt <= value.startsAt ||
      value.updatedAt < value.startsAt ||
      value.chargedMicros > value.limitMicros) {
    throw new Error("Invalid WhatsApp spending authority");
  }
  if (value.scope.kind === "senderDay") {
    const start = Date.parse(value.scope.day + "T00:00:00Z");
    if (!Number.isSafeInteger(start) ||
        new Date(start).toISOString().slice(0, 10) !== value.scope.day ||
        value.startsAt !== start || value.endsAt !== start + 86_400_000) {
      throw new Error("WhatsApp sender-day budget must use its UTC window");
    }
  }
  return value;
}
