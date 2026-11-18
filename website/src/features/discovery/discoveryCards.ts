import type {CatchOrganizerCardSystemProps, CatchPlanCardProps} from "@catch/web-ui";
import {discoveryPagesCopy as copy} from "@content/discovery/discoveryPages";
import {interpolateContent as fill} from "@content/interpolate";
import type {HomeCity, HomeOrganizer, HomePlan} from "../home/homeTypes";
import {organizerCard, planCard, type OrganizerCardView, type PlanCardView} from "../home/homeModel";
import type {DiscoveryOrganizer, DiscoveryPlan} from "./discoveryTypes";

/**
 * Plans and organisers as Explore, the city pages and the discovery pages
 * draw them, so each reads the same everywhere: the homepage's card views,
 * with the read model's women-led tag on the host line, then the card grid's
 * items (the canvas plan card with its date square, and the organiser card
 * the homepage's organiser band uses).
 */
export function discoveryPlanCard(plan: HomePlan, timezone: string, withDate = true): PlanCardView {
  const card = planCard(plan, timezone, withDate);
  return (plan as DiscoveryPlan).womenLed ? {...card, detail: fill(copy.womenLedDetail, {detail: card.detail})} : card;
}

export function discoveryOrganizerCard(organizer: HomeOrganizer, city: HomeCity): OrganizerCardView {
  const card = organizerCard(organizer, city);
  return (organizer as DiscoveryOrganizer).womenLed ?
    {...card, meta: fill(copy.womenLedMeta, {meta: card.meta}), subtitle: fill(copy.womenLedMeta, {meta: card.subtitle})} : card;
}

export function planGridItems(cards: readonly PlanCardView[]): (CatchPlanCardProps & {id: string})[] {
  return cards.map((plan) => ({
    id: plan.key, href: plan.href, title: plan.title, label: plan.label, format: plan.format, detail: plan.detail,
    price: plan.price, availability: plan.availability, photoUrl: plan.photoUrl, posterLabel: plan.posterLabel, date: plan.date,
  }));
}

/** An organiser links to their page, or to its claim section while unclaimed; one joining without a page yet does not link. */
export function organizerGridItems(cards: readonly OrganizerCardView[]): (CatchOrganizerCardSystemProps & {id: string})[] {
  return cards.map((organizer) => ({
    id: organizer.key, name: organizer.name, initials: organizer.initials, color: organizer.color, meta: organizer.meta,
    href: organizer.action.kind === "none" ? undefined : organizer.action.href,
  }));
}
