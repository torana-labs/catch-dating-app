import {validatePreviewEventOfferPreferencesCallableResponse} from
  "../shared/generated/validators/previewEventOfferPreferencesOutput";
import {issueOfferRecipientInvitation} from
  "../organizerEventOfferRecipients/recipientGrant";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit, RateLimitConfig} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {validatePreviewEventOffersCallablePayload} from
  "../shared/generated/validators/previewEventOffersInput";
import {validateCommitEventOffersCallablePayload} from
  "../shared/generated/validators/commitEventOffersInput";
import {validateMutateEventOfferCallablePayload} from
  "../shared/generated/validators/mutateEventOfferInput";
import {validateGetEventOfferCallablePayload} from
  "../shared/generated/validators/getEventOfferInput";
import {validateListEventOffersCallablePayload} from
  "../shared/generated/validators/listEventOffersInput";
import {validateEventOfferPreviewCallableResponse} from
  "../shared/generated/validators/eventOfferPreviewOutput";
import {validateEventOfferCommitCallableResponse} from
  "../shared/generated/validators/eventOfferCommitOutput";
import {validateEventOfferMutationCallableResponse} from
  "../shared/generated/validators/eventOfferMutationOutput";
import {validateEventOfferDetailCallableResponse} from
  "../shared/generated/validators/eventOfferDetailOutput";
import {validateEventOfferListCallableResponse} from
  "../shared/generated/validators/eventOfferListOutput";
import {FirestoreEventOfferRepository} from "./eventOfferFirestoreRepository";
import {OfferDomainError} from "./eventOfferDomain";
import {
  commitEventOffers as commit, getEventOffer as detail,
  listEventOffers as list, mutateEventOffer as mutate,
  previewEventOffers as preview, OfferRepository,
  prepareEventOfferHandoff as prepareHandoff,
  getEventOfferConfiguration as configuration,
} from "./eventOfferService";

import {validatePrepareEventOfferHandoffCallablePayload} from
  "../shared/generated/validators/prepareEventOfferHandoffInput";
import {validateEventOfferHandoffCallableResponse} from
  "../shared/generated/validators/eventOfferHandoffOutput";

import {validateGetEventOfferConfigurationCallablePayload} from
  "../shared/generated/validators/getEventOfferConfigurationInput";
import {validateEventOfferConfigurationCallableResponse} from
  "../shared/generated/validators/eventOfferConfigurationOutput";

import {configureEventOfferPreferences as configurePreferences} from
  "./eventOfferConfigurationService";
import {validateConfigureEventOfferPreferencesCallablePayload} from
  "../shared/generated/validators/configureEventOfferPreferencesInput";
import {validateConfigureEventOfferPreferencesCallableResponse} from
  "../shared/generated/validators/configureEventOfferPreferencesOutput";
import {BRAND} from "../shared/generated/brand";


export interface OfferCallableDependencies {
  firestore: () => FirebaseFirestore.Firestore;
  repository: (db: FirebaseFirestore.Firestore) => OfferRepository;
  checkRateLimit: typeof checkRateLimit;
  issueInvitation?: Parameters<typeof prepareHandoff>[0]["issueInvitation"];
}
const defaultDeps: OfferCallableDependencies = {
  firestore: () => admin.firestore(),
  repository: (db) => new FirestoreEventOfferRepository(db),
  checkRateLimit,
  issueInvitation: async (input) => {
    const invitation = await issueOfferRecipientInvitation({
      db: admin.firestore(), actorUid: input.actorUid,
      scope: {organizerId: input.organizerId, eventId: input.eventId,
        offerId: input.offerId, responseId: input.responseId},
      expectedOfferGeneration: input.expectedOfferGeneration,
      expectedOfferRevision: input.expectedOfferRevision});
    return `${BRAND.web.origin}/offer#${invitation.token}`;
  },
};

async function execute<T>(params: {
  uid: string;
  action: string;
  limit: RateLimitConfig;
  deps: OfferCallableDependencies;
  run: (repository: OfferRepository) => Promise<T>;
  validate: (value: unknown) => boolean;
}): Promise<T> {
  const {uid, action, limit, deps, run, validate} = params;
  const db = deps.firestore();
  await deps.checkRateLimit(db, uid, action, limit);
  try {
    const result = await run(deps.repository(db));
    if (!validate(result)) {
      throw new HttpsError("internal", "Invalid event offer result.");
    }
    return result;
  } catch (error) {
    if (error instanceof OfferDomainError) {
      const codes = {invalid: "invalid-argument", denied: "permission-denied",
        conflict: "failed-precondition"} as const;
      throw new HttpsError(codes[error.code], error.message,
        error.code === "conflict" ? {reason: "offer_review_required"} :
          undefined);
    }
    throw error;
  }
}

export async function previewEventOffersHandler(
  request: CallableRequest<unknown>, deps = defaultDeps
) {
  const uid = requireAuth(request);
  const input = validateCallableWithAjv(request,
    validatePreviewEventOffersCallablePayload);
  return execute({uid, action: "previewEventOffers", deps,
    limit: {maxRequests: 20, windowMs: 60 * 1000},
    run: (repository) => preview({repository, actor: {uid}, input}),
    validate: validateEventOfferPreviewCallableResponse});
}

export async function commitEventOffersHandler(
  request: CallableRequest<unknown>, deps = defaultDeps
) {
  const uid = requireAuth(request);
  const input = validateCallableWithAjv(request,
    validateCommitEventOffersCallablePayload);
  return execute({uid, action: "commitEventOffers", deps,
    limit: {maxRequests: 10, windowMs: 60 * 1000},
    run: (repository) => commit({repository, actor: {uid}, input}),
    validate: validateEventOfferCommitCallableResponse});
}

export async function mutateEventOfferHandler(
  request: CallableRequest<unknown>, deps = defaultDeps
) {
  const uid = requireAuth(request);
  const input = validateCallableWithAjv(request,
    validateMutateEventOfferCallablePayload);
  return execute({uid, action: "mutateEventOffer", deps,
    limit: {maxRequests: 30, windowMs: 60 * 1000},
    run: (repository) => mutate({repository, actor: {uid}, ...input}),
    validate: validateEventOfferMutationCallableResponse});
}

export async function getEventOfferHandler(
  request: CallableRequest<unknown>, deps = defaultDeps
) {
  const uid = requireAuth(request);
  const input = validateCallableWithAjv(request,
    validateGetEventOfferCallablePayload);
  return execute({uid, action: "getEventOffer", deps,
    limit: {maxRequests: 60, windowMs: 60 * 1000},
    run: (repository) => detail({repository, actor: {uid}, ...input}),
    validate: validateEventOfferDetailCallableResponse});
}

export async function listEventOffersHandler(
  request: CallableRequest<unknown>, deps = defaultDeps
) {
  const uid = requireAuth(request);
  const input = validateCallableWithAjv(request,
    validateListEventOffersCallablePayload);
  return execute({uid, action: "listEventOffers", deps,
    limit: {maxRequests: 30, windowMs: 60 * 1000},
    run: (repository) => list({repository, actor: {uid}, ...input}),
    validate: validateEventOfferListCallableResponse});
}

export const previewEventOffers = onCall(appCheckCallableOptions,
  (request) => previewEventOffersHandler(request));
export const commitEventOffers = onCall(appCheckCallableOptions,
  (request) => commitEventOffersHandler(request));
export const mutateEventOffer = onCall(appCheckCallableOptions,
  (request) => mutateEventOfferHandler(request));
export const getEventOffer = onCall(appCheckCallableOptions,
  (request) => getEventOfferHandler(request));
export const listEventOffers = onCall(appCheckCallableOptions,
  (request) => listEventOffersHandler(request));

/** Prepares editable text only; never sends or records delivery. */
export async function prepareEventOfferHandoffHandler(
  request: CallableRequest<unknown>, deps = defaultDeps
) {
  const uid = requireAuth(request);
  const input = validateCallableWithAjv(request,
    validatePrepareEventOfferHandoffCallablePayload);
  return execute({uid, action: "prepareEventOfferHandoff", deps,
    limit: {maxRequests: 30, windowMs: 60 * 1000},
    run: (repository) => prepareHandoff({repository, actor: {uid}, ...input,
      issueInvitation: deps.issueInvitation}),
    validate: validateEventOfferHandoffCallableResponse});
}
export const prepareEventOfferHandoff = onCall(appCheckCallableOptions,
  (request) => prepareEventOfferHandoffHandler(request));

/** Reads private payment configuration only after current manager authority. */
export async function getEventOfferConfigurationHandler(
  request: CallableRequest<unknown>, deps = defaultDeps
) {
  const uid = requireAuth(request);
  const input = validateCallableWithAjv(request,
    validateGetEventOfferConfigurationCallablePayload);
  return execute({uid, action: "getEventOfferConfiguration", deps,
    limit: {maxRequests: 60, windowMs: 60 * 1000},
    run: (repository) => configuration({repository, actor: {uid}, ...input}),
    validate: validateEventOfferConfigurationCallableResponse});
}
export const getEventOfferConfiguration = onCall(appCheckCallableOptions,
  (request) => getEventOfferConfigurationHandler(request));

/** Changes future offer defaults; issued offer snapshots remain immutable. */
export async function configureEventOfferPreferencesHandler(
  request: CallableRequest<unknown>, deps = defaultDeps
) {
  const actorUid = requireAuth(request);
  const command = validateCallableWithAjv(request,
    validateConfigureEventOfferPreferencesCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "configureEventOfferPreferences", {
    maxRequests: 10, windowMs: 60 * 1000,
  });
  const result = await configurePreferences({actorUid, command, deps: {
    db,
    serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  }});
  if (!validateConfigureEventOfferPreferencesCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid event preference result.");
  }
  return result;
}
export const configureEventOfferPreferences = onCall(appCheckCallableOptions,
  (request) => configureEventOfferPreferencesHandler(request));

/** Read-only review uses exactly the same resolver and fences as saving. */
export async function previewEventOfferPreferencesHandler(
  request: CallableRequest<unknown>, deps = defaultDeps
) {
  const actorUid = requireAuth(request);
  const command = validateCallableWithAjv(request,
    validateConfigureEventOfferPreferencesCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "previewEventOfferPreferences", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const result = await configurePreferences({actorUid, command,
    previewOnly: true, deps: {db,
      serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp()}});
  if (!validatePreviewEventOfferPreferencesCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid event preference preview.");
  }
  return result;
}
export const previewEventOfferPreferences = onCall(appCheckCallableOptions,
  (request) => previewEventOfferPreferencesHandler(request));
