import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {
  HttpsError,
  onCall,
  type CallableRequest,
} from "firebase-functions/v2/https";
import {eventAgeEligibility} from "./eventProfileRequirements";
import {requirePublicConfiguredEvent} from "../events/configuredEvent";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {isAccountReadyUserProfile} from "../shared/profileReadiness";
import {organizerRelationshipId} from "../shared/relationshipDocuments";
import {validateManageWebsiteAccountCallablePayload} from
  "../shared/generated/validators/manageWebsiteAccountInput";
import {validateUserProfileDocument} from
  "../shared/generated/validators/userProfileDocument";
import {userProfileDocumentSchema} from
  "../shared/generated/schemas/userProfileDocument";
import type {ManageWebsiteAccountCallableResponse as Account} from
  "../shared/generated/manageWebsiteAccountCallableResponse";
import type {
  UserProfileDocument as Profile,
  EventDocument,
} from "../shared/generated/firestoreAdminTypes";

interface AccountDeps {
  db: () => FirebaseFirestore.Firestore;
  now: () => Date;
  loadUser: (uid: string) => Promise<{
    uid: string;
    disabled: boolean;
    phoneNumber?: string;
  }>;
  rateLimit: typeof checkRateLimit;
}
const defaults: AccountDeps = {
  db: () => admin.firestore(),
  now: () => new Date(),
  loadUser: (uid) => admin.auth().getUser(uid),
  rateLimit: checkRateLimit,
};

/** Same Firebase UID and users document as the apps; no social opt-in. */
export async function manageWebsiteAccountHandler(
  request: CallableRequest<unknown>,
  deps: AccountDeps = defaults
): Promise<Account> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv(
    request,
    validateManageWebsiteAccountCallablePayload
  );
  const db = deps.db();
  await deps.rateLimit(db, uid, "manageWebsiteAccount", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  return db.runTransaction(async (tx) => {
    const ref = db.collection("users").doc(uid);
    const [snapshot, deleted, authUser, follow, eventSnapshot] =
      await Promise.all([
        tx.get(ref),
        tx.get(db.collection("deletedUsers").doc(uid)),
        deps.loadUser(uid),
        data.organizerId ?
          tx.get(
            db
              .collection("organizerFollows")
              .doc(organizerRelationshipId(data.organizerId, uid))
          ) :
          null,
        data.eventId ?
          tx.get(db.collection("events").doc(data.eventId)) :
          null,
      ]);
    const current = snapshot.data() as Profile | undefined;
    if (
      authUser.uid !== uid ||
      authUser.disabled ||
      deleted.exists ||
      current?.deleted === true ||
      current?.deletedAt != null
    ) {
      throw new HttpsError("permission-denied", "Account is unavailable.");
    }
    if (eventSnapshot && !eventSnapshot.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    const event = eventSnapshot ?
      requirePublicConfiguredEvent(eventSnapshot.data() as EventDocument) :
      null;
    const phone = authUser.phoneNumber ?? null;
    let profile = current;
    if (data.action === "complete") {
      if (data.expectedUid !== uid) {
        throw new HttpsError("aborted", "Your signed-in account changed.");
      }
      if (
        !phone ||
        !/^\+[1-9][0-9]{7,14}$/u.test(phone) ||
        request.auth?.token.phone_number !== phone
      ) {
        throw new HttpsError(
          "failed-precondition",
          "Verify your current phone before continuing."
        );
      }
      if ((current?.profileRevision ?? 0) !== data.expectedProfileRevision) {
        throw new HttpsError(
          "aborted",
          "Your account changed. Review the latest details and try again."
        );
      }
      const displayName = data.displayName.trim();
      const birthday =
        data.dateOfBirth === undefined ?
          undefined :
          accountBirthDate(data.dateOfBirth, deps.now());
      profile = {
        ...newAccountProfile(displayName, phone),
        ...current,
        name: current?.name?.trim() || displayName,
        displayName,
        phoneNumber: phone,
        ...(birthday ? {dateOfBirth: Timestamp.fromDate(birthday)} : {}),
        profileRevision: (current?.profileRevision ?? 0) + 1,
      };
      const legacy = new Set(
        userProfileDocumentSchema["x-legacy-tolerated-fields"] as string[]
      );
      const validationData = Object.fromEntries(
        Object.entries(profile).filter(([key]) => !legacy.has(key))
      );
      if (!validateUserProfileDocument(validationData)) {
        throw new HttpsError(
          "invalid-argument",
          "Review your account details before continuing."
        );
      }
      tx.set(ref, profile);
    }
    return {
      uid,
      accountReady: Boolean(
        profile &&
        isAccountReadyUserProfile(profile) &&
        profile.phoneNumber === phone
      ),
      displayName:
        profile?.displayName?.trim() || profile?.name?.trim() ||
        profile?.firstName?.trim() || "",
      phoneNumber: phone,
      dateOfBirth:
        profile?.dateOfBirth?.toDate().toISOString().slice(0, 10) ?? null,
      profileRevision: profile?.profileRevision ?? 0,
      following: follow ? follow.data()?.status === "active" : null,
      eventAge: event ? eventAgeEligibility(event, profile, deps.now()) : null,
    };
  });
}

/** Optional birth dates are real dates, not an adult-only account gate. */
export function accountBirthDate(value: string, today: Date): Date {
  const birthday = new Date(`${value}T00:00:00.000Z`);
  const current = new Date(today.toISOString().slice(0, 10));
  const oldest = new Date(current);
  oldest.setUTCFullYear(oldest.getUTCFullYear() - 121);
  if (
    !Number.isFinite(birthday.getTime()) ||
    birthday.toISOString().slice(0, 10) !== value ||
    birthday > current ||
    birthday <= oldest
  ) {
    throw new HttpsError("invalid-argument", "Enter a valid date of birth.");
  }
  return birthday;
}

/** Storage defaults do not create questions or grant social visibility. */
export function newAccountProfile(name: string, phone: string): Profile {
  return {
    name,
    displayName: name,
    firstName: "",
    lastName: "",
    phoneNumber: phone,
    email: "",
    profileComplete: false,
    profilePhotos: [],
    profilePrompts: [],
    interestedInGenders: [],
    minAgePreference: 18,
    maxAgePreference: 99,
    languages: [],
    activityPreferences: {
      running: {
        paceMinSecsPerKm: 300,
        paceMaxSecsPerKm: 420,
        preferredDistances: [],
        runningReasons: [],
        preferredRunTimes: [],
        version: 0,
      },
    },
    prefsNewCatches: false,
    prefsMessages: true,
    prefsEventReminders: true,
    prefsRunStatusUpdates: false,
    prefsClubUpdates: false,
    prefsWeeklyDigest: false,
    prefsShowOnMap: false,
    prefsShowInCrossPaths: false,
    prefsCrossPathsInvitations: false,
  };
}

export const manageWebsiteAccount = onCall(
  appCheckCallableOptions,
  (request) => manageWebsiteAccountHandler(request)
);
