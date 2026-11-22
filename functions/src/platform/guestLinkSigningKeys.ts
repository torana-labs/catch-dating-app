export interface GuestLinkSigningKeys {
  currentKeyId: string;
  /** Keys stay in the trusted worker's secret binding, never Firestore. */
  keyFor(keyId: string): Buffer;
}
