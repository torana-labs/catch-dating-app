import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import type {OrganizerPaymentConnectionDocument as Connection} from
  "../../shared/generated/firestoreAdminTypes";
import {requireDoc} from "../../shared/validation";
import type {RazorpayCredentialVault, RazorpayCredentialBinding,
  RazorpayStoredCredential} from "./razorpayCredentialVault";
import {FormPaymentProviderError, type RazorpayFormProvider} from
  "./razorpayFormProvider";

interface CredentialDeps {
  db: FirebaseFirestore.Firestore;
  vault: Pick<RazorpayCredentialVault, "access" | "save" | "disable">;
  provider: Pick<RazorpayFormProvider, "refreshToken">;
  now?: () => number;
}

/** A credential this close to expiry is always refreshed before use. */
export const formPaymentMandatoryRefreshMillis = 120_000;

export interface FormPaymentCredentialAccessOptions {
  /** Refresh early when the token expires within this window. Scheduled
   * maintenance uses a wide window; a checkout uses the mandatory one. */
  refreshWithinMillis?: number;
}

/** A refresh token can rotate. An uncertain POST must never be repeated. */
export class FormPaymentCredentials {
  private readonly now: () => number;
  constructor(private readonly deps: CredentialDeps) {
    this.now = deps.now ?? Date.now;
  }

  async access(binding: RazorpayCredentialBinding,
    options: FormPaymentCredentialAccessOptions = {}):
    Promise<RazorpayStoredCredential> {
    const refreshWithin = options.refreshWithinMillis ??
      formPaymentMandatoryRefreshMillis;
    if (!Number.isSafeInteger(refreshWithin) ||
        refreshWithin < formPaymentMandatoryRefreshMillis) unavailable();
    const ref = this.deps.db.collection("organizerPaymentConnections")
      .doc(binding.connectionId);
    const current = requireDoc<Connection>(await ref.get(),
      "OrganizerPaymentConnectionDocument");
    assertBinding(current, binding);
    const credential = await this.deps.vault.access(
      current.secretVersionResource!, binding);
    if (credential.token.expiresAt > this.now() + refreshWithin) {
      return credential;
    }
    // An early refresh that never left the process must not take a still
    // usable connection out of service.
    const usable = credential.token.expiresAt >
      this.now() + formPaymentMandatoryRefreshMillis;
    const leaseUntil = Timestamp.fromMillis(this.now() + 60_000);
    const claimed = await this.deps.db.runTransaction(async (tx) => {
      const latest = requireDoc<Connection>(await tx.get(ref),
        "OrganizerPaymentConnectionDocument");
      assertBinding(latest, binding);
      if (latest.secretVersionResource !== current.secretVersionResource) {
        return "reload" as const;
      }
      if (latest.refreshLeaseUntil ||
          latest.lastErrorCode === "refreshOutcomeUnknown" ||
          latest.lastErrorCode === "refreshRejected") {
        // An expired lease means a process may have died after rotating the
        // token. Reconnecting is safer than resending that refresh token.
        if (latest.refreshLeaseUntil &&
            latest.refreshLeaseUntil.toMillis() <= this.now()) {
          tx.update(ref, {refreshLeaseUntil: null,
            status: latest.status === "disconnected" ?
              "disconnected" : "needsAttention",
            lastErrorCode: "refreshOutcomeUnknown",
            updatedAt: Timestamp.fromMillis(this.now())});
        }
        return "busy" as const;
      }
      tx.update(ref, {refreshLeaseUntil: leaseUntil,
        updatedAt: Timestamp.fromMillis(this.now())});
      return "claimed" as const;
    });
    if (claimed === "reload") return this.access(binding, options);
    if (claimed !== "claimed") unavailable();
    let newVersion: string | null = null;
    try {
      const token = await this.deps.provider.refreshToken(credential.token);
      if (token.accountId !== binding.accountId ||
          token.expiresAt <= this.now() + formPaymentMandatoryRefreshMillis ||
          !token.publicToken.startsWith(`rzp_${binding.mode}_oauth_`)) {
        throw new Error("Refreshed credential does not match merchant.");
      }
      const refreshed = {...credential, token};
      newVersion = await this.deps.vault.save(refreshed);
      const savedVersion = newVersion;
      await this.deps.db.runTransaction(async (tx) => {
        const latest = requireDoc<Connection>(await tx.get(ref),
          "OrganizerPaymentConnectionDocument");
        assertBinding(latest, binding);
        if (latest.secretVersionResource !== current.secretVersionResource ||
            latest.refreshLeaseUntil?.toMillis() !== leaseUntil.toMillis()) {
          unavailable();
        }
        // Keep disconnection intact while retaining settlement/refund access.
        tx.update(ref, {secretVersionResource: savedVersion,
          tokenExpiresAt: Timestamp.fromMillis(token.expiresAt),
          publicToken: token.publicToken, refreshLeaseUntil: null,
          revision: latest.revision + 1,
          updatedAt: Timestamp.fromMillis(this.now()),
          lastErrorCode: latest.lastErrorCode === "refreshNotSent" ?
            null : latest.lastErrorCode});
      });
      return refreshed;
    } catch (error) {
      // Do not disable a potentially attached secret after an uncertain
      // Firestore commit. Re-read first; recovery keeps the winning version.
      const latest = requireDoc<Connection>(await ref.get(),
        "OrganizerPaymentConnectionDocument");
      if (newVersion && latest.secretVersionResource === newVersion) {
        return this.deps.vault.access(newVersion, binding);
      }
      if (newVersion) {
        await this.deps.vault.disable(newVersion).catch(() => undefined);
      }
      await this.deps.db.runTransaction(async (tx) => {
        const value = requireDoc<Connection>(await tx.get(ref),
          "OrganizerPaymentConnectionDocument");
        if (value.secretVersionResource !== current.secretVersionResource ||
            value.refreshLeaseUntil?.toMillis() !== leaseUntil.toMillis()) {
          return;
        }
        const notSent = error instanceof FormPaymentProviderError &&
          error.disposition === "requestNotSent";
        const rejected = error instanceof FormPaymentProviderError &&
          error.disposition === "rejected";
        tx.update(ref, {refreshLeaseUntil: null,
          status: notSent || value.status === "disconnected" ?
            value.status : "needsAttention",
          lastErrorCode: notSent ?
            usable ? value.lastErrorCode : "refreshNotSent" :
            rejected ? "refreshRejected" : "refreshOutcomeUnknown",
          updatedAt: Timestamp.fromMillis(this.now())});
      });
      unavailable();
    }
  }
}

function assertBinding(value: Connection, binding: RazorpayCredentialBinding) {
  if (value.organizerId !== binding.organizerId ||
      value.accountId !== binding.accountId || value.mode !== binding.mode ||
      !value.secretVersionResource) unavailable();
}

function unavailable(): never {
  throw new HttpsError("unavailable",
    "The organizer payment connection is being checked. Please try again.");
}
