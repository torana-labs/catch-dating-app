import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import {getAuth} from "firebase-admin/auth";
import {getApp} from "firebase-admin/app";
import {getFirestore, type Firestore} from "firebase-admin/firestore";
import {defineBoolean, defineString} from "firebase-functions/params";
import {
  HttpsError,
  onCall,
  type CallableRequest,
} from "firebase-functions/v2/https";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateAdminReviewCatchWhatsappInboundCallablePayload} from
  "../shared/generated/validators/adminReviewCatchWhatsappInboundInput";
import {validateAdminReviewCatchWhatsappInboundCallableResponse} from
  "../shared/generated/validators/adminReviewCatchWhatsappInboundOutput";
import {validateAdminSendCatchWhatsappReplyCallableResponse} from
  "../shared/generated/validators/adminSendCatchWhatsappReplyOutput";
import {
  authorizeCatchReply,
  parseCatchReplyInput,
  sendCatchWhatsappReply,
} from "./whatsappReply";
import type {
  CatchGetUser,
  CatchReplyConfig,
  PreparedCatchReply,
} from "./whatsappReply";
import {
  CatchAppAuthorityStore,
  withCatchFreshAuthContext,
} from "./whatsappAppAuthorityStore";
import {
  createCatchFirebaseAuthority,
  createCatchGoogleFirebaseLookupTransport,
} from "./whatsappFirebaseAuthority";
import {CatchWhatsappReplyStore} from "./whatsappReplyStore";
import {prepareCatchReplyProvider} from "./whatsappReplyProvider";

/** Testable composition; no readiness writer, attestation or activation API. */
export function createCatchReplyHandlers(deps: {
  config: () => CatchReplyConfig;
  db: () => Firestore;
  getUser: CatchGetUser;
  now: () => number;
  prepare: (config: CatchReplyConfig) => Promise<PreparedCatchReply>;
  rateLimit: typeof checkRateLimit;
  authority?: () => CatchAppAuthorityStore;
}) {
  async function authorize(request: CallableRequest<unknown>) {
    const config = {...deps.config()};
    await authorizeCatchReply(request, config, deps.getUser);
    if (!request.app) {
      throw new HttpsError("unauthenticated", "App Check is required.");
    }
    return config;
  }
  return {
    review: async (request: CallableRequest<unknown>) => {
      const config = await authorize(request);
      if (
        !validateAdminReviewCatchWhatsappInboundCallablePayload(request.data)
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Invalid Catch inbound review.",
        );
      }
      const db = deps.db();
      await deps.rateLimit(
        db,
        request.auth!.uid,
        "adminReviewCatchWhatsappInbound",
        {maxRequests: 30, windowMs: 60 * 1000},
      );
      const result = await new CatchWhatsappReplyStore(db, {
        ...deps,
        authority: deps.authority?.(),
      }).review(request, request.data.inboundEventId, config);
      if (!validateAdminReviewCatchWhatsappInboundCallableResponse(result)) {
        throw new HttpsError("internal", "Invalid Catch review result.");
      }
      return result;
    },
    send: async (request: CallableRequest<unknown>) => {
      await authorize(request);
      const input = parseCatchReplyInput(request.data);
      const db = deps.db();
      await deps.rateLimit(
        db,
        request.auth!.uid,
        "adminSendCatchWhatsappReply",
        {maxRequests: 5, windowMs: 60 * 1000},
      );
      const result = await sendCatchWhatsappReply(
        {...request, data: input},
        {
          ...deps,
          store: new CatchWhatsappReplyStore(db, {
            ...deps,
            authority: deps.authority?.(),
          }),
        },
      );
      if (!validateAdminSendCatchWhatsappReplyCallableResponse(result)) {
        throw new HttpsError("internal", "Invalid Catch reply result.");
      }
      return result;
    },
  };
}

const enabled = defineBoolean("CATCH_WHATSAPP_REPLIES_ENABLED", {
  default: false,
});
const atomicIngress = defineBoolean(
  "CATCH_WHATSAPP_ATOMIC_STOP_INGRESS_READY",
  {default: false},
);
const waba = defineString("CATCH_WHATSAPP_WABA_ID", {default: ""});
const phone = defineString("CATCH_WHATSAPP_PHONE_NUMBER_ID", {default: ""});
const actor = defineString("CATCH_WHATSAPP_REPLY_ACTOR_UID", {default: ""});
const recipient = defineString("CATCH_WHATSAPP_REPLY_RECIPIENT_UID", {
  default: "",
});
const endpoint = defineString("CATCH_WHATSAPP_REPLY_RECIPIENT_E164", {
  default: "",
});
const credential = defineString("CATCH_WHATSAPP_REPLY_CREDENTIAL_VERSION", {
  default: "",
});
const graph = defineString("CATCH_WHATSAPP_REPLY_GRAPH_VERSION", {
  default: "",
});
const evidence = defineString("CATCH_WHATSAPP_REPLY_EVIDENCE_SHA256", {
  default: "",
});

const handlers = createCatchReplyHandlers({
  config: () => ({
    enabled: enabled.value(),
    atomicStopIngressReady: atomicIngress.value(),
    wabaId: waba.value().trim(),
    phoneNumberId: phone.value().trim(),
    actorUid: actor.value().trim(),
    recipientUid: recipient.value().trim(),
    recipientE164: endpoint.value().trim(),
    credentialVersionResource: credential.value().trim(),
    graphVersion: graph.value().trim(),
    readinessEvidenceHash: evidence.value().trim(),
  }),
  db: getFirestore,
  getUser: (uid) => getAuth().getUser(uid),
  now: Date.now,
  rateLimit: checkRateLimit,
  authority: () => {
    const projectId = getApp().options.projectId;
    if (!projectId) {
      throw new HttpsError(
        "failed-precondition",
        "Catch project is unavailable.",
      );
    }
    const firebase = createCatchFirebaseAuthority({
      projectId,
      auth: getAuth(),
      transport: createCatchGoogleFirebaseLookupTransport(projectId),
      now: Date.now,
    });
    return new CatchAppAuthorityStore(getFirestore(), {
      projectId,
      now: Date.now,
      firebase,
      withFreshAuthContext: (identity, callback) =>
        withCatchFreshAuthContext(firebase, identity, callback),
      withAuditedAuthFence: async () => {
        // Internal grant commands have no callable/session producer. The
        // fallback cannot initialize authority or bypass fresh checks.
        throw new HttpsError(
          "failed-precondition",
          "Catch authority is unavailable.",
        );
      },
    });
  },
  prepare: (config) =>
    prepareCatchReplyProvider(config, {
      now: Date.now,
      fetch: (...args) => fetch(...args),
      readCredential: async (version) => {
        const project =
          getApp().options.projectId || process.env.GCLOUD_PROJECT;
        if (!project || !version.startsWith(`projects/${project}/secrets/`)) {
          throw new Error("Catch credential project mismatch");
        }
        const [value] =
          await new SecretManagerServiceClient().accessSecretVersion({
            name: version,
          });
        const data = value.payload?.data;
        if (!data) throw new Error("Catch credential unavailable");
        return typeof data === "string" ?
          data :
          Buffer.from(data).toString("utf8");
      },
    }),
});
export const adminReviewCatchWhatsappInbound = onCall(
  appCheckCallableOptionsWithLimits({
    maxInstances: 2,
    concurrency: 10,
    timeoutSeconds: 30,
  }),
  handlers.review,
);
export const adminSendCatchWhatsappReply = onCall(
  appCheckCallableOptionsWithLimits({
    maxInstances: 2,
    concurrency: 10,
    timeoutSeconds: 30,
  }),
  handlers.send,
);
