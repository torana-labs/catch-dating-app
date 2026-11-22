import {HttpsError} from "firebase-functions/v2/https";

export type SupplyPublishStatus = "draft" | "published" | "suppressed";
export type SupplyIndexStatus = "noindex" | "indexed";
export type SupplyAppVisibility = "hidden" | "discoverable";

export interface SupplyVisibilityControls {
  publishStatus: SupplyPublishStatus;
  indexStatus: SupplyIndexStatus;
  appVisibility: SupplyAppVisibility;
}

export interface SupplyVisibilityChecklist {
  identityReviewed: boolean;
  surfaceInventoryReviewed: boolean;
  ownerSafeCopyReviewed: boolean;
  marketScopeReviewed: boolean;
  mediaRightsReviewed: boolean;
  crawlDisabledReviewed: boolean;
  manualReportsReviewed?: boolean;
  claimTargetReviewed?: boolean;
  takedownPathReviewed?: boolean;
  impersonationReviewed?: boolean;
  operatingStatusReviewed?: boolean;
  eventAccuracyReviewed?: boolean;
  unclaimedAffordancesReviewed?: boolean;
  cityEvidenceReviewed?: boolean;
  formatsReviewed?: boolean;
  datingFramingReviewed?: boolean;
  personalDataReviewed?: boolean;
}

type OrganizerDecision = "approve_public" | "hold" | "suppress";

interface OrganizerVisibilityDecision extends SupplyVisibilityControls {
  decision: OrganizerDecision;
  checklist: SupplyVisibilityChecklist;
}

interface CurrentOrganizerVisibility {
  claimed: boolean;
  controls: SupplyVisibilityControls;
}

const baseChecklistFields: Array<keyof SupplyVisibilityChecklist> = [
  "identityReviewed",
  "surfaceInventoryReviewed",
  "ownerSafeCopyReviewed",
  "marketScopeReviewed",
  "mediaRightsReviewed",
  "crawlDisabledReviewed",
];

const webChecklistFields: Array<keyof SupplyVisibilityChecklist> = [
  "claimTargetReviewed",
  "takedownPathReviewed",
  "impersonationReviewed",
];

const appChecklistFields: Array<keyof SupplyVisibilityChecklist> = [
  "operatingStatusReviewed",
  "eventAccuracyReviewed",
  "unclaimedAffordancesReviewed",
];

/**
 * What staff also confirm before approving a listing Catch sourced itself (a
 * nomination or discovery) for the programmatic listings programme: the city
 * comes from the organizer's events or own pages, not from whoever nominated
 * it; the formats chosen match what it runs; nothing frames it as dating or
 * singles; and it carries no personal data such as founder names or personal
 * numbers.
 */
export const programmaticListingChecklistFields: Array<
  keyof SupplyVisibilityChecklist> = [
    "cityEvidenceReviewed",
    "formatsReviewed",
    "datingFramingReviewed",
    "personalDataReviewed",
  ];

/**
 * Refuses a staff approval of a programmatic listing until every
 * programmatic checklist item is confirmed.
 * @param {SupplyVisibilityChecklist} checklist The reviewer's checklist.
 */
export function assertProgrammaticListingChecklist(
  checklist: Partial<SupplyVisibilityChecklist>
): void {
  requireChecklist(checklist as SupplyVisibilityChecklist,
    programmaticListingChecklistFields, "A programmatic listing");
}

/**
 * Enforces approval and surface-specific gates without coupling approval to
 * any one visibility switch.
 * @param {OrganizerVisibilityDecision} data Requested intake decision.
 * @param {CurrentOrganizerVisibility | null} current Current organizer state.
 */
export function assertOrganizerVisibilityDecisionAllowed(
  data: OrganizerVisibilityDecision,
  current: CurrentOrganizerVisibility | null = null
): void {
  if (data.indexStatus === "indexed" &&
      data.publishStatus !== "published") {
    fail("Search indexing requires public-web publication.");
  }

  if (data.decision === "hold" && !controlsAreOff(data, "draft")) {
    fail("Held organizer intake decisions must keep every surface off.");
  }
  if (data.decision === "suppress" &&
      !controlsAreOff(data, "suppressed")) {
    fail("Suppressed organizer intake decisions must clear every surface.");
  }

  if (data.decision === "approve_public") {
    requireChecklist(data.checklist, baseChecklistFields, "record approval");
    if (data.publishStatus === "published" ||
        data.indexStatus === "indexed" ||
        data.appVisibility === "discoverable") {
      requireChecklist(data.checklist, webChecklistFields, "web visibility");
    }
    if (data.appVisibility === "discoverable") {
      requireChecklist(data.checklist, appChecklistFields, "app visibility");
    }
  }

  if (current?.claimed === true &&
      visibilityWouldDowngrade(data, current.controls)) {
    fail(
      "An intake decision cannot reduce visibility for a claimed organizer."
    );
  }
}

/**
 * Returns event visibility after applying the organizer's per-surface ceiling.
 * @param {SupplyVisibilityControls} event Requested event controls.
 * @param {SupplyVisibilityControls} organizer Organizer controls.
 * @return {SupplyVisibilityControls} Effective event visibility.
 */
export function effectiveEventVisibility(
  event: SupplyVisibilityControls,
  organizer: SupplyVisibilityControls
): SupplyVisibilityControls {
  return {
    publishStatus:
      event.publishStatus === "published" &&
      organizer.publishStatus === "published" ?
        "published" :
        event.publishStatus === "suppressed" ? "suppressed" : "draft",
    indexStatus:
      event.indexStatus === "indexed" &&
      organizer.indexStatus === "indexed" ?
        "indexed" :
        "noindex",
    appVisibility:
      event.appVisibility === "discoverable" &&
      organizer.appVisibility === "discoverable" ?
        "discoverable" :
        "hidden",
  };
}

/**
 * Refuses event surface controls above the organizer ceiling.
 * @param {SupplyVisibilityControls} event Requested event controls.
 * @param {SupplyVisibilityControls} organizer Organizer controls.
 */
export function assertEventVisibilityWithinOrganizerCeiling(
  event: SupplyVisibilityControls,
  organizer: SupplyVisibilityControls
): void {
  const effective = effectiveEventVisibility(event, organizer);
  if (effective.publishStatus !== event.publishStatus ||
      effective.indexStatus !== event.indexStatus ||
      effective.appVisibility !== event.appVisibility) {
    fail("An event cannot be more visible than its organizer.");
  }
}

function controlsAreOff(
  controls: SupplyVisibilityControls,
  publishStatus: "draft" | "suppressed"
): boolean {
  return controls.publishStatus === publishStatus &&
    controls.indexStatus === "noindex" &&
    controls.appVisibility === "hidden";
}

function requireChecklist(
  checklist: SupplyVisibilityChecklist,
  fields: Array<keyof SupplyVisibilityChecklist>,
  gate: string
): void {
  const missing = fields.filter((field) => checklist[field] !== true);
  if (missing.length > 0) {
    fail(
      `${gate} requires checklist confirmation: ${missing.join(", ")}.`
    );
  }
}

function visibilityWouldDowngrade(
  requested: SupplyVisibilityControls,
  current: SupplyVisibilityControls
): boolean {
  return publishRank(requested.publishStatus) <
      publishRank(current.publishStatus) ||
    indexRank(requested.indexStatus) < indexRank(current.indexStatus) ||
    appRank(requested.appVisibility) < appRank(current.appVisibility);
}

function publishRank(value: SupplyPublishStatus): number {
  return value === "published" ? 1 : 0;
}

function indexRank(value: SupplyIndexStatus): number {
  return value === "indexed" ? 1 : 0;
}

function appRank(value: SupplyAppVisibility): number {
  return value === "discoverable" ? 1 : 0;
}

function fail(message: string): never {
  throw new HttpsError("failed-precondition", message);
}
