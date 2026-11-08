import {CatchButton, CatchPageTabBar, CatchStack, CatchSurface, CatchText} from "@catch/web-ui";
import {ownerViewCopy} from "../../../content/ownerView";
import {SignInButton} from "../../account/SignInSheet";
import type {OrganizerEventView} from "../organizerPageView";
import {OwnerAudiencePanel} from "./OwnerAudiencePanel";
import {OwnerInsightsPanel} from "./OwnerInsightsPanel";
import {OwnerLinksPanel} from "./OwnerLinksPanel";
import {OwnerPagePanel} from "./OwnerPagePanel";
import {OwnerSettingsPanel} from "./OwnerSettingsPanel";
import type {OwnerViewController} from "./useOwnerViewController";

const copy = ownerViewCopy;

/**
 * The owner bar at the top of a claimed organiser's own page, for the team:
 * who they are on the page, and the tools their role allows behind one
 * "Manage" button, so the public page underneath reads as visitors see it.
 * Renders nothing for anyone else.
 */
export function OwnerView({controller, displayUrl, events, name, readAt}: {
  controller: OwnerViewController;
  displayUrl: string;
  events: readonly OrganizerEventView[];
  name: string;
  readAt: number;
}) {
  if (controller.hidden || !controller.data || !controller.role) return null;
  const {tab, tabs, open} = controller;
  return (
    <CatchSurface aria-label={copy.bar.label} as="section" block="tile">
      <CatchStack align="center" direction="row" gap={12} justify="between">
        <CatchStack gap={2}>
          <CatchText variant="label-kicker">{`${copy.bar.kicker} · ${copy.bar.roles[controller.role]}`}</CatchText>
          <CatchText as="h2" variant="title-row">{copy.bar.title(name)}</CatchText>
        </CatchStack>
        <CatchButton label={open ? copy.bar.close : copy.bar.open} onPressed={controller.toggle} size="sm"
          variant={open ? "secondary" : "primary"} />
      </CatchStack>
      {open ? (
        <CatchStack gap={20}>
          {tabs.length > 1 ? (
            <CatchPageTabBar label={copy.bar.tabsLabel} onChanged={controller.setTab}
              options={tabs.map((value) => ({value, label: copy.tabs[value]}))} selected={tab} size="sm" />
          ) : null}
          {tab === "insights" ? <OwnerInsightsPanel controller={controller} /> : null}
          {tab === "links" ? <OwnerLinksPanel controller={controller} readAt={readAt} /> : null}
          {tab === "page" ? <OwnerPagePanel controller={controller} /> : null}
          {tab === "audience" ? <OwnerAudiencePanel controller={controller} /> : null}
          {tab === "settings" ? <OwnerSettingsPanel controller={controller} displayUrl={displayUrl} events={events} /> : null}
          <CatchText as="p" tone="secondary" variant="body-small">{copy.bar.liveNote}</CatchText>
        </CatchStack>
      ) : null}
    </CatchSurface>
  );
}

/**
 * A quiet line at the foot of a claimed page for a signed-out visitor who
 * may be its organiser. It opens the website sign-in sheet (P4.8a); once
 * signed in, the controller's auth watch loads the owner view.
 */
export function OwnerSignInPrompt({controller}: {controller: OwnerViewController}) {
  if (!controller.signedOut) return null;
  return (
    <CatchStack align="center" direction="row" gap={8} justify="center" wrap>
      <CatchText tone="secondary" variant="body-small">{copy.signIn.title}</CatchText>
      <SignInButton label={copy.signIn.action} />
    </CatchStack>
  );
}
