export {whatsappPermissionSummary as guestPermissionSummary} from
  "../shared/contactPermissions";

/**
 * The guest-readable copy of each WhatsApp permission row on the guest's
 * messaging settings page, kept until the guest minimum-build floor passes a
 * build that reads contactPermissions (issue #2460). Consent writers write
 * it in their own transaction through writeContactPermissionState.
 */
export const guestMessagingPermissionsCollection = "guestMessagingPermissions";

/** The view id of the guest's Catch row; organizer rows reuse source ids. */
export function catchPermissionViewId(uid: string): string {
  return `catchpref_${uid}`;
}
