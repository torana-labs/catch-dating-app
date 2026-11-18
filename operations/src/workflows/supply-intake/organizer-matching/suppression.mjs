import crypto from "node:crypto";
import {compactHandle, compactText, handleForKey, identityKeysForLink, nameForm, slugOrNull} from "./normalize.mjs";

// The do-not-list (listing suppression) registry's identity keys and their
// keyed hashes. Functions (intake, listing approval, organizer creation) and
// the organiser takedown tool (tool/data/organizer_takedown.mjs) both derive
// keys here, so a name, handle, link, domain, organiser id or slug produces
// the same key on both sides. The registry stores only HMAC-SHA256 hashes of
// these keys under a secret key (LISTING_SUPPRESSION_HMAC_KEY), never the
// keys themselves: a plain hash of a public handle is reversible by guessing.
//
// Key namespaces:
//   label:<letters and digits>  a business name, alias or handle, compacted,
//                               so "Example Runners", "@example.runners" and
//                               the domain example-runners.example agree
//   instagram:<handle>, luma:calendar:<slug>, domain:<host>, url:<url>, ...
//                               the identity keys normalize.mjs derives from
//                               organiser links
//   organizer:<organizerId>     a Catch organiser document id
//   slug:<slug>                 a public page slug

export const SUPPRESSION_HASH_SCHEME = "hmac-sha256/listing-suppression-v1";

/** The takedown request types a suppression can record (docs/data_contracts.md, "Listing suppressions"). */
export const SUPPRESSION_REASONS = Object.freeze([
  "removeAndDoNotList",
  "trademark",
  "copyright",
  "privacy",
  "courtOrder",
  "impersonation",
]);

export const SUPPRESSION_CASE_ID_PATTERN = /^TD-[0-9]{4}$/u;
export const MIN_SUPPRESSION_SECRET_LENGTH = 32;
const MIN_LABEL_LENGTH = 4;
const HANDLE_IN_TEXT = /(?:^|[^\p{L}\p{N}_.])@([\p{L}\p{N}_.]{2,64})/gu;
const URL_IN_TEXT = /https?:\/\/[^\s<>"')]+/giu;
const ORGANIZER_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,179}$/u;

/** A secret too short to key the registry is no secret: callers treat it as unavailable. */
export function usableSuppressionSecret(secret) {
  return typeof secret === "string" && secret.trim().length >= MIN_SUPPRESSION_SECRET_LENGTH;
}

/** The keyed hash of one identity key, as stored in listingSuppressions.identityHashes. */
export function suppressionKeyHash(secret, key) {
  if (!usableSuppressionSecret(secret)) throw new Error("The listing suppression key is unavailable.");
  return crypto.createHmac("sha256", secret.trim()).update(`${SUPPRESSION_HASH_SCHEME}\n${key}`).digest("hex");
}

/** Sorted, unique hashes of the given keys. */
export function suppressionHashes(secret, keys) {
  return [...new Set([...keys].map((key) => suppressionKeyHash(secret, key)))].sort();
}

function label(value) {
  const compact = compactText(value);
  return compact.length >= MIN_LABEL_LENGTH ? `label:${compact}` : null;
}

function labelsForName(value) {
  const form = nameForm(value);
  return [label(value), form && form.key.length >= MIN_LABEL_LENGTH ? `label:${form.key}` : null];
}

function labelForIdentityKey(key) {
  if (key.startsWith("url:")) {
    try {
      const segments = new URL(key.slice(4)).pathname.split("/").filter(Boolean);
      return segments.length ? label(segments.at(-1)) : null;
    } catch {
      return null;
    }
  }
  const handle = handleForKey(key);
  return handle ? `label:${handle}` : null;
}

function keysForLink(url, roles) {
  return roles.flatMap((organizerRole) => identityKeysForLink(url, {organizerRole}))
    .flatMap((key) => [key, labelForIdentityKey(key)]);
}

function keysForDomain(value) {
  const host = String(value ?? "").trim().toLowerCase().replace(/^https?:\/\//u, "").split(/[/?#]/u)[0];
  return host ? keysForLink(`https://${host}/`, [true]) : [];
}

function keysForHandle(value) {
  const handle = compactHandle(value);
  return handle ? [`label:${handle}`] : [];
}

function keysInText(text) {
  const value = String(text ?? "");
  return [
    ...[...value.matchAll(HANDLE_IN_TEXT)].flatMap((match) => keysForHandle(match[1])),
    ...[...value.matchAll(URL_IN_TEXT)].flatMap((match) => keysForLink(match[0], [false, true])),
  ];
}

function keysForSlug(value) {
  const slug = slugOrNull(value);
  return slug ? [`slug:${slug}`, label(slug)] : [];
}

function keysForOrganizerId(value) {
  return typeof value === "string" && ORGANIZER_ID.test(value) ? [`organizer:${value}`] : [];
}

const list = (value) => (Array.isArray(value) ? value : value == null ? [] : [value])
  .filter((item) => typeof item === "string" && item.trim());

/**
 * The identity keys of one organiser as a case file or a stored record
 * describes it. Links are read as the organiser's own pages unless
 * seedLinks is set, when an ambiguous link is read both ways (a nominator's
 * link may be an event page or the organiser's calendar).
 */
export function suppressionKeysForIdentity({names, handles, urls, domains, organizerIds, slugs, notes} = {},
  {seedLinks = false} = {}) {
  const roles = seedLinks ? [false, true] : [true];
  const keys = [
    ...list(names).flatMap(labelsForName),
    ...list(handles).flatMap(keysForHandle),
    ...list(urls).flatMap((url) => keysForLink(url, roles)),
    ...list(domains).flatMap(keysForDomain),
    ...list(organizerIds).flatMap(keysForOrganizerId),
    ...list(slugs).flatMap(keysForSlug),
    ...list(notes).flatMap(keysInText),
  ];
  return [...new Set(keys.filter((key) => typeof key === "string" && key.length > 0 && key.length <= 2_100))].sort();
}

/** The identity keys a Supply Intake request names: its seed, any @handles and links in its notes, and its target. */
export function suppressionKeysForIntakeRequest(request) {
  const seed = request?.seed ?? {};
  return suppressionKeysForIdentity({
    names: seed.name,
    urls: seed.urls,
    notes: [seed.name, seed.notes],
    organizerIds: request?.target?.organizerId,
  }, {seedLinks: true});
}

/** Whether a case id is the opaque TD-nnnn form the registry and the takedown workflow accept. */
export function isSuppressionCaseId(value) {
  return typeof value === "string" && SUPPRESSION_CASE_ID_PATTERN.test(value);
}
