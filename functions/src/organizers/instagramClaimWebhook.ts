import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {defineSecret, defineString} from "firebase-functions/params";
import {onRequest} from "firebase-functions/v2/https";
import {
  InstagramAccessTokenSource,
  InstagramAccessTokenStore,
} from "./instagramAccessTokenStore";
import {handleInstagramClaimWebhook} from "./instagramClaimProtocol";
import {
  FakeInstagramProvider,
  InstagramGraphProvider,
} from "./instagramMessagingProvider";
import type {InstagramMessagingProvider} from "./instagramMessagingProvider";
import {
  catchInstagramAccountId,
  defaultClaimVerificationDeps,
  instagramClaimsEnabled,
  processInstagramClaimMessages,
} from "./organizerClaimVerification";

// Meta signs webhook payloads with the app secret of the app that owns the
// Instagram Login product.
const appSecret = defineSecret("CATCH_INSTAGRAM_APP_SECRET");
// The version pinned at deploy. refreshInstagramAccessToken renews it, and
// the webhook switches to the renewed version without a redeploy.
export const instagramAccessToken =
  defineSecret("CATCH_INSTAGRAM_ACCESS_TOKEN");
const verifyToken = defineSecret("CATCH_INSTAGRAM_WEBHOOK_VERIFY_TOKEN");
export const instagramGraphVersion = defineString(
  "CATCH_INSTAGRAM_GRAPH_VERSION", {default: "v26.0"});

let emulatorProvider: FakeInstagramProvider | null = null;
let tokenSource: InstagramAccessTokenSource | null = null;

/**
 * The emulator never calls Meta: it gets the fake provider, whose senders
 * come from CATCH_INSTAGRAM_FAKE_SENDERS, a JSON map of sender id to
 * username.
 */
export function instagramClaimProvider(): InstagramMessagingProvider {
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    emulatorProvider ??= new FakeInstagramProvider(
      fakeSenders(process.env.CATCH_INSTAGRAM_FAKE_SENDERS));
    return emulatorProvider;
  }
  tokenSource ??= new InstagramAccessTokenSource(
    new InstagramAccessTokenStore(admin.firestore()),
    (reason) => logger.warn("Instagram webhook is using the deployed token",
      {reason}));
  const source = tokenSource;
  const accountId = catchInstagramAccountId.value().trim();
  return new InstagramGraphProvider({
    accountId,
    accessToken: () => source.token(accountId, instagramAccessToken.value()),
    graphVersion: instagramGraphVersion.value().trim(),
  });
}

export const instagramClaimWebhook = onRequest({
  secrets: [appSecret, instagramAccessToken, verifyToken], maxInstances: 2,
  concurrency: 10, invoker: "public",
}, async (request, response) => {
  const enabled = instagramClaimsEnabled.value();
  const result = await handleInstagramClaimWebhook({
    method: request.method, query: request.query,
    rawBody: request.rawBody,
    signature: request.header("x-hub-signature-256"),
  }, {accountId: catchInstagramAccountId.value().trim(),
    appSecret: appSecret.value(), verifyToken: verifyToken.value()},
  // Switched off, signed deliveries are acknowledged and ignored so Meta
  // keeps the subscription healthy.
  async (messages) => enabled ? processInstagramClaimMessages(messages,
    {...defaultClaimVerificationDeps, provider: instagramClaimProvider}) :
    undefined);
  if (result.status === 503) {
    logger.warn("Instagram claim webhook unavailable", {body: result.body});
  }
  response.type("text/plain").status(result.status).send(result.body);
});

function fakeSenders(value: string | undefined): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(value ?? "{}");
    return typeof parsed === "object" && parsed !== null ?
      Object.fromEntries(Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string")) :
      {};
  } catch {
    return {};
  }
}
