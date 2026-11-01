import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {defineSecret} from "firebase-functions/params";
import {onRequest} from "firebase-functions/v2/https";
import {defaultSupportInboxDeps, recordSupportInbound} from
  "../supportInbox/conversations";
import {routeInstagramInbound} from
  "../catchMessaging/instagramInboundRouter";
import {messageNominationsEnabled} from
  "../catchMessaging/inboundRouterRuntime";
import {defaultMessageNominationDeps} from
  "../operations/supplyIntake/messageNominations";
import {
  InstagramAccessTokenSource,
  InstagramAccessTokenStore,
} from "./instagramAccessTokenStore";
import {extractClaimCode, handleInstagramClaimWebhook} from
  "./instagramClaimProtocol";
import type {InstagramInboundMessage} from "./instagramClaimProtocol";
import {
  FakeInstagramProvider,
  InstagramGraphProvider,
} from "./instagramMessagingProvider";
import type {InstagramMessagingProvider} from "./instagramMessagingProvider";
import {
  catchInstagramAccountId,
  catchInstagramGraphVersion,
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
    graphVersion: catchInstagramGraphVersion.value().trim(),
  });
}

/**
 * A message with a claim code goes to claim verification; any other goes
 * to the nomination router. Each path has its own switch, and a message
 * whose path is off is acknowledged and ignored so Meta keeps the
 * subscription healthy.
 */
async function handleInstagramMessages(messages: InstagramInboundMessage[]) {
  const claimsEnabled = instagramClaimsEnabled.value();
  const nominationsEnabled = messageNominationsEnabled.value();
  for (const message of messages) {
    if (extractClaimCode(message.text)) {
      if (claimsEnabled) {
        await processInstagramClaimMessages([message],
          {...defaultClaimVerificationDeps, provider: instagramClaimProvider});
      }
    } else {
      let outcome = "support";
      if (nominationsEnabled) {
        const db = admin.firestore();
        outcome = await routeInstagramInbound({
          ...defaultMessageNominationDeps(db,
            (uid) => admin.auth().getUser(uid)),
          provider: instagramClaimProvider,
          serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
        }, message);
      }
      if (outcome === "support") {
        // Messages for the team land in the Support inbox.
        await recordSupportInbound(defaultSupportInboxDeps, {
          channel: "instagram",
          contactAddress: `ig:${message.senderId}`,
          text: message.text ?? "",
          sourceEventId: `instagram-${message.messageKey}`,
        });
      } else {
        logger.info("Instagram message routed", {outcome});
      }
    }
  }
}

export const instagramClaimWebhook = onRequest({
  secrets: [appSecret, instagramAccessToken, verifyToken], maxInstances: 2,
  concurrency: 10, invoker: "public",
}, async (request, response) => {
  const result = await handleInstagramClaimWebhook({
    method: request.method, query: request.query,
    rawBody: request.rawBody,
    signature: request.header("x-hub-signature-256"),
  }, {accountId: catchInstagramAccountId.value().trim(),
    appSecret: appSecret.value(), verifyToken: verifyToken.value()},
  handleInstagramMessages);
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
