import {applyBrandText, brand} from "../brand.ts";

/**
 * The content contract for playbook pages: the pages the website redesign
 * composes from the kit's sections (design/source_packs/website-playbook).
 * One spec drives three things, so they cannot drift apart:
 *
 * - the TypeScript types (`PlaybookPageDocument` and the section types),
 * - the browser-safe runtime validator (`validatePlaybookPage`), and
 * - the editor JSON Schema (`playbookPageJsonSchema`), which
 *   playbookPage.schema.json must equal (playbookContract.test.ts).
 *
 * A page is copy and structure only. Colours are `Ground` names, never hex.
 * Links name a route id, an anchor on the page or a WhatsApp message, never a
 * URL. Media names a capture slot (a real app screen from the capture
 * pipeline; app screens are never drawn), a photo asset or a QR code. Cards that list live things (plans, organisers, cities, stories)
 * name their read model as a `source` and carry no items.
 *
 * Text rules on every copy string: no `[placeholder]` brackets, no hex
 * colours, and no literal brand name (write `{{brand.name}}`, resolved by
 * applyBrand when the page loads). Rules that need the site's registries
 * (route ids, capture slots) run when `validatePlaybookPage` is given a
 * context; the static schema cannot know those lists, nor the brand name.
 */

/**
 * Website v2 grounds, as @catch/web-ui's `Ground` (PlaybookSections.tsx pins
 * the parity): white, paper, ink, the six accents, then the page colours the
 * product pages added (17 Nov 2026), sky and the soft tints.
 */
export const playbookGrounds = [
  "white", "paper", "ink", "coral", "pink", "yellow", "mint", "indigo", "magenta",
  "sky", "coralSoft", "pinkSoft", "yellowSoft", "mintSoft", "indigoSoft", "magentaSoft", "skySoft",
] as const;
export type PlaybookGround = (typeof playbookGrounds)[number];
/** The soft tints colour a secondary tile, never a band or a card (the kit's `.tile.s-*`). */
export const playbookTileOnlyGrounds: ReadonlySet<PlaybookGround> = new Set(["coralSoft", "pinkSoft", "yellowSoft", "mintSoft", "indigoSoft", "magentaSoft", "skySoft"]);
/** A story's initials sit on one of the grounds the apps share (the avatar's monogram grounds). */
const avatarGrounds = ["white", "paper", "ink", "coral", "pink", "yellow", "mint", "indigo", "magenta"] as const satisfies readonly PlaybookGround[];

/**
 * Show-when-live: where a section's or an action's feature stands in the
 * product brief. Only `built` (the default) is shown. A `partly` or `new`
 * feature, or a `tryIt` tool whose command has not shipped, stays in the
 * page's content, hidden, until a PR flips it to `built`.
 */
export const playbookFeatureStatuses = ["built", "partly", "new", "tryIt"] as const;
export type PlaybookFeatureStatus = (typeof playbookFeatureStatuses)[number];

/** The chrome a page asks for: PublicSiteHeader and PublicSiteFooter variants. */
export const playbookHeaderVariants = ["guest", "host", "minimal"] as const;
export const playbookFooterVariants = ["guest", "host", "minimal"] as const;


/**
 * The site components a `custom` section may name: the no-show calculator,
 * the guest app's launch notice (/app/), the try-it tools and the numbers-only
 * report on Reports and payouts. The /pricing/ bands whose
 * figures the shared fee model works out, or whose canvas layout no kit
 * section draws, are custom: the fee band with its calculator, the worked
 * examples, the cap, what the plan includes and the organisations band.
 */
export const playbookCustomComponents = [
  "noShowCalculator", "eventPageFromLink", "walkthroughSlots", "appLaunchNotice", "lastEventReport",
  "pricingCalculator", "pricingExamples", "pricingCap", "pricingIncluded", "pricingOrganisations", "hostCompare",
] as const;

// ---------------------------------------------------------------------------
// The spec language: a small, closed subset of JSON Schema.

type CopySpec = {readonly t: "copy"};
type StringSpec = {readonly t: "string"; readonly pattern: string};
type EnumSpec<V extends string = string> = {readonly t: "enum"; readonly values: readonly V[]};
type ConstSpec<V extends string = string> = {readonly t: "const"; readonly value: V};
type BoolSpec = {readonly t: "bool"};
type IntSpec = {readonly t: "int"; readonly values?: readonly number[]; readonly min?: number; readonly max?: number};
interface AnyArraySpec {readonly t: "array"; readonly of: Spec; readonly min?: number; readonly max?: number}
interface Fields {readonly [key: string]: Spec}
interface AnyObjectSpec {readonly t: "object"; readonly required: Fields; readonly optional: Fields; readonly name?: string}
interface AnyUnionSpec {readonly t: "union"; readonly by: "type"; readonly variants: {readonly [key: string]: AnyObjectSpec}}
interface AnyOneOfSpec {readonly t: "oneOf"; readonly options: readonly AnyObjectSpec[]; readonly name?: string}
type Spec = CopySpec | StringSpec | EnumSpec | ConstSpec | BoolSpec | IntSpec | AnyArraySpec | AnyObjectSpec | AnyUnionSpec | AnyOneOfSpec;

interface ArraySpec<O extends Spec> {readonly t: "array"; readonly of: O; readonly min?: number; readonly max?: number}
interface ObjectSpec<R extends Fields = Fields, P extends Fields = Record<never, never>> {readonly t: "object"; readonly required: R; readonly optional: P; readonly name?: string}
type UnionSpec = AnyUnionSpec;
interface OneOfSpec<O extends readonly AnyObjectSpec[] = readonly AnyObjectSpec[]> {readonly t: "oneOf"; readonly options: O; readonly name?: string}

type Infer<S> =
  S extends CopySpec | StringSpec ? string :
  S extends EnumSpec<infer V> ? V :
  S extends ConstSpec<infer V> ? V :
  S extends BoolSpec ? boolean :
  S extends IntSpec ? number :
  S extends {readonly t: "array"; readonly of: infer O} ? readonly Infer<O>[] :
  S extends {readonly t: "object"; readonly required: infer R; readonly optional: infer P} ?
    Flatten<{readonly [K in keyof R]: Infer<R[K]>} & {readonly [K in keyof P]?: Infer<P[K]>}> :
  S extends {readonly t: "union"; readonly variants: infer V} ? {[K in keyof V]: Infer<V[K]>}[keyof V] :
  S extends {readonly t: "oneOf"; readonly options: readonly (infer O)[]} ? Infer<O> :
  never;
type Flatten<T> = {[K in keyof T]: T[K]};

const copy = (): CopySpec => ({t: "copy"});
const str = (pattern: string): StringSpec => ({t: "string", pattern});
const oneOfValues = <const V extends string>(values: readonly V[]): EnumSpec<V> => ({t: "enum", values});
const constant = <const V extends string>(value: V): ConstSpec<V> => ({t: "const", value});
const bool = (): BoolSpec => ({t: "bool"});
const int = (values: readonly number[]): IntSpec => ({t: "int", values});
const range = (min: number, max: number): IntSpec => ({t: "int", min, max});
const list = <const O extends Spec>(of: O, min = 1, max?: number): ArraySpec<O> => ({t: "array", of, min, ...(max === undefined ? {} : {max})});
function obj<const R extends Fields, const P extends Fields = Record<never, never>>(required: R, optional?: P, name?: string): ObjectSpec<R, P> {
  return {t: "object", required, optional: (optional ?? {}) as P, ...(name ? {name} : {})};
}

// ---------------------------------------------------------------------------
// Machine strings.

const sectionIdPattern = "^[a-z][a-z0-9-]*$";
const routeIdPattern = "^[a-z][a-z0-9_]*$";
const slotPattern = "^[a-z0-9][a-z0-9-]*$";
const footnoteIdPattern = "^[a-z][a-z0-9-]*$";
const leadFormIdPattern = "^[a-z][a-z0-9_]*$";
const formatPattern = "^[a-z][a-z0-9-]*$";
const pageIdPattern = "^[a-z][a-z0-9_]*(?:/[a-z0-9][a-z0-9-]*)*$";
const assetPattern = "^/assets/[A-Za-z0-9/_.-]+\\.(?:jpg|jpeg|png|webp|avif|svg)$";

const ground = oneOfValues(playbookGrounds);

/**
 * Where an action goes: a route of this site (optionally an anchor on it),
 * one page of a family by its content key (`{"page": "story_detail/carter-road"}`),
 * an anchor on this page, or a WhatsApp chat with the support number.
 */
const destinationSpec: OneOfSpec = {
  t: "oneOf",
  name: "destination",
  options: [
    obj({route: str(routeIdPattern)}, {anchor: str(sectionIdPattern)}),
    obj({page: str(pageIdPattern)}, {anchor: str(sectionIdPattern)}),
    obj({anchor: str(sectionIdPattern)}),
    obj({kind: constant("whatsapp"), message: copy()}),
  ],
};
const destination = destinationSpec as OneOfSpec<readonly [
  ObjectSpec<{route: StringSpec}, {anchor: StringSpec}>,
  ObjectSpec<{page: StringSpec}, {anchor: StringSpec}>,
  ObjectSpec<{anchor: StringSpec}>,
  ObjectSpec<{kind: ConstSpec<"whatsapp">; message: CopySpec}>,
]>;

const featureStatus = oneOfValues(playbookFeatureStatuses);
const action = obj({label: copy(), to: destination}, {emphasis: oneOfValues(["primary", "secondary"] as const), status: featureStatus}, "action");
const actions = (max = 3) => list(action, 1, max);
/**
 * A tile's or a group's link: the whole tile, or the group's title, opens
 * it. `label` is for words the title doesn't already say, such as "Build my
 * page"; leave it out when it would only repeat the title, and the title ends
 * in an arrow alone. The validator refuses a label that repeats its title.
 */
const tileLink = obj({to: destination}, {label: copy(), status: featureStatus}, "tileLink");

const photo = obj({kind: constant("photo"), asset: str(assetPattern), alt: copy()}, {note: copy()}, "photo");
/** A QR code of a destination of this site, such as the start page, for a reader on a laptop to open on their phone. */
const qr = obj({kind: constant("qr"), to: destination, label: copy()});
/** A capture slot id in the app-screenshot manifest. */
const captureSlot = str(slotPattern);
const mediaSpec: OneOfSpec = {
  t: "oneOf",
  name: "media",
  options: [
    obj({kind: constant("capture"), slot: captureSlot}, {alt: copy()}),
    photo,
    qr,
  ],
};
const media = mediaSpec as OneOfSpec<readonly [
  ObjectSpec<{kind: ConstSpec<"capture">; slot: StringSpec}, {alt: CopySpec}>,
  typeof photo,
  typeof qr,
]>;

/**
 * The input a closing form asks for: a phone number (the default), a link
 * or a line of text for a tool that reads one, or a file for a tool that
 * uploads one. A form renders only when its slot can send what it asks for,
 * so a link or file form waits for its command.
 */
export const playbookLeadInputs = ["tel", "url", "text", "file"] as const;

/** What a lead form asks for: its request kind and extra fields, as the website enquiry intake takes them. */
export const playbookLeadRequestKinds = ["guide", "walkthrough", "demo", "venue", "story", "referral", "org_contact", "city_alerts", "tool"] as const;
export const playbookLeadFieldNames = [
  "name", "preferredTime", "whatYouHost", "area", "capacity", "nights", "orgType", "orgName", "hostName", "hostLink", "relationship",
] as const;

/**
 * A phone-number capture: the request it files, an optional format tag, any
 * extra fields, and its words. It renders only once its slot is filled
 * (features/playbook/playbookLeadForms.ts), so no form submits to nowhere.
 * A `tool` form asks for a link or a line of text (`input`) for a try-it
 * command; no slot takes one until its command ships.
 */
const leadForm = obj({
  id: str(leadFormIdPattern),
  requestKind: oneOfValues(playbookLeadRequestKinds),
  label: copy(),
  submitLabel: copy(),
}, {
  format: str(formatPattern),
  /** The kit's form input type: tel (the default), url, text or file. */
  input: oneOfValues(playbookLeadInputs),
  fields: list(obj({name: oneOfValues(playbookLeadFieldNames), label: copy()}, {placeholder: copy()}), 1, 6),
  /** A line under the field, such as "We’ll message you on WhatsApp." */
  note: copy(),
}, "leadForm");

const proofLine = obj({text: copy()}, {footnote: str(footnoteIdPattern)});

const base = <const T extends string>(type: T) => ({type: constant(type), id: str(sectionIdPattern), ground});
/** Every section may say where its feature stands (show-when-live), and why it is held back. */
const sectionStatus = {status: featureStatus, statusNote: copy()};
/** A band's own heading: the headline, with an optional kicker and lead. `pageTitle: true` makes the headline the page's h1. */
const band = {title: copy()};
const bandOptional = {kicker: copy(), lead: copy()};

const sectionSpec = {
  t: "union",
  by: "type",
  variants: {
    hero: obj({...base("hero"), title: copy(), lead: copy(), actions: actions()}, {
      ...sectionStatus,
      kicker: copy(),
      proof: list(proofLine, 1, 3),
      aside: action,
      /**
       * Up to three cut-outs floating over the media: fragment captures, each
       * a crop of one real widget from the hero's own capture (its
       * `fragmentOf`), so names and numbers agree with the screen. There is
       * no drawn card: a hero's floating parts are always captures.
       */
      fragments: list(captureSlot, 1, 3),
      tags: list(copy(), 1, 4),
      /** A short line under the actions. */
      note: copy(),
      media,
    }),
    tiles: obj({...base("tiles"), ...band, items: list(obj({title: copy()}, {
      body: copy(),
      figure: copy(),
      figureNote: copy(),
      list: list(copy(), 1, 6),
      fix: copy(),
      then: copy(),
      /** A small label above the title. */
      kicker: copy(),
      ground,
      link: tileLink,
    }), 1, 12)}, {...sectionStatus, ...bandOptional, pageTitle: bool(), columns: int([2, 3, 4, 6]), align: oneOfValues(["start", "center"] as const), actions: actions(), foot: copy()}),
    split: obj({...base("split"), ...band}, {
      ...sectionStatus,
      ...bandOptional,
      /** The second column: media, or a lead form in its place (never both). */
      media,
      leadForm,
      pageTitle: bool(),
      body: copy(),
      ticks: list(copy(), 1, 8),
      mediaFirst: bool(),
      actions: actions(),
      groups: list(obj({title: copy(), list: list(copy(), 1, 8)}, {label: copy(), links: list(tileLink, 1, 3)}), 1, 4),
      steps: list(obj({label: copy(), title: copy(), body: copy()}), 1, 6),
      callout: obj({figure: copy(), text: copy()}),
    }),
    timeline: obj({...base("timeline"), ...band, steps: list(obj({time: copy(), title: copy(), body: copy()}), 2, 8)}, {...sectionStatus, ...bandOptional, media}),
    checklist: obj({...base("checklist"), ...band, items: list(obj({title: copy(), body: copy()}), 2, 12)}, {...sectionStatus, ...bandOptional, actions: actions()}),
    story: obj({...base("story"), name: copy(), initials: copy(), quote: copy()}, {
      ...sectionStatus,
      kicker: copy(),
      meta: copy(),
      avatarGround: oneOfValues(avatarGrounds),
      metrics: list(obj({label: copy(), value: copy(), footnote: str(footnoteIdPattern)}, {source: copy()}), 1, 4),
      media: photo,
      link: action,
    }),
    /** The rate as one figure, the headline that completes it, the cap and trial lines, and worked examples. */
    pricing: obj({...base("pricing"), price: copy(), title: copy(), examples: list(obj({title: copy(), value: copy()}, {body: copy()}), 1, 4)}, {
      ...sectionStatus,
      kicker: copy(),
      cap: copy(),
      trial: copy(),
      actions: actions(),
      /** A calculator under the columns, from the custom registry (the /pricing/ fee calculator). */
      calculator: oneOfValues(["pricingCalculator"] as const),
    }),
    faq: obj({...base("faq"), ...band, items: list(obj({question: copy(), answer: copy()}), 1, 12)}, {...sectionStatus, kicker: copy(), action}),
    cta: obj({...base("cta"), ...band}, {
      ...sectionStatus,
      ...bandOptional,
      actions: actions(),
      leadForm,
      /** The store badges of the guest app or of the host app. */
      storeBadges: oneOfValues(["guest", "host"] as const),
      media,
    }),
    cards: obj({...base("cards"), ...band, source: {
      t: "oneOf",
      options: [
        obj({kind: constant("cityPlans")}, {format: str(formatPattern)}),
        obj({kind: constant("organisers")}, {format: str(formatPattern)}),
        obj({kind: constant("cities")}),
        obj({kind: constant("stories")}, {format: str(formatPattern), city: str(formatPattern)}),
        obj({kind: constant("playbooks")}, {format: str(formatPattern), city: str(formatPattern)}),
        obj({kind: constant("people"), group: str(formatPattern)}),
      ],
    } as OneOfSpec<readonly [
      ObjectSpec<{kind: ConstSpec<"cityPlans">}, {format: StringSpec}>,
      ObjectSpec<{kind: ConstSpec<"organisers">}, {format: StringSpec}>,
      ObjectSpec<{kind: ConstSpec<"cities">}>,
      ObjectSpec<{kind: ConstSpec<"stories">}, {format: StringSpec; city: StringSpec}>,
      ObjectSpec<{kind: ConstSpec<"playbooks">}, {format: StringSpec; city: StringSpec}>,
      ObjectSpec<{kind: ConstSpec<"people">; group: StringSpec}>,
    ]>}, {
      ...sectionStatus,
      /** Filter chips over the cards, each narrowing the source by its key. */
      filters: list(obj({key: str(formatPattern), label: copy()}), 2, 8),
      ...bandOptional,
      pageTitle: bool(),
      columns: int([3, 4]),
      empty: obj({title: copy(), body: copy()}),
      actions: actions(),
    }),
    tabs: obj({...base("tabs"), ...band, items: list(obj({label: copy()}, {
      title: copy(),
      subtitle: copy(),
      time: copy(),
      body: copy(),
      accent: oneOfValues(["coral", "pink", "yellow", "mint", "indigo", "magenta"] as const),
      tips: list(copy(), 1, 6),
      list: list(obj({time: copy(), title: copy()}, {body: copy()}), 1, 8),
      media,
    }), 2, 8)}, {...sectionStatus, ...bandOptional, layout: oneOfValues(["tabs", "steps"] as const), align: oneOfValues(["start", "center"] as const), defaultItem: range(0, 7)}),
    /**
     * A comparison: the compared columns, an optional corner label over the
     * row labels, and per row one cell per column, each with text, a yes/no
     * mark or both. `checked` dates the comparison ("Checked 16 Nov 2026").
     */
    table: obj({...base("table"), ...band, columns: list(copy(), 1, 6), rows: list(obj({label: copy(), cells: list(obj({}, {
      text: copy(),
      status: oneOfValues(["yes", "no", "unknown"] as const),
    }), 1, 6)}), 1, 30)}, {...sectionStatus, ...bandOptional, rowHeader: copy(), highlightColumn: range(0, 5), source: copy(), checked: copy()}),
    article: obj({...base("article"), ...band, sections: list(obj({heading: copy(), paragraphs: list(copy(), 1, 12)}, {list: list(copy(), 1, 12), tip: copy()}), 1, 20)}, {
      ...sectionStatus,
      ...bandOptional,
      pageTitle: bool(),
      meta: copy(),
      aside: obj({ground, title: copy(), body: copy()}, {action}),
    }),
    /** One capture, photo or QR code on its own, with an optional heading. */
    screen: obj({...base("screen"), media}, {...sectionStatus, ...bandOptional, title: copy(), caption: copy()}),
    /**
     * A section drawn by a component the site provides, such as a calculator
     * or a form with its own backend: `component` names it in the closed
     * registry (features/playbook/playbookCustomSections.ts), and `labels`
     * carries its words by key, so its copy stays in the page.
     */
    custom: obj({...base("custom"), component: oneOfValues(playbookCustomComponents)}, {
      ...sectionStatus,
      ...bandOptional,
      title: copy(),
      /** The title is the page's h1, as /pricing/'s fee band is. */
      pageTitle: bool(),
      labels: list(obj({key: str("^[a-z][A-Za-z0-9]*$"), text: copy()}), 1, 40),
    }),
  },
} as const satisfies UnionSpec;

const breadcrumbs = obj({links: list(obj({label: copy(), to: destination}), 1, 4), current: copy()});
/**
 * The page's own metadata: its title and descriptions for search and link
 * previews, an optional preview image, and `noindex`, the one flag that keeps
 * a page out of search and the sitemap until the owner approves it. Every
 * page starts with `"noindex": true`; approval is the PR that sets it false.
 * Ad landing pages stay noindex whatever this says.
 */
const pageMeta = obj({title: copy(), description: copy(), noindex: bool()}, {socialDescription: copy(), ogImage: str(assetPattern)});

/** A link in a footer column: its words and where it goes. */
const footerLink = obj({label: copy(), to: destination});
const pageSpec = obj({
  $schema: constant("../../playbookPage.schema.json"),
  id: str(pageIdPattern),
  route: str(routeIdPattern),
  meta: pageMeta,
  header: obj({variant: oneOfValues(playbookHeaderVariants)}, {
    breadcrumbs,
    /** The page's own primary action in place of the variant's, such as "Book a walkthrough". */
    action,
    /**
     * The founding-host offer strip. It shows only while the market's public
     * counter is open, and says nothing otherwise.
     */
    offer: obj({market: str("^[a-z][a-z0-9-]{1,49}$"), lead: copy(), body: copy()}, {action}),
  }),
  footer: obj({variant: oneOfValues(playbookFooterVariants)}, {
    footnotes: list(obj({id: str(footnoteIdPattern), text: copy()}), 1, 12),
    /**
     * The host footer's link columns in place of the variant's (the kit's
     * KitFooter `cols`), such as the product pages' Product column. The last
     * column ends with Privacy choices; pages that pass none render as before.
     */
    columns: list(obj({title: copy(), links: list(footerLink, 1, 12)}), 1, 5),
    /** A bar fixed to the foot of a phone screen with the page's one action. */
    phoneBar: obj({action}, {note: copy()}),
  }),
  sections: list(sectionSpec, 1, 24),
});

export type PlaybookPageDocument = Infer<typeof pageSpec>;
export type PlaybookSection = Infer<typeof sectionSpec>;
export type PlaybookSectionType = PlaybookSection["type"];
export type PlaybookSectionOf<T extends PlaybookSectionType> = Extract<PlaybookSection, {type: T}>;
export type PlaybookAction = Infer<typeof action>;
export type PlaybookDestination = Infer<typeof destination>;
export type PlaybookMedia = Infer<typeof media>;
export type PlaybookLeadForm = NonNullable<PlaybookSectionOf<"cta">["leadForm"]>;

/**
 * One page's content in a section's page index
 * (content/playbook/pages/<section>/index.ts): the JSON file beside the
 * index, and its lazy import. The index key is the page's content key: the
 * route id for a single page, or the route id and its parameters joined
 * with `/` for a page of a family (`story_detail/driftwood-bay-runners`).
 */
export interface PlaybookPageEntry {
  readonly file: string;
  readonly load: () => Promise<{default: unknown}>;
}
export type PlaybookPageIndex = {readonly [contentKey: string]: PlaybookPageEntry};

export const playbookSectionTypes = Object.keys(sectionSpec.variants) as PlaybookSectionType[];

// ---------------------------------------------------------------------------
// Text rules.

const placeholderPattern = /\[[^\]\n]*\]/u;
const hexColourPattern = /#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{3,4})\b/u;
const singleBraceBrandPattern = /(?<!\{)\{\s*brand\.[^}]*\}(?!\})/u;
const brandNamePattern = new RegExp(`\\b${brand.name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\b`, "u");
/** Text rules the static schema also enforces. The brand rule depends on the brand record, so only the runtime validator has it. */
export const playbookCopyPatterns = {placeholder: placeholderPattern.source, hexColour: hexColourPattern.source} as const;

function copyErrors(label: string, value: string): string[] {
  const errors: string[] = [];
  if (placeholderPattern.test(value)) errors.push(`${label} has a [placeholder]; resolve it or remove the line`);
  if (hexColourPattern.test(value)) errors.push(`${label} has a hex colour; use a ground`);
  if (singleBraceBrandPattern.test(value)) errors.push(`${label} writes a brand token with single braces; use {{brand.name}}`);
  if (brandNamePattern.test(value)) errors.push(`${label} names the brand literally; write {{brand.name}}`);
  try {
    applyBrandText(value);
  } catch (error) {
    errors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
  return errors;
}

// ---------------------------------------------------------------------------
// The structural walker.

function walk(spec: Spec, value: unknown, label: string, errors: string[]) {
  switch (spec.t) {
    case "copy":
      if (typeof value !== "string" || value.trim() === "") errors.push(`${label} must be a non-empty string`);
      else errors.push(...copyErrors(label, value));
      return;
    case "string":
      if (typeof value !== "string" || !new RegExp(spec.pattern, "u").test(value)) errors.push(`${label} must match ${spec.pattern}`);
      return;
    case "enum":
      if (!spec.values.includes(value as string)) errors.push(`${label} must be one of ${spec.values.join(", ")}`);
      return;
    case "const":
      if (value !== spec.value) errors.push(`${label} must be ${spec.value}`);
      return;
    case "bool":
      if (typeof value !== "boolean") errors.push(`${label} must be true or false`);
      return;
    case "int":
      if (!Number.isInteger(value)) errors.push(`${label} must be an integer`);
      else if (spec.values && !spec.values.includes(value as number)) errors.push(`${label} must be one of ${spec.values.join(", ")}`);
      else if ((spec.min !== undefined && (value as number) < spec.min) || (spec.max !== undefined && (value as number) > spec.max)) {
        errors.push(`${label} must be from ${spec.min} to ${spec.max}`);
      }
      return;
    case "array":
      if (!Array.isArray(value)) {
        errors.push(`${label} must be a list`);
        return;
      }
      if (value.length < (spec.min ?? 0)) errors.push(`${label} needs at least ${spec.min} item(s)`);
      if (spec.max !== undefined && value.length > spec.max) errors.push(`${label} allows at most ${spec.max} item(s)`);
      value.forEach((item, index) => walk(spec.of, item, `${label}[${index}]`, errors));
      return;
    case "object": {
      if (!isRecord(value)) {
        errors.push(`${label} must be an object`);
        return;
      }
      for (const key of Object.keys(value)) {
        if (!(key in spec.required) && !(key in spec.optional)) errors.push(`${label} has unsupported key ${key}`);
      }
      for (const [key, child] of Object.entries(spec.required)) {
        if (!(key in value)) errors.push(`${label} is missing ${key}`);
        else walk(child, value[key], `${label}.${key}`, errors);
      }
      for (const [key, child] of Object.entries(spec.optional)) {
        if (key in value) walk(child, value[key], `${label}.${key}`, errors);
      }
      return;
    }
    case "union": {
      const variant = isRecord(value) && typeof value[spec.by] === "string" ? spec.variants[value[spec.by] as string] : undefined;
      if (!variant) {
        errors.push(`${label}.${spec.by} must be one of ${Object.keys(spec.variants).join(", ")}`);
        return;
      }
      walk(variant, value, label, errors);
      return;
    }
    case "oneOf": {
      const results = spec.options.map((option: AnyObjectSpec) => {
        const optionErrors: string[] = [];
        walk(option, value, label, optionErrors);
        return optionErrors;
      });
      const passing = results.filter((result: string[]) => result.length === 0).length;
      if (passing === 1) return;
      if (passing > 1) {
        errors.push(`${label} matches more than one shape`);
        return;
      }
      // Report the closest shape: the one with the fewest problems.
      errors.push(...results.reduce((best: string[], result: string[]) => result.length < best.length ? result : best));
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Rules across the page.

/** The site's registries, for the rules the static schema cannot check. */
export interface PlaybookValidationContext {
  /** Every route id an action or breadcrumb may name. */
  readonly routeIds: ReadonlySet<string>;
  /** The family routes (`story_detail`, `playbook_guide`, …) a page may be on; an action names a family page by its content key instead. */
  readonly familyRouteIds?: ReadonlySet<string>;
  /** Capture slot ids in the app-screenshot manifest. */
  readonly captureSlots: ReadonlySet<string>;
  /** The manifest's fragment captures, each with the capture slot it is cut from (`fragmentOf`). */
  readonly captureFragments?: ReadonlyMap<string, string>;
  /** Routes whose pages never enter search, such as ad landing pages. */
  readonly alwaysNoindexRoutes?: ReadonlySet<string>;
  /** The section ids of pages a `{route, anchor}` may link into; a route listed here must have the anchor. */
  readonly routeAnchors?: ReadonlyMap<string, ReadonlySet<string>>;
  /** The content keys of registered family pages a `{page}` may name, with their section ids. */
  readonly pageAnchors?: ReadonlyMap<string, ReadonlySet<string>>;
}

function pageErrors(page: PlaybookPageDocument, context: PlaybookValidationContext | undefined): string[] {
  const errors: string[] = [];
  const sectionIds = new Set<string>();
  for (const section of page.sections) {
    if (sectionIds.has(section.id)) errors.push(`sections: duplicate id ${section.id}`);
    sectionIds.add(section.id);
  }
  // The rules below hold for the page as visitors get it: its live sections and actions.
  const liveIds = new Set(page.sections.filter(playbookIsLive).map((section) => section.id));
  const hiddenIds = new Set([...sectionIds].filter((id) => !liveIds.has(id)));

  const titles = page.sections.filter(playbookIsLive).filter((section) => section.type === "hero" || ("pageTitle" in section && section.pageTitle === true));
  if (titles.length !== 1) errors.push(`page needs exactly one page title (a hero, or one section with pageTitle) among its live sections, found ${titles.length}`);

  const footnoteIds = new Set((page.footer.footnotes ?? []).map((footnote) => footnote.id));
  const referenced = new Set<string>();
  const footnote = (label: string, id: string | undefined, required: boolean) => {
    if (id === undefined) {
      if (required) errors.push(`${label} states a number; give it a footnote with its source`);
      return;
    }
    referenced.add(id);
    if (!footnoteIds.has(id)) errors.push(`${label} cites unknown footnote ${id}`);
  };

  const destinationErrors = (label: string, to: PlaybookDestination, live = true) => {
    if ("route" in to) {
      if (context && !context.routeIds.has(to.route)) errors.push(`${label} links unknown route ${to.route}`);
      const anchors = context?.routeAnchors?.get(to.route);
      if (to.anchor && anchors && !anchors.has(to.anchor)) errors.push(`${label} links #${to.anchor}, which is not a section of ${to.route}`);
    } else if ("page" in to) {
      const anchors = context?.pageAnchors?.get(to.page);
      if (context?.pageAnchors && !anchors) errors.push(`${label} links page ${to.page}, which is not a registered page`);
      if (to.anchor && anchors && !anchors.has(to.anchor)) errors.push(`${label} links #${to.anchor}, which is not a section of ${to.page}`);
    } else if ("anchor" in to && !sectionIds.has(to.anchor)) {
      errors.push(`${label} links #${to.anchor}, which is not a section on this page`);
    } else if ("anchor" in to && live && hiddenIds.has(to.anchor)) {
      errors.push(`${label} links #${to.anchor}, which is hidden until its feature is built; hide the link too`);
    }
  };
  const mediaErrors = (label: string, item: PlaybookMedia | undefined) => {
    if (item?.kind === "qr") destinationErrors(`${label}.to`, item.to);
    if (item?.kind === "capture" && context && !context.captureSlots.has(item.slot)) {
      errors.push(`${label} names unknown capture slot ${item.slot}`);
    }
  };

  page.sections.forEach((section, index) => {
    const label = `sections[${index}] (${section.id})`;
    const live = playbookIsLive(section);
    forEachAction(section, (item, path) => destinationErrors(`${label}.${path}`, item.to, live && playbookIsLive(item)));
    if (playbookTileOnlyGrounds.has(section.ground)) errors.push(`${label}.ground ${section.ground} is a soft tint, for a tile only`);
    if (section.type === "tiles") {
      section.items.forEach((item, itemIndex) => {
        if (item.ground && playbookTileOnlyGrounds.has(item.ground) && playbookTileOnlyGrounds.has(section.ground)) errors.push(`${label}.items[${itemIndex}] sits on a soft tint`);
        if (item.link?.label && repeatsTitle(item.link.label, item.title)) errors.push(`${label}.items[${itemIndex}].link.label repeats the tile's title; leave the label out`);
      });
    }
    if (section.type === "split") {
      section.groups?.forEach((group, groupIndex) => group.links?.forEach((link, linkIndex) => {
        if (link.label && repeatsTitle(link.label, group.title)) errors.push(`${label}.groups[${groupIndex}].links[${linkIndex}].label repeats the group's title; leave the label out`);
      }));
    }
    forEachMedia(section, (item, path) => mediaErrors(`${label}.${path}`, item));
    if (section.type === "hero" && section.fragments) {
      if (section.media?.kind !== "capture") errors.push(`${label}.fragments are cut from the hero's capture; give the hero capture media`);
      if (new Set(section.fragments).size !== section.fragments.length) errors.push(`${label}.fragments repeat a slot`);
      const screen = section.media?.kind === "capture" ? section.media.slot : undefined;
      section.fragments.forEach((slot, index) => {
        if (context && !context.captureSlots.has(slot)) errors.push(`${label}.fragments[${index}] names unknown capture slot ${slot}`);
        else if (context?.captureFragments && context.captureFragments.get(slot) !== screen) {
          errors.push(`${label}.fragments[${index}] ${slot} is not a fragment cut from the hero's capture ${screen}`);
        }
      });
    }
    if (section.type === "hero" && live) {
      section.proof?.forEach((line, lineIndex) => footnote(`${label}.proof[${lineIndex}]`, line.footnote, /\d/u.test(line.text)));
    }
    if (section.type === "table") {
      section.rows.forEach((row, rowIndex) => {
        if (row.cells.length !== section.columns.length) errors.push(`${label}.rows[${rowIndex}] needs ${section.columns.length} cells, one per column`);
        row.cells.forEach((cell, cellIndex) => {
          if (cell.text === undefined && cell.status === undefined) errors.push(`${label}.rows[${rowIndex}].cells[${cellIndex}] needs text or a status`);
        });
      });
      if (section.highlightColumn !== undefined && section.highlightColumn >= section.columns.length) errors.push(`${label}.highlightColumn names no column`);
    }
    const form = "leadForm" in section ? section.leadForm : undefined;
    if (form && ((form.input ?? "tel") === "tel") === (form.requestKind === "tool")) {
      errors.push(`${label}.leadForm: a tool form asks for a link, text or a file (input url, text or file), and only a tool form does`);
    }
    if (section.type === "split" && section.media && section.leadForm) {
      errors.push(`${label} holds media or a lead form in its second column, not both`);
    }
    if (section.type === "tabs" && section.defaultItem !== undefined && section.defaultItem >= section.items.length) {
      errors.push(`${label}.defaultItem names no item`);
    }
    if (section.type === "story" && live) {
      section.metrics?.forEach((metric, metricIndex) => footnote(`${label}.metrics[${metricIndex}]`, metric.footnote, true));
    }
  });
  page.header.breadcrumbs?.links.forEach((link, index) => destinationErrors(`header.breadcrumbs.links[${index}]`, link.to));
  const chromeActions = [
    ["header.action", page.header.action],
    ["header.offer.action", page.header.offer?.action],
    ["footer.phoneBar.action", page.footer.phoneBar?.action],
  ] as const;
  for (const [label, item] of chromeActions) if (item) destinationErrors(label, item.to, playbookIsLive(item));
  page.footer.columns?.forEach((column, columnIndex) => column.links.forEach((link, linkIndex) =>
    destinationErrors(`footer.columns[${columnIndex}].links[${linkIndex}]`, link.to)));
  for (const id of footnoteIds) {
    if (!referenced.has(id)) errors.push(`footer.footnotes: ${id} is not cited by any section`);
  }
  if (context) {
    if (!context.routeIds.has(page.route) && !context.familyRouteIds?.has(page.route)) errors.push(`route ${page.route} is not a registered route`);
    if (context.alwaysNoindexRoutes?.has(page.route) && !page.meta.noindex) errors.push(`meta.noindex must stay true on ${page.route} pages`);

  }
  return errors;
}

/** Whether a section or an action is shown: its feature is built (show-when-live). */
export function playbookIsLive(item: {readonly status?: PlaybookFeatureStatus}): boolean {
  return (item.status ?? "built") === "built";
}

/**
 * The page as visitors get it: its live sections, each without its hidden
 * actions. The renderer, the structured data and the static heads all read
 * this; the hidden parts stay in the content file until their feature ships.
 */
export function livePlaybookPage(page: PlaybookPageDocument): PlaybookPageDocument {
  const liveActions = (items: readonly PlaybookAction[] | undefined) => items?.filter(playbookIsLive);
  const liveAction = (item: PlaybookAction | undefined) => item && playbookIsLive(item) ? item : undefined;
  const sections = page.sections.filter(playbookIsLive).map((section): PlaybookSection => {
    const next: Record<string, unknown> = {...section};
    if ("actions" in section && section.actions) {
      const kept = liveActions(section.actions);
      if (kept?.length) next.actions = kept;
      else delete next.actions;
    }
    if (section.type === "hero" && section.aside && !liveAction(section.aside)) delete next.aside;
    if (section.type === "faq" && section.action && !liveAction(section.action)) delete next.action;
    if (section.type === "story" && section.link && !liveAction(section.link)) delete next.link;
    if (section.type === "tiles") next.items = section.items.map((item) => item.link && !playbookIsLive(item.link) ? without(item, "link") : item);
    if (section.type === "split" && section.groups) {
      next.groups = section.groups.map((group) => {
        const links = group.links?.filter(playbookIsLive);
        return links?.length ? {...group, links} : without(group, "links");
      });
    }
    if (section.type === "article" && section.aside?.action && !liveAction(section.aside.action)) next.aside = without(section.aside, "action");
    return next as PlaybookSection;
  });
  const header = page.header.action && !playbookIsLive(page.header.action) ? without(page.header, "action") : page.header;
  return {...page, header, sections};
}

function without<T extends object, K extends keyof T>(value: T, key: K): Omit<T, K> {
  const copy = {...value};
  delete copy[key];
  return copy;
}

/**
 * Whether a link's words only repeat the title they sit under: the same words,
 * or the title's opening words ("Forms" under "Forms, in every step"), with
 * case and punctuation ignored.
 */
export function playbookLabelRepeatsTitle(label: string, title: string): boolean {
  const words = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}{}.]+/gu, " ").trim();
  const link = words(label);
  const heading = words(title);
  return link !== "" && (link === heading || heading.startsWith(`${link} `));
}
const repeatsTitle = playbookLabelRepeatsTitle;

/** Every action in a section, with its path for messages. */
export function forEachAction(section: PlaybookSection, visit: (item: PlaybookAction, path: string) => void) {
  const each = (items: readonly PlaybookAction[] | undefined, path: string) => items?.forEach((item, index) => visit(item, `${path}[${index}]`));
  if ("actions" in section) each(section.actions, "actions");
  if (section.type === "hero" && section.aside) visit(section.aside, "aside");
  if (section.type === "faq" && section.action) visit(section.action, "action");
  // A tile link without words of its own is named by the tile's title.
  if (section.type === "tiles") section.items.forEach((item, index) => item.link && visit({...item.link, label: item.link.label ?? item.title}, `items[${index}].link`));
  // So is a group link without words of its own, by the group's title.
  if (section.type === "split") section.groups?.forEach((group, index) => group.links?.forEach((link, linkIndex) =>
    visit({...link, label: link.label ?? group.title}, `groups[${index}].links[${linkIndex}]`)));
  if (section.type === "story" && section.link) visit(section.link, "link");
  if (section.type === "article" && section.aside?.action) visit(section.aside.action, "aside.action");
}

function forEachMedia(section: PlaybookSection, visit: (item: PlaybookMedia | undefined, path: string) => void) {
  if ("media" in section) visit(section.media, "media");
  if (section.type === "tabs") section.items.forEach((item, index) => visit(item.media, `items[${index}].media`));
}

/** Every problem with a page document. Pass the context to also check route ids and capture slots. */
export function validatePlaybookPage(value: unknown, context?: PlaybookValidationContext): string[] {
  const errors: string[] = [];
  walk(pageSpec, value, "page", errors);
  if (errors.length > 0) return errors;
  return pageErrors(value as PlaybookPageDocument, context);
}

/** The page document, or an error listing every problem. Never replace this call with a type assertion. */
export function validatedPlaybookPage(value: unknown, context?: PlaybookValidationContext): PlaybookPageDocument {
  const errors = validatePlaybookPage(value, context);
  if (errors.length > 0) {
    throw new Error("Playbook page validation failed:\n" + errors.map((error) => `- ${error}`).join("\n"));
  }
  return value as PlaybookPageDocument;
}

// ---------------------------------------------------------------------------
// The editor schema, generated from the same spec.

type JsonSchema = {[key: string]: unknown};

/** The JSON Schema (2020-12) playbookPage.schema.json must equal. */
export function playbookPageJsonSchema(): JsonSchema {
  const defs: {[name: string]: JsonSchema} = {};
  const toSchema = (spec: Spec): JsonSchema => {
    if ((spec.t === "object" || spec.t === "oneOf") && spec.name) {
      if (!defs[spec.name]) {
        defs[spec.name] = {};
        defs[spec.name] = inline(spec);
      }
      return {$ref: `#/$defs/${spec.name}`};
    }
    return inline(spec);
  };
  const inline = (spec: Spec): JsonSchema => {
    switch (spec.t) {
      case "copy":
        return {$ref: "#/$defs/copy"};
      case "string":
        return {type: "string", pattern: spec.pattern};
      case "enum":
        return {enum: [...spec.values]};
      case "const":
        return {const: spec.value};
      case "bool":
        return {type: "boolean"};
      case "int":
        return spec.values ? {enum: [...spec.values]} :
          {type: "integer", ...(spec.min === undefined ? {} : {minimum: spec.min}), ...(spec.max === undefined ? {} : {maximum: spec.max})};
      case "array":
        return {type: "array", items: toSchema(spec.of), minItems: spec.min ?? 0, ...(spec.max === undefined ? {} : {maxItems: spec.max})};
      case "object":
        return {
          type: "object",
          additionalProperties: false,
          required: Object.keys(spec.required),
          properties: Object.fromEntries([...Object.entries(spec.required), ...Object.entries(spec.optional)].map(([key, child]) => [key, toSchema(child)])),
        };
      case "union":
        return {oneOf: Object.values(spec.variants).map(toSchema)};
      case "oneOf":
        return {oneOf: spec.options.map(toSchema)};
      default:
        throw new Error("unknown spec");
    }
  };
  const root = inline(pageSpec);
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "Website playbook page",
    description: "Generated from website/src/content/playbook/playbookContract.ts; playbookContract.test.ts keeps it equal. The runtime validator also rejects the literal brand name and checks route ids, capture slots, anchors and footnotes.",
    ...root,
    $defs: {
      copy: {
        type: "string",
        pattern: "\\S",
        not: {anyOf: [{pattern: playbookCopyPatterns.placeholder}, {pattern: playbookCopyPatterns.hexColour}]},
      },
      ...Object.fromEntries(Object.entries(defs).sort(([a], [b]) => a.localeCompare(b))),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
