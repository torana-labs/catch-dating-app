import {
  CatchButton,
  CatchIcon,
  CatchLoadingIndicator,
  CatchPageBody,
  CatchPaneLayout,
  CatchRoot,
  CatchStack,
  CatchSurface,
  CatchText,
  CatchTopBar,
} from "@catch/web-ui";
import type {ReactNode} from "react";
import {programmeLinkCopy as copy} from "../../content/programmes";
import {programmeFormat, programmeMadeWith, type ProgrammeBranding} from "./programmeBrandingModel";
import type {ProgrammeLinkScreen} from "./programmeLinkModel";

/**
 * The frame every programme link shares, as the boards draw it on the white
 * ground: the site top bar with the programme's (or the hotel's) name, one
 * reading column (the hotel's wide table on desktop), the loading and
 * unavailable states, and the made-with line. The ready content is the page's.
 * A programme's branding, once its read returns it, sets the format colour
 * and adds the planner's credit to the made-with line.
 */
export function ProgrammeLinkFrame<T>({
  title,
  actions,
  screen,
  refresh,
  refreshing,
  wide = false,
  branding,
  children,
}: {
  title: string | null;
  branding?: ProgrammeBranding | null;
  actions?: ReactNode;
  screen: ProgrammeLinkScreen<T>;
  refresh: () => void;
  refreshing: boolean;
  wide?: boolean;
  children: (view: T) => ReactNode;
}) {
  let body: ReactNode;
  if (screen.kind === "loading") {
    body = (
      <>
        <CatchText as="h1" variant="page-title">{copy.loadingTitle}</CatchText>
        <CatchStack align="center" direction="row" gap={12}>
          <CatchLoadingIndicator />
          <CatchText role="status" tone="secondary" variant="body">{copy.loading}</CatchText>
        </CatchStack>
      </>
    );
  } else if (screen.kind === "unavailable") {
    const [heading, lead] = screen.reason === "expired" ? [copy.expiredTitle, copy.expiredBody] :
      screen.reason === "network" ? [copy.networkTitle, copy.networkBody] : [copy.invalidTitle, copy.invalidBody];
    body = (
      <>
        <CatchStack gap={8}>
          <CatchText as="h1" variant="page-title">{heading}</CatchText>
          <CatchText tone="secondary" variant="body">{lead}</CatchText>
        </CatchStack>
        {screen.reason === "network" ? (
          <CatchStack align="start">
            <CatchButton label={refreshing ? copy.refreshing : copy.refresh} onPressed={refresh}
              status={refreshing ? "loading" : "idle"} />
          </CatchStack>
        ) : null}
      </>
    );
  } else {
    body = children(screen.view);
  }
  return (
    <CatchRoot format={programmeFormat(branding)} theme="day">
      <CatchTopBar actions={actions} title={title ?? copy.brand} variant="site" />
      <CatchPageBody aria-label={copy.mainLabel} as="main" gutter={false} pb="s0" pt="s4">
        <CatchPaneLayout
          main={
            <CatchStack gap="section">
              {body}
              <CatchText align="center" tone="secondary" variant="body-meta">{programmeMadeWith(branding)}</CatchText>
            </CatchStack>
          }
          pattern={wide ? "wide-table" : "reading"}
        />
      </CatchPageBody>
    </CatchRoot>
  );
}

/** The boards' neutral notice with the protected mark: who sees personal data, and for how long. */
export function ProgrammePrivacyNote({children}: {children: string}) {
  return (
    <CatchSurface block="tile">
      <CatchStack align="start" direction="row" gap={12}>
        <CatchIcon name="protected" />
        <CatchText tone="secondary" variant="body-small">{children}</CatchText>
      </CatchStack>
    </CatchSurface>
  );
}
