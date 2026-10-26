import {CatchGap, CatchIcon, CatchLinkTile, CatchPreviewCard} from "@catch/web-ui";
import {organizerPageCopy as copy} from "../../../../content/organizerPage";
import type {OrganizerPageController} from "../../useOrganizerPageController";

/** The next event wherever it is sold, on the first phone screen. */
export function OrganizerNextUpSection({controller}: {controller: OrganizerPageController}) {
  const next = controller.view.nextUp;
  if (!next) return null;
  return (
    <CatchPreviewCard
      action={next.nextAction}
      actionAccent="coral"
      detail={next.when}
      ground="ink"
      href={next.href}
      label={next.label}
      labelAccent="coral"
      meta={next.meta}
      onClick={() => controller.openEvent(next)}
      size="feature"
      tag={next.sourceLabel}
      title={next.title}
    />
  );
}

/** The organiser's links, pinned first; until owners add links, the public pages the listing came from. */
export function OrganizerLinksSection({controller}: {controller: OrganizerPageController}) {
  const {links} = controller.view;
  if (!links.length) return null;
  return (
    <CatchGap aria-label={copy.linksLabel} as="nav" size="inline">
      {links.map((link) => (
        <CatchLinkTile
          href={link.href}
          icon={<CatchIcon icon={link.icon} size="row" />}
          key={link.key}
          onClick={() => controller.openLink(link)}
          pinned={link.pinned}
          subtitle={link.subtitle}
          title={link.title}
        />
      ))}
    </CatchGap>
  );
}
