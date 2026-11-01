import type {CommercialTerms} from "../../../generated/contracts/commercialTerms";
import type {CommercialTermsOverride} from
  "../../../generated/contracts/commercialTermsOverride";

/**
 * Commercial terms as an operator edits them: percentages and rupees in,
 * basis points and paise out. Platform terms set every field; an organizer
 * override sets only the fields it lists, and the rest inherit.
 */
export type TermsPurpose = keyof CommercialTerms["purposes"];
export const termsPurposes: readonly TermsPurpose[] =
  ["eventAdmission", "formFee", "hostMembership"];
export const termsPurposeLabels = {
  eventAdmission: "Event tickets",
  formFee: "Form fees",
  hostMembership: "Host memberships",
} as const satisfies Record<TermsPurpose, string>;

export type TermsFieldId =
  | "rate" | "cap" | "cycleDays" | "base" | "taxTreatment" | "trialDays"
  | "toolsOnlyFee" | "gatewayFeeBearer"
  | `${TermsPurpose}.counts` | `${TermsPurpose}.atSource`;

export type TermsFieldKind = "percent" | "rupees" | "rupeesOrNoCap" | "days" |
  "choice";

export interface TermsFieldOption {value: string; label: string}

export interface TermsField {
  id: TermsFieldId;
  label: string;
  group: "Commission" | "Trial and tools-only fee" | "Gateway fees" |
    "Event tickets" | "Form fees" | "Host memberships";
  kind: TermsFieldKind;
  helperText?: string;
  options?: readonly TermsFieldOption[];
}

/** A draft holds the operator's text per field; an absent key inherits. */
export type TermsDraft = Partial<Record<TermsFieldId, string>>;

const baseOptions = [
  {value: "netOfRefunds", label: "Net of refunds"},
  {value: "gross", label: "Gross sales"},
] as const;
const taxOptions = [
  {value: "exclusive", label: "Before GST"},
  {value: "inclusive", label: "Including GST"},
] as const;
const bearerOptions = [
  {value: "host", label: "The host"},
  {value: "platform", label: "Catch"},
] as const;
const countsOptions = [
  {value: "yes", label: "Counts toward commission"},
  {value: "no", label: "Does not count"},
] as const;

export const termsFields: readonly TermsField[] = [
  {id: "rate", label: "Commission rate", group: "Commission", kind: "percent",
    helperText: "Percent of sales, like 5 or 4.5."},
  {id: "cap", label: "Cap per cycle", group: "Commission",
    kind: "rupeesOrNoCap",
    helperText: "In rupees per host per cycle. Leave empty for no cap."},
  {id: "cycleDays", label: "Cycle length", group: "Commission", kind: "days",
    helperText: "Rolling days, starting when the trial ends."},
  {id: "base", label: "Commission base", group: "Commission", kind: "choice",
    options: baseOptions},
  {id: "taxTreatment", label: "GST", group: "Commission", kind: "choice",
    options: taxOptions,
    helperText: "Before GST adds GST on top when Catch charges it."},
  {id: "trialDays", label: "Trial", group: "Trial and tools-only fee",
    kind: "days", helperText: "Days from the host's first event."},
  {id: "toolsOnlyFee", label: "Tools-only fee", group:
    "Trial and tools-only fee", kind: "rupees",
  helperText: "In rupees per cycle, on the same GST basis."},
  {id: "gatewayFeeBearer", label: "Gateway fees paid by", group:
    "Gateway fees", kind: "choice", options: bearerOptions},
  ...termsPurposes.flatMap((purpose): TermsField[] => [
    {id: `${purpose}.counts`, label: "Commission", group:
      termsPurposeLabels[purpose], kind: "choice", options: countsOptions},
    {id: `${purpose}.atSource`, label: "Fee deducted at source", group:
      termsPurposeLabels[purpose], kind: "percent",
    helperText: "Only when Catch splits the payment. Use 0 for none."},
  ]),
];

export const termsFieldById = new Map(termsFields.map((field) =>
  [field.id, field]));

type TermsValue = number | string | boolean | null;

function valueOf(terms: CommercialTerms, id: TermsFieldId): TermsValue {
  switch (id) {
  case "rate": return terms.commission.rateBasisPoints;
  case "cap": return terms.commission.capMinor;
  case "cycleDays": return terms.commission.cycleDays;
  case "base": return terms.commission.base;
  case "taxTreatment": return terms.commission.taxTreatment;
  case "trialDays": return terms.trial.days;
  case "toolsOnlyFee": return terms.toolsOnly.feeMinor;
  case "gatewayFeeBearer": return terms.gatewayFeeBearer;
  default: {
    const [purpose, part] = id.split(".") as [TermsPurpose, string];
    return part === "counts" ?
      terms.purposes[purpose].countsTowardCommission :
      terms.purposes[purpose].atSourceFeeBasisPoints;
  }
  }
}

/** The value an override sets for one field, or undefined to inherit. */
function overrideValueOf(terms: CommercialTermsOverride,
  id: TermsFieldId): TermsValue | undefined {
  switch (id) {
  case "rate": return terms.commission?.rateBasisPoints;
  case "cap": return terms.commission && "capMinor" in terms.commission ?
    terms.commission.capMinor ?? null : undefined;
  case "cycleDays": return terms.commission?.cycleDays;
  case "base": return terms.commission?.base;
  case "taxTreatment": return terms.commission?.taxTreatment;
  case "trialDays": return terms.trial?.days;
  case "toolsOnlyFee": return terms.toolsOnly?.feeMinor;
  case "gatewayFeeBearer": return terms.gatewayFeeBearer;
  default: {
    const [purpose, part] = id.split(".") as [TermsPurpose, string];
    const entry = terms.purposes?.[purpose];
    return part === "counts" ? entry?.countsTowardCommission :
      entry?.atSourceFeeBasisPoints;
  }
  }
}

const rupees = new Intl.NumberFormat("en-IN", {style: "currency",
  currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0});

export function formatTermsValue(id: TermsFieldId, value: TermsValue):
  string {
  const field = termsFieldById.get(id)!;
  switch (field.kind) {
  case "percent": return `${trimNumber(Number(value) / 100)}%`;
  case "rupees": return rupees.format(Number(value) / 100);
  case "rupeesOrNoCap": return value === null ? "No cap" :
    rupees.format(Number(value) / 100);
  case "days": return `${value} day${value === 1 ? "" : "s"}`;
  case "choice": {
    const key = typeof value === "boolean" ? (value ? "yes" : "no") :
      String(value);
    return field.options?.find((option) => option.value === key)?.label ??
      key;
  }
  }
}

function trimNumber(value: number): string {
  return Number.isInteger(value) ? String(value) :
    value.toFixed(2).replace(/0+$/u, "").replace(/\.$/u, "");
}

/** Draft text for a stored value, the inverse of the parser below. */
function draftTextOf(id: TermsFieldId, value: TermsValue): string {
  const field = termsFieldById.get(id)!;
  switch (field.kind) {
  case "percent": return trimNumber(Number(value) / 100);
  case "rupees": return trimNumber(Number(value) / 100);
  case "rupeesOrNoCap": return value === null ? "" :
    trimNumber(Number(value) / 100);
  case "days": return String(value);
  case "choice": return typeof value === "boolean" ?
    (value ? "yes" : "no") : String(value);
  }
}

export function draftFromTerms(terms: CommercialTerms): TermsDraft {
  return Object.fromEntries(termsFields.map((field) =>
    [field.id, draftTextOf(field.id, valueOf(terms, field.id))]));
}

export function draftFromOverride(terms: CommercialTermsOverride | null):
  TermsDraft {
  const draft: TermsDraft = {};
  for (const field of termsFields) {
    const value = terms ? overrideValueOf(terms, field.id) : undefined;
    if (value !== undefined) draft[field.id] = draftTextOf(field.id, value);
  }
  return draft;
}

const decimal = /^\d+(?:\.\d{1,2})?$/u;

/** Parses one field's text; returns an operator-facing error on failure. */
export function parseTermsField(id: TermsFieldId, text: string):
  {value: TermsValue} | {error: string} {
  const field = termsFieldById.get(id)!;
  const input = text.trim().replace(/[₹,\s]/gu, "");
  switch (field.kind) {
  case "percent": {
    const max = id === "rate" ? 100 : 99.99;
    if (!decimal.test(input) || Number(input) > max) {
      return {error: `${label(field)} must be a percentage from 0 to ${max}.`};
    }
    return {value: Math.round(Number(input) * 100)};
  }
  case "rupeesOrNoCap":
  case "rupees":
    if (field.kind === "rupeesOrNoCap" && input === "") return {value: null};
    if (!decimal.test(input) || Number(input) > 1_000_000_000) {
      return {error: `${label(field)} must be an amount in rupees.`};
    }
    return {value: Math.round(Number(input) * 100)};
  case "days": {
    const min = id === "cycleDays" ? 1 : 0;
    if (!/^\d+$/u.test(input) || Number(input) < min || Number(input) > 366) {
      return {error: `${label(field)} must be ${min} to 366 days.`};
    }
    return {value: Number(input)};
  }
  case "choice": {
    if (!field.options?.some((option) => option.value === input)) {
      return {error: `Choose a value for ${label(field)}.`};
    }
    return {value: field.options === countsOptions ? input === "yes" : input};
  }
  }
}

function label(field: TermsField): string {
  return field.group === field.label || !field.id.includes(".") ?
    field.label : `${field.group}: ${field.label.toLowerCase()}`;
}

type ParseResult<T> = {terms: T; errors: []} | {terms: null; errors: string[]};

function parseDraft(draft: TermsDraft, ids: TermsFieldId[]):
  {values: Map<TermsFieldId, TermsValue>; errors: string[]} {
  const values = new Map<TermsFieldId, TermsValue>();
  const errors: string[] = [];
  for (const id of ids) {
    const result = parseTermsField(id, draft[id] ?? "");
    if ("error" in result) errors.push(result.error);
    else values.set(id, result.value);
  }
  return {values, errors};
}

export function termsFromDraft(draft: TermsDraft):
  ParseResult<CommercialTerms> {
  const {values, errors} = parseDraft(draft, termsFields.map((f) => f.id));
  if (errors.length > 0) return {terms: null, errors};
  const v = (id: TermsFieldId) => values.get(id);
  const purpose = (key: TermsPurpose) => ({
    countsTowardCommission: v(`${key}.counts`) as boolean,
    atSourceFeeBasisPoints: v(`${key}.atSource`) as number,
  });
  return {errors: [], terms: {
    currency: "INR",
    commission: {rateBasisPoints: v("rate") as number,
      capMinor: v("cap") as number | null, cycleDays: v("cycleDays") as number,
      cycleAnchor: "trialEnd",
      base: v("base") as CommercialTerms["commission"]["base"],
      taxTreatment: v("taxTreatment") as
        CommercialTerms["commission"]["taxTreatment"]},
    trial: {days: v("trialDays") as number, anchor: "firstEvent"},
    toolsOnly: {feeMinor: v("toolsOnlyFee") as number},
    gatewayFeeBearer: v("gatewayFeeBearer") as
      CommercialTerms["gatewayFeeBearer"],
    purposes: {eventAdmission: purpose("eventAdmission"),
      formFee: purpose("formFee"), hostMembership: purpose("hostMembership")},
  }};
}

export function overrideFromDraft(draft: TermsDraft):
  ParseResult<CommercialTermsOverride> {
  const ids = termsFields.map((f) => f.id).filter((id) => id in draft);
  const {values, errors} = parseDraft(draft, ids);
  if (errors.length > 0) return {terms: null, errors};
  const override: CommercialTermsOverride = {};
  const commission: NonNullable<CommercialTermsOverride["commission"]> = {};
  const set = <K extends keyof typeof commission>(key: K, id: TermsFieldId) => {
    if (values.has(id)) commission[key] = values.get(id) as never;
  };
  set("rateBasisPoints", "rate");
  set("capMinor", "cap");
  set("cycleDays", "cycleDays");
  set("base", "base");
  set("taxTreatment", "taxTreatment");
  if (Object.keys(commission).length > 0) override.commission = commission;
  if (values.has("trialDays")) {
    override.trial = {days: values.get("trialDays") as number};
  }
  if (values.has("toolsOnlyFee")) {
    override.toolsOnly = {feeMinor: values.get("toolsOnlyFee") as number};
  }
  if (values.has("gatewayFeeBearer")) {
    override.gatewayFeeBearer = values.get("gatewayFeeBearer") as
      CommercialTerms["gatewayFeeBearer"];
  }
  const purposes: NonNullable<CommercialTermsOverride["purposes"]> = {};
  for (const purpose of termsPurposes) {
    const entry: NonNullable<typeof purposes[TermsPurpose]> = {};
    if (values.has(`${purpose}.counts`)) {
      entry.countsTowardCommission = values.get(`${purpose}.counts`) as boolean;
    }
    if (values.has(`${purpose}.atSource`)) {
      entry.atSourceFeeBasisPoints = values.get(`${purpose}.atSource`) as number;
    }
    if (Object.keys(entry).length > 0) purposes[purpose] = entry;
  }
  if (Object.keys(purposes).length > 0) override.purposes = purposes;
  return {errors: [], terms: override};
}

export interface TermsDiffRow {
  id: TermsFieldId;
  field: string;
  before: string;
  after: string;
  changed: boolean;
}

function fieldTitle(field: TermsField): string {
  return field.id.includes(".") ? `${field.group}: ${field.label}` :
    field.label;
}

/** Every platform field, before and after; unsaved terms read "Not set". */
export function platformTermsDiff(before: CommercialTerms | null,
  after: CommercialTerms): TermsDiffRow[] {
  return termsFields.map((field) => {
    const next = formatTermsValue(field.id, valueOf(after, field.id));
    const previous = before ?
      formatTermsValue(field.id, valueOf(before, field.id)) : "Not set";
    return {id: field.id, field: fieldTitle(field), before: previous,
      after: next, changed: previous !== next};
  });
}

/**
 * One organizer's fields before and after an override change. An unset
 * field reads as inherited, with the platform value it inherits.
 */
export function overrideTermsDiff(platform: CommercialTerms | null,
  before: CommercialTermsOverride | null, after: CommercialTermsOverride):
  TermsDiffRow[] {
  const show = (terms: CommercialTermsOverride | null, id: TermsFieldId) => {
    const value = terms ? overrideValueOf(terms, id) : undefined;
    if (value !== undefined) return formatTermsValue(id, value);
    return platform ?
      `Inherited (${formatTermsValue(id, valueOf(platform, id))})` :
      "Inherited";
  };
  return termsFields.map((field) => {
    const previous = show(before, field.id);
    const next = show(after, field.id);
    return {id: field.id, field: fieldTitle(field), before: previous,
      after: next, changed: previous !== next};
  });
}

/** Display rows for stored terms; an override shows inherited fields too. */
export function termsSummaryRows(platform: CommercialTerms | null,
  override: CommercialTermsOverride | null, scope: "platform" | "organizer"):
  Array<{id: TermsFieldId; field: string; value: string; inherited: boolean}> {
  return termsFields.map((field) => {
    const own = scope === "organizer" && override ?
      overrideValueOf(override, field.id) : undefined;
    if (scope === "organizer" && own === undefined) {
      return {id: field.id, field: fieldTitle(field), inherited: true,
        value: platform ? `Inherited (${formatTermsValue(field.id,
          valueOf(platform, field.id))})` : "Inherited"};
    }
    const value = scope === "organizer" ? own! :
      platform ? valueOf(platform, field.id) : undefined;
    return {id: field.id, field: fieldTitle(field), inherited: false,
      value: value === undefined ? "Not set" :
        formatTermsValue(field.id, value)};
  });
}

/** Field names that differ between two stored revisions of one scope. */
export function revisionChanges(scope: "platform" | "organizer",
  previous: CommercialTerms | CommercialTermsOverride | null,
  next: CommercialTerms | CommercialTermsOverride): string[] {
  return termsFields.filter((field) => {
    const read = (terms: CommercialTerms | CommercialTermsOverride | null) => {
      if (!terms) return undefined;
      return scope === "platform" ?
        valueOf(terms as CommercialTerms, field.id) :
        overrideValueOf(terms as CommercialTermsOverride, field.id);
    };
    return read(previous) !== read(next);
  }).map(fieldTitle);
}
