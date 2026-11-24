import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  type AdminContext,
  type AdminRoleClaim,
  requireAdminRole,
} from "../adminAuth";
import type {OrganizerDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {isOrganizerManager} from "../../shared/organizerHosts";
import {requireDoc} from "../../shared/validation";

/**
 * Who may call a callable (STR-10, issue #2532). Every callable built with
 * `callable()` names one: there is no default. A policy checks the request
 * before the payload is read, so an unauthenticated caller never learns the
 * payload's shape, then optionally checks the validated payload (for
 * example, the organiser it names), and returns the actor the handler gets.
 */
export interface CallablePolicy<P, A> {
  /** Shown in review and in failures; names what the policy admits. */
  readonly name: string;
  /** Checks the request alone, before the payload is validated. */
  authorizeRequest(request: CallableRequest<unknown>): A | Promise<A>;
  /** Checks the validated payload; returns the actor the handler gets. */
  authorizeData?(request: CallableRequest<unknown>, data: P, actor: A):
    A | Promise<A>;
}

/** The signed-in caller's uid. */
export interface SignedInActor {
  uid: string;
}

function signedInUid(request: CallableRequest<unknown>): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  return uid;
}

/** Any signed-in account. The handler owns every further check. */
export const signedIn: CallablePolicy<unknown, SignedInActor> = {
  name: "signedIn",
  authorizeRequest: (request) => ({uid: signedInUid(request)}),
};

/**
 * A Catch admin holding one of [roles] (`requireAdminRole`).
 * @param {AdminRoleClaim[]} roles The admitted admin role claims.
 * @return {CallablePolicy} The policy.
 */
export function adminRoles(roles: readonly AdminRoleClaim[]):
  CallablePolicy<unknown, AdminContext> {
  if (roles.length === 0) {
    throw new Error("adminRoles needs at least one role.");
  }
  return {
    name: `adminRoles(${roles.join(",")})`,
    authorizeRequest: (request) => requireAdminRole(request, roles),
  };
}

/** A manager of the organiser the payload names, with that organiser. */
export interface OrganizerManagerActor {
  uid: string;
  organizerId: string;
  organizer: OrganizerDocument;
}

/**
 * An owner or manager of the organiser [select] reads from the payload, by
 * the organiser's own authority fields (`isOrganizerManager`). A check that
 * must share a transaction with the write stays a customPolicy.
 * @param {Function} select The organiser id in the validated payload.
 * @param {Function} firestore Firestore, injectable for tests.
 * @return {CallablePolicy} The policy.
 */
export function organizerManager<P>(select: (data: P) => string,
  firestore: () => FirebaseFirestore.Firestore = () => admin.firestore()):
  CallablePolicy<P, OrganizerManagerActor> {
  return {
    name: "organizerManager",
    authorizeRequest: (request) => ({uid: signedInUid(request),
      organizerId: "", organizer: {} as OrganizerDocument}),
    authorizeData: async (_request, data, actor) => {
      const organizerId = select(data);
      const snap = await firestore().collection("organizers")
        .doc(organizerId).get();
      if (!snap.exists) {
        throw new HttpsError("not-found", "Organizer not found.");
      }
      const organizer = requireDoc<OrganizerDocument>(snap,
        "OrganizerDocument");
      if (!isOrganizerManager(organizer, actor.uid)) {
        throw new HttpsError("permission-denied",
          "Only organizer owners and managers can access this organizer.");
      }
      return {uid: actor.uid, organizerId, organizer};
    },
  };
}

/** A caller of a deliberately open callable; uid when signed in. */
export interface PublicActor {
  uid: string | null;
}

/**
 * Open to anyone, signed in or not. The reason is required so an open
 * endpoint always says why it is open.
 * @param {string} reason Why this callable needs no sign-in.
 * @return {CallablePolicy} The policy.
 */
export function publicCallable(reason: string):
  CallablePolicy<unknown, PublicActor> {
  if (reason.trim().length < 10) {
    throw new Error("publicCallable needs a reason of at least 10 characters.");
  }
  return {
    name: `public(${reason})`,
    authorizeRequest: (request) => ({uid: request.auth?.uid ?? null}),
  };
}

/**
 * A named check this file has no policy for yet: authorisation inside a
 * transaction, a guest secret, a signed link. The sign-in requirement is
 * still stated, and the name appears in review. Promote a check that
 * repeats to a named policy here.
 * @param {string} name What the check admits.
 * @param {object} check Whether sign-in is required, and the checks.
 * @return {CallablePolicy} The policy.
 */
export function customPolicy<P, A>(name: string, check: {
  requiresSignIn: boolean;
  authorize: (request: CallableRequest<unknown>, data: P,
    uid: string | null) => A | Promise<A>;
}): CallablePolicy<P, A> {
  return {
    name: `custom(${name})`,
    authorizeRequest: (request) => {
      const uid = check.requiresSignIn ? signedInUid(request) :
        request.auth?.uid ?? null;
      // The actor is decided once the payload is known.
      return {uid} as unknown as A;
    },
    authorizeData: (request, data, actor) => check.authorize(request, data,
      (actor as unknown as {uid: string | null}).uid),
  };
}
