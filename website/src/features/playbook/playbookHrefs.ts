import {brand} from "../../content/brand.ts";
import type {PlaybookDestination} from "../../content/playbook/playbookContract.ts";
import {playbookFixedRoutes, playbookPathForContentKey, siteRouteHrefs} from "./playbookRoutes.ts";

const routeHrefs: Readonly<Record<string, string>> = {
  ...siteRouteHrefs,
  ...Object.fromEntries(playbookFixedRoutes.map((route) => [route.id, route.path])),
};

/**
 * Where links to a page go until the page ships: the one place to switch
 * them. A page may name `{"route": "<id>"}` before its content lands, with
 * an entry here sending the link to a stand-in path; remove the entry when
 * the page's content lands. /host/start/ shipped, so none is left.
 */
export const playbookRouteAliases: Readonly<Record<string, string>> = {};

/** A WhatsApp chat with the support number in the brand record, the message already typed. */
export function playbookWhatsAppHref(message: string): string {
  return `https://wa.me/${brand.support.whatsapp.replace(/\D/gu, "")}?text=${encodeURIComponent(message)}`;
}

/**
 * Where a destination goes. A route id names a site route or a playbook page
 * (a family's page is named by its content key instead); an aliased route
 * goes to its stand-in until its page ships. The content tests hold every
 * destination to a page that exists.
 */
export function playbookHref(to: PlaybookDestination): string {
  if ("kind" in to) return playbookWhatsAppHref(to.message);
  if ("page" in to) {
    const pagePath = playbookPathForContentKey(to.page);
    if (!pagePath) throw new Error(`Playbook destination names page ${to.page}, which is no family page.`);
    return to.anchor ? `${pagePath}#${to.anchor}` : pagePath;
  }
  if (!("route" in to)) return `#${to.anchor}`;
  const alias = playbookRouteAliases[to.route];
  if (alias) return alias;
  const path = routeHrefs[to.route];
  if (!path) throw new Error(`Playbook destination names route ${to.route}, which has no single page.`);
  return to.anchor ? `${path}#${to.anchor}` : path;
}
