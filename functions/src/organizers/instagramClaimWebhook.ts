import * as logger from "firebase-functions/logger";
import {defineSecret, defineString} from "firebase-functions/params";
import {onRequest} from "firebase-functions/v2/https";
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
const accessToken = defineSecret("CATCH_INSTAGRAM_ACCESS_TOKEN");
const verifyToken = defineSecret("CATCH_INSTAGRAM_WEBHOOK_VERIFY_TOKEN");
const graphVersion = defineString("CATCH_INSTAGRAM_GRAPH_VERSION",
  {default: "v26.0"});

let emulatorProvider: FakeInstagramProvider | null = null;

/** The emulator never calls Meta: it gets the fake provider. */
export function instagramClaimProvider(): InstagramMessagingProvider {
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    emulatorProvider ??= new FakeInstagramProvider();
    return emulatorProvider;
  }
  return new InstagramGraphProvider({
    accountId: catchInstagramAccountId.value().trim(),
    accessToken: accessToken.value(),
    graphVersion: graphVersion.value().trim(),
  });
}

export const instagramClaimWebhook = onRequest({
  secrets: [appSecret, accessToken, verifyToken], maxInstances: 2,
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
