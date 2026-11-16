import {CatchFlowLayout, CatchGroundCard} from "@catch/web-ui";
import type {ReactNode} from "react";
import {PublicSiteFooter, PublicSiteHeader} from "./PublicSiteChrome";
import {WebsitePageMain} from "./PageShell";

/**
 * A booking with no event page around it (CAT-252): a payment receipt, an
 * invitation on its way to its event, or an event whose public page is gone;
 * and the other one-job event flows, the event update and the rehearsal.
 * It is the playbook kit's flow (the LiveCheckout and LiveInvite boards): the
 * kicker, headline and lead over the 640px column, and the booking card as
 * the column's block. It shows no event detail beyond what its steps show,
 * and the pages that use it stay private and unstored. A booking is a
 * one-job flow: the minimal header and no help band.
 */
export function EventBookingFrame({kicker, title, body, banner, card = true, children}: {
  kicker?: string;
  title: string;
  body?: string;
  /** A notice above the head, such as the rehearsal's practice banner. */
  banner?: ReactNode;
  /** False: the children are the column's own blocks (an event update, a rehearsal). */
  card?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <PublicSiteHeader variant="minimal" />
      <WebsitePageMain>
        <CatchFlowLayout banner={banner} kicker={kicker} lead={body} title={title}>
          {card ? <CatchGroundCard ground="white" outlined>{children}</CatchGroundCard> : children}
        </CatchFlowLayout>
      </WebsitePageMain>
      <PublicSiteFooter helpBand={false} />
    </>
  );
}
