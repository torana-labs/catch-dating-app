import {HttpsError} from "firebase-functions/v2/https";
import type {OrganizerDocument} from "../shared/generated/firestoreAdminTypes";
import type {
  OrganizerOwnerViewCallableResponse,
} from "../shared/generated/organizerOwnerViewCallableResponse";
import {isOrganizerManager, isOrganizerOwner} from "../shared/organizerHosts";

export type OwnerViewRole = OrganizerOwnerViewCallableResponse["role"];
export type OwnerViewCapability =
  OrganizerOwnerViewCallableResponse["capabilities"][number];

/**
 * What each role may do in the website owner view. Each capability mirrors
 * the server command behind it, so the page never offers a control the
 * server refuses:
 * - about and the accent go through updateOrganizer, which only the owner
 *   may call for identity fields; managers may change photos only;
 * - review replies (setReviewResponse), follower updates
 *   (createOrganizerPost) and owner links (manageOrganizerOwnerPage) accept
 *   owners and managers;
 * - tracking settings accept managers on the server, but the owner view
 *   keeps the domain, Pixel and GA4 settings with the owner (a stricter
 *   page, never a looser one);
 * - an analyst reads insights only. No team command grants it yet; the
 *   role is reserved so the page and contract are ready when one does.
 */
export const ownerViewCapabilities: Record<OwnerViewRole,
  readonly OwnerViewCapability[]> = {
    owner: ["insights", "links", "about", "photos", "reviews",
      "messageFollowers", "settings", "openInHost"],
    editor: ["insights", "links", "photos", "reviews", "messageFollowers",
      "openInHost"],
    analyst: ["insights", "openInHost"],
  };

/**
 * The caller's owner-view role on this organiser, by the organiser's own
 * authority fields (the same ones every organiser command checks).
 * @param {OrganizerDocument} organizer The organiser.
 * @param {string} uid Caller.
 * @return {OwnerViewRole | null} The role, or null for anyone else.
 */
export function ownerViewRole(
  organizer: OrganizerDocument,
  uid: string
): OwnerViewRole | null {
  if (isOrganizerOwner(organizer, uid)) return "owner";
  if (isOrganizerManager(organizer, uid)) return "editor";
  return null;
}

/**
 * Throws unless the caller's role grants the capability.
 * @param {OrganizerDocument} organizer The organiser.
 * @param {string} uid Caller.
 * @param {OwnerViewCapability} capability What they are doing.
 * @return {OwnerViewRole} The caller's role.
 */
export function requireOwnerViewCapability(
  organizer: OrganizerDocument,
  uid: string,
  capability: OwnerViewCapability
): OwnerViewRole {
  const role = ownerViewRole(organizer, uid);
  if (!role) {
    throw new HttpsError("permission-denied",
      "Only this organiser's team can manage the page.");
  }
  if (!ownerViewCapabilities[role].includes(capability)) {
    throw new HttpsError("permission-denied",
      "Your role on this page cannot do that.");
  }
  return role;
}
