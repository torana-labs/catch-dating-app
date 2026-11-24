import type {CreateEventRehearsalCallablePayload} from "../../../../functions/src/shared/generated/createEventRehearsalCallablePayload";
import type {CreateEventRehearsalCallableResponse} from "../../../../functions/src/shared/generated/createEventRehearsalCallableResponse";
import type {CreatePromotionKitCallablePayload} from "../../../../functions/src/shared/generated/createPromotionKitCallablePayload";
import type {CreatePromotionKitCallableResponse} from "../../../../functions/src/shared/generated/createPromotionKitCallableResponse";
import type {EnsureTryItWorkspaceCallablePayload} from "../../../../functions/src/shared/generated/ensureTryItWorkspaceCallablePayload";
import type {EnsureTryItWorkspaceCallableResponse} from "../../../../functions/src/shared/generated/ensureTryItWorkspaceCallableResponse";
import type {ImportEventFromLinkCallablePayload} from "../../../../functions/src/shared/generated/importEventFromLinkCallablePayload";
import type {ImportEventFromLinkCallableResponse} from "../../../../functions/src/shared/generated/importEventFromLinkCallableResponse";
import type {ImportFormFromLinkCallablePayload} from "../../../../functions/src/shared/generated/importFormFromLinkCallablePayload";
import type {ImportFormFromLinkCallableResponse} from "../../../../functions/src/shared/generated/importFormFromLinkCallableResponse";
import type {ImportGuestListCallablePayload} from "../../../../functions/src/shared/generated/importGuestListCallablePayload";
import type {ImportGuestListCallableResponse} from "../../../../functions/src/shared/generated/importGuestListCallableResponse";
import type {ImportOrganizerFromLinkCallablePayload} from "../../../../functions/src/shared/generated/importOrganizerFromLinkCallablePayload";
import type {ImportOrganizerFromLinkCallableResponse} from "../../../../functions/src/shared/generated/importOrganizerFromLinkCallableResponse";
import type {ImportPastSalesCallablePayload} from "../../../../functions/src/shared/generated/importPastSalesCallablePayload";
import type {ImportPastSalesCallableResponse} from "../../../../functions/src/shared/generated/importPastSalesCallableResponse";
import type {PlanNightCallablePayload} from "../../../../functions/src/shared/generated/planNightCallablePayload";
import type {PlanNightCallableResponse} from "../../../../functions/src/shared/generated/planNightCallableResponse";
import {claimFirebaseConfigured} from "../../firebaseConfig";
import {getFirebaseRuntime, invokeWebsiteCallable} from "./runtime";

/**
 * The playbook try-it tools' commands.
 */
/**
 * The try-it commands (contracts/commands/catalog.json) by callable: each
 * one's payload and response, generated from its schemas. The website's
 * command client (shared/api/tryItCommands.ts) is the only caller.
 */
export interface TryItCommandCallables {
  ensureTryItWorkspace: {payload: EnsureTryItWorkspaceCallablePayload; response: EnsureTryItWorkspaceCallableResponse};
  importOrganizerFromLink: {payload: ImportOrganizerFromLinkCallablePayload; response: ImportOrganizerFromLinkCallableResponse};
  importEventFromLink: {payload: ImportEventFromLinkCallablePayload; response: ImportEventFromLinkCallableResponse};
  createPromotionKit: {payload: CreatePromotionKitCallablePayload; response: CreatePromotionKitCallableResponse};
  importGuestList: {payload: ImportGuestListCallablePayload; response: ImportGuestListCallableResponse};
  importPastSales: {payload: ImportPastSalesCallablePayload; response: ImportPastSalesCallableResponse};
  planNight: {payload: PlanNightCallablePayload; response: PlanNightCallableResponse};
  importFormFromLink: {payload: ImportFormFromLinkCallablePayload; response: ImportFormFromLinkCallableResponse};
}

/** Who a try-it command would run as: the signed-in account and its phone, when Firebase verified one by code. */
export interface TryItCaller {
  readonly uid: string;
  readonly phoneNumber: string | null;
}

/**
 * The signed-in website account a try-it tool would act as, once the saved
 * sign-in is restored; null when no one is signed in or this build has no
 * Firebase. The one sign-in sheet (features/account) links or signs in the
 * phone, so a caller with a phoneNumber passes requirePhoneVerifiedCaller.
 */
export async function readTryItCaller(): Promise<TryItCaller | null> {
  if (!claimFirebaseConfigured) return null;
  const runtime = await getFirebaseRuntime();
  if (!runtime) return null;
  await runtime.auth.authStateReady();
  const user = runtime.auth.currentUser;
  return user && !user.isAnonymous ? {uid: user.uid, phoneNumber: user.phoneNumber ?? null} : null;
}

/** One try-it command call as the signed-in account, with the site's App Check token, like every website callable. */
export async function invokeTryItCommand<Name extends keyof TryItCommandCallables>(
  callable: Name, payload: TryItCommandCallables[Name]["payload"]
): Promise<TryItCommandCallables[Name]["response"]> {
  return invokeWebsiteCallable<TryItCommandCallables[Name]["payload"], TryItCommandCallables[Name]["response"]>(
    callable, payload, claimFirebaseConfigured, "Try-it tools");
}

export type TryItRehearsalPayload = CreateEventRehearsalCallablePayload;
export type TryItRehearsalResponse = CreateEventRehearsalCallableResponse;

/**
 * The plan-a-night tool's practice session: createEventRehearsal for the
 * visitor's try-it workspace, with the setup night.plan answered. Not a
 * command, so it has no envelope; it is the same callable Catch Host's
 * dress rehearsal uses, as the signed-in account with App Check.
 */
export async function createTryItRehearsal(payload: TryItRehearsalPayload): Promise<TryItRehearsalResponse> {
  return invokeWebsiteCallable<TryItRehearsalPayload, TryItRehearsalResponse>(
    "createEventRehearsal", payload, claimFirebaseConfigured, "Try-it tools");
}
