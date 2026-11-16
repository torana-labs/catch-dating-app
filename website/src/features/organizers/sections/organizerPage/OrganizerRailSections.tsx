import {CatchBadge, CatchButton, CatchIcon, CatchLinkTile, CatchStack, CatchSurface, CatchText} from "@catch/web-ui";
import {organizerPageCopy as copy} from "../../../../content/organizerPage";
import type {OrganizerPageController} from "../../useOrganizerPageController";

/**
 * The next event wherever it is sold, on the first phone screen: the board's
 * ink spotlight with the countdown, where it is sold, what and when, and the
 * price beside the action. The whole spotlight opens the event.
 */
export function OrganizerNextUpSection({controller}: {controller: OrganizerPageController}) {
  const next = controller.view.nextUp;
  if (!next) return null;
  return (
    <CatchSurface block="spotlight" color="ink" href={next.href} onClick={() => controller.openEvent(next)}>
      <CatchStack align="center" direction="row" gap={8} justify="between">
        <CatchText variant="label-kicker">{next.label}</CatchText>
        <CatchBadge label={next.sourceLabel} recipe="onDark" />
      </CatchStack>
      <CatchText variant="display-sm">{next.title}</CatchText>
      <CatchText variant="body-small">{next.when}</CatchText>
      <CatchStack align="center" direction="row" gap={8} justify="between">
        <CatchText variant="label-action">{next.meta}</CatchText>
        <CatchButton isInteractive={false} label={next.nextAction} onPressed={null} size="sm" variant="accent" />
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
