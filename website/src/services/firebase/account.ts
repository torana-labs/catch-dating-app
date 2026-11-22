import type {FollowOrganizerByPhoneCallablePayload} from "../../../../functions/src/shared/generated/followOrganizerByPhoneCallablePayload";
import type {FollowOrganizerByPhoneCallableResponse} from "../../../../functions/src/shared/generated/followOrganizerByPhoneCallableResponse";
import type {GetEventTicketCodeCallableResponse} from "../../../../functions/src/shared/generated/getEventTicketCodeCallableResponse";
import type {ManageWebsiteAccountCallablePayload} from "../../../../functions/src/shared/generated/manageWebsiteAccountCallablePayload";
import type {ManageWebsiteAccountCallableResponse} from "../../../../functions/src/shared/generated/manageWebsiteAccountCallableResponse";
import type {WithdrawParticipantMessagingPermissionCallablePayload} from "../../../../functions/src/shared/generated/withdrawParticipantMessagingPermissionCallablePayload";
import type {WithdrawParticipantMessagingPermissionCallableResponse} from "../../../../functions/src/shared/generated/withdrawParticipantMessagingPermissionCallableResponse";
import {claimFirebaseConfigured} from "../../firebaseConfig";
import {getFirebaseRuntime, invokeWebsiteCallable} from "./runtime";

/**
 * The signed-in account's own commands: account read and completion, follows, passes and messaging withdrawals.
 */
export function manageWebsiteAccount(payload: ManageWebsiteAccountCallablePayload): Promise<ManageWebsiteAccountCallableResponse> {
  return invokeWebsiteCallable("manageWebsiteAccount", payload, claimFirebaseConfigured, "Website account");
}
export function setWebsiteOrganizerFollow(organizerId: string, following: boolean, expectedUid: string): Promise<{following: boolean}> {
  return invokeWebsiteCallable(following ? "followOrganizer" : "unfollowOrganizer", {organizerId, expectedUid}, claimFirebaseConfigured, "Organizer following");
}

/**
 * Follow with just a phone number (CAT-253). Call after the phone code
 * signed in or linked the verified phone; the token is refreshed first so it
 * carries that phone. whatsappUpdates is the follower's own tick.
 */
export async function followWebsiteOrganizerByPhone(
  payload: FollowOrganizerByPhoneCallablePayload
): Promise<FollowOrganizerByPhoneCallableResponse> {
  const runtime = await getFirebaseRuntime();
  if (!runtime || !claimFirebaseConfigured) {
    throw new Error("Organizer following are not configured for this build.");
  }
  await runtime.auth.currentUser?.getIdToken(true);
  return invokeWebsiteCallable("followOrganizerByPhone", payload, claimFirebaseConfigured, "Organizer following");
}
export type WebsiteAccount = ManageWebsiteAccountCallableResponse;
export type WebsiteAccountSection = NonNullable<Extract<ManageWebsiteAccountCallablePayload, {action: "read"}>["sections"]>[number];
export type WebsiteEventTicketCode = GetEventTicketCodeCallableResponse;
/** The guest's signed pass for one booking, the same code the apps show at the door. */
export function getWebsiteEventTicketCode(eventId: string): Promise<GetEventTicketCodeCallableResponse> {
  return invokeWebsiteCallable("getEventTicketCode", {eventId}, claimFirebaseConfigured, "Event passes");
}
/** Withdraws one organiser's WhatsApp permission with the reviewed receipt; it never grants consent. */
export function withdrawWebsiteMessagingPermission(
  payload: WithdrawParticipantMessagingPermissionCallablePayload
): Promise<WithdrawParticipantMessagingPermissionCallableResponse> {
  return invokeWebsiteCallable("withdrawParticipantMessagingPermission", payload, claimFirebaseConfigured, "Messaging permissions");
}
