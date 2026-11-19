import type {CatchOrganizerCardSystemProps, CatchPlanCardProps} from "@catch/web-ui";
import {discoveryPagesCopy as copy} from "@content/discovery/discoveryPages";
import {interpolateContent as fill} from "@content/interpolate";
import {listingRequestHref} from "@content/listingRequest";
import {unclaimedListingCopy as unclaimed} from "@content/organizerPage";
import type {HomeCity, HomeOrganizer, HomePlan} from "../home/homeTypes";
import {organizerCard, planCard, type OrganizerCardView, type PlanCardView} from "../home/homeModel";
import type {DiscoveryOrganizer, DiscoveryPlan} from "./discoveryTypes";

/**
 * Plans and organisers as Explore, the city pages and the discovery pages
 * draw them, so each reads the same everywhere: the homepage's card views,
 * with the read model's women-led tag (a plan's badge on its photo, the
 * start of an organiser's line), then the card grid's items (the canvas plan
 * card with its date square, and the organiser card the homepage's organiser
 * band uses).
 */
export type DiscoveryPlanCardView = PlanCardView & {badge?: string};

export function discoveryPlanCard(plan: HomePlan, timezone: string, withDate = true): DiscoveryPlanCardView {
  const card = planCard(plan, timezone, withDate);
  return (plan as DiscoveryPlan).womenLed ? {...card, badge: copy.womenLedBadge} : card;
}

/**
 * An organiser who has not claimed their listing, with a page or still
 * joining without one: the short unclaimed label and a link to report or
 * remove the listing on the request form (listings plan B4, 19 Nov 2026).
 */
export interface UnclaimedOrganizerListingView {
  label: string;
  report: {label: string; semanticsLabel: string; href: string};
}

export type DiscoveryOrganizerCardView = OrganizerCardView & {listing?: UnclaimedOrganizerListingView};

/** Not claimed yet by the read model's claim state: unclaimed, or a claim still under review. */
export function unclaimedOrganizerListing(organizer: Pick<HomeOrganizer, "organizerId" | "name" | "claimState">):
  UnclaimedOrganizerListingView | undefined {
  if (organizer.claimState !== "unclaimed" && organizer.claimState !== "claimPending") return undefined;
  return {
    label: unclaimed.cardLabel,
    report: {label: unclaimed.cardReport, semanticsLabel: unclaimed.cardReportLabel(organizer.name),
      href: listingRequestHref({kind: "organizer", id: organizer.organizerId})},
  };
}

export function discoveryOrganizerCard(organizer: HomeOrganizer, city: HomeCity): DiscoveryOrganizerCardView {
  const base = organizerCard(organizer, city);
  const card = (organizer as DiscoveryOrganizer).womenLed ?
    {...base, meta: fill(copy.womenLedMeta, {meta: base.meta}), subtitle: fill(copy.womenLedMeta, {meta: base.subtitle})} : base;
  const listing = unclaimedOrganizerListing(organizer);
  return listing ? {...card, listing} : card;
}

export function planGridItems(cards: readonly DiscoveryPlanCardView[]): (CatchPlanCardProps & {id: string})[] {
  return cards.map((plan) => ({
    id: plan.key, href: plan.href, title: plan.title, label: plan.label, format: plan.format, detail: plan.detail,
    price: plan.price, availability: plan.availability, photoUrl: plan.photoUrl, posterLabel: plan.posterLabel, date: plan.date,
    ...(plan.badge ? {badge: plan.badge} : {}),
  }));
}

/**
 * An organiser links to their page, or to its claim section while unclaimed; one joining without a page yet does not link.
 * The compact grid card has room for one line, so an unclaimed organiser's line starts with the unclaimed label.
 */
export function organizerGridItems(cards: readonly DiscoveryOrganizerCardView[]): (CatchOrganizerCardSystemProps & {id: string})[] {
  return cards.map((organizer) => ({
    id: organizer.key, name: organizer.name, initials: organizer.initials, color: organizer.color,
    meta: organizer.listing ? `${organizer.listing.label} · ${organizer.meta}` : organizer.meta,
    href: organizer.action.kind === "none" ? undefined : organizer.action.href,
  }));
}
