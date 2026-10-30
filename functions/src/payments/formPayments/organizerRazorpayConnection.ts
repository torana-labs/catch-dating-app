import {createHash, randomBytes} from "node:crypto";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import type {OrganizerPaymentConnectionDocument as Connection,
  OrganizerPaymentOauthStateDocument as OauthState} from
  "../../shared/generated/firestoreAdminTypes";
import {requireOrganizerManager} from "../../shared/organizerManagerAuthority";
import {requireDoc} from "../../shared/validation";
import type {RazorpayCredentialVault} from "./razorpayCredentialVault";
import type {RazorpayFormProvider} from "./razorpayFormProvider";

export interface OrganizerRazorpayConnectionDeps {
  db: FirebaseFirestore.Firestore;
  provider: Pick<RazorpayFormProvider, "authorizationUrl" | "exchangeCode" |
    "createWebhook" | "verifyWebhook">;
  vault: Pick<RazorpayCredentialVault, "save" | "disable">;
  mode: "test" | "live";
  webhookBaseUrl: string;
  now?: () => number;
  randomToken?: () => string;
  requireManager?: typeof requireOrganizerManager;
}

/** OAuth binds one initiating manager to a new immutable connection id. An
 * organizer has at most one ready connection per mode: event checkout needs a
 * single merchant, so a second account is refused instead of guessed between.
 */
export class OrganizerRazorpayConnectionService {
  private readonly now: () => number;
  private readonly randomToken: () => string;
  private readonly requireManager: typeof requireOrganizerManager;

  constructor(private readonly deps: OrganizerRazorpayConnectionDeps) {
    this.now = deps.now ?? Date.now;
    this.randomToken = deps.randomToken ??
      (() => randomBytes(32).toString("base64url"));
    this.requireManager = deps.requireManager ?? requireOrganizerManager;
  }

  async begin(organizerId: string, actorUid: string): Promise<{
    connectionId: string; authorizationUrl: string; expiresAtMillis: number;
  }> {
    assertId(organizerId);
    assertId(actorUid);
    await this.authorize(organizerId, actorUid);
    if ((await this.readyConnections(organizerId)).docs.length > 0) {
      throw new HttpsError("failed-precondition",
        "Disconnect the connected Razorpay account before connecting another.",
        {reason: "razorpayAlreadyConnected"});
    }
    const state = this.randomToken();
    const authorizationUrl = this.deps.provider.authorizationUrl(state);
    const stateHash = hashState(state);
    const connectionId = `rpc_${stateHash.slice(0, 32)}`;
    const webhookUrl = this.webhookUrl(connectionId);
    const now = Timestamp.fromMillis(this.now());
    const expiresAt = Timestamp.fromMillis(now.toMillis() + 10 * 60_000);
    const connection: Connection = {
      organizerId, provider: "razorpay", mode: this.deps.mode,
      status: "connecting", accountId: null, publicToken: null,
      secretVersionResource: null, tokenExpiresAt: null, webhookId: null,
      webhookUrl, webhookVerifiedAt: null, connectedByUid: actorUid,
      revision: 1, refreshLeaseUntil: null, createdAt: now, updatedAt: now,
      disconnectedAt: null, lastErrorCode: null,
    };
    const oauth: OauthState = {organizerId, connectionId, actorUid,
      mode: this.deps.mode, status: "pending", createdAt: now, expiresAt,
      completedAt: null};
    await this.deps.db.runTransaction(async (tx) => {
      tx.create(this.connectionRef(connectionId), connection);
      tx.create(this.stateRef(stateHash), oauth);
    });
    // Only the authorization URL carries the raw state. It is never stored.
    return {connectionId, authorizationUrl,
      expiresAtMillis: expiresAt.toMillis()};
  }

  /** The HTTP callback uses one-use state instead of a Firebase session. */
  async complete(state: string, code: string): Promise<{
    connectionId: string; status: "ready";
  }> {
    const stateHash = hashState(state);
    if (!code || code.length > 4096 || /\s/u.test(code)) invalidCallback();
    const claimed = await this.claimCallback(stateHash);
    if (claimed.replay) {
      await this.authorize(claimed.oauth.organizerId, claimed.oauth.actorUid);
      return {connectionId: claimed.oauth.connectionId, status: "ready"};
    }
    const {oauth} = claimed;
    let savedVersion: string | null = null;
    let credentialAttached = false;
    try {
      await this.authorize(oauth.organizerId, oauth.actorUid);
      const token = await this.deps.provider.exchangeCode(code);
      const webhookSecret = this.randomToken();
      savedVersion = await this.deps.vault.save({
        organizerId: oauth.organizerId, connectionId: oauth.connectionId,
        accountId: token.accountId, mode: oauth.mode, token, webhookSecret,
      });
      // Persist the credential before provisioning. A webhook failure must not
      // lose access needed to inspect or remove the provider-side resource.
      await this.updateConnecting(oauth, {
        accountId: token.accountId, publicToken: token.publicToken,
        secretVersionResource: savedVersion,
        tokenExpiresAt: Timestamp.fromMillis(token.expiresAt),
      });
      credentialAttached = true;
      const url = this.webhookUrl(oauth.connectionId);
      const webhookId = await this.deps.provider.createWebhook({
        accessToken: token.accessToken, accountId: token.accountId,
        url, secret: webhookSecret,
      });
      await this.updateConnecting(oauth, {webhookId});
      await this.deps.provider.verifyWebhook({accessToken: token.accessToken,
        accountId: token.accountId, webhookId, url});
      await this.authorize(oauth.organizerId, oauth.actorUid);
      await this.deps.db.runTransaction(async (tx) => {
        const [stateSnap, connectionSnap, ready] = await Promise.all([
          tx.get(this.stateRef(stateHash)),
          tx.get(this.connectionRef(oauth.connectionId)),
          this.readyConnections(oauth.organizerId, tx),
        ]);
        const current = requireDoc<OauthState>(stateSnap,
          "OrganizerPaymentOauthStateDocument");
        const connection = requireDoc<Connection>(connectionSnap,
          "OrganizerPaymentConnectionDocument");
        assertConnecting(connection, oauth);
        // Another account became ready while this one was authorizing.
        if (ready.docs.some((doc) => doc.id !== oauth.connectionId)) {
          invalidCallback();
        }
        if (current.status !== "exchanging" ||
            current.connectionId !== oauth.connectionId ||
            current.expiresAt.toMillis() <= this.now()) invalidCallback();
        const now = Timestamp.fromMillis(this.now());
        tx.update(connectionSnap.ref, {status: "ready", webhookVerifiedAt: now,
          updatedAt: now, revision: connection.revision + 1,
          lastErrorCode: null});
        tx.update(stateSnap.ref, {status: "completed", completedAt: now});
      });
      return {connectionId: oauth.connectionId, status: "ready"};
    } catch {
      if (savedVersion && !credentialAttached) {
        await this.deps.vault.disable(savedVersion).catch(() => undefined);
      }
      await this.failCallback(stateHash, oauth).catch(() => undefined);
      throw new HttpsError("failed-precondition",
        "Razorpay connection could not be verified. " +
        "Return to Catch and reconnect.");
    }
  }

  async status(organizerId: string, actorUid: string, connectionId: string):
    Promise<{connectionId: string; status: Connection["status"];
      mode: Connection["mode"]; accountId: string | null;
      webhookVerified: boolean; lastErrorCode: string | null}> {
    const connection = await this.ownedConnection(organizerId, actorUid,
      connectionId);
    return {connectionId, status: connection.status, mode: connection.mode,
      accountId: connection.accountId,
      webhookVerified: connection.webhookVerifiedAt !== null,
      lastErrorCode: connection.lastErrorCode};
  }

  /** Stops new checkout; retains server credentials for existing payments. */
  async disconnect(organizerId: string, actorUid: string, connectionId: string):
    Promise<void> {
    await this.ownedConnection(organizerId, actorUid, connectionId);
    await this.deps.db.runTransaction(async (tx) => {
      const ref = this.connectionRef(connectionId);
      const connection = requireDoc<Connection>(await tx.get(ref),
        "OrganizerPaymentConnectionDocument");
      if (connection.organizerId !== organizerId) invalidCallback();
      if (connection.status === "disconnected") return;
      const now = Timestamp.fromMillis(this.now());
      tx.update(ref, {status: "disconnected", disconnectedAt: now,
        updatedAt: now, revision: connection.revision + 1});
    });
  }

  private async claimCallback(stateHash: string):
    Promise<{oauth: OauthState; replay: boolean}> {
    return this.deps.db.runTransaction(async (tx) => {
      const ref = this.stateRef(stateHash);
      const snap = await tx.get(ref);
      if (!snap.exists) invalidCallback();
      const oauth = requireDoc<OauthState>(snap,
        "OrganizerPaymentOauthStateDocument");
      const connectionSnap = await tx.get(
        this.connectionRef(oauth.connectionId));
      if (!connectionSnap.exists || oauth.mode !== this.deps.mode ||
          oauth.expiresAt.toMillis() <= this.now()) invalidCallback();
      const connection = requireDoc<Connection>(connectionSnap,
        "OrganizerPaymentConnectionDocument");
      if (oauth.status === "completed" && connection.status === "ready" &&
          connection.organizerId === oauth.organizerId &&
          connection.connectedByUid === oauth.actorUid) {
        return {oauth, replay: true};
      }
      assertConnecting(connection, oauth);
      if (oauth.status !== "pending") invalidCallback();
      tx.update(ref, {status: "exchanging"});
      return {oauth, replay: false};
    });
  }

  private async updateConnecting(oauth: OauthState,
    patch: Partial<Connection>): Promise<void> {
    await this.deps.db.runTransaction(async (tx) => {
      const ref = this.connectionRef(oauth.connectionId);
      const connection = requireDoc<Connection>(await tx.get(ref),
        "OrganizerPaymentConnectionDocument");
      assertConnecting(connection, oauth);
      tx.update(ref, {...patch,
        updatedAt: Timestamp.fromMillis(this.now()),
        revision: connection.revision + 1});
    });
  }

  private async failCallback(stateHash: string, oauth: OauthState):
    Promise<void> {
    await this.deps.db.runTransaction(async (tx) => {
      const stateRef = this.stateRef(stateHash);
      const ref = this.connectionRef(oauth.connectionId);
      const [stateSnap, connectionSnap] = await Promise.all([
        tx.get(stateRef), tx.get(ref),
      ]);
      const current = requireDoc<OauthState>(stateSnap,
        "OrganizerPaymentOauthStateDocument");
      const connection = requireDoc<Connection>(connectionSnap,
        "OrganizerPaymentConnectionDocument");
      if (current.status !== "exchanging") return;
      tx.update(stateRef, {status: "failed",
        completedAt: Timestamp.fromMillis(this.now())});
      if (connection.status !== "connecting") return;
      tx.update(ref, {status: "needsAttention",
        lastErrorCode: "oauthSetupFailed",
        updatedAt: Timestamp.fromMillis(this.now()),
        revision: connection.revision + 1});
    });
  }

  private async ownedConnection(organizerId: string, actorUid: string,
    connectionId: string): Promise<Connection> {
    assertId(organizerId);
    assertId(actorUid);
    assertId(connectionId);
    await this.authorize(organizerId, actorUid);
    const snap = await this.connectionRef(connectionId).get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Connection not found.");
    }
    const connection = requireDoc<Connection>(snap,
      "OrganizerPaymentConnectionDocument");
    if (connection.organizerId !== organizerId) {
      throw new HttpsError("not-found", "Connection not found.");
    }
    return connection;
  }

  private authorize(organizerId: string, actorUid: string): Promise<void> {
    return this.requireManager({db: this.deps.db, organizerId, actorUid});
  }

  private readyConnections(organizerId: string,
    tx?: FirebaseFirestore.Transaction):
    Promise<FirebaseFirestore.QuerySnapshot> {
    const query = this.deps.db.collection("organizerPaymentConnections")
      .where("organizerId", "==", organizerId).where("status", "==", "ready")
      .where("mode", "==", this.deps.mode).limit(2);
    return tx ? tx.get(query) : query.get();
  }

  private connectionRef(id: string): FirebaseFirestore.DocumentReference {
    return this.deps.db.collection("organizerPaymentConnections").doc(id);
  }

  private stateRef(hash: string): FirebaseFirestore.DocumentReference {
    return this.deps.db.collection("organizerPaymentOauthStates").doc(hash);
  }

  private webhookUrl(connectionId: string): string {
    const url = new URL(this.deps.webhookBaseUrl);
    if (url.protocol !== "https:" || url.username || url.password ||
        url.hash || url.search) throw new Error("Invalid form webhook URL.");
    url.searchParams.set("connectionId", connectionId);
    if (url.href.length > 255) throw new Error("Form webhook URL is too long.");
    return url.href;
  }
}

function hashState(state: string): string {
  if (!/^[A-Za-z0-9_-]{32,128}$/u.test(state)) invalidCallback();
  return createHash("sha256").update(state).digest("hex");
}

function assertConnecting(connection: Connection, state: OauthState): void {
  if (connection.status !== "connecting" || connection.disconnectedAt ||
      connection.organizerId !== state.organizerId ||
      connection.connectedByUid !== state.actorUid ||
      connection.mode !== state.mode) invalidCallback();
}

function assertId(value: string): void {
  if (!/^[A-Za-z0-9_-]{1,128}$/u.test(value)) {
    throw new HttpsError("invalid-argument", "Invalid connection identity.");
  }
}

function invalidCallback(): never {
  throw new HttpsError("failed-precondition",
    "This Razorpay connection link is invalid, expired, or already used.");
}
