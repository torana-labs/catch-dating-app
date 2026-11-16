import {brand} from "../../content/brand.ts";
import type {PlaybookDestination} from "../../content/playbook/playbookContract.ts";
import {playbookFixedRoutes, siteRouteHrefs} from "./playbookRoutes.ts";

const routeHrefs: Readonly<Record<string, string>> = {
  ...siteRouteHrefs,
  ...Object.fromEntries(playbookFixedRoutes.map((route) => [route.id, route.path])),
};

/** A WhatsApp chat with the support number in the brand record, the message already typed. */
export function playbookWhatsAppHref(message: string): string {
  return `https://wa.me/${brand.support.whatsapp.replace(/\D/gu, "")}?text=${encodeURIComponent(message)}`;
}

/**
 * Where a destination goes. A route id names a site route or a playbook page
 * (never a family: its pages need parameters); the content tests hold every
 * route a page names to a page that exists.
 */
export function playbookHref(to: PlaybookDestination): string {
  if ("kind" in to) return playbookWhatsAppHref(to.message);
  if (!("route" in to)) return `#${to.anchor}`;
  const path = routeHrefs[to.route];
  if (!path) throw new Error(`Playbook destination names route ${to.route}, which has no single page.`);
  return to.anchor ? `${path}#${to.anchor}` : path;
}
