import {brand} from "./brand.ts";

/** Only this public field may leave the server-side configuration reader. */
export type PublicContact = Readonly<{supportEmail: string}>;
export const fallbackPublicContact: PublicContact = Object.freeze({
  supportEmail: brand.support.email,
});

export type PublicContactDocument = Readonly<{
  schemaVersion: 1;
  revision: number;
  supportEmail: string;
}>;

// Deliberately narrower than all RFC mailboxes: these bytes are safe in mailto hrefs.
const emailPattern = /^[a-z0-9][a-z0-9._+-]*@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/u;

export function validPublicContactEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && !value.includes("..") && emailPattern.test(value);
}

export function parsePublicContactDocument(value: unknown): PublicContactDocument | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join(",") !== "revision,schemaVersion,supportEmail" ||
    record.schemaVersion !== 1 || !Number.isSafeInteger(record.revision) ||
    (record.revision as number) < 1 || !validPublicContactEmail(record.supportEmail)) return null;
  return {schemaVersion: 1, revision: record.revision as number, supportEmail: record.supportEmail};
}

export function publicContactFromDocument(value: unknown): PublicContact | null {
  const parsed = parsePublicContactDocument(value);
  return parsed ? {supportEmail: parsed.supportEmail} : null;
}

/** Source-controlled policy prose is unchanged; only its canonical contact address varies. */
export function renderContactText(text: string, contact: PublicContact): string {
  return text.replaceAll(fallbackPublicContact.supportEmail, contact.supportEmail);
}
