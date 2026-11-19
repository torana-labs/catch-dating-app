import {listingRequestCopy as copy} from "@content/listingRequest";
import {interpolateContent as fill} from "@content/interpolate";
import type {ListingRequestDraftBody} from "../../shared/api/listingRequest";

/**
 * The listing request form's answers and rules. They mirror the intake's
 * (functions/src/takedownRequests/model.ts) so a person sees what is missing
 * before sending; the intake checks everything again.
 */

export const requestTypes = ["claim", "correctFact", "removeAndDoNotList", "trademark", "copyright", "privacy",
  "impersonation", "legalOrder"] as const;
export type RequestType = typeof requestTypes[number];

export type RequesterRole = keyof typeof copy.roles;
export type ProofMethod = "instagramCode" | "domainEmail" | "letterhead";
export type DeclarationKey = keyof typeof copy.declarations;

export const contextMax = 280;

const speaksForOrganisation: readonly RequesterRole[] = ["owner", "staff", "authorisedAgent"];

/** Who may file each type, as the intake checks it. */
export const rolesByType: Record<RequestType, readonly RequesterRole[]> = {
  claim: speaksForOrganisation,
  correctFact: [...speaksForOrganisation, "memberOfPublic"],
  removeAndDoNotList: speaksForOrganisation,
  trademark: ["rightsHolder", "authorisedAgent", "owner"],
  copyright: ["rightsHolder", "authorisedAgent", "owner"],
  privacy: ["affectedIndividual", "nominee"],
  impersonation: speaksForOrganisation,
  legalOrder: ["authority", "authorisedAgent"],
};

export const proofMethodsByType: Partial<Record<RequestType, readonly ProofMethod[]>> = {
  claim: ["instagramCode", "domainEmail"],
  removeAndDoNotList: ["instagramCode", "domainEmail", "letterhead"],
  impersonation: ["instagramCode", "domainEmail"],
};

/** The declarations each type asks for, in the order the form shows them. */
export function declarationsFor(type: RequestType | null): readonly DeclarationKey[] {
  const base: DeclarationKey[] = ["accurate", "authorised", "contactConsent"];
  if (type === "trademark" || type === "impersonation") return [...base, "goodFaith"];
  if (type === "copyright") return [...base, "goodFaith", "notLicensed"];
  return base;
}

export type ListingTarget =
  | {readonly kind: "organizer"; readonly id: string}
  | {readonly kind: "event"; readonly id: string}
  | {readonly kind: "url"; readonly url: string};

export interface ListingRequestDraft {
  type: RequestType | null;
  target: ListingTarget;
  name: string;
  role: RequesterRole | null;
  email: string;
  phone: string;
  organisation: string;
  proofMethod: ProofMethod | null;
  officialHandle: string;
  officialDomain: string;
  field: keyof typeof copy.fields.fact.options | null;
  correction: string;
  evidenceUrl: string;
  basis: "registered" | "unregistered" | null;
  registrationNumber: string;
  registrationClass: string;
  jurisdiction: string;
  firstUseYear: string;
  trademarkRemedy: keyof typeof copy.fields.trademarkRemedy.options | null;
  workKind: keyof typeof copy.fields.workKind.options | null;
  originalWorkUrl: string;
  ownershipBasis: keyof typeof copy.fields.ownershipBasis.options | null;
  relationship: "self" | "nominee" | null;
  dataKinds: Array<keyof typeof copy.fields.dataKinds.options>;
  identityMatch: keyof typeof copy.fields.identityMatch.options | null;
  privacyRemedy: keyof typeof copy.fields.privacyRemedy.options | null;
  issuingBody: keyof typeof copy.fields.issuingBody.options | null;
  orderReference: string;
  orderDate: string;
  orderUrl: string;
  context: string;
  declarations: Record<DeclarationKey, boolean>;
}

export function emptyDraft(target: ListingTarget = {kind: "url", url: ""}, type: RequestType | null = null): ListingRequestDraft {
  return {
    type, target, name: "", role: null, email: "", phone: "", organisation: "",
    proofMethod: null, officialHandle: "", officialDomain: "",
    field: null, correction: "", evidenceUrl: "",
    basis: null, registrationNumber: "", registrationClass: "", jurisdiction: "IN", firstUseYear: "", trademarkRemedy: null,
    workKind: null, originalWorkUrl: "", ownershipBasis: null,
    relationship: null, dataKinds: [], identityMatch: null, privacyRemedy: null,
    issuingBody: null, orderReference: "", orderDate: "", orderUrl: "",
    context: "",
    declarations: {accurate: false, authorised: false, contactConsent: false, goodFaith: false, notLicensed: false},
  };
}

const idPattern = /^[A-Za-z0-9_-]{1,128}$/u;

/**
 * The listing the form opened from: `?organizer=<id>` or `?event=<id>` from
 * a listing's "Report or remove this listing" link, or `?url=` for a page
 * link; `?type=` preselects a request type.
 */
export function prefillFromSearch(search: string): {target: ListingTarget; type: RequestType | null} {
  const params = new URLSearchParams(search);
  const typeParam = params.get("type");
  const type = (requestTypes as readonly string[]).includes(typeParam ?? "") ? typeParam as RequestType : null;
  const organizer = params.get("organizer");
  if (organizer && idPattern.test(organizer)) return {target: {kind: "organizer", id: organizer}, type};
  const event = params.get("event");
  if (event && /^[A-Za-z0-9_-]{1,160}$/u.test(event)) return {target: {kind: "event", id: event}, type};
  return {target: {kind: "url", url: params.get("url")?.slice(0, 512) ?? ""}, type};
}

/** The request form link for a listing; the content module owns it so every page's report link shares it. */
export {listingRequestHref} from "@content/listingRequest";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const urlPattern = /^https?:\/\/[^\s]+\.[^\s]+$/u;
const handlePattern = /^@?[A-Za-z0-9._]{1,30}$/u;
const domainPattern = /^(?:https?:\/\/)?(?:www\.)?((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63})\/?$/iu;

export function normalizedDomain(value: string): string {
  return domainPattern.exec(value.trim())?.[1]?.toLowerCase() ?? "";
}

export function normalizedPhone(value: string): string {
  return value.replace(/[\s().-]/gu, "");
}

export type DraftErrors = Partial<Record<string, string>>;

const isUrl = (value: string) => urlPattern.test(value.trim()) && value.trim().length <= 512;

/** What step 2 is missing, by field. Empty when it is complete. */
export function detailErrors(draft: ListingRequestDraft): DraftErrors {
  const errors: DraftErrors = {};
  const e = copy.errors;
  const require = (key: string, ok: boolean, message: string = e.required) => {
    if (!ok) errors[key] = message;
  };
  if (draft.target.kind === "url") require("target", isUrl(draft.target.url), e.target);
  require("name", draft.name.trim().length >= 2, e.name);
  require("role", draft.role !== null && draft.type !== null && rolesByType[draft.type].includes(draft.role), e.role);
  require("email", emailPattern.test(draft.email.trim()), e.email);
  if (draft.phone.trim()) require("phone", /^\+[1-9][0-9]{7,14}$/u.test(normalizedPhone(draft.phone)), e.phone);
  require("context", draft.context.trim().length <= contextMax, fill(e.context, {max: contextMax}));
  switch (draft.type) {
  case "claim":
  case "removeAndDoNotList":
  case "impersonation": {
    require("proofMethod", draft.proofMethod !== null, e.proof);
    if (draft.proofMethod === "instagramCode") require("officialHandle", handlePattern.test(draft.officialHandle.trim()), e.handle);
    if (draft.proofMethod === "domainEmail") {
      const domain = normalizedDomain(draft.officialDomain);
      require("officialDomain", domain !== "", e.domain);
      const emailDomain = draft.email.trim().toLowerCase().split("@")[1] ?? "";
      if (domain && !errors.email) require("email", emailDomain === domain || emailDomain.endsWith(`.${domain}`), e.domainEmail);
    }
    if (draft.proofMethod === "letterhead") {
      require("officialDomain", normalizedDomain(draft.officialDomain) !== "" || handlePattern.test(draft.officialHandle.trim()), e.domain);
    }
    break;
  }
  case "correctFact":
    require("field", draft.field !== null);
    require("correction", draft.correction.trim().length >= 1 && draft.correction.trim().length <= 200);
    require("evidenceUrl", isUrl(draft.evidenceUrl), e.url);
    break;
  case "trademark":
    require("basis", draft.basis !== null);
    require("trademarkRemedy", draft.trademarkRemedy !== null);
    if (draft.basis === "registered") {
      require("registrationNumber", /^[A-Za-z0-9/-]{3,20}$/u.test(draft.registrationNumber.trim()));
      const cls = Number(draft.registrationClass);
      require("registrationClass", Number.isInteger(cls) && cls >= 1 && cls <= 45, e.number);
      require("jurisdiction", /^[A-Z]{2}$/u.test(draft.jurisdiction.trim().toUpperCase()));
    }
    if (draft.basis === "unregistered") {
      const year = Number(draft.firstUseYear);
      require("firstUseYear", Number.isInteger(year) && year >= 1900 && year <= 2100, e.number);
      require("evidenceUrl", isUrl(draft.evidenceUrl), e.url);
    }
    break;
  case "copyright":
    require("workKind", draft.workKind !== null);
    require("originalWorkUrl", isUrl(draft.originalWorkUrl), e.url);
    require("ownershipBasis", draft.ownershipBasis !== null);
    break;
  case "privacy":
    require("relationship", draft.relationship !== null);
    require("dataKinds", draft.dataKinds.length > 0);
    require("identityMatch", draft.identityMatch !== null);
    require("privacyRemedy", draft.privacyRemedy !== null);
    break;
  case "legalOrder":
    require("issuingBody", draft.issuingBody !== null);
    require("orderReference", draft.orderReference.trim().length >= 2);
    require("orderDate", /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u.test(draft.orderDate));
    if (draft.orderUrl.trim()) require("orderUrl", isUrl(draft.orderUrl), e.url);
    break;
  case null:
    errors.type = e.type;
    break;
  }
  return errors;
}

export function declarationsComplete(draft: ListingRequestDraft): boolean {
  return declarationsFor(draft.type).every((key) => draft.declarations[key]);
}

function text(value: string): string | undefined {
  const trimmed = value.trim().replace(/\s+/gu, " ");
  return trimmed ? trimmed : undefined;
}

function compact<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null && entry !== "")) as T;
}

function verificationFor(draft: ListingRequestDraft): Record<string, unknown> {
  switch (draft.type) {
  case "claim":
  case "removeAndDoNotList":
  case "impersonation":
    return compact({proofMethod: draft.proofMethod, officialHandle: text(draft.officialHandle)?.replace(/^@/u, ""),
      officialDomain: normalizedDomain(draft.officialDomain) || undefined});
  case "correctFact":
    return {field: draft.field, correction: text(draft.correction), evidenceUrl: draft.evidenceUrl.trim()};
  case "trademark":
    return draft.basis === "registered" ?
      {basis: "registered", registrationNumber: draft.registrationNumber.trim(), registrationClass: Number(draft.registrationClass),
        jurisdiction: draft.jurisdiction.trim().toUpperCase(), preferredRemedy: draft.trademarkRemedy} :
      {basis: "unregistered", firstUseYear: Number(draft.firstUseYear), evidenceUrl: draft.evidenceUrl.trim(),
        preferredRemedy: draft.trademarkRemedy};
  case "copyright":
    return {workKind: draft.workKind, originalWorkUrl: draft.originalWorkUrl.trim(), ownershipBasis: draft.ownershipBasis};
  case "privacy":
    return {relationship: draft.relationship, dataKinds: draft.dataKinds, identityMatch: draft.identityMatch,
      preferredRemedy: draft.privacyRemedy};
  case "legalOrder":
    return compact({issuingBody: draft.issuingBody, orderReference: text(draft.orderReference), orderDate: draft.orderDate,
      orderUrl: draft.orderUrl.trim() || undefined});
  default:
    return {};
  }
}

/**
 * The request body (without its client request id) for a complete draft.
 * Only the type's own fields and declarations are sent.
 */
export function requestBody(draft: ListingRequestDraft, sourcePage: string): ListingRequestDraftBody {
  if (!draft.type || !draft.role) throw new Error("The request is not complete.");
  const target = draft.target.kind === "organizer" ? {kind: "organizer", organizerId: draft.target.id} :
    draft.target.kind === "event" ? {kind: "event", eventId: draft.target.id} : {kind: "url", url: draft.target.url.trim()};
  const declarations = Object.fromEntries(declarationsFor(draft.type).map((key) => [key, true]));
  const phone = draft.phone.trim() ? normalizedPhone(draft.phone) : undefined;
  return {
    requestType: draft.type,
    target,
    requester: compact({name: text(draft.name), role: draft.role, email: draft.email.trim().toLowerCase(), phone,
      organisation: text(draft.organisation)}),
    verification: verificationFor(draft),
    declarations,
    ...(text(draft.context) ? {context: text(draft.context)} : {}),
    consent: {purpose: "listingRequest", version: copy.consentVersion},
    sourcePage: sourcePage.split(/[?#]/u)[0] || "/listings/request/",
    website: "",
  } as unknown as ListingRequestDraftBody;
}

export function toggle<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}
