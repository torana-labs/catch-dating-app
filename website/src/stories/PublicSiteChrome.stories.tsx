import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ComponentProps, ReactNode} from "react";
import {expect, userEvent, within} from "storybook/test";

import {CatchButton, CatchRoot, CatchSurface, CatchText} from "@catch/web-ui";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../shared/site";

const publicRouteIds = ["home", "visitor_discovery", "host", "claim", "claim_lookup", "privacy", "terms", "help", "not_found", "organizer_search", "organizer_listing_canonical", "organizer_listing_legacy", "event_detail_canonical"];

// The header's links move into the phone menu by the window's width, so each
// width is a viewport rather than a frame.
const viewports = {
  chromeDesktop: {name: "Site chrome · desktop 1280", styles: {width: "1280px", height: "720px"}, type: "desktop"},
  chromePhone: {name: "Site chrome · phone 390", styles: {width: "390px", height: "720px"}, type: "mobile"},
} as const;
const at1280 = {globals: {viewport: {value: "chromeDesktop", isRotated: false}}};
const at390 = {globals: {viewport: {value: "chromePhone", isRotated: false}}};

const meta = {
  title: "Marketing Website/Shared/Public site chrome",
  component: PublicSiteHeader,
  parameters: {viewport: {options: viewports}},
} satisfies Meta<typeof PublicSiteHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

const eventTrail = {links: [{href: "/explore/", label: "What’s on"}, {href: "/mumbai/", label: "Mumbai"}], current: "Sunday morning run"};
const billingTrail = {links: [{href: "/host/", label: "For hosts"}], current: "Billing"};

/** One header over a stand-in page, so each story holds one banner and one Primary navigation. */
function HeaderPage({children = "Page", ...props}: ComponentProps<typeof PublicSiteHeader> & {children?: ReactNode}) {
  return (
    <CatchRoot theme="day">
      <PublicSiteHeader {...props} />
      <WebsitePageMain>
        <CatchSurface as="section" block="band"><CatchText as="h1" variant="page-title">{children}</CatchText></CatchSurface>
      </WebsitePageMain>
    </CatchRoot>
  );
}

export const PublicSiteHeaderStory: Story = {
  parameters: {catchComponent: {id: "shared_public_site_header", routeIds: publicRouteIds,
    states: ["global-navigation"]}},
  render: () => <HeaderPage>Organiser profile</HeaderPage>,
};

/** The guest header: What's on and For hosts, then Get notified. */
export const GuestHeader1280: Story = {...at1280, name: "Guest header · 1280", render: () => <HeaderPage variant="guest">Guest page</HeaderPage>};
export const GuestHeader390: Story = {...at390, name: "Guest header · 390", render: () => <HeaderPage variant="guest">Guest page</HeaderPage>};

/** The guest header with the event page's breadcrumb: What's on, the city, the event. */
export const GuestHeaderBreadcrumbs1280: Story = {
  ...at1280,
  name: "Guest header with breadcrumbs · 1280",
  render: () => <HeaderPage breadcrumbs={eventTrail} variant="guest">Sunday morning run</HeaderPage>,
};
export const GuestHeaderBreadcrumbs390: Story = {
  ...at390,
  name: "Guest header with breadcrumbs · 390",
  render: () => <HeaderPage breadcrumbs={eventTrail} variant="guest">Sunday morning run</HeaderPage>,
};

/**
 * The host header: What's on and Help, the For hosts dropdown, WhatsApp and
 * Start free trial. The play opens the dropdown and closes it with Escape.
 */
export const HostHeader1280: Story = {
  ...at1280,
  name: "Host header · 1280",
  render: () => <HeaderPage variant="host">Host page</HeaderPage>,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", {name: "For hosts"});
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{Escape}");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  },
};
/** Below 600px the dropdown draws nothing; its pages are in the phone menu. */
export const HostHeader390: Story = {...at390, name: "Host header · 390", render: () => <HeaderPage variant="host">Host page</HeaderPage>};

/** The host header over host billing, with its breadcrumb back to For hosts. */
export const HostHeaderBreadcrumbs1280: Story = {
  ...at1280,
  name: "Host header with breadcrumbs · 1280",
  render: () => <HeaderPage breadcrumbs={billingTrail} variant="host">Billing</HeaderPage>,
};
export const HostHeaderBreadcrumbs390: Story = {
  ...at390,
  name: "Host header with breadcrumbs · 390",
  render: () => <HeaderPage breadcrumbs={billingTrail} variant="host">Billing</HeaderPage>,
};

/** A one-job flow's header, such as a booking: the wordmark alone. */
export const MinimalHeader1280: Story = {...at1280, name: "Minimal header · 1280", render: () => <HeaderPage variant="minimal">Your booking</HeaderPage>};
export const MinimalHeader390: Story = {...at390, name: "Minimal header · 390", render: () => <HeaderPage variant="minimal">Your booking</HeaderPage>};

/** The offer strip the header can carry above the bar; no page passes one yet. */
export const OfferStrip: Story = {
  ...at1280,
  name: "Offer strip · 1280",
  render: () => (
    <HeaderPage offer={{lead: "A sample offer lead.", body: "A sample line about the offer.", action: {href: "#offer", label: "A sample action"}}} variant="host">
      Host page
    </HeaderPage>
  ),
};

/** A product page's header: its name, its sections and its action. */
export const ProductPageHeaderStory: Story = {
  render: () => <CatchRoot theme="day">
    <PublicSiteHeader actions={<CatchButton href="#apply" label="Apply for a pilot" size="sm" />}
      links={[{href: "#night", label: "On the night"}, {href: "#layers", label: "Ways to use Catch"}, {href: "#pricing", label: "Pricing"}]} title="Catch for hosts" />
  </CatchRoot>,
};

export const PublicSiteFooterStory: Story = {
  parameters: {catchComponent: {id: "shared_public_site_footer", routeIds: publicRouteIds,
    states: ["global-links"]}},
  render: () => <PublicSiteFooter />,
};

/**
 * The guest footer with and without the help band, and the host footer with
 * it. A page holds one contentinfo landmark: each footer sits in its own
 * labelled section with its own navigation name.
 */
function Footers() {
  return (
    <CatchRoot theme="day">
      <section aria-label="Guest footer with the help band">
        <PublicSiteFooter navLabel="Footer, guest" />
      </section>
      <section aria-label="Guest footer without the help band">
        <PublicSiteFooter helpBand={false} navLabel="Footer, one-job flow" />
      </section>
      <section aria-label="Host footer with the help band">
        <PublicSiteFooter navLabel="Footer, host" variant="host" />
      </section>
    </CatchRoot>
  );
}
export const Footers1280: Story = {...at1280, name: "Footers · 1280", render: () => <Footers />};
export const Footers390: Story = {...at390, name: "Footers · 390", render: () => <Footers />};

/** The one site footer with a page's Cities column, and named for a product. */
export const PublicSiteFooterVariantsStory: Story = {
  // A page holds one contentinfo landmark: each footer sits in its own labelled section.
  render: () => <CatchRoot theme="day">
    <section aria-label="With cities">
      <PublicSiteFooter cities={[{href: "/mumbai/", label: "Mumbai", soon: false}, {href: "/pune/", label: "Pune", soon: true}]} />
    </section>
    <section aria-label="Product">
      <PublicSiteFooter navLabel="Footer, product page" tagline="Part of Catch. For planners running weddings and destination events in India." variant="host" wordmark="Catch for weddings" />
    </section>
  </CatchRoot>,
};
