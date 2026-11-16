import {applyBrand} from "../../content/brand.ts";
import {discoveryPlaybookPages} from "../../content/playbook/pages/discovery/index.ts";
import {hostPlaybookPages} from "../../content/playbook/pages/host/index.ts";
import {productPlaybookPages} from "../../content/playbook/pages/product/index.ts";
import {resourcesPlaybookPages} from "../../content/playbook/pages/resources/index.ts";
import {
  validatedPlaybookPage,
  type PlaybookPageDocument,
  type PlaybookPageEntry,
  type PlaybookPageIndex,
} from "../../content/playbook/playbookContract.ts";
import {matchPlaybookRoute, type PlaybookRouteGroup, type PlaybookRouteMatch} from "./playbookRoutes.ts";

/**
 * Every section's page index, by the section folder it lives in. Each index
 * is owned by its section's content PR; this map only joins them. No
 * import.meta.glob: each page is one explicit lazy import in its index.
 */
export const playbookPageIndexes: {readonly [G in PlaybookRouteGroup]: PlaybookPageIndex} = {
  host: hostPlaybookPages,
  product: productPlaybookPages,
  resources: resourcesPlaybookPages,
  discovery: discoveryPlaybookPages,
};

/** Routes whose pages never enter search: ad landing pages. */
export const alwaysNoindexPlaybookRoutes: ReadonlySet<string> = new Set(["lp_campaign"]);

/** A path that names a playbook page whose content is registered. */
export interface PlaybookPageRef {
  readonly match: PlaybookRouteMatch;
  readonly entry: PlaybookPageEntry;
}

/**
 * The registered playbook page a path names, or null: an unknown path, or a
 * registered route whose page is not written yet, which must 404 rather than
 * render empty. Synchronous, so the router and the server pick the page key
 * before loading anything.
 */
export function resolvePlaybookPage(pathname: string): PlaybookPageRef | null {
  const match = matchPlaybookRoute(pathname);
  if (!match) return null;
  const entry = playbookPageIndexes[match.route.group][match.contentKey];
  return entry ? {match, entry} : null;
}

/**
 * Loads a page, validates it (a malformed page fails loudly instead of
 * rendering half a page), checks it is the page its index says, and resolves
 * its brand tokens. Ad landing pages are always noindex.
 */
export async function loadPlaybookPage(ref: PlaybookPageRef): Promise<PlaybookPageDocument> {
  const page = validatedPlaybookPage((await ref.entry.load()).default);
  if (page.id !== ref.match.contentKey || page.route !== ref.match.route.id) {
    throw new Error(`Playbook page ${ref.entry.file} is ${page.id} on ${page.route}, not ${ref.match.contentKey}.`);
  }
  const branded = applyBrand(page);
  return alwaysNoindexPlaybookRoutes.has(page.route) ? {...branded, meta: {...branded.meta, noindex: true}} : branded;
}
