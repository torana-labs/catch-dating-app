import {applyBrand} from "../../content/brand.ts";
import {discoveryPlaybookPages} from "../../content/playbook/pages/discovery/index.ts";
import {hostPlaybookPages} from "../../content/playbook/pages/host/index.ts";
import {productPlaybookPages} from "../../content/playbook/pages/product/index.ts";
import {resourcesPlaybookPages} from "../../content/playbook/pages/resources/index.ts";
import {
  livePlaybookPage,
  validatedPlaybookPage,
  type PlaybookPageDocument,
  type PlaybookPageEntry,
  type PlaybookPageIndex,
} from "../../content/playbook/playbookContract.ts";
import {pendingPlaybookBindings} from "./playbookBindings.ts";
import {
  matchPlaybookRoute,
  playbookPathForContentKey,
  type PlaybookRouteGroup,
  type PlaybookRouteMatch,
} from "./playbookRoutes.ts";

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
 * Every registered page, from every section index, with the path it is
 * served at. A key that names no route of its section, or a family page
 * with the wrong number of parameters, is skipped here and fails
 * playbookPages.test.ts.
 */
export function registeredPlaybookPages(): PlaybookPageRef[] {
  const refs: PlaybookPageRef[] = [];
  for (const index of Object.values(playbookPageIndexes)) {
    for (const contentKey of Object.keys(index)) {
      const path = playbookPathForContentKey(contentKey);
      const match = path ? matchPlaybookRoute(path) : null;
      if (match?.contentKey === contentKey) refs.push({match, entry: index[contentKey]});
    }
  }
  return refs;
}

/**
 * Loads a page, validates it (a malformed page fails loudly instead of
 * rendering half a page), checks it is the page its index says, keeps its
 * live sections and actions (show-when-live: hidden parts stay in the file),
 * and resolves its brand tokens. Ad landing pages are always noindex. Null
 * when the live page uses a section or option no kit component draws yet
 * (./playbookBindings): such a page 404s like an unwritten one.
 */
export async function loadPlaybookPage(ref: PlaybookPageRef): Promise<PlaybookPageDocument | null> {
  const written = validatedPlaybookPage((await ref.entry.load()).default);
  if (written.id !== ref.match.contentKey || written.route !== ref.match.route.id) {
    throw new Error(`Playbook page ${ref.entry.file} is ${written.id} on ${written.route}, not ${ref.match.contentKey}.`);
  }
  const page = livePlaybookPage(written);
  if (pendingPlaybookBindings(page).length > 0) return null;
  const branded = applyBrand(page);
  return alwaysNoindexPlaybookRoutes.has(page.route) ? {...branded, meta: {...branded.meta, noindex: true}} : branded;
}

/**
 * The paths of every page the owner has approved for search: registered,
 * renderable, and with meta.noindex false. Ad landing pages never are.
 */
export async function approvedPlaybookPaths(): Promise<string[]> {
  const pages = await Promise.all(registeredPlaybookPages().map(async (ref) => ({ref, page: await loadPlaybookPage(ref)})));
  return pages.filter(({page}) => page && !page.meta.noindex).map(({ref}) => ref.match.canonicalPath);
}
