import {CatchFlowLayout, CatchGroundCard} from "@catch/web-ui";
import type {ReactNode} from "react";
import {PublicSiteFooter, PublicSiteHeader} from "./PublicSiteChrome";
import {WebsitePageMain} from "./PageShell";

/**
 * A booking with no event page around it (CAT-252): a payment receipt, an
 * invitation on its way to its event, or an event whose public page is gone.
 * It is the playbook kit's flow (the LiveCheckout and LiveInvite boards): the
 * kicker, headline and lead over the 640px column, and the booking card as
 * the column's block. It shows no event detail beyond what its steps show,
 * and the pages that use it stay private and unstored. A booking is a
 * one-job flow: the minimal header and no help band.
 */
export function EventBookingFrame({kicker, title, body, children}: {
  kicker?: string;
  title: string;
  body?: string;
  children: ReactNode;
}) {
  return (
    <>
      <PublicSiteHeader variant="minimal" />
      <WebsitePageMain>
        <CatchFlowLayout kicker={kicker} lead={body} title={title}>
          <CatchGroundCard ground="white" outlined>{children}</CatchGroundCard>
        </CatchFlowLayout>
      </WebsitePageMain>
      <PublicSiteFooter helpBand={false} />
    </>
  );
}
