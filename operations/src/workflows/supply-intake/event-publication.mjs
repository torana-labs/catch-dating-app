import Ajv from "ajv";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {OperationsError} from "../../platform/errors.mjs";
import {price} from "./event-import.mjs";
import {normalizeOrganizerSurfaceUrl} from "./sources/surfaces.mjs";

// Who reviews an imported event before it publishes. The policy names one
// mode: every event waits for staff, or, once staff approve an organizer's
// listing, its events that pass every automated check below publish without
// a person and the rest wait. Staff can publish what waits and withdraw
// anything published in either mode. Functions performs the writes; this
// module only decides.

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const policyPath = path.join(moduleDirectory, "config", "event_publication_policy.json");
const schemaPath = path.join(moduleDirectory, "config", "event_publication_policy.schema.json");

export const AUTO_PUBLISH_MODE = "auto_publish_approved_organizers";
// The receipt actor for events published under the policy rather than by a person.
export const AUTO_PUBLISH_ACTOR = "supply-intake-auto-publish";

// Catch's public pages carry no dating framing, so an organizer's own copy
// that sells an event as a singles night or a mixer waits for a person.
// "Single" alone is ordinary English (a single ticket, single-origin), so
// only the plural and phrases about single people count.
const DATING_FRAMING = [
  /\bsingles\b/iu,
  /\bsingle (?:men|women|people|folks|ladies|guys|professionals)\b/iu,
  /\bspeed[- ]?dat(?:e|es|ing)\b/iu,
  /\bdating\b/iu,
  /\bmatch[- ]?making\b/iu,
  /\bblind dates?\b/iu,
  /\bmixers?\b/iu,
  /\bfind (?:your|a) (?:match|partner|date|soulmate)\b/iu,
];

export async function loadEventPublicationPolicy({readFile = fs.readFile} = {}) {
  const [policyText, schemaText] = await Promise.all([readFile(policyPath, "utf8"), readFile(schemaPath, "utf8")]);
  const policy = JSON.parse(policyText);
  const validate = new Ajv({allErrors: true, strict: false}).compile(JSON.parse(schemaText));
  if (!validate(policy)) {
    throw new OperationsError("INVALID_EVENT_PUBLICATION_POLICY",
      "Supply Intake event publication policy does not satisfy its schema.",
      {details: {errors: (validate.errors ?? []).map((error) =>
        ({path: error.instancePath, keyword: error.keyword, message: error.message}))}});
  }
  return structuredClone(policy);
}

/** Phrases in the event's own title or description that frame it as dating. */
export function datingFramingFindings(event) {
  const findings = [];
  for (const field of ["title", "description"]) {
    const text = typeof event?.[field] === "string" ? event[field] : "";
    for (const pattern of DATING_FRAMING) {
      const match = pattern.exec(text);
      if (match) findings.push({check: "dating_framing", field, match: match[0]});
    }
  }
  return findings;
}

/**
 * A published event shows its price beside the outbound link, "Free" when the
 * page says so. A page that states no price leaves a person to check it.
 */
export function priceFindings(event) {
  return price(event?.price).displayText === null ?
    [{check: "price_missing", field: "price", match: "The source page states no price."}] : [];
}

/**
 * An event read from the organizer's own pages may still be someone else's:
 * a co-hosted event on their calendar, or an event page a nominator pasted.
 * It is attributed when it names no other organizer, or its organizer link
 * or name matches the approved organizer.
 */
export function attributionFindings(event, organizer) {
  const eventName = comparableName(event?.organizerName);
  const eventUrl = surfaceKey(event?.organizerUrl);
  if (!eventName && !eventUrl) return [];
  if (eventUrl && (organizer?.links ?? []).some((url) => surfaceKey(url) === eventUrl)) return [];
  if (eventName && eventName === comparableName(organizer?.name)) return [];
  return [{check: "organizer_attribution", field: "organizerName",
    match: event.organizerName ?? event.organizerUrl}];
}

/**
 * The review an event gets under the policy alone. `eligible` is true only
 * when the policy auto-publishes and every automated check passes; the plan's
 * own blockers (end time, location, coordinates, duplicates, dates) still
 * apply on top.
 * @param {{event: object, organizer: {name: string | null, links: string[]}, policy: object, now: string}} input
 */
export function automatedEventReview({event, organizer, policy, now}) {
  const copyFindings = [...datingFramingFindings(event), ...attributionFindings(event, organizer)];
  const findings = [...copyFindings, ...priceFindings(event)];
  const autoPublish = policy?.mode === AUTO_PUBLISH_MODE;
  return {
    eligible: autoPublish && findings.length === 0,
    findings,
    review: {
      reviewerUid: AUTO_PUBLISH_ACTOR,
      decidedAt: now,
      note: `Published under ${policy?.policyVersion ?? "the event publication policy"}: the organizer's listing ` +
        "was approved and the event passed every automated check.",
      ownerSafeCopyReviewed: copyFindings.length === 0,
      importPolicyAcknowledged: autoPublish,
      blockerResolutions: [],
    },
  };
}

/**
 * The review a staff member gives by publishing: their checklist confirms the
 * copy and the outbound-only booking, and their resolutions or cited waivers
 * clear governed blockers for this event. A location they supply fills the
 * map location the source page left out.
 */
export function staffEventReview({reviewerUid, decidedAt, note, checklist, blockerResolutions = [],
  location = null}) {
  return {
    reviewerUid,
    decidedAt,
    note,
    ownerSafeCopyReviewed: checklist?.ownerSafeCopyReviewed === true,
    importPolicyAcknowledged: checklist?.outboundLinksReviewed === true &&
      checklist?.noCatchBookingPaymentsWaitlist === true,
    blockerResolutions: blockerResolutions.map((resolution) => ({
      blockerCode: resolution.blockerCode,
      outcome: resolution.outcome,
      policyGapDecisionId: resolution.policyGapDecisionId ?? null,
      note: resolution.note,
    })),
    location: location === null ? null : {name: location.name ?? null, address: location.address ?? null,
      placeId: location.placeId ?? null, latitude: location.latitude, longitude: location.longitude},
  };
}

function comparableName(value) {
  if (typeof value !== "string") return null;
  const name = value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/gu, "");
  return name.length > 0 ? name : null;
}

// The surface's identity key where the platform has one (a Luma slug names
// a calendar or an event, which only the page tells apart), else the URL
// without its query.
function surfaceKey(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    const surface = normalizeOrganizerSurfaceUrl(value);
    if (surface.normalizedKey) return surface.normalizedKey.replace(/^luma:calendar:/u, "luma:event:");
    const url = new URL(surface.canonicalUrl);
    return `${url.host}${url.pathname}`.replace(/\/+$/u, "");
  } catch {
    return null;
  }
}
