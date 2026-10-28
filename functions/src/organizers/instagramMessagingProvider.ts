import {normalizeInstagramUsername} from "./organizerClaimSources";

/**
 * What claim verification needs from Instagram. Catch never messages first:
 * it reads the username of an account that messaged Catch, and replies in
 * that thread inside Instagram's 24-hour reply window.
 */
export interface InstagramMessagingProvider {
  /** The sender's username, or null when Instagram does not return one. */
  lookupUsername(senderId: string): Promise<string | null>;
  sendReply(recipientId: string, text: string): Promise<void>;
}

export interface InstagramGraphConfig {
  /** Catch's Instagram professional account id. */
  accountId: string;
  /** Long-lived Instagram user access token for that account. */
  accessToken: string;
  graphVersion: string;
}

export class InstagramProviderError extends Error {
  constructor(message: string, readonly status: number | null) {
    super(message);
    this.name = "InstagramProviderError";
  }
}

const requestTimeoutMillis = 8000;
const maxResponseBytes = 64 * 1024;

/**
 * Instagram API with Instagram Login, on graph.instagram.com: the user
 * profile API for the sender's username and the Send API for the reply.
 */
export class InstagramGraphProvider implements InstagramMessagingProvider {
  constructor(
    private readonly config: InstagramGraphConfig,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async lookupUsername(senderId: string): Promise<string | null> {
    const url = this.graphUrl(requireScopedId(senderId));
    url.searchParams.set("fields", "username");
    const body = await this.requestJson(url, {method: "GET"});
    return normalizeInstagramUsername(body.username);
  }

  async sendReply(recipientId: string, text: string): Promise<void> {
    await this.requestJson(this.graphUrl(`${this.config.accountId}/messages`), {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        recipient: {id: requireScopedId(recipientId)},
        message: {text: text.slice(0, 1000)},
      }),
    });
  }

  private graphUrl(path: string): URL {
    if (!/^v[1-9][0-9]*\.[0-9]+$/.test(this.config.graphVersion) ||
        !/^[0-9]{1,32}$/.test(this.config.accountId) ||
        !/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(path)) {
      throw new InstagramProviderError("Invalid Instagram request.", null);
    }
    return new URL(
      `https://graph.instagram.com/${this.config.graphVersion}/${path}`);
  }

  private async requestJson(url: URL, init: RequestInit):
    Promise<Record<string, unknown>> {
    let response: Response;
    let text: string;
    try {
      response = await this.fetchImpl(url, {
        ...init,
        // The token travels in a header so it never lands in a request log.
        headers: {...init.headers as Record<string, string>,
          Authorization: `Bearer ${this.config.accessToken}`},
        redirect: "error",
        signal: AbortSignal.timeout(requestTimeoutMillis),
      });
      text = await response.text();
    } catch {
      throw new InstagramProviderError("Instagram request failed.", null);
    }
    if (text.length > maxResponseBytes) {
      throw new InstagramProviderError("Instagram response too large.",
        response.status);
    }
    if (!response.ok) {
      throw new InstagramProviderError("Instagram rejected the request.",
        response.status);
    }
    try {
      const body: unknown = JSON.parse(text);
      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        throw new Error("Expected an object.");
      }
      return body as Record<string, unknown>;
    } catch {
      throw new InstagramProviderError("Instagram response was not JSON.",
        response.status);
    }
  }
}

/**
 * Emulator stand-in: senders are looked up in a fixed id-to-username map,
 * and replies are kept in memory for tests to read.
 */
export class FakeInstagramProvider implements InstagramMessagingProvider {
  readonly replies: Array<{recipientId: string; text: string}> = [];

  constructor(private readonly usernames: Record<string, string> = {}) {}

  async lookupUsername(senderId: string): Promise<string | null> {
    return normalizeInstagramUsername(this.usernames[senderId]);
  }

  async sendReply(recipientId: string, text: string): Promise<void> {
    this.replies.push({recipientId, text});
  }
}

function requireScopedId(value: string): string {
  if (!/^[0-9]{1,32}$/.test(value)) {
    throw new InstagramProviderError("Invalid Instagram-scoped id.", null);
  }
  return value;
}
