/**
 * A user's push address in one app. Installations under
 * users/{uid}/pushInstallations are the only token store: each signed-in
 * device writes one row carrying its token and app role. Single-recipient
 * senders target the most recently refreshed device of that app; for the
 * Guest app that is the device the retired users.fcmToken field tracked.
 */

export type PushAppRole = "consumer" | "host";

/** Installations scanned per user; devices beyond this are ignored. */
export const PUSH_INSTALLATION_SCAN_LIMIT = 20;

type InstallationRow = Readonly<Record<string, unknown>>;

function updatedAtMillis(value: unknown): number {
  if (value && typeof value === "object" &&
      typeof (value as {toMillis?: unknown}).toMillis === "function") {
    return (value as {toMillis: () => number}).toMillis();
  }
  if (value instanceof Date) return value.getTime();
  return 0;
}

/**
 * Picks the newest token for one app from installation rows.
 * @param {ReadonlyArray<InstallationRow>} installations Stored rows.
 * @param {PushAppRole} role App whose devices count.
 * @return {string | null} Token, or null when no device is registered.
 */
export function newestPushToken(
  installations: ReadonlyArray<InstallationRow>,
  role: PushAppRole = "consumer"
): string | null {
  let newest: {token: string; at: number} | null = null;
  for (const row of installations) {
    if (row.appRole !== role || typeof row.token !== "string") continue;
    const token = row.token.trim();
    if (token.length === 0) continue;
    const at = updatedAtMillis(row.updatedAt);
    if (newest === null || at > newest.at) newest = {token, at};
  }
  return newest?.token ?? null;
}

/**
 * Installation rows query for one user.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} uid User id.
 * @return {FirebaseFirestore.Query} Bounded installations query.
 */
export function pushInstallationsQuery(
  db: FirebaseFirestore.Firestore,
  uid: string
): FirebaseFirestore.Query {
  return db.collection(`users/${uid}/pushInstallations`)
    .limit(PUSH_INSTALLATION_SCAN_LIMIT);
}

/**
 * Reads the newest token for one app.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} uid User id.
 * @param {PushAppRole} role App whose devices count.
 * @param {FirebaseFirestore.Transaction} tx Optional transaction to read in.
 * @return {Promise<string | null>} Token, or null.
 */
export async function readPushToken(
  db: FirebaseFirestore.Firestore,
  uid: string,
  role: PushAppRole,
  tx?: FirebaseFirestore.Transaction
): Promise<string | null> {
  const query = pushInstallationsQuery(db, uid);
  const snapshot = tx ? await tx.get(query) : await query.get();
  return newestPushToken(snapshot.docs.map((row) => row.data()), role);
}

/**
 * Reads the newest Guest-app token for a user.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} uid User id.
 * @param {FirebaseFirestore.Transaction} tx Optional transaction to read in.
 * @return {Promise<string | null>} Token, or null.
 */
export function readConsumerPushToken(
  db: FirebaseFirestore.Firestore,
  uid: string,
  tx?: FirebaseFirestore.Transaction
): Promise<string | null> {
  return readPushToken(db, uid, "consumer", tx);
}
