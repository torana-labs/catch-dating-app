import type {WebsiteMetaCopy} from "./types";

export const staticMetaKeys = [
  "sales_demo",
  "home",
  "visitor_discovery",
  "host",
  "host_apply",

  "event_runtime",
  "event_assistance",
  "event_offer",
  "event_booking",
  "event_rehearsal",
  "event_invite",
  "household_rsvp",
  "public_form",
  "organizers",
  "claim",
  "privacy",
  "terms",
  "help",
  "account_deletion",
  "refunds",
  "contact",
  "not_found",
] as const;

const listingLabelKeys = [
  "profileEyebrow",
  "formatsHeading",
  "factsHeading",
  "sourcesHeading",
  "lastVerifiedPrefix",
  "notRecorded",
  "homeBreadcrumb",
  "organizersBreadcrumb",
] as const;
const eventLabelKeys = [
  "eventEyebrow",
  "hostedByPrefix",
  "scheduleHeading",
  "locationLabel",
  "priceLabel",
  "sourceLabel",
  "reviewsHeading",
  "lastReviewedPrefix",
  "homeBreadcrumb",
  "organizersBreadcrumb",
] as const;

export interface WebsiteMetaDocument extends WebsiteMetaCopy {
  readonly $schema: "./meta.schema.json";
}

export function validateWebsiteMeta(value: unknown) {
  const errors: string[] = [];
  if (!isRecord(value)) return ["root must be an object"];
  if (value.$schema !== "./meta.schema.json") {
    errors.push("$schema must be ./meta.schema.json");
  }
  if (!isRecord(value.routes)) {
    errors.push("routes must be an object");
  } else {
    assertExactKeys("routes", value.routes, staticMetaKeys, errors);
    for (const key of staticMetaKeys) {
      validateStaticMeta(key, value.routes[key], errors);
    }
  }
  if (!isRecord(value.listing)) {
    errors.push("listing must be an object");
  } else {
    assertExactKeys("listing", value.listing, ["titleTemplate", "staticLabels"], errors);
    requiredString("listing.titleTemplate", value.listing.titleTemplate, errors);
    for (const token of ["name", "city"]) {
      if (!String(value.listing.titleTemplate ?? "").includes(`{${token}}`)) {
        errors.push(`listing.titleTemplate must contain {${token}}`);
      }
    }
    if (!isRecord(value.listing.staticLabels)) {
      errors.push("listing.staticLabels must be an object");
    } else {
      assertExactKeys(
        "listing.staticLabels",
        value.listing.staticLabels,
        listingLabelKeys,
        errors
      );
      for (const key of listingLabelKeys) {
        requiredString(
          `listing.staticLabels.${key}`,
          value.listing.staticLabels[key],
          errors
        );
      }
    }
  }
  if (!isRecord(value.event)) {
    errors.push("event must be an object");
  } else {
    assertExactKeys(
      "event",
      value.event,
      [
        "titleTemplate",
        "catchTwitterTemplate",
        "externalTwitterTemplate",
        "staticLabels",
      ],
      errors
    );
    validateTemplateTokens(
      "event.titleTemplate",
      value.event.titleTemplate,
      ["title", "city"],
      errors
    );
    validateTemplateTokens(
      "event.catchTwitterTemplate",
      value.event.catchTwitterTemplate,
      ["title", "organizer"],
      errors
    );
    validateTemplateTokens(
      "event.externalTwitterTemplate",
      value.event.externalTwitterTemplate,
      ["title", "source"],
      errors
    );
    if (!isRecord(value.event.staticLabels)) {
      errors.push("event.staticLabels must be an object");
    } else {
      assertExactKeys(
        "event.staticLabels",
        value.event.staticLabels,
        eventLabelKeys,
        errors
      );
      for (const key of eventLabelKeys) {
        requiredString(
          `event.staticLabels.${key}`,
          value.event.staticLabels[key],
          errors
        );
      }
    }
  }
  return errors;
}

export function validatedWebsiteMeta(value: unknown): WebsiteMetaDocument {
  const errors = validateWebsiteMeta(value);
  if (errors.length > 0) {
    throw new Error(
      "Website metadata validation failed:\n" +
        errors.map((error) => `- ${error}`).join("\n")
    );
  }
  return value as WebsiteMetaDocument;
}

function validateStaticMeta(key: string, value: unknown, errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`routes.${key} must be an object`);
    return;
  }
  const allowedKeys = [
    "title",
    "description",
    "canonicalPath",
    "twitterDescription",
    "robots",
  ];
  assertAllowedKeys(`routes.${key}`, value, allowedKeys, errors);
  for (const field of ["title", "description", "canonicalPath", "twitterDescription"]) {
    requiredString(`routes.${key}.${field}`, value[field], errors);
  }
  if (typeof value.canonicalPath === "string" && !canonicalPath(value.canonicalPath)) {
    errors.push(`routes.${key}.canonicalPath must start and end with /`);
  }
  if (value.robots !== undefined && value.robots !== "noindex, follow") {
    errors.push(`routes.${key}.robots must be noindex, follow when present`);
  }
}

function assertExactKeys(
  label: string,
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
  errors: string[]
) {
  assertAllowedKeys(label, value, expectedKeys, errors);
  for (const key of expectedKeys) {
    if (!(key in value)) errors.push(`${label} is missing ${key}`);
  }
}

function assertAllowedKeys(
  label: string,
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  errors: string[]
) {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${label} has unsupported key ${key}`);
  }
}

function requiredString(label: string, value: unknown, errors: string[]) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${label} must be a non-empty string`);
  }
}

function validateTemplateTokens(
  label: string,
  value: unknown,
  tokens: readonly string[],
  errors: string[]
) {
  requiredString(label, value, errors);
  for (const token of tokens) {
    if (!String(value ?? "").includes(`{${token}}`)) {
      errors.push(`${label} must contain {${token}}`);
    }
  }
}

function canonicalPath(value: string) {
  return value === "/" || (value.startsWith("/") && value.endsWith("/"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
