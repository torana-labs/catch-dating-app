// The brand record and the helpers every web runtime and Node script uses to
// read it. Functions and Flutter read generated copies (see generate.mjs).
import record from "./brand.json" with {type: "json"};

function deepFreeze(value) {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

const {$schema: _schema, ...brandRecord} = record;

export const brand = deepFreeze(brandRecord);

/** An absolute URL on the public website. `path` starts with "/". */
export function webUrl(path = "/") {
  if (!path.startsWith("/")) throw new Error(`Brand web paths start with "/": ${path}`);
  return brand.web.origin + path;
}

export const instagramUrl = `https://www.instagram.com/${brand.social.instagramHandle}/`;

// Copy files write {{brand.name}}, {{brand.web.domain}} and so on; applyBrand
// resolves them. An unknown path or a non-string value is a build error.
const tokenPattern = /\{\{\s*brand\.([A-Za-z0-9_.]+)\s*\}\}/gu;

export function resolveBrandToken(path) {
  let value = brand;
  for (const key of path.split(".")) {
    value = value != null && typeof value === "object" && Object.hasOwn(value, key) ? value[key] : undefined;
  }
  if (typeof value !== "string") throw new Error(`Unknown brand token: {{brand.${path}}}`);
  return value;
}

export function applyBrandText(text) {
  return text.replace(tokenPattern, (_match, path) => resolveBrandToken(path));
}

/** Resolves brand tokens in every string of a JSON-like value. */
export function applyBrand(value) {
  if (typeof value === "string") return applyBrandText(value);
  if (Array.isArray(value)) return value.map(applyBrand);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, applyBrand(child)]));
  }
  return value;
}

/** Every origin must sit on the primary domain so one domain change moves them together. */
export function brandConsistencyErrors(candidate = brand) {
  const errors = [];
  const {domain} = candidate.web;
  for (const [key, origin] of Object.entries(candidate.web)) {
    if (key === "domain") continue;
    const host = new URL(origin).hostname;
    if (host !== domain && !host.endsWith(`.${domain}`)) errors.push(`web.${key} (${origin}) is not on ${domain}.`);
  }
  if (candidate.web.origin !== `https://${domain}`) errors.push(`web.origin must be https://${domain}.`);
  const sender = candidate.senders.emailDomain;
  if (sender !== domain && !sender.endsWith(`.${domain}`)) errors.push(`senders.emailDomain (${sender}) is not on ${domain}.`);
  return errors;
}
