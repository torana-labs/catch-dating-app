import {CatchBand, CatchBandHeader, CatchButton, CatchFeatureTile, CatchGrid, CatchOrganizerCard, CatchStack} from "@catch/web-ui";
import {discoveryPagesCopy as copy} from "@content/discovery/discoveryPages";
import {interpolateContent as fill} from "@content/interpolate";
import {useId} from "react";
import type {OrganizerCardView} from "../home/homeModel";

/** The mint card after the organisers (the kit's claim card): a way in for an organiser who is not listed yet. */
export interface DiscoveryOrganisersClaim {
  title: string;
  body: string;
  action: {label: string; href: string};
}

export interface DiscoveryOrganisersProps {
  kicker: string;
  title: string;
  lead?: string;
  cards: readonly OrganizerCardView[];
  claim?: DiscoveryOrganisersClaim;
  /** A secondary button under the cards, such as "See all organisers". */
  action?: {label: string; href: string};
}

/**
 * "Who runs them" on Explore and the city-by-format pages (the kit's
 * KitCards org band on the tint panel): each organiser as the kit's Follow
 * card (monogram, name, what they run, their next plan and Follow), then,
 * where the page has one, the mint card for an organiser who is not listed.
 * Follow opens the organiser's page, where following happens (phone sign-in
 * and the WhatsApp tick); an organiser without a page has no button. It
 * arranges library parts (D18).
 */
export function DiscoveryOrganisers({kicker, title, lead, cards, claim, action}: DiscoveryOrganisersProps) {
  const titleId = `${useId()}-organisers`;
  return (
    <CatchBand aria-labelledby={titleId} as="section" ground="paper">
      <CatchStack gap={24}>
        <CatchBandHeader ground="paper" kicker={kicker} kickerAccent="mint" lead={lead} size="section" title={title} titleId={titleId} />
        <CatchGrid as="ul" columns={4}>
          {cards.map((card) => (
            <CatchOrganizerCard
              action={card.href ? (
                <CatchButton fullWidth href={card.href} label={copy.follow} semanticsLabel={fill(copy.followLabel, {name: card.name})} size="sm"
                  variant="secondary" />
              ) : undefined}
              ground="white"
              href={card.href}
              initials={card.initials}
              key={card.key}
              monogramGround={card.monogramGround}
              name={card.name}
              next={card.next}
              subtitle={card.subtitle}
            />
          ))}
          {claim ? <CatchFeatureTile body={claim.body} ground="mint" link={claim.action} title={claim.title} /> : null}
        </CatchGrid>
        {action ? (
          <CatchStack direction="row" gap={12}>
            <CatchButton href={action.href} label={action.label} variant="secondary" />
          </CatchStack>
        ) : null}
      </CatchStack>
    </CatchBand>
  );
}
