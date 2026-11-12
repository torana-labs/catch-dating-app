export type ConversationPushRole = "consumer" | "host";

/** Selects unique app-specific addresses from installation rows. */
export function conversationPushTokens(
  installations: ReadonlyArray<Record<string, unknown>>,
  role: ConversationPushRole
): string[] {
  const tokens = installations.flatMap((installation) =>
    installation.appRole === role &&
      typeof installation.token === "string" &&
      installation.token.trim().length > 0 ? [installation.token] : []
  );
  return [...new Set(tokens)];
}

/** Reads per-user installations for conversation pushes. */
export async function resolveConversationPushTokens(
  db: FirebaseFirestore.Firestore,
  uid: string,
  role: ConversationPushRole
): Promise<string[]> {
  const snapshot = await db.collection("users").doc(uid)
    .collection("pushInstallations").get();
  return conversationPushTokens(
    snapshot.docs.map((document) => document.data()), role
  );
}
