import {CatchBand, CatchGap, CatchGroundCard, CatchSplit, CatchText} from "@catch/web-ui";
import type {ReactNode} from "react";
import {PublicSiteFooter, PublicSiteHeader} from "./PublicSiteChrome";

/**
 * A booking with no event page around it (CAT-252): a payment receipt, an
 * offer, an invitation on its way to its event, or an event whose public page
 * is gone. The booking card sits where the event page puts it, beside a
 * heading that says what the booking is for. It shows no event detail beyond
 * what its steps show, and the pages that use it stay private and unstored.
 */
export function EventBookingFrame({title, body, children}: {
  title: string;
  body?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <PublicSiteHeader />
      <CatchBand as="main" pt="compact">
        <CatchSplit
          end={<CatchGroundCard ground="white" outlined>{children}</CatchGroundCard>}
          gap="regular"
          railSide="end"
          ratio="narrowRail"
          start={(
            <CatchGap size="related">
              <CatchText as="h1" variant="displayM">{title}</CatchText>
              {body ? <CatchText as="p" color="ink2" variant="bodyL">{body}</CatchText> : null}
            </CatchGap>
          )}
        />
      </CatchBand>
      <PublicSiteFooter />
    </>
  );
}
