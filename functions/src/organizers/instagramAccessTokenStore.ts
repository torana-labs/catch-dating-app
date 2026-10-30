import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import {Timestamp} from "firebase-admin/firestore";
import type {InstagramAccessTokenDocument} from
  "../shared/generated/firestoreAdminTypes";
import {runtimeProjectId, SecretVersionReferenceGuard} from
  "../shared/secretVersionReference";

export const instagramAccessTokenSecretId = "CATCH_INSTAGRAM_ACCESS_TOKEN";
const collection = "instagramAccessTokens";

export type InstagramTokenErrorCode =
  NonNullable<InstagramAccessTokenDocument["lastErrorCode"]>;

export interface InstagramTokenSecretStore {
  add(parent: string, value: string): Promise<string>;
  read(version: string): Promise<string>;
}

/**
 * Renewed Instagram Login tokens live as new versions of
 * CATCH_INSTAGRAM_ACCESS_TOKEN. Firestore records which exact version is
 * current, so the webhook can move to it without a redeploy.
 */
export class InstagramAccessTokenStore {
  constructor(
    private readonly db: FirebaseFirestore.Firestore,
    private readonly projectId: () => string | undefined = runtimeProjectId,
    private readonly secrets: InstagramTokenSecretStore =
    new GoogleSecretStore(),
    private readonly references = new SecretVersionReferenceGuard(projectId)
  ) {}

  async record(accountId: string):
    Promise<InstagramAccessTokenDocument | null> {
    const snap = await this.ref(accountId).get();
    return snap.exists ? snap.data() as InstagramAccessTokenDocument : null;
  }

  async readToken(version: string): Promise<string> {
    await this.references.assert(version, instagramAccessTokenSecretId);
    return requireToken(await this.secrets.read(version));
  }

  async addToken(token: string): Promise<string> {
    const projectId = this.projectId();
    if (!projectId) throw new Error("Instagram token store has no project.");
    const version = await this.secrets.add(
      `projects/${projectId}/secrets/${instagramAccessTokenSecretId}`,
      requireToken(token));
    await this.references.assert(version, instagramAccessTokenSecretId);
    return version;
  }

  /**
   * Points the record at a renewed token. Returns false when another run
   * changed the record first; that run's token is just as new.
   */
  async saveRefresh(accountId: string, expectedRevision: number | null,
    refresh: {secretVersion: string; expiresAtMillis: number;
      nowMillis: number}): Promise<boolean> {
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(this.ref(accountId));
      const revision = snap.exists ?
        (snap.data() as InstagramAccessTokenDocument).revision : null;
      if (revision !== expectedRevision) return false;
      const now = Timestamp.fromMillis(refresh.nowMillis);
      tx.set(this.ref(accountId), {
        accountId, secretVersion: refresh.secretVersion,
        expiresAt: Timestamp.fromMillis(refresh.expiresAtMillis),
        refreshedAt: now, lastAttemptAt: now, lastErrorCode: null,
        revision: (revision ?? 0) + 1,
      });
      return true;
    });
  }

  /**
   * Records a failed renewal. The current token stays in use unless Meta
   * said it is no longer valid.
   */
  async saveFailure(accountId: string, expectedRevision: number | null,
    failure: {code: InstagramTokenErrorCode; dropToken: boolean;
      nowMillis: number}): Promise<void> {
    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(this.ref(accountId));
      const current = snap.exists ?
        snap.data() as InstagramAccessTokenDocument : null;
      if ((current?.revision ?? null) !== expectedRevision) return;
      tx.set(this.ref(accountId), {
        accountId,
        secretVersion: failure.dropToken ? null :
          current?.secretVersion ?? null,
        expiresAt: failure.dropToken ? null : current?.expiresAt ?? null,
        refreshedAt: current?.refreshedAt ?? null,
        lastAttemptAt: Timestamp.fromMillis(failure.nowMillis),
        lastErrorCode: failure.code,
        revision: (current?.revision ?? 0) + 1,
      });
    });
  }

  private ref(accountId: string) {
    if (!/^[0-9]{1,32}$/u.test(accountId)) {
      throw new Error("Invalid Instagram account id.");
    }
    return this.db.collection(collection).doc(accountId);
  }
}

const recordCacheMillis = 5 * 60_000;
// A renewed token this close to expiry is not worth switching to.
const minimumRemainingMillis = 60 * 60_000;

/**
 * What the webhook sends to Meta: the renewed token while its record says it
 * is valid, else the version pinned at deploy. A broken record never stops
 * the webhook; it falls back to the pinned token.
 */
export class InstagramAccessTokenSource {
  private cached?: {accountId: string; until: number; token: Promise<string>};

  constructor(
    private readonly store: Pick<InstagramAccessTokenStore,
      "record" | "readToken">,
    private readonly onFallback: (reason: string) => void = () => undefined,
    private readonly now: () => number = Date.now
  ) {}

  async token(accountId: string, pinned: string): Promise<string> {
    if (this.cached?.accountId === accountId &&
        this.cached.until > this.now()) {
      return this.cached.token;
    }
    const token = this.resolve(accountId, pinned);
    this.cached = {accountId, until: this.now() + recordCacheMillis, token};
    return token;
  }

  private async resolve(accountId: string, pinned: string): Promise<string> {
    try {
      const record = await this.store.record(accountId);
      if (!record?.secretVersion || !record.expiresAt ||
          record.expiresAt.toMillis() - this.now() < minimumRemainingMillis) {
        return pinned;
      }
      return await this.store.readToken(record.secretVersion);
    } catch {
      this.onFallback("renewed-token-unavailable");
      return pinned;
    }
  }
}

class GoogleSecretStore implements InstagramTokenSecretStore {
  constructor(private readonly client = new SecretManagerServiceClient()) {}

  async add(parent: string, value: string): Promise<string> {
    const [version] = await this.client.addSecretVersion({parent,
      payload: {data: Buffer.from(value, "utf8")}});
    if (!version.name) throw new Error("Secret version has no name.");
    return version.name;
  }

  async read(version: string): Promise<string> {
    const [result] = await this.client.accessSecretVersion({name: version});
    const bytes = result.payload?.data;
    if (!bytes) throw new Error("Secret version is empty.");
    return Buffer.from(bytes).toString("utf8");
  }
}

/** One shape check for a token from Meta, the pinned secret or a record. */
export function requireToken(value: unknown): string {
  if (typeof value !== "string") throw new Error("Invalid Instagram token.");
  const token = value.trim();
  if (token.length < 20 || token.length > 4096 || /\s/u.test(token)) {
    throw new Error("Invalid Instagram token.");
  }
  return token;
}
