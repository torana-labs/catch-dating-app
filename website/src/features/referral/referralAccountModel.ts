/**
 * Who is signed in on /refer/, as the referral form shows it. The lead intake
 * decides credit from the account's ID token (functions/src/waitlist/
 * websiteLead.ts records `lead.referralCredit`), and the reward goes to a
 * referrer who owns a live organizer (functions/src/money/organizerReferrals
 * .ts). This only tells the person, before they send, what the intake will
 * see: nothing here is sent with the lead.
 */

/** The parts of the signed-in Firebase user the form reads. */
export interface ReferralAccountUser {
  readonly uid: string;
  readonly phoneNumber: string | null;
  readonly isAnonymous: boolean;
}

/** A host page the signed-in account owns and that is live (not archived). */
export interface ReferralOwnedOrganizer {
  readonly organizerId: string;
  readonly name: string;
}

export type ReferralAccount =
  /** The browser has not decided yet, or the owned host pages are being read. */
  | {readonly status: "checking"}
  | {readonly status: "signedOut"}
  /** Owns at least one live host page: `name` is that page when there is one, else the phone. */
  | {readonly status: "owner"; readonly name: string | null}
  | {readonly status: "notOwner"; readonly name: string | null}
  /** The owned host pages could not be read: credit is the intake's call. */
  | {readonly status: "unknown"; readonly name: string | null};

/** The owned host pages as read: pending, failed, or the live ones. */
export type ReferralOwnership = "pending" | "failed" | readonly ReferralOwnedOrganizer[];

/**
 * The form's account state. An anonymous account counts as signed out, as
 * the intake does. A signed-in owner of exactly one live host page is named
 * by that page; otherwise by the account's phone.
 */
export function referralAccount(input: {loaded: boolean; user: ReferralAccountUser | null; ownership: ReferralOwnership}): ReferralAccount {
  if (!input.loaded) return {status: "checking"};
  const user = input.user && !input.user.isAnonymous ? input.user : null;
  if (!user) return {status: "signedOut"};
  const phone = user.phoneNumber || null;
  if (input.ownership === "pending") return {status: "checking"};
  if (input.ownership === "failed") return {status: "unknown", name: phone};
  if (input.ownership.length === 0) return {status: "notOwner", name: phone};
  return {status: "owner", name: input.ownership.length === 1 ? input.ownership[0].name : phone};
}

/**
 * The live host pages among the organizers an account owns. An archived page
 * earns nothing, so it is left out.
 */
export function liveOwnedOrganizers(rows: readonly {organizerId: string; name: string; archived: boolean}[]): ReferralOwnedOrganizer[] {
  return rows.filter((row) => row.organizerId && !row.archived).map(({organizerId, name}) => ({organizerId, name: name || organizerId}));
}
