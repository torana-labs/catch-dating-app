import {CatchButton, type CatchOrganizerCardLegacyProps, type CatchPlanCardProps} from "@catch/web-ui";
import {homePageCopy} from "@content/homePage";
import {interpolateContent as fill} from "@content/interpolate";
import type {OrganizerCardView, PlanCardView} from "../home/homeModel";

/**
 * The card grid's items for plans and organisers, shared by Explore, the city
 * pages and the discovery pages so a plan or an organiser reads the same on
 * each: CatchCardGrid draws them through CatchPlanCard and the paper
 * CatchOrganizerCard.
 */
export function planGridItems(cards: readonly PlanCardView[]): (CatchPlanCardProps & {id: string})[] {
  return cards.map((plan) => ({
    id: plan.key,
    availability: plan.availability,
    detail: plan.detail,
    format: plan.format,
    href: plan.href,
    label: plan.label,
    photoUrl: plan.photoUrl,
    posterLabel: plan.posterLabel,
    price: plan.price,
    title: plan.title,
  }));
}

/** An organiser's page link, or the claim link on an unclaimed page; nothing for one joining without a page yet. */
function organizerAction(organizer: OrganizerCardView) {
  const copy = homePageCopy.organisers;
  if (organizer.action.kind === "page") {
    return <CatchButton href={organizer.action.href} label={copy.seePage} semanticsLabel={fill(copy.seePageLabel, {name: organizer.name})}
      size="sm" variant="secondary" />;
  }
  if (organizer.action.kind === "claim") return <CatchButton href={organizer.action.href} label={copy.claim} size="sm" variant="quiet" />;
  return undefined;
}

export function organizerGridItems(cards: readonly OrganizerCardView[]): (CatchOrganizerCardLegacyProps & {id: string})[] {
  return cards.map((organizer) => ({
    id: organizer.key,
    action: organizerAction(organizer),
    footnote: organizer.footnote,
    href: organizer.href,
    initials: organizer.initials,
    monogramGround: organizer.monogramGround,
    name: organizer.name,
    next: organizer.next,
    subtitle: organizer.subtitle,
  }));
}
