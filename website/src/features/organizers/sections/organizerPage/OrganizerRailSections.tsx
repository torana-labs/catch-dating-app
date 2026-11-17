import {
  CatchBadge,
  CatchButton,
  CatchIcon,
  CatchIconAction,
  CatchLinkTile,
  CatchStack,
  CatchSurface,
  CatchText,
  useCatchBandKicker,
} from "@catch/web-ui";
import {organizerPageCopy as copy} from "../../../../content/organizerPage";
import type {OrganizerPageController} from "../../useOrganizerPageController";

/**
 * The next event wherever it is sold, at the top of the rail: the board's
 * ink spotlight with the countdown, where it is sold, what and when, and the
 * price beside the action. The whole spotlight opens the event.
 */
export function OrganizerNextUpSection({controller}: {controller: OrganizerPageController}) {
  const next = controller.view.nextUp;
  // The countdown takes the coral kicker, bright on the ink spotlight.
  const kicker = useCatchBandKicker({accent: "coral", ground: "ink"});
  if (!next) return null;
  return (
    <CatchSurface block="spotlight" color="ink" href={next.href} onClick={() => controller.openEvent(next)}>
      <CatchStack gap={12}>
        <CatchStack align="center" direction="row" gap={8} justify="between">
          <CatchText {...kicker}>{next.label}</CatchText>
          <CatchBadge label={next.sourceLabel} recipe="onDark" />
        </CatchStack>
        <CatchText variant="display-title">{next.title}</CatchText>
        <CatchText tone="secondary" variant="body">{next.when}</CatchText>
        <CatchStack align="center" direction="row" gap={12} justify="between">
          <CatchText variant="label-action">{next.meta}</CatchText>
          <CatchButton isInteractive={false} label={next.nextAction} onPressed={null} size="md" variant="accent" />
        </CatchStack>
      </CatchStack>
    </CatchSurface>
  );
}

/**
 * The organiser's links as the board's link tiles, pinned first on the
 * organiser's colour; until owners add links, the public pages the listing
 * came from.
 */
export function OrganizerLinksSection({controller}: {controller: OrganizerPageController}) {
  const {links, header} = controller.view;
  if (!links.length) return null;
  return (
    <CatchStack aria-label={copy.linksLabel} as="nav" gap={8}>
      {links.map((link) => (
        <CatchLinkTile
          accent={header.accent}
          href={link.href}
          icon={<CatchIcon name={link.icon} size={20} />}
          key={link.key}
          onClick={() => controller.openLink(link)}
          pinned={link.pinned}
          subtitle={link.subtitle}
          title={link.title}
        />
      ))}
    </CatchStack>
  );
}

/** The social profiles the owner linked, as the board's row of round icons under the links. */
export function OrganizerSocialsSection({controller}: {controller: OrganizerPageController}) {
  const {socials} = controller.view;
  if (!socials.length) return null;
  return (
    <CatchStack aria-label={copy.socialsLabel} as="nav" direction="row" gap={8} wrap>
      {socials.map((link) => (
        <CatchIconAction href={link.href} icon={link.icon} key={link.key} label={link.title}
          onClick={() => controller.openLink(link)} />
      ))}
    </CatchStack>
  );
}
