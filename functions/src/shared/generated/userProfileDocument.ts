/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

import type {ProfilePromptAnswer} from "./profilePromptAnswer";
import type {ProfilePhoto} from "./profilePhoto";
import type {ActivityPreferences} from "./activityPreferences";

/**
 * Canonical private profile document stored at users/{uid}. The uid is the document id and is not stored in document data.
 */
export interface UserProfileDocument {
  name: string;
  firstName: string;
  lastName: string;
  displayName: string;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  dateOfBirth?: {
    _seconds: number;
    _nanoseconds: number;
  };
  gender?: "man" | "woman" | "nonBinary" | "other";
  phoneNumber: string;
  countryCode?: string;
  profileRevision?: number;
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  profileClaimedAt?: {
    _seconds: number;
    _nanoseconds: number;
  };
  profileComplete: boolean;
  /**
   * Internal demo seed marker used for cleanup and diagnostics.
   */
  synthetic?: boolean;
  /**
   * Internal demo seed prefix used for cleanup and diagnostics.
   */
  seedPrefix?: string;
  /**
   * Internal demo seed scenario name used for cleanup and diagnostics.
   */
  scenario?: string;
  /**
   * Internal demo-operations marker used for cleanup and diagnostics.
   */
  demoOps?: boolean;
  /**
   * Internal demo-operations id used for cleanup and diagnostics.
   */
  demoOpsId?: string;
  /**
   * Internal demo-operations command name used for cleanup and diagnostics.
   */
  demoOpsCommand?: string;
  email: "" | string;
  instagramHandle?: string | null;
  /**
   * @maxItems 3
   */
  profilePrompts: ProfilePromptAnswer[];
  /**
   * @maxItems 6
   */
  profilePhotos: ProfilePhoto[];
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /**
   * @minItems 0
   * @maxItems 8
   */
  interestedInGenders: ("man" | "woman" | "nonBinary" | "other")[];
  minAgePreference: number;
  maxAgePreference: number;
  height?: number | null;
  occupation?: string | null;
  company?: string | null;
  education?:
    | "highSchool"
    | "someCollege"
    | "bachelors"
    | "masters"
    | "phd"
    | "tradeSchool"
    | "other"
    | null;
  religion?:
    | "hindu"
    | "muslim"
    | "christian"
    | "sikh"
    | "jain"
    | "buddhist"
    | "other"
    | "nonReligious"
    | null;
  /**
   * @maxItems 20
   */
  languages: (
    | "english"
    | "hindi"
    | "marathi"
    | "tamil"
    | "telugu"
    | "kannada"
    | "bengali"
    | "gujarati"
    | "punjabi"
    | "malayalam"
    | "odia"
    | "other"
  )[];
  relationshipGoal?:
    | "relationship"
    | "casual"
    | "marriage"
    | "friendship"
    | "unsure"
    | null;
  drinking?: "never" | "socially" | "often" | null;
  smoking?: "never" | "occasionally" | "often" | null;
  workout?: "never" | "sometimes" | "often" | "everyday" | null;
  diet?: "omnivore" | "vegetarian" | "vegan" | "jain" | "other" | null;
  children?:
    | "dontHave"
    | "haveWantMore"
    | "haveNoMore"
    | "wantSomeday"
    | "dontWant"
    | null;
  activityPreferences: ActivityPreferences;
  prefsNewCatches: boolean;
  prefsMessages: boolean;
  prefsEventReminders: boolean;
  prefsRunStatusUpdates: boolean;
  prefsOrganizerUpdates: boolean;
  prefsWeeklyDigest: boolean;
  prefsShowOnMap: boolean;
  /**
   * Private global consent gate for Cross Paths. Missing values resolve to false and this field must never be copied to publicProfiles.
   */
  prefsShowInCrossPaths?: boolean;
  /**
   * Opt-in push preference for Cross Paths invitations. Missing values resolve to false; durable Activity items are still written.
   */
  prefsCrossPathsInvitations?: boolean;
  fcmToken?: string;
  deleted?: boolean;
  deletedAt?: {
    _seconds: number;
    _nanoseconds: number;
  } | null;
}
