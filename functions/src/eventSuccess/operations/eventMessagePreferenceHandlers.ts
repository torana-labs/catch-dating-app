import type {CallableRequest} from "firebase-functions/v2/https";
import type {ValidateFunction} from "ajv";
import {callable, type CallableSpec} from "../../platform/callables/callable";
import {publicCallable, signedIn} from "../../platform/callables/policies";
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

/**
 * One merged callable: the policy and the envelope are checked first, then
 * the channel's own handler runs with the channel's own request.
 */
function spec<A>(name: string, policy: CallableSpec<Envelope, A,
  unknown>["policy"], input: (value: unknown) => boolean,
handlers: Record<Channel, Handler>): CallableSpec<Envelope, A, unknown> {
  return {name, policy, input: input as ValidateFunction<Envelope>,
    handle: ({request, data}) =>
      handlers[data.channel]({...request, data: data.request})};
}

// A message link carries its own secret; the channel handler checks it and
// rate-limits by network and credential.
const withdrawalLink = publicCallable(
  "a message withdrawal link carries its own secret");

export const getEventMessagePreferenceSpec = spec(
  "getEventMessagePreference", signedIn,
  validateGetEventMessagePreferenceCallablePayload, {
    sms: (request) => getEventAssistanceSmsPreferenceHandler(request),
    rcs: (request) => getEventRcsPreferenceHandler(request),
    whatsapp: (request) => getEventWhatsappPreferenceHandler(request),
  });
export const setEventMessagePreferenceSpec = spec(
  "setEventMessagePreference", signedIn,
  validateSetEventMessagePreferenceCallablePayload, {
    sms: (request) => setEventAssistanceSmsPreferenceHandler(request),
    rcs: (request) => setEventRcsPreferenceHandler(request),
    whatsapp: (request) => setEventWhatsappPreferenceHandler(request),
  });
export const listEventMessagePreferencesSpec = spec(
  "listEventMessagePreferences", signedIn,
  validateListEventMessagePreferencesCallablePayload, {
    sms: (request) => listEventSmsPreferencesHandler(request),
    rcs: (request) => listEventRcsPreferencesHandler(request),
    whatsapp: (request) => listEventWhatsappPreferencesHandler(request),
  });
export const getEventMessageWithdrawalSpec = spec(
  "getEventMessageWithdrawal", withdrawalLink,
  validateGetEventMessageWithdrawalCallablePayload, {
    sms: (request) => getEventAssistanceSmsWithdrawalHandler(request),
    rcs: (request) => getEventRcsWithdrawalHandler(request),
    whatsapp: (request) => getEventWhatsappWithdrawalHandler(request),
  });
export const withdrawEventMessageSpec = spec(
  "withdrawEventMessage", withdrawalLink,
  validateWithdrawEventMessageCallablePayload, {
    sms: (request) => withdrawEventAssistanceSmsHandler(request),
    rcs: (request) => withdrawEventRcsHandler(request),
    whatsapp: (request) => withdrawEventWhatsappHandler(request),
  });

export const getEventMessagePreference = callable(
  getEventMessagePreferenceSpec);
export const setEventMessagePreference = callable(
  setEventMessagePreferenceSpec);
export const listEventMessagePreferences = callable(
  listEventMessagePreferencesSpec);
export const getEventMessageWithdrawal = callable(
  getEventMessageWithdrawalSpec);
export const withdrawEventMessage = callable(withdrawEventMessageSpec);
