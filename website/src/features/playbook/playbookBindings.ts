import type {PlaybookPageDocument, PlaybookSectionOf, PlaybookSectionType} from "../../content/playbook/playbookContract.ts";
import {publishedHostStories} from "../../content/stories/hostStories.ts";
import {readyPlaybookCustomComponents} from "./custom/readyCustomSections.ts";

/**
 * The parts of the content contract that have no @catch/web-ui component to
 * draw them yet. A page that uses any of them is not rendered: it 404s, the
 * same as a page whose content is not written, rather than render with a
 * band missing. PlaybookSections.tsx binds every section type not listed
 * here, and its types fail if the two disagree.
 */
export const pendingPlaybookSectionTypes = [] as const satisfies readonly PlaybookSectionType[];
export type PendingPlaybookSectionType = (typeof pendingPlaybookSectionTypes)[number];
export type BoundPlaybookSectionType = Exclude<PlaybookSectionType, PendingPlaybookSectionType>;

/**
 * The card sources the cards section draws (CatchCardGrid): the market's
 * cities, from the catalog, and the published host stories
 * (content/stories/hostStories.ts). The other sources (plans, organisers,
 * playbook guides, people) have no adapter to their read model yet, so a
 * page naming one is not rendered.
 */
export const readyPlaybookCardSources = ["cities", "stories"] as const satisfies readonly PlaybookCardSourceKind[];
type PlaybookCardSourceKind = PlaybookSectionOf<"cards">["source"]["kind"];

/**
 * Options inside bound sections that no kit component draws yet:
 * - excerptMessages: an illustrative screen of chat messages (CatchScreenPreview has no chat bubbles);
 * - splitMediaFirst: the media column before the copy (CatchSplitSection always puts media second);
 * - splitGroupLinks: more than one link in a split's group (CatchSplitSectionGroup takes one);
 * - tileKicker: a label above a tile's title (CatchFeatureTile has none);
 * - phoneBar: a bar fixed to the foot of a phone screen (no site part yet);
 * - cardsFilters: filter chips over a cards band (the cities source takes no filter).
 */
export type PendingPlaybookFeature = "excerptMessages" | "splitMediaFirst" | "splitGroupLinks" | "tileKicker" | "phoneBar" | "cardsFilters";

/** The pending section types, features, card sources (`cards:<kind>`) and custom components (`custom:<key>`) a page uses; empty when the page renders. */
export function pendingPlaybookBindings(page: PlaybookPageDocument): string[] {
  const pending = new Set<string>();
  const pendingTypes: readonly string[] = pendingPlaybookSectionTypes;
  for (const section of page.sections) {
    if (pendingTypes.includes(section.type)) pending.add(section.type);
    if (section.type === "split" && section.mediaFirst) pending.add("splitMediaFirst" satisfies PendingPlaybookFeature);
    if (section.type === "split" && section.groups?.some((group) => (group.links?.length ?? 0) > 1)) pending.add("splitGroupLinks" satisfies PendingPlaybookFeature);
    if (section.type === "tiles" && section.items.some((item) => item.kicker)) pending.add("tileKicker" satisfies PendingPlaybookFeature);
    if (section.type === "cards") {
      const readySources: readonly string[] = readyPlaybookCardSources;
      if (!readySources.includes(section.source.kind)) pending.add(`cards:${section.source.kind}`);
      // A stories band never renders empty: a page of host stories needs real ones (content/stories/README.md).
      if (section.source.kind === "stories" && publishedHostStories.length === 0) pending.add("cards:stories");
      if (section.filters) pending.add("cardsFilters" satisfies PendingPlaybookFeature);
    }
    const ready: readonly string[] = readyPlaybookCustomComponents;
    if (section.type === "custom" && !ready.includes(section.component)) pending.add(`custom:${section.component}`);
    if (section.type === "pricing" && section.calculator && !ready.includes(section.calculator)) pending.add(`custom:${section.calculator}`);
    const media = [
      "media" in section ? section.media : undefined,
      ...(section.type === "tabs" ? section.items.map((item) => item.media) : []),
    ];
    if (media.some((item) => item?.kind === "excerpt" && item.card.messages)) pending.add("excerptMessages" satisfies PendingPlaybookFeature);
    if (section.type === "flow" && section.blocks.some((block) => block.messages)) pending.add("excerptMessages" satisfies PendingPlaybookFeature);
  }
  if (page.footer.phoneBar) pending.add("phoneBar" satisfies PendingPlaybookFeature);
  return [...pending].sort();
}
