import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {validateGetEventMessagePreferenceCallablePayload} from
  "../../shared/generated/validators/getEventMessagePreferenceInput";
import {validateSetEventMessagePreferenceCallablePayload} from
  "../../shared/generated/validators/setEventMessagePreferenceInput";
import {validateListEventMessagePreferencesCallablePayload} from
  "../../shared/generated/validators/listEventMessagePreferencesInput";
import {validateGetEventMessageWithdrawalCallablePayload} from
  "../../shared/generated/validators/getEventMessageWithdrawalInput";
import {validateWithdrawEventMessageCallablePayload} from
  "../../shared/generated/validators/withdrawEventMessageInput";
import {
  getEventAssistanceSmsPreferenceHandler,
  setEventAssistanceSmsPreferenceHandler,
} from "./smsPreferenceHandlers";
import {
  getEventWhatsappPreferenceHandler,
  setEventWhatsappPreferenceHandler,
} from "./whatsappPreferenceHandlers";
import {
  getEventRcsPreferenceHandler,
  setEventRcsPreferenceHandler,
} from "./rcsPreferenceHandlers";
import {listEventSmsPreferencesHandler} from "./smsPreferenceOptionsHandlers";
import {listEventWhatsappPreferencesHandler} from
  "./whatsappPreferenceOptionsHandlers";
import {listEventRcsPreferencesHandler} from "./rcsPreferenceOptionsHandlers";
import {
  getEventAssistanceSmsWithdrawalHandler,
  withdrawEventAssistanceSmsHandler,
} from "./smsWithdrawalHandlers";
import {
  getEventWhatsappWithdrawalHandler,
  withdrawEventWhatsappHandler,
} from "./whatsappWithdrawalHandlers";
import {
  getEventRcsWithdrawalHandler,
  withdrawEventRcsHandler,
} from "./rcsWithdrawalHandlers";

/**
 * One callable per event-day consent action for every channel (issue #2494
 * step 2): get, set and list a verified guest's preference, and read and
 * use a message withdrawal link. Each takes {channel, request}; request is
 * the channel's own payload and the channel's handler validates it, applies
 * its rate limit and returns its own response, exactly as the 15
 * per-channel callables these replaced did.
 */
type Channel = "sms" | "rcs" | "whatsapp";
type Handler = (request: CallableRequest<unknown>) => Promise<unknown>;
type Envelope = {channel: Channel; request: unknown};

function dispatch(validate: (value: unknown) => boolean,
  handlers: Record<Channel, Handler>) {
  return (request: CallableRequest<unknown>) => {
    if (!validate(request.data)) {
      throw new HttpsError("invalid-argument", "Invalid request.");
    }
    const envelope = request.data as Envelope;
    return handlers[envelope.channel]({...request, data: envelope.request});
  };
}

export const getEventMessagePreferenceHandler = dispatch(
  validateGetEventMessagePreferenceCallablePayload, {
    sms: (request) => getEventAssistanceSmsPreferenceHandler(request),
    rcs: (request) => getEventRcsPreferenceHandler(request),
    whatsapp: (request) => getEventWhatsappPreferenceHandler(request),
  });
export const setEventMessagePreferenceHandler = dispatch(
  validateSetEventMessagePreferenceCallablePayload, {
    sms: (request) => setEventAssistanceSmsPreferenceHandler(request),
    rcs: (request) => setEventRcsPreferenceHandler(request),
    whatsapp: (request) => setEventWhatsappPreferenceHandler(request),
  });
export const listEventMessagePreferencesHandler = dispatch(
  validateListEventMessagePreferencesCallablePayload, {
    sms: (request) => listEventSmsPreferencesHandler(request),
    rcs: (request) => listEventRcsPreferencesHandler(request),
    whatsapp: (request) => listEventWhatsappPreferencesHandler(request),
  });
export const getEventMessageWithdrawalHandler = dispatch(
  validateGetEventMessageWithdrawalCallablePayload, {
    sms: (request) => getEventAssistanceSmsWithdrawalHandler(request),
    rcs: (request) => getEventRcsWithdrawalHandler(request),
    whatsapp: (request) => getEventWhatsappWithdrawalHandler(request),
  });
export const withdrawEventMessageHandler = dispatch(
  validateWithdrawEventMessageCallablePayload, {
    sms: (request) => withdrawEventAssistanceSmsHandler(request),
    rcs: (request) => withdrawEventRcsHandler(request),
    whatsapp: (request) => withdrawEventWhatsappHandler(request),
  });

export const getEventMessagePreference = onCall(appCheckCallableOptions,
  getEventMessagePreferenceHandler);
export const setEventMessagePreference = onCall(appCheckCallableOptions,
  setEventMessagePreferenceHandler);
export const listEventMessagePreferences = onCall(appCheckCallableOptions,
  listEventMessagePreferencesHandler);
export const getEventMessageWithdrawal = onCall(appCheckCallableOptions,
  getEventMessageWithdrawalHandler);
export const withdrawEventMessage = onCall(appCheckCallableOptions,
  withdrawEventMessageHandler);
