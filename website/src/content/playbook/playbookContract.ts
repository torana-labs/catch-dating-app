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
 * URL. Media names a capture slot, an illustrative screen card or a photo
 * asset. Cards that list live things (plans, organisers, cities, stories)
 * name their read model as a `source` and carry no items.
 *
 * Text rules on every copy string: no `[placeholder]` brackets, no hex
 * colours, and no literal brand name (write `{{brand.name}}`, resolved by
 * applyBrand when the page loads). Rules that need the site's registries
 * (route ids, capture slots) run when `validatePlaybookPage` is given a
 * context; the static schema cannot know those lists, nor the brand name.
 */

/** Website v2 grounds, as @catch/web-ui's `Ground` (PlaybookSections.tsx pins the parity). */
export const playbookGrounds = ["white", "paper", "ink", "coral", "pink", "yellow", "mint", "indigo", "magenta"] as const;
export type PlaybookGround = (typeof playbookGrounds)[number];

/** The chrome a page asks for: PublicSiteHeader and PublicSiteFooter variants. */
export const playbookHeaderVariants = ["guest", "host", "minimal"] as const;
export const playbookFooterVariants = ["guest", "host", "minimal"] as const;

/** The read models a data-bound card section can list. */
export const playbookCardSources = ["cityPlans", "organisers", "cities", "stories", "playbooks"] as const;

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

/** Where an action goes: a route of this site (optionally an anchor on it), an anchor on this page, or a WhatsApp chat with Catch. */
const destinationSpec: OneOfSpec = {
  t: "oneOf",
  name: "destination",
  options: [
    obj({route: str(routeIdPattern)}, {anchor: str(sectionIdPattern)}),
    obj({anchor: str(sectionIdPattern)}),
    obj({kind: constant("whatsapp"), message: copy()}),
  ],
};
const destination = destinationSpec as OneOfSpec<readonly [
  ObjectSpec<{route: StringSpec}, {anchor: StringSpec}>,
  ObjectSpec<{anchor: StringSpec}>,
  ObjectSpec<{kind: ConstSpec<"whatsapp">; message: CopySpec}>,
]>;

const action = obj({label: copy(), to: destination}, {emphasis: oneOfValues(["primary", "secondary"] as const)}, "action");
const actions = (max = 3) => list(action, 1, max);

/** An illustrative screen: sample data drawn as a card, labelled as illustrative by the renderer. */
const excerptCard = obj({title: copy()}, {
  subtitle: copy(),
  label: copy(),
  stats: list(obj({value: copy(), label: copy()}), 1, 4),
  rows: list(obj({title: copy()}, {detail: copy(), value: copy(), tag: copy()}), 1, 8),
  bars: list(obj({label: copy(), value: copy(), share: range(0, 100)}), 1, 6),
  fields: list(obj({label: copy()}, {placeholder: copy()}), 1, 6),
  messages: list(obj({text: copy()}, {time: copy(), own: bool()}), 1, 8),
  tiles: list(obj({title: copy(), body: copy()}, {ground}), 1, 6),
  actions: list(copy(), 1, 3),
  note: copy(),
}, "excerptCard");

const photo = obj({kind: constant("photo"), asset: str(assetPattern), alt: copy()}, {note: copy()}, "photo");
const mediaSpec: OneOfSpec = {
  t: "oneOf",
  name: "media",
  options: [
    obj({kind: constant("capture"), slot: str(slotPattern)}),
    obj({kind: constant("excerpt"), card: excerptCard}),
    photo,
  ],
};
const media = mediaSpec as OneOfSpec<readonly [
  ObjectSpec<{kind: ConstSpec<"capture">; slot: StringSpec}>,
  ObjectSpec<{kind: ConstSpec<"excerpt">; card: typeof excerptCard}>,
  typeof photo,
]>;

const proofLine = obj({text: copy()}, {footnote: str(footnoteIdPattern)});

const base = <const T extends string>(type: T) => ({type: constant(type), id: str(sectionIdPattern), ground});
/** A band's own heading: the headline, with an optional kicker and lead. `pageTitle: true` makes the headline the page's h1. */
const band = {title: copy()};
const bandOptional = {kicker: copy(), lead: copy()};

const sectionSpec = {
  t: "union",
  by: "type",
  variants: {
    hero: obj({...base("hero"), title: copy(), lead: copy(), actions: actions()}, {
      kicker: copy(),
      proof: list(proofLine, 1, 3),
      aside: action,
      chip: obj({title: copy(), rows: list(obj({label: copy(), value: copy()}), 1, 4)}),
      tags: list(copy(), 1, 4),
      media,
    }),
    tiles: obj({...base("tiles"), ...band, items: list(obj({title: copy()}, {
      body: copy(),
      figure: copy(),
      figureNote: copy(),
      list: list(copy(), 1, 6),
      fix: copy(),
      then: copy(),
      ground,
      link: action,
    }), 1, 12)}, {...bandOptional, pageTitle: bool(), columns: int([2, 3, 4]), align: oneOfValues(["start", "center"] as const), actions: actions(), foot: copy()}),
    split: obj({...base("split"), ...band, media}, {
      ...bandOptional,
      pageTitle: bool(),
      body: copy(),
      ticks: list(copy(), 1, 8),
      mediaFirst: bool(),
      actions: actions(),
      groups: list(obj({title: copy(), list: list(copy(), 1, 8)}, {label: copy(), link: action}), 1, 4),
      steps: list(obj({label: copy(), title: copy(), body: copy()}), 1, 6),
      callout: obj({figure: copy(), text: copy()}),
    }),
    timeline: obj({...base("timeline"), ...band, steps: list(obj({time: copy(), title: copy(), body: copy()}), 2, 8)}, {...bandOptional, media}),
    checklist: obj({...base("checklist"), ...band, items: list(obj({title: copy(), body: copy()}), 2, 12)}, {...bandOptional, actions: actions()}),
    story: obj({...base("story"), name: copy(), initials: copy(), quote: copy()}, {
      kicker: copy(),
      meta: copy(),
      metrics: list(obj({label: copy(), value: copy(), footnote: str(footnoteIdPattern)}), 1, 4),
      media: photo,
    }),
    pricing: obj({...base("pricing"), price: copy(), examples: list(obj({title: copy(), value: copy(), body: copy()}), 1, 4)}, {
      kicker: copy(),
      priceNote: copy(),
      lead: copy(),
      actions: actions(),
    }),
    faq: obj({...base("faq"), ...band, items: list(obj({question: copy(), answer: copy()}), 1, 12)}, {kicker: copy(), action}),
    cta: obj({...base("cta"), ...band}, {
      ...bandOptional,
      actions: actions(),
      leadForm: obj({id: str(leadFormIdPattern), label: copy(), submitLabel: copy()}),
      storeBadges: bool(),
      media,
    }),
    cards: obj({...base("cards"), ...band, source: {
      t: "oneOf",
      options: [
        obj({kind: constant("cityPlans")}, {format: str(formatPattern)}),
        obj({kind: constant("organisers")}, {format: str(formatPattern)}),
        obj({kind: constant("cities")}),
        obj({kind: constant("stories")}),
        obj({kind: constant("playbooks")}),
      ],
    } as OneOfSpec<readonly [
      ObjectSpec<{kind: ConstSpec<"cityPlans">}, {format: StringSpec}>,
      ObjectSpec<{kind: ConstSpec<"organisers">}, {format: StringSpec}>,
      ObjectSpec<{kind: ConstSpec<"cities">}>,
      ObjectSpec<{kind: ConstSpec<"stories">}>,
      ObjectSpec<{kind: ConstSpec<"playbooks">}>,
    ]>}, {
      ...bandOptional,
      pageTitle: bool(),
      columns: int([2, 3, 4]),
      empty: obj({title: copy(), body: copy()}),
      actions: actions(),
    }),
    tabs: obj({...base("tabs"), ...band, items: list(obj({label: copy()}, {
      title: copy(),
      subtitle: copy(),
      time: copy(),
      body: copy(),
      tips: list(copy(), 1, 6),
      list: list(obj({title: copy(), body: copy()}, {label: copy()}), 1, 8),
      columns: list(obj({title: copy(), list: list(copy(), 1, 8)}), 1, 4),
      media,
    }), 2, 8)}, {...bandOptional, layout: oneOfValues(["steps", "panels"] as const)}),
    table: obj({...base("table"), ...band, columns: list(copy(), 2, 6), rows: list(list(copy(), 2, 6), 1, 20)}, {...bandOptional, note: copy()}),
    article: obj({...base("article"), ...band, sections: list(obj({heading: copy(), paragraphs: list(copy(), 1, 12)}, {list: list(copy(), 1, 12), tip: copy()}), 1, 20)}, {
      ...bandOptional,
      pageTitle: bool(),
      meta: copy(),
      aside: obj({ground, title: copy(), body: copy()}, {actions: actions(2)}),
    }),
    /** One illustrative screen or capture on its own, with an optional heading. */
    screen: obj({...base("screen"), media}, {...bandOptional, title: copy(), caption: copy()}),
    /** A one-job flow: its step rail or tabs, then the screens of the current step. */
    flow: obj({...base("flow"), ...band, blocks: list(excerptCard, 1, 6)}, {
      ...bandOptional,
      steps: list(copy(), 2, 6),
      currentStep: range(0, 5),
      tabs: list(copy(), 2, 8),
      currentTab: range(0, 7),
      actions: actions(),
      note: copy(),
    }),
  },
} as const satisfies UnionSpec;

const breadcrumbs = obj({links: list(obj({label: copy(), to: obj({route: str(routeIdPattern)})}), 1, 4), current: copy()});
/**
 * The page's own metadata: its title and descriptions for search and link
 * previews, an optional preview image, and `noindex`, the one flag that keeps
 * a page out of search and the sitemap until the owner approves it. Every
 * page starts with `"noindex": true`; approval is the PR that sets it false.
 * Ad landing pages stay noindex whatever this says.
 */
const pageMeta = obj({title: copy(), description: copy(), noindex: bool()}, {socialDescription: copy(), ogImage: str(assetPattern)});

const pageSpec = obj({
  $schema: constant("../../playbookPage.schema.json"),
  id: str(pageIdPattern),
  route: str(routeIdPattern),
  meta: pageMeta,
  header: obj({variant: oneOfValues(playbookHeaderVariants)}, {breadcrumbs}),
  footer: obj({variant: oneOfValues(playbookFooterVariants)}, {footnotes: list(obj({id: str(footnoteIdPattern), text: copy()}), 1, 12)}),
  sections: list(sectionSpec, 1, 24),
});

export type PlaybookPageDocument = Infer<typeof pageSpec>;
export type PlaybookSection = Infer<typeof sectionSpec>;
export type PlaybookSectionType = PlaybookSection["type"];
export type PlaybookSectionOf<T extends PlaybookSectionType> = Extract<PlaybookSection, {type: T}>;
export type PlaybookAction = Infer<typeof action>;
export type PlaybookDestination = Infer<typeof destination>;
export type PlaybookMedia = Infer<typeof media>;
export type PlaybookExcerptCard = Infer<typeof excerptCard>;
export type PlaybookCardSource = PlaybookSectionOf<"cards">["source"];
export type PlaybookLeadForm = NonNullable<PlaybookSectionOf<"cta">["leadForm"]>;
export type PlaybookPageMeta = PlaybookPageDocument["meta"];

/**
 * One page's content in a section's page index
 * (content/playbook/pages/<section>/index.ts): the JSON file beside the
 * index, and its lazy import. The index key is the page's content key: the
 * route id for a single page, or the route id and its parameters joined
 * with `/` for a page of a family (`story_detail/carter-road-runners`).
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
  /** Capture slot ids in the app-screenshot manifest. */
  readonly captureSlots: ReadonlySet<string>;
  /** Routes whose pages never enter search, such as ad landing pages. */
  readonly alwaysNoindexRoutes?: ReadonlySet<string>;
}

function pageErrors(page: PlaybookPageDocument, context: PlaybookValidationContext | undefined): string[] {
  const errors: string[] = [];
  const sectionIds = new Set<string>();
  for (const section of page.sections) {
    if (sectionIds.has(section.id)) errors.push(`sections: duplicate id ${section.id}`);
    sectionIds.add(section.id);
  }

  const titles = page.sections.filter((section) => section.type === "hero" || ("pageTitle" in section && section.pageTitle === true));
  if (titles.length !== 1) errors.push(`page needs exactly one page title (a hero, or one section with pageTitle), found ${titles.length}`);

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

  const destinationErrors = (label: string, to: PlaybookDestination) => {
    if ("route" in to) {
      if (context && !context.routeIds.has(to.route)) errors.push(`${label} links unknown route ${to.route}`);
    } else if ("anchor" in to && !sectionIds.has(to.anchor)) {
      errors.push(`${label} links #${to.anchor}, which is not a section on this page`);
    }
  };
  const mediaErrors = (label: string, item: PlaybookMedia | undefined) => {
    if (item?.kind === "capture" && context && !context.captureSlots.has(item.slot)) {
      errors.push(`${label} names unknown capture slot ${item.slot}`);
    }
  };

  page.sections.forEach((section, index) => {
    const label = `sections[${index}] (${section.id})`;
    forEachAction(section, (item, path) => destinationErrors(`${label}.${path}`, item.to));
    forEachMedia(section, (item, path) => mediaErrors(`${label}.${path}`, item));
    if (section.type === "hero") {
      section.proof?.forEach((line, lineIndex) => footnote(`${label}.proof[${lineIndex}]`, line.footnote, /\d/u.test(line.text)));
    }
    if (section.type === "flow") {
      if (section.currentStep !== undefined && section.currentStep >= (section.steps?.length ?? 0)) errors.push(`${label}.currentStep names no step`);
      if (section.currentTab !== undefined && section.currentTab >= (section.tabs?.length ?? 0)) errors.push(`${label}.currentTab names no tab`);
    }
    if (section.type === "table") {
      section.rows.forEach((row, rowIndex) => {
        if (row.length !== section.columns.length) errors.push(`${label}.rows[${rowIndex}] needs ${section.columns.length} cells, one per column`);
      });
    }
    if (section.type === "story") {
      section.metrics?.forEach((metric, metricIndex) => footnote(`${label}.metrics[${metricIndex}]`, metric.footnote, true));
    }
  });
  for (const id of footnoteIds) {
    if (!referenced.has(id)) errors.push(`footer.footnotes: ${id} is not cited by any section`);
  }
  if (context) {
    if (!context.routeIds.has(page.route)) errors.push(`route ${page.route} is not a registered route`);
    if (context.alwaysNoindexRoutes?.has(page.route) && !page.meta.noindex) errors.push(`meta.noindex must stay true on ${page.route} pages`);
    page.header.breadcrumbs?.links.forEach((link, index) => {
      if (!context.routeIds.has(link.to.route)) errors.push(`header.breadcrumbs.links[${index}] links unknown route ${link.to.route}`);
    });
  }
  return errors;
}

/** Every action in a section, with its path for messages. */
export function forEachAction(section: PlaybookSection, visit: (item: PlaybookAction, path: string) => void) {
  const each = (items: readonly PlaybookAction[] | undefined, path: string) => items?.forEach((item, index) => visit(item, `${path}[${index}]`));
  if ("actions" in section) each(section.actions, "actions");
  if (section.type === "hero" && section.aside) visit(section.aside, "aside");
  if (section.type === "faq" && section.action) visit(section.action, "action");
  if (section.type === "tiles") section.items.forEach((item, index) => item.link && visit(item.link, `items[${index}].link`));
  if (section.type === "split") section.groups?.forEach((group, index) => group.link && visit(group.link, `groups[${index}].link`));
  if (section.type === "article") each(section.aside?.actions, "aside.actions");
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
    title: "Catch website playbook page",
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
