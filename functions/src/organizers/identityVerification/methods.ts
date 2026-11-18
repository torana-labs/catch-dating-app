/* eslint-disable max-len */
import type {OrganizerDocument} from "../../shared/generated/firestoreAdminTypes";
import {listingInstagramUsername, listingLumaCalendarUrl} from
  "../organizerClaimSources";
import {lumaClaimMarker} from "../lumaClaimPage";

// The ways an organizer can prove it controls an official channel
// (issue #2096). Every flow that verifies an organizer (claiming a listing
// today; standing for a takedown request and an imported page next) reads
// its methods from this registry, so a new kind of check is one entry here,
// not a change in each flow.

export type VerificationMethodId = "instagramMessage" | "lumaDescription";

/** What a method needs to know about the environment it runs in. */
export interface VerificationMethodEnvironment {
  instagramEnabled: boolean;
  /** Catch's Instagram username without @, or null when unset. */
  catchInstagramHandle: string | null;
  lumaEnabled: () => Promise<boolean>;
}

export interface VerificationMethod {
  id: VerificationMethodId;
  /** automated: the proof completes without a person. */
  kind: "automated";
  /**
   * inboundMessage: the proof arrives on its own (a message to Catch).
   * pageCheck: the caller asks Catch to look for the proof.
   */
  completion: "inboundMessage" | "pageCheck";
  /** Codes that arrive by value are reserved so a message finds its attempt. */
  reservesCode: boolean;
  /** Where the proof must come from on this organizer, or null when it has none. */
  proofTarget: (organizer: OrganizerDocument) => string | null;
  /** Whether the method is offered (the options a page shows). */
  offered: (env: VerificationMethodEnvironment) => Promise<boolean>;
  /** Whether an attempt can start: offered, plus anything starting needs. */
  startable: (env: VerificationMethodEnvironment) => Promise<boolean>;
  /** The text the person puts where the proof is checked. */
  proofText: (code: string) => string;
  /** Why an attempt cannot start when the organizer has no proof target. */
  noTargetMessage: string;
}

const instagramMessage: VerificationMethod = {
  id: "instagramMessage",
  kind: "automated",
  completion: "inboundMessage",
  reservesCode: true,
  proofTarget: (organizer) => listingInstagramUsername(organizer),
  offered: async (env) => env.instagramEnabled,
  startable: async (env) => env.instagramEnabled &&
    env.catchInstagramHandle !== null,
  proofText: (code) => code,
  noTargetMessage: "This listing has no Instagram account to check.",
};

const lumaDescription: VerificationMethod = {
  id: "lumaDescription",
  kind: "automated",
  completion: "pageCheck",
  reservesCode: false,
  proofTarget: (organizer) => listingLumaCalendarUrl(organizer),
  offered: (env) => env.lumaEnabled(),
  startable: (env) => env.lumaEnabled(),
  proofText: (code) => lumaClaimMarker(code),
  noTargetMessage: "This listing has no Luma calendar to check.",
};

/** Every method, in the order a page offers them. */
export const VERIFICATION_METHODS: readonly VerificationMethod[] =
  [instagramMessage, lumaDescription];

export function verificationMethod(id: string): VerificationMethod {
  const method = VERIFICATION_METHODS.find((entry) => entry.id === id);
  if (!method) throw new Error(`Unknown verification method: ${id}`);
  return method;
}
