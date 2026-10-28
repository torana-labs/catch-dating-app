import type {
  AdminClubDetails,
  AdminOrganizerOwnerLink,
  AdminSetClubIndexStatusPayload,
  AdminUpdateClubDetailsPayload,
  OrganizerAppVisibility,
  OrganizerOwnerLinkIcon,
  OrganizerType,
  OrganizerPublishStatus,
  OrganizerSourceConfidence,
  OrganizerVerificationStatus,
} from "../../../shared/types/adminTypes";
import {
  launchMarketForId,
  launchMarkets,
} from "../../../shared/config/launchMarkets";

export interface OrganizerPublishingFormState {
  clubId: string;
  name: string;
  description: string;
  location: string;
  area: string;
  tagsText: string;
  instagramHandle: string;
  phoneNumber: string;
  email: string;
  imageUrl: string;
  profileImageUrl: string;
  organizerType: OrganizerType;
  publicCategoryLabel: string;
  cityName: string;
  regionName: string;
  countryCode: string;
  countryName: string;
  appVisibility: OrganizerAppVisibility;
  publicPageSlug: string;
  publicPageCitySlug: string;
  canonicalPath: string;
  publishStatus: OrganizerPublishStatus;
  seoTitle: string;
  seoDescription: string;
  sourceConfidence: OrganizerSourceConfidence;
  verificationStatus: OrganizerVerificationStatus;
  headline: string;
  summary: string;
  sourceSummary: string;
  formatsText: string;
  ownerLinks: OrganizerOwnerLinkDraft[];
  reviewNote: string;
}

/** An owner link as the editor holds it; showUntil is a local datetime. */
export interface OrganizerOwnerLinkDraft {
  id: string;
  label: string;
  subtitle: string;
  url: string;
  icon: OrganizerOwnerLinkIcon | "";
  pinned: boolean;
  showUntil: string;
}

export interface PublishChecklistState {
  sourceEvidenceVerified: boolean;
  mediaRightsVerified: boolean;
  cadenceVerified: boolean;
  ownerContactVerified: boolean;
}

export interface OrganizerValidationIssue {
  id: string;
  label: string;
  detail: string;
  severity: "blocker" | "warning";
  targetId?: string;
}

export interface OrganizerValidationOptions {
  publishing?: boolean;
  requireReviewNote?: boolean;
}

export interface OrganizerDiffRow {
  field: string;
  before: string;
  after: string;
}

const organizerPathPattern =
  /^\/organizers\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?\/$/;
const organizerSlugPattern = /^[a-z0-9-]+$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const organizerPublishingFieldIds = {
  area: "organizer-area",
  canonicalPath: "organizer-canonical-path",
  description: "organizer-description",
  email: "organizer-email",
  headline: "organizer-headline",
  imageUrl: "organizer-image-url",
  launchMarket: "organizer-launch-market",
  logoUrl: "organizer-logo-url",
  name: "organizer-name",
  publicPageSlug: "organizer-public-page-slug",
  reviewNote: "organizer-review-note",
  sourceConfidence: "organizer-source-confidence",
  summary: "organizer-summary",
  verificationStatus: "organizer-verification-status",
} as const;

export const maxOrganizerOwnerLinks = 20;

export const organizerOwnerLinkIconOptions = [
  {value: "", label: "From the address"},
  {value: "link", label: "Link"},
  {value: "website", label: "Website"},
  {value: "community", label: "Community chat"},
  {value: "social", label: "Social profile"},
  {value: "tickets", label: "Tickets"},
  {value: "calendar", label: "Calendar"},
  {value: "shop", label: "Shop"},
  {value: "partner", label: "Partner"},
  {value: "video", label: "Video"},
  {value: "route", label: "Route"},
] as const;

export function organizerOwnerLinkFieldId(
  index: number,
  field: "label" | "url" | "showUntil"
): string {
  return `organizer-owner-link-${index}-${field}`;
}

export const organizerTypeOptions = [
  {value: "club", label: "Club"},
  {value: "community", label: "Community"},
  {value: "individual", label: "Individual organizer"},
  {value: "eventProducer", label: "Event producer"},
  {value: "venue", label: "Venue"},
  {value: "brand", label: "Brand"},
] as const;

export const organizerAppVisibilityOptions = [
  {value: "hidden", label: "Hidden — not discoverable in the app"},
  {value: "discoverable", label: "Discoverable — visible to members"},
] as const;

export const organizerPublishStatusOptions = [
  {value: "draft", label: "Draft — private"},
  {value: "qa", label: "QA — internal review"},
  {value: "published", label: "Published — public web"},
  {value: "suppressed", label: "Suppressed — temporarily hidden"},
  {value: "removed", label: "Removed — retired"},
] as const;

export const organizerSourceConfidenceOptions = [
  {value: "seedOnly", label: "Seed only — evidence not reviewed"},
  {value: "low", label: "Low — weak source match"},
  {value: "medium", label: "Medium — evidence needs review"},
  {value: "high", label: "High — strong current public evidence"},
  {value: "ownerVerified", label: "Owner verified — confirmed by organizer"},
] as const;

export const organizerVerificationStatusOptions = [
  {value: "unverified", label: "Unverified"},
  {value: "sourceBacked", label: "Source backed"},
  {value: "ownerVerified", label: "Owner verified"},
] as const;

export const organizerLaunchMarketOptions = launchMarkets.map((market) => ({
  value: market.id,
  label: market.label,
}));

export const publishChecklistItems = [
  {
    key: "sourceEvidenceVerified",
    label: "Source evidence verified",
    detail: "The official source matches this organizer identity and current details.",
  },
  {
    key: "mediaRightsVerified",
    label: "Media rights verified",
    detail: "Every image or logo is approved for public use.",
  },
  {
    key: "cadenceVerified",
    label: "Cadence and crawl fit verified",
    detail: "A current public session or repeatable event cadence is confirmed.",
  },
  {
    key: "ownerContactVerified",
    label: "Owner contact or claim path verified",
    detail: "There is a reviewed owner contact or a safe public claim path.",
  },
] as const satisfies ReadonlyArray<{
  key: keyof PublishChecklistState;
  label: string;
  detail: string;
}>;

export const emptyPublishChecklist: PublishChecklistState = {
  sourceEvidenceVerified: false,
  mediaRightsVerified: false,
  cadenceVerified: false,
  ownerContactVerified: false,
};

export function completePublishChecklist(
  checklist: PublishChecklistState
): boolean {
  return checklist.sourceEvidenceVerified &&
    checklist.mediaRightsVerified &&
    checklist.cadenceVerified &&
    checklist.ownerContactVerified;
}

export function countIncompletePublishChecklist(
  checklist: PublishChecklistState
): number {
  return publishChecklistItems.filter((item) => !checklist[item.key]).length;
}

export function updateOrganizerLaunchMarket(
  form: OrganizerPublishingFormState,
  marketId: string
): OrganizerPublishingFormState {
  const market = launchMarketForId(marketId);
  if (!market) return {...form, location: marketId};
  const routeMatch = organizerPathPattern.exec(form.canonicalPath.trim());
  const canonicalPath = routeMatch?.[2] ?
    `/organizers/${market.publicPageCitySlug}/${form.publicPageSlug.trim()}/` :
    form.canonicalPath;
  return {
    ...form,
    location: market.id,
    cityName: market.cityName,
    regionName: market.regionName,
    countryCode: market.countryCode,
    countryName: market.countryName,
    publicPageCitySlug: market.publicPageCitySlug,
    canonicalPath,
  };
}

export function formFromOrganizerProfile(
  club: AdminClubDetails
): OrganizerPublishingFormState {
  return {
    clubId: club.clubId,
    name: club.name,
    description: club.description,
    location: club.location ?? "",
    area: club.area,
    tagsText: listToText(club.tags),
    instagramHandle: club.instagramHandle ?? "",
    phoneNumber: club.phoneNumber ?? "",
    email: club.email ?? "",
    imageUrl: club.imageUrl ?? "",
    profileImageUrl: club.profileImageUrl ?? "",
    organizerType: club.organizerType,
    publicCategoryLabel: club.publicCategoryLabel ?? "",
    cityName: club.cityName ?? "",
    regionName: club.regionName ?? "",
    countryCode: club.countryCode ?? "",
    countryName: club.countryName ?? "",
    appVisibility: club.appVisibility ?? "hidden",
    publicPageSlug: club.publicPage.slug ?? "",
    publicPageCitySlug: club.publicPage.citySlug ?? "",
    canonicalPath: club.publicPage.canonicalPath ?? "",
    publishStatus: club.publicPage.publishStatus ?? "qa",
    seoTitle: club.publicPage.seoTitle ?? "",
    seoDescription: club.publicPage.seoDescription ?? "",
    sourceConfidence: club.provenance.sourceConfidence ?? "seedOnly",
    verificationStatus: club.provenance.verificationStatus ?? "unverified",
    headline: club.publicProfile.headline ?? "",
    summary: club.publicProfile.summary ?? "",
    sourceSummary: club.publicProfile.sourceSummary ?? "",
    formatsText: listToText(club.publicProfile.formats),
    ownerLinks: club.ownerLinks.map(ownerLinkDraft),
    reviewNote: "",
  };
}

export function emptyOrganizerOwnerLinkDraft(): OrganizerOwnerLinkDraft {
  return {
    id: `link-${globalThis.crypto.randomUUID()}`,
    label: "",
    subtitle: "",
    url: "",
    icon: "",
    pinned: false,
    showUntil: "",
  };
}

/** The links an editor's drafts save, in order. */
export function ownerLinksFromDrafts(
  drafts: OrganizerOwnerLinkDraft[]
): AdminOrganizerOwnerLink[] {
  return drafts.map((draft) => ({
    id: draft.id,
    label: draft.label.trim(),
    subtitle: nullableText(draft.subtitle),
    url: draft.url.trim(),
    icon: draft.icon || null,
    pinned: draft.pinned,
    showUntil: draft.showUntil.trim() ?
      isoFromLocalDateTime(draft.showUntil) : null,
  }));
}

function ownerLinkDraft(link: AdminOrganizerOwnerLink): OrganizerOwnerLinkDraft {
  return {
    id: link.id,
    label: link.label,
    subtitle: link.subtitle ?? "",
    url: link.url,
    icon: link.icon ?? "",
    pinned: link.pinned,
    showUntil: link.showUntil ? localDateTimeFromIso(link.showUntil) : "",
  };
}

/** A datetime-local value in the browser's zone, to the minute. */
function localDateTimeFromIso(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${
    pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isoFromLocalDateTime(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function diffOrganizerProfile(
  club: AdminClubDetails | null,
  form: OrganizerPublishingFormState | null
): OrganizerDiffRow[] {
  if (!club || !form) return [];
  const original = formFromOrganizerProfile(club);
  return diffFields(original, form);
}

export function buildOrganizerSavePayload(
  club: AdminClubDetails,
  form: OrganizerPublishingFormState
): AdminUpdateClubDetailsPayload {
  const original = formFromOrganizerProfile(club);
  const fields: AdminUpdateClubDetailsPayload["fields"] = {};

  addChanged(fields, "name", original.name, form.name);
  addChanged(fields, "description", original.description, form.description);
  addChanged(fields, "location", original.location, nullableText(form.location));
  addChanged(fields, "area", original.area, form.area);
  addChangedArray(fields, "tags", original.tagsText, form.tagsText);
  addChanged(
    fields,
    "instagramHandle",
    original.instagramHandle,
    nullableText(form.instagramHandle)
  );
  addChanged(fields, "phoneNumber", original.phoneNumber, nullableText(form.phoneNumber));
  addChanged(fields, "email", original.email, nullableText(form.email));
  addChanged(fields, "imageUrl", original.imageUrl, nullableText(form.imageUrl));
  addChanged(
    fields,
    "profileImageUrl",
    original.profileImageUrl,
    nullableText(form.profileImageUrl)
  );
  addChanged(
    fields,
    "organizerType",
    original.organizerType,
    form.organizerType
  );
  addChanged(
    fields,
    "publicCategoryLabel",
    original.publicCategoryLabel,
    nullableText(form.publicCategoryLabel)
  );
  addChanged(fields, "cityName", original.cityName, nullableText(form.cityName));
  addChanged(fields, "regionName", original.regionName, nullableText(form.regionName));
  addChanged(fields, "countryCode", original.countryCode, nullableText(form.countryCode));
  addChanged(fields, "countryName", original.countryName, nullableText(form.countryName));
  addChanged(fields, "appVisibility", original.appVisibility, form.appVisibility);

  const publicPage: NonNullable<
    AdminUpdateClubDetailsPayload["fields"]["publicPage"]
  > = {};
  addChanged(publicPage, "slug", original.publicPageSlug, form.publicPageSlug);
  addChanged(
    publicPage,
    "citySlug",
    original.publicPageCitySlug,
    nullableText(form.publicPageCitySlug)
  );
  addChanged(
    publicPage,
    "canonicalPath",
    original.canonicalPath,
    form.canonicalPath
  );
  addChanged(publicPage, "publishStatus", original.publishStatus, form.publishStatus);
  addChanged(publicPage, "seoTitle", original.seoTitle, nullableText(form.seoTitle));
  addChanged(
    publicPage,
    "seoDescription",
    original.seoDescription,
    nullableText(form.seoDescription)
  );
  if (Object.keys(publicPage).length > 0) fields.publicPage = publicPage;

  const provenance: NonNullable<
    AdminUpdateClubDetailsPayload["fields"]["provenance"]
  > = {};
  addChanged(
    provenance,
    "sourceConfidence",
    original.sourceConfidence,
    form.sourceConfidence
  );
  addChanged(
    provenance,
    "verificationStatus",
    original.verificationStatus,
    form.verificationStatus
  );
  if (Object.keys(provenance).length > 0) fields.provenance = provenance;

  const publicProfile: NonNullable<
    AdminUpdateClubDetailsPayload["fields"]["publicProfile"]
  > = {};
  addChanged(publicProfile, "headline", original.headline, nullableText(form.headline));
  addChanged(publicProfile, "summary", original.summary, nullableText(form.summary));
  addChanged(
    publicProfile,
    "sourceSummary",
    original.sourceSummary,
    nullableText(form.sourceSummary)
  );
  addChangedArray(publicProfile, "formats", original.formatsText, form.formatsText);
  if (Object.keys(publicProfile).length > 0) {
    fields.publicProfile = publicProfile;
  }

  const ownerLinks = ownerLinksFromDrafts(form.ownerLinks);
  if (JSON.stringify(ownerLinks) !==
      JSON.stringify(ownerLinksFromDrafts(original.ownerLinks))) {
    fields.ownerLinks = ownerLinks;
  }

  return {
    clubId: form.clubId.trim(),
    reviewNote: nullableText(form.reviewNote),
    fields,
  };
}

export function buildOrganizerPublishPayload(
  form: OrganizerPublishingFormState,
  checklist: PublishChecklistState
): AdminSetClubIndexStatusPayload {
  return {
    clubId: form.clubId.trim(),
    indexStatus: "indexReady",
    checklist,
    reviewNote: nullableText(form.reviewNote),
  };
}

export function validateOrganizerPublishingForm(
  form: OrganizerPublishingFormState | null,
  options: OrganizerValidationOptions = {}
): OrganizerValidationIssue[] {
  if (!form) {
    return [{
      id: "no-form",
      label: "No organizer loaded",
      detail: "Load a canonical organizers/{id} document before publishing.",
      severity: "blocker",
    }];
  }
  const issues: OrganizerValidationIssue[] = [];
  requireText(
    issues,
    "name",
    "Name",
    form.name,
    organizerPublishingFieldIds.name
  );
  requireText(
    issues,
    "description",
    "Description",
    form.description,
    organizerPublishingFieldIds.description
  );
  requireText(
    issues,
    "area",
    "Area / locality",
    form.area,
    organizerPublishingFieldIds.area
  );
  requireText(
    issues,
    "slug",
    "Public page slug",
    form.publicPageSlug,
    organizerPublishingFieldIds.publicPageSlug
  );
  requireText(
    issues,
    "canonical-path",
    "Canonical path",
    form.canonicalPath,
    organizerPublishingFieldIds.canonicalPath
  );
  validateLaunchMarket(issues, form, options.publishing === true);
  validateSlug(issues, form.publicPageSlug);
  validateOptionalUrl(
    issues,
    "image-url",
    "Image URL",
    form.imageUrl,
    organizerPublishingFieldIds.imageUrl
  );
  validateOptionalUrl(
    issues,
    "logo-url",
    "Logo URL",
    form.profileImageUrl,
    organizerPublishingFieldIds.logoUrl
  );
  validateOptionalEmail(issues, form.email);
  validateOwnerLinks(issues, form.ownerLinks);
  const routeIssue = validateCanonicalPath(form);
  if (routeIssue) issues.push(routeIssue);
  if (options.requireReviewNote && !form.reviewNote.trim()) {
    issues.push({
      id: "review-note",
      label: "Review note",
      detail: "Explain what you verified or changed; this becomes the audited operator context.",
      severity: "blocker",
      targetId: organizerPublishingFieldIds.reviewNote,
    });
  }
  if (options.publishing) {
    requireText(
      issues,
      "headline",
      "Headline",
      form.headline,
      organizerPublishingFieldIds.headline,
      "Add the short member-facing promise shown at the top of the listing."
    );
    requireText(
      issues,
      "summary",
      "Summary",
      form.summary,
      organizerPublishingFieldIds.summary,
      "Add a concise member-facing summary of the organizer and its formats."
    );
    if (form.sourceConfidence !== "high" &&
        form.sourceConfidence !== "ownerVerified") {
      issues.push({
        id: "source-confidence",
        label: "Source confidence",
        detail: "Select High for strong current official evidence, or Owner verified after direct confirmation.",
        severity: "blocker",
        targetId: organizerPublishingFieldIds.sourceConfidence,
      });
    }
    if (form.verificationStatus === "unverified") {
      issues.push({
        id: "verification",
        label: "Verification",
        detail: "Select Source backed after checking an official source, or Owner verified after direct confirmation.",
        severity: "blocker",
        targetId: organizerPublishingFieldIds.verificationStatus,
      });
    }
  }
  return issues;
}

export function hasBlockingIssues(issues: OrganizerValidationIssue[]): boolean {
  return issues.some((issue) => issue.severity === "blocker");
}

export function organizerTypeLabel(type: OrganizerType): string {
  switch (type) {
  case "eventProducer": return "Event producer";
  case "individual": return "Individual organizer";
  default: return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

function validateCanonicalPath(
  form: OrganizerPublishingFormState
): OrganizerValidationIssue | null {
  const match = organizerPathPattern.exec(form.canonicalPath.trim());
  if (!match) {
    return {
      id: "route-shape",
      label: "Canonical path",
      detail: "Use /organizers/{slug}/ or /organizers/{citySlug}/{slug}/.",
      severity: "blocker",
      targetId: organizerPublishingFieldIds.canonicalPath,
    };
  }
  const firstSegment = match[1];
  const secondSegment = match[2] ?? null;
  const routeSlug = secondSegment ?? firstSegment;
  const routeCity = secondSegment ? firstSegment : null;
  if (routeSlug !== form.publicPageSlug.trim()) {
    return {
      id: "route-slug",
      label: "Canonical path",
      detail: "The final route segment must match the public page slug.",
      severity: "blocker",
      targetId: organizerPublishingFieldIds.canonicalPath,
    };
  }
  if (routeCity &&
      form.publicPageCitySlug.trim() &&
      routeCity !== form.publicPageCitySlug.trim()) {
    return {
      id: "route-city",
      label: "Canonical path",
      detail: "The route city segment must match the page city slug.",
      severity: "blocker",
      targetId: organizerPublishingFieldIds.canonicalPath,
    };
  }
  return null;
}

function requireText(
  issues: OrganizerValidationIssue[],
  id: string,
  label: string,
  value: string,
  targetId: string,
  detail = `${label} is required for a canonical organizer listing.`
) {
  if (value.trim()) return;
  issues.push({
    id,
    label,
    detail,
    severity: "blocker",
    targetId,
  });
}

function validateLaunchMarket(
  issues: OrganizerValidationIssue[],
  form: OrganizerPublishingFormState,
  publishing: boolean
) {
  const market = launchMarketForId(form.location);
  if (!market) {
    issues.push({
      id: "launch-market",
      label: "Launch market",
      detail: "Choose Mumbai or Indore so city, region, country, and route metadata stay consistent.",
      severity: publishing ? "blocker" : "warning",
      targetId: organizerPublishingFieldIds.launchMarket,
    });
    return;
  }
  const mismatchedProjection =
    form.cityName !== market.cityName ||
    form.regionName !== market.regionName ||
    form.countryCode !== market.countryCode ||
    form.countryName !== market.countryName ||
    form.publicPageCitySlug !== market.publicPageCitySlug;
  if (!mismatchedProjection) return;
  issues.push({
    id: "launch-market-projection",
    label: "Launch market",
    detail: "Re-select the launch market to repair its city, region, country, and page-city projection.",
    severity: "blocker",
    targetId: organizerPublishingFieldIds.launchMarket,
  });
}

function validateSlug(
  issues: OrganizerValidationIssue[],
  value: string
) {
  if (!value.trim() || organizerSlugPattern.test(value.trim())) return;
  issues.push({
    id: "slug-shape",
    label: "Public page slug",
    detail: "Use lowercase letters, numbers, and hyphens only.",
    severity: "blocker",
    targetId: organizerPublishingFieldIds.publicPageSlug,
  });
}

function validateOptionalUrl(
  issues: OrganizerValidationIssue[],
  id: string,
  label: string,
  value: string,
  targetId: string
) {
  const trimmed = value.trim();
  if (!trimmed) return;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:" || url.protocol === "http:") return;
  } catch {
    // Report the same actionable issue for malformed URLs.
  }
  issues.push({
    id,
    label,
    detail: "Enter a complete http:// or https:// URL.",
    severity: "blocker",
    targetId,
  });
}

function validateOwnerLinks(
  issues: OrganizerValidationIssue[],
  drafts: OrganizerOwnerLinkDraft[]
) {
  if (drafts.length > maxOrganizerOwnerLinks) {
    issues.push({
      id: "owner-links-count",
      label: "Page links",
      detail: `Keep the page to ${maxOrganizerOwnerLinks} links or fewer.`,
      severity: "blocker",
    });
  }
  drafts.forEach((draft, index) => {
    const label = `Page link ${index + 1}`;
    if (!draft.label.trim()) {
      issues.push({
        id: `owner-link-${index}-label`,
        label,
        detail: "Give the link the label visitors will see.",
        severity: "blocker",
        targetId: organizerOwnerLinkFieldId(index, "label"),
      });
    }
    if (!isHttpsUrl(draft.url.trim())) {
      issues.push({
        id: `owner-link-${index}-url`,
        label,
        detail: "Enter the full https:// address the link opens.",
        severity: "blocker",
        targetId: organizerOwnerLinkFieldId(index, "url"),
      });
    }
    if (draft.showUntil.trim() && !isoFromLocalDateTime(draft.showUntil)) {
      issues.push({
        id: `owner-link-${index}-show-until`,
        label,
        detail: "Pick a valid show-until date and time, or clear it.",
        severity: "blocker",
        targetId: organizerOwnerLinkFieldId(index, "showUntil"),
      });
    }
  });
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function validateOptionalEmail(
  issues: OrganizerValidationIssue[],
  value: string
) {
  const trimmed = value.trim();
  if (!trimmed || emailPattern.test(trimmed)) return;
  issues.push({
    id: "email-shape",
    label: "Email",
    detail: "Enter a complete email address or leave the field empty.",
    severity: "blocker",
    targetId: organizerPublishingFieldIds.email,
  });
}

function diffFields(
  before: OrganizerPublishingFormState,
  after: OrganizerPublishingFormState
): OrganizerDiffRow[] {
  const rows: OrganizerDiffRow[] = [];
  for (const key of Object.keys(before) as Array<keyof OrganizerPublishingFormState>) {
    if (key === "reviewNote") continue;
    if (key === "ownerLinks") {
      const beforeLinks = ownerLinksFromDrafts(before.ownerLinks);
      const afterLinks = ownerLinksFromDrafts(after.ownerLinks);
      if (JSON.stringify(beforeLinks) !== JSON.stringify(afterLinks)) {
        rows.push({
          field: "Page links",
          before: ownerLinksSummary(beforeLinks),
          after: ownerLinksSummary(afterLinks),
        });
      }
      continue;
    }
    const beforeValue = String(before[key] ?? "");
    const afterValue = String(after[key] ?? "");
    if (beforeValue !== afterValue) {
      rows.push({
        field: labelFromKey(key),
        before: beforeValue || "empty",
        after: afterValue || "empty",
      });
    }
  }
  return rows;
}

function ownerLinksSummary(links: AdminOrganizerOwnerLink[]): string {
  return links.map((link) =>
    `${link.label || link.url || "Untitled"}${link.pinned ? " (pinned)" : ""}`)
    .join(", ") || "empty";
}

function labelFromKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function addChanged<T extends Record<string, unknown>, K extends keyof T>(
  target: T,
  key: K,
  before: unknown,
  after: T[K]
) {
  if (normalizeComparable(before) !== normalizeComparable(after)) {
    target[key] = after;
  }
}

function addChangedArray<T extends Record<string, unknown>, K extends keyof T>(
  target: T,
  key: K,
  beforeText: string,
  afterText: string
) {
  const before = JSON.stringify(textToList(beforeText));
  const after = textToList(afterText);
  if (before !== JSON.stringify(after)) target[key] = after as T[K];
}

function normalizeComparable(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function listToText(items: string[]): string {
  return items.join("\n");
}

function textToList(value: string): string[] {
  return Array.from(new Set(
    value
      .split("\n")
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  ));
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
