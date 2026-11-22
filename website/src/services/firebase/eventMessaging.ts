import type {EventAssistanceGuestViewCallableResponse} from "../../../../functions/src/shared/generated/eventAssistanceGuestViewCallableResponse";
import type {EventAssistanceSmsPreferenceCallableResponse} from "../../../../functions/src/shared/generated/eventAssistanceSmsPreferenceCallableResponse";
import type {EventAssistanceSmsWithdrawalCallableResponse} from "../../../../functions/src/shared/generated/eventAssistanceSmsWithdrawalCallableResponse";
import type {EventRcsPreferenceCallableResponse} from "../../../../functions/src/shared/generated/eventRcsPreferenceOutput";
import type {EventRcsWithdrawalCallableResponse} from "../../../../functions/src/shared/generated/eventRcsWithdrawalOutput";
import type {EventWhatsappPreferenceCallableResponse} from "../../../../functions/src/shared/generated/eventWhatsappPreferenceCallableResponse";
import type {EventWhatsappWithdrawalCallableResponse} from "../../../../functions/src/shared/generated/eventWhatsappWithdrawalCallableResponse";
import type {GetEventAssistanceGuestViewCallablePayload} from "../../../../functions/src/shared/generated/getEventAssistanceGuestViewCallablePayload";
import type {GetEventAssistanceSmsPreferenceCallablePayload} from "../../../../functions/src/shared/generated/getEventAssistanceSmsPreferenceCallablePayload";
import type {GetEventAssistanceSmsWithdrawalCallablePayload} from "../../../../functions/src/shared/generated/getEventAssistanceSmsWithdrawalCallablePayload";
import type {GetEventRcsPreferenceCallablePayload} from "../../../../functions/src/shared/generated/getEventRcsPreferenceInput";
import type {GetEventRcsWithdrawalCallablePayload} from "../../../../functions/src/shared/generated/getEventRcsWithdrawalInput";
import type {GetEventWhatsappPreferenceCallablePayload} from "../../../../functions/src/shared/generated/getEventWhatsappPreferenceCallablePayload";
import type {GetEventWhatsappWithdrawalCallablePayload} from "../../../../functions/src/shared/generated/getEventWhatsappWithdrawalCallablePayload";
import type {ListEventRcsPreferencesCallablePayload} from "../../../../functions/src/shared/generated/listEventRcsPreferencesInput";
import type {ListEventRcsPreferencesCallableResponse} from "../../../../functions/src/shared/generated/listEventRcsPreferencesOutput";
import type {ListEventSmsPreferencesCallablePayload} from "../../../../functions/src/shared/generated/listEventSmsPreferencesInput";
import type {ListEventSmsPreferencesCallableResponse} from "../../../../functions/src/shared/generated/listEventSmsPreferencesOutput";
import type {ListEventWhatsappPreferencesCallablePayload} from "../../../../functions/src/shared/generated/listEventWhatsappPreferencesInput";
import type {ListEventWhatsappPreferencesCallableResponse} from "../../../../functions/src/shared/generated/listEventWhatsappPreferencesOutput";
import type {SetEventAssistanceSmsPreferenceCallablePayload} from "../../../../functions/src/shared/generated/setEventAssistanceSmsPreferenceCallablePayload";
import type {SetEventRcsPreferenceCallablePayload} from "../../../../functions/src/shared/generated/setEventRcsPreferenceInput";
import type {SetEventWhatsappPreferenceCallablePayload} from "../../../../functions/src/shared/generated/setEventWhatsappPreferenceCallablePayload";
import type {SubmitEventAssistanceGuestChoiceCallablePayload} from "../../../../functions/src/shared/generated/submitEventAssistanceGuestChoiceCallablePayload";
import type {SubmitEventAssistanceGuestChoiceCallableResponse} from "../../../../functions/src/shared/generated/submitEventAssistanceGuestChoiceCallableResponse";
import type {WithdrawEventAssistanceSmsCallablePayload} from "../../../../functions/src/shared/generated/withdrawEventAssistanceSmsCallablePayload";
import type {WithdrawEventRcsCallablePayload} from "../../../../functions/src/shared/generated/withdrawEventRcsInput";
import type {WithdrawEventWhatsappCallablePayload} from "../../../../functions/src/shared/generated/withdrawEventWhatsappCallablePayload";
import {eventRuntimeFirebaseConfigured} from "../../firebaseConfig";
import {invokeWebsiteCallable} from "./runtime";

/**
 * Event messaging: assistance guest views and SMS, WhatsApp and RCS preferences and withdrawals.
 */
export async function getEventAssistanceGuestView(
  payload: GetEventAssistanceGuestViewCallablePayload
): Promise<EventAssistanceGuestViewCallableResponse> {
  return invokeWebsiteCallable("getEventAssistanceGuestView", payload,
    eventRuntimeFirebaseConfigured, "Event updates");
}

export async function submitEventAssistanceGuestChoice(
  payload: SubmitEventAssistanceGuestChoiceCallablePayload
): Promise<SubmitEventAssistanceGuestChoiceCallableResponse> {
  return invokeWebsiteCallable("submitEventAssistanceGuestChoice", payload,
    eventRuntimeFirebaseConfigured, "Event updates");
}

export async function listEventSmsPreferences(payload: ListEventSmsPreferencesCallablePayload): Promise<ListEventSmsPreferencesCallableResponse> {
  return invokeWebsiteCallable("listEventSmsPreferences", payload,
    eventRuntimeFirebaseConfigured, "Event text preferences");
}

export async function getEventAssistanceSmsPreference(
  payload: GetEventAssistanceSmsPreferenceCallablePayload
): Promise<EventAssistanceSmsPreferenceCallableResponse> {
  return invokeWebsiteCallable("getEventAssistanceSmsPreference", payload,
    eventRuntimeFirebaseConfigured, "Event text preferences");
}

export async function setEventAssistanceSmsPreference(
  payload: SetEventAssistanceSmsPreferenceCallablePayload
): Promise<EventAssistanceSmsPreferenceCallableResponse> {
  return invokeWebsiteCallable("setEventAssistanceSmsPreference", payload,
    eventRuntimeFirebaseConfigured, "Event text preferences");
}

export async function getEventAssistanceSmsWithdrawal(
  payload: GetEventAssistanceSmsWithdrawalCallablePayload
): Promise<EventAssistanceSmsWithdrawalCallableResponse> {
  return invokeWebsiteCallable("getEventAssistanceSmsWithdrawal", payload,
    eventRuntimeFirebaseConfigured, "Event text withdrawal");
}
export async function withdrawEventAssistanceSms(
  payload: WithdrawEventAssistanceSmsCallablePayload
): Promise<EventAssistanceSmsWithdrawalCallableResponse> {
  return invokeWebsiteCallable("withdrawEventAssistanceSms", payload,
    eventRuntimeFirebaseConfigured, "Event text withdrawal");
}

export async function getEventWhatsappWithdrawal(
  payload: GetEventWhatsappWithdrawalCallablePayload
): Promise<EventWhatsappWithdrawalCallableResponse> {
  return invokeWebsiteCallable("getEventWhatsappWithdrawal", payload,
    eventRuntimeFirebaseConfigured, "Event WhatsApp withdrawal");
}
export async function withdrawEventWhatsapp(
  payload: WithdrawEventWhatsappCallablePayload
): Promise<EventWhatsappWithdrawalCallableResponse> {
  return invokeWebsiteCallable("withdrawEventWhatsapp", payload,
    eventRuntimeFirebaseConfigured, "Event WhatsApp withdrawal");
}

export async function getEventRcsWithdrawal(
  payload: GetEventRcsWithdrawalCallablePayload
): Promise<EventRcsWithdrawalCallableResponse> {
  return invokeWebsiteCallable("getEventRcsWithdrawal", payload,
    eventRuntimeFirebaseConfigured, "Event RCS withdrawal");
}
export async function withdrawEventRcs(
  payload: WithdrawEventRcsCallablePayload
): Promise<EventRcsWithdrawalCallableResponse> {
  return invokeWebsiteCallable("withdrawEventRcs", payload,
    eventRuntimeFirebaseConfigured, "Event RCS withdrawal");
}

export async function listEventRcsPreferences(payload: ListEventRcsPreferencesCallablePayload): Promise<ListEventRcsPreferencesCallableResponse> {
  return invokeWebsiteCallable("listEventRcsPreferences", payload,
    eventRuntimeFirebaseConfigured, "Event RCS preferences");
}

export async function getEventRcsPreference(payload: GetEventRcsPreferenceCallablePayload): Promise<EventRcsPreferenceCallableResponse> {
  return invokeWebsiteCallable("getEventRcsPreference", payload,
    eventRuntimeFirebaseConfigured, "Event RCS preferences");
}

export async function setEventRcsPreference(payload: SetEventRcsPreferenceCallablePayload): Promise<EventRcsPreferenceCallableResponse> {
  return invokeWebsiteCallable("setEventRcsPreference", payload,
    eventRuntimeFirebaseConfigured, "Event RCS preferences");
}

export async function listEventWhatsappPreferences(payload: ListEventWhatsappPreferencesCallablePayload): Promise<ListEventWhatsappPreferencesCallableResponse> {
  return invokeWebsiteCallable("listEventWhatsappPreferences", payload,
    eventRuntimeFirebaseConfigured, "Event WhatsApp preferences");
}

export async function getEventWhatsappPreference(payload: GetEventWhatsappPreferenceCallablePayload): Promise<EventWhatsappPreferenceCallableResponse> {
  return invokeWebsiteCallable("getEventWhatsappPreference", payload,
    eventRuntimeFirebaseConfigured, "Event WhatsApp preferences");
}

export async function setEventWhatsappPreference(payload: SetEventWhatsappPreferenceCallablePayload): Promise<EventWhatsappPreferenceCallableResponse> {
  return invokeWebsiteCallable("setEventWhatsappPreference", payload,
    eventRuntimeFirebaseConfigured, "Event WhatsApp preferences");
}
