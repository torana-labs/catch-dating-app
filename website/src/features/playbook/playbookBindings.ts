import type {PlaybookPageDocument, PlaybookSectionType} from "../../content/playbook/playbookContract.ts";

/**
 * The parts of the content contract that have no @catch/web-ui component to
 * draw them yet. A page that uses any of them is not rendered: it 404s, the
 * same as a page whose content is not written, rather than render with a
 * band missing. PlaybookSections.tsx binds every section type not listed
 * here, and its types fail if the two disagree.
 */
export const pendingPlaybookSectionTypes = ["pricing", "story", "tabs", "table", "article", "cards"] as const satisfies readonly PlaybookSectionType[];
export type PendingPlaybookSectionType = (typeof pendingPlaybookSectionTypes)[number];
export type BoundPlaybookSectionType = Exclude<PlaybookSectionType, PendingPlaybookSectionType>;

/**
 * Options inside bound sections that the bound component cannot draw yet:
 * excerptMessages, an illustrative screen of chat messages (CatchScreenPreview
 * has no chat bubbles); splitMediaFirst, the media column before the copy
 * (CatchSplitSection always puts media second).
 */
export type PendingPlaybookFeature = "excerptMessages" | "splitMediaFirst";

/** The pending section types and features a page uses; empty when the page renders. */
export function pendingPlaybookBindings(page: PlaybookPageDocument): string[] {
  const pending = new Set<string>();
  const pendingTypes: readonly string[] = pendingPlaybookSectionTypes;
  for (const section of page.sections) {
    if (pendingTypes.includes(section.type)) pending.add(section.type);
    if (section.type === "split" && section.mediaFirst) pending.add("splitMediaFirst" satisfies PendingPlaybookFeature);
    const media = [
      "media" in section ? section.media : undefined,
      ...(section.type === "tabs" ? section.items.map((item) => item.media) : []),
    ];
    if (media.some((item) => item?.kind === "excerpt" && item.card.messages)) pending.add("excerptMessages" satisfies PendingPlaybookFeature);
    if (section.type === "flow" && section.blocks.some((block) => block.messages)) pending.add("excerptMessages" satisfies PendingPlaybookFeature);
  }
  return [...pending].sort();
}
