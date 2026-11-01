import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import type {
  AccountSafetyActionDocument,
  AccountSafetyNoticeDocument,
  AccountSafetyStateDocument,
} from "../shared/generated/firestoreAdminTypes";
import {millisOf} from "./safetyPolicy";

export const ACCOUNT_SAFETY_STATES = "accountSafetyStates";
export const ACCOUNT_SAFETY_ACTIONS = "accountSafetyActions";
export const ACCOUNT_SAFETY_NOTICES = "accountSafetyNotices";
export const ORGANIZER_GUEST_BLOCKS = "organizerGuestBlocks";

type Hold = AccountSafetyStateDocument["messaging"];
type ActiveAction = Pick<AccountSafetyActionDocument,
  "actionId" | "kind" | "endsAt" | "status">;

const levelRank = {
  none: 0,
  warned: 1,
  restricted: 2,
  suspended: 3,
  banned: 4,
} as const;
const kindLevel = {
  warn: "warned",
  restrict: "restricted",
  suspend: "suspended",
  ban: "banned",
} as const;

/**
 * Whether an action is still in force at a time.
 * @param {ActiveAction} action Account safety action.
 * @param {number} nowMillis Current time.
 * @return {boolean} In force.
 */
export function actionInForce(action: ActiveAction, nowMillis: number):
  boolean {
  if (action.status !== "active") return false;
  const ends = millisOf(action.endsAt);
  return ends === null || ends > nowMillis;
}

/**
 * Derives an account's standing from its actions. The strongest action sets
 * the level; holds last until the latest end among the actions that impose
 * them (null when any of them runs until lifted).
 * @param {string} uid Account.
 * @param {ActiveAction[]} actions The account's actions.
 * @param {number} nowMillis Current time.
 * @param {boolean} authDisabledBySafety Whether safety disabled sign-in.
 * @param {Timestamp} updatedAt Write time.
 * @return {AccountSafetyStateDocument} Standing document.
 */
export function deriveAccountSafetyState(
  uid: string,
  actions: ActiveAction[],
  nowMillis: number,
  authDisabledBySafety: boolean,
  updatedAt: Timestamp
): AccountSafetyStateDocument {
  const inForce = actions.filter((action) => actionInForce(action, nowMillis));
  let level: AccountSafetyStateDocument["level"] = "none";
  for (const action of inForce) {
    const next = kindLevel[action.kind];
    if (levelRank[next] > levelRank[level]) level = next;
  }
  return {
    schemaVersion: 1,
    uid,
    level,
    messaging: holdFor(inForce, ["restrict", "suspend", "ban"]),
    booking: holdFor(inForce, ["suspend", "ban"]),
    authDisabledBySafety,
    activeActionIds: inForce.map((action) => action.actionId).sort(),
    updatedAt,
  };
}

function holdFor(
  actions: ActiveAction[],
  kinds: Array<ActiveAction["kind"]>
): Hold {
  const holding = actions.filter((action) => kinds.includes(action.kind));
  if (holding.length === 0) return {held: false, until: null};
  if (holding.some((action) => action.endsAt === null)) {
    return {held: true, until: null};
  }
  const latest = Math.max(...holding.map((action) =>
    millisOf(action.endsAt) ?? 0));
  return {held: true, until: Timestamp.fromMillis(latest)};
}

/**
 * Whether a hold applies now.
 * @param {Hold | undefined} hold Hold from a standing document.
 * @param {number} nowMillis Current time.
 * @return {boolean} Held.
 */
export function holdApplies(hold: Hold | undefined, nowMillis: number):
  boolean {
  if (!hold?.held) return false;
  const until = millisOf(hold.until);
  return until === null || until > nowMillis;
}

/**
 * Reads an account's standing in a transaction; null when it has none.
 * @param {FirebaseFirestore.Transaction} tx Transaction.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} uid Account.
 * @return {Promise<AccountSafetyStateDocument | null>} Standing.
 */
export async function readAccountStandingInTransaction(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  uid: string
): Promise<AccountSafetyStateDocument | null> {
  const snap = await tx.get(db.collection(ACCOUNT_SAFETY_STATES).doc(uid));
  return snap.exists ? snap.data() as AccountSafetyStateDocument : null;
}

/**
 * Stops a restricted, suspended or banned account sending messages or
 * posting in group chats. Read before any transaction write.
 * @param {FirebaseFirestore.Transaction} tx Transaction.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} uid Sender.
 * @param {number} nowMillis Current time.
 */
export async function assertAccountMayMessage(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  uid: string,
  nowMillis: number
): Promise<void> {
  const standing = await readAccountStandingInTransaction(tx, db, uid);
  if (holdApplies(standing?.messaging, nowMillis)) {
    throw new HttpsError(
      "permission-denied",
      "Your account can't send messages right now."
    );
  }
}

/**
 * Returns the deterministic id of an organizer's block on one guest.
 * @param {string} organizerId Organizer.
 * @param {string} uid Guest.
 * @return {string} Block document id.
 */
export function organizerGuestBlockId(organizerId: string, uid: string):
  string {
  return `${organizerId}__${uid}`;
}

/**
 * Stops a suspended or banned account booking anything, and a guest an
 * organizer has blocked booking that organizer's events. Read before any
 * transaction write.
 * @param {FirebaseFirestore.Transaction} tx Transaction.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} uid Guest.
 * @param {string | null | undefined} organizerId Event's organizer.
 * @param {number} nowMillis Current time.
 */
export async function assertAccountMayBook(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  uid: string,
  organizerId: string | null | undefined,
  nowMillis: number
): Promise<void> {
  const [standing, organizerBlock] = await Promise.all([
    readAccountStandingInTransaction(tx, db, uid),
    organizerId ?
      tx.get(db.collection(ORGANIZER_GUEST_BLOCKS)
        .doc(organizerGuestBlockId(organizerId, uid))) :
      Promise.resolve(null),
  ]);
  if (holdApplies(standing?.booking, nowMillis)) {
    throw new HttpsError(
      "permission-denied",
      "Your account can't book events right now."
    );
  }
  if (organizerBlock?.exists) {
    throw new HttpsError(
      "permission-denied",
      "Booking isn't available for this event."
    );
  }
}

/**
 * Builds a safety notice for one account.
 * @param {object} input Notice fields.
 * @return {AccountSafetyNoticeDocument} Notice document.
 */
export function safetyNotice(input: {
  noticeId: string;
  uid: string;
  kind: AccountSafetyNoticeDocument["kind"];
  title: string;
  body: string;
  actionId: string | null;
  appealable: boolean;
  createdAt: Timestamp;
}): AccountSafetyNoticeDocument {
  return {
    schemaVersion: 1,
    noticeId: input.noticeId,
    uid: input.uid,
    kind: input.kind,
    title: input.title,
    body: input.body,
    actionId: input.actionId,
    appealable: input.appealable,
    createdAt: input.createdAt,
    readAt: null,
  };
}

/**
 * Returns a notice's document reference.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} uid Account.
 * @param {string} noticeId Notice id.
 * @return {FirebaseFirestore.DocumentReference} Reference.
 */
export function safetyNoticeRef(
  db: FirebaseFirestore.Firestore,
  uid: string,
  noticeId: string
): FirebaseFirestore.DocumentReference {
  return db.doc(`${ACCOUNT_SAFETY_NOTICES}/${uid}/items/${noticeId}`);
}

/** What a reporter is told: that it was handled, never what was done. */
export const REPORT_HANDLED_NOTICE = {
  title: "We've looked into your report",
  body: "Thank you for telling us. We reviewed what happened and handled " +
    "it. To protect everyone's privacy we don't share what we did.",
} as const;

/** The acknowledgement sent the moment a report arrives. */
export const REPORT_RECEIVED_NOTICE = {
  title: "We got your report",
  body: "Thank you for telling us. Someone from Catch will look at it " +
    "within 24 hours. You can block this person any time.",
} as const;
