import type {Meta, StoryObj} from "@storybook/react-vite";

import {CatchButton, CatchRoot, CatchSurface, CatchText} from "@catch/web-ui";
import {PublicSiteFooter, PublicSiteHeader, SiteFooterBand, WebsitePageMain} from "../shared/site";

const publicRouteIds = ["home", "visitor_discovery", "host", "claim", "claim_lookup", "privacy", "terms", "help", "not_found", "organizer_search", "organizer_listing_canonical", "organizer_listing_legacy", "event_detail_canonical", "host_apply"];
const meta = {title: "Marketing Website/Shared/Public site chrome", component: PublicSiteHeader} satisfies Meta<typeof PublicSiteHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const PublicSiteHeaderStory: Story = {
  parameters: {catchComponent: {id: "shared_public_site_header", routeIds: publicRouteIds,
    states: ["global-navigation"]}},
  render: () => <CatchRoot theme="day">
    <PublicSiteHeader />
    <WebsitePageMain>
      <CatchSurface as="section" block="band"><CatchText as="h1" variant="page-title">Organiser profile</CatchText></CatchSurface>
    </WebsitePageMain>
  </CatchRoot>,
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

/** The system footer band, with columns and short. */
export const SiteFooterBandStory: Story = {
  // A page holds one contentinfo landmark: each footer sits in its own labelled section.
  render: () => <CatchRoot theme="day">
    <section aria-label="With columns">
      <SiteFooterBand columns={[{title: "Explore", links: [{href: "/explore/", label: "What’s on"}]}, {title: "Hosts", links: [{href: "/host/", label: "Catch for hosts"}]}]}
        label="Footer" tagline="Meet people in real life, through hosts who bring them together." wordmark="Catch" />
    </section>
    <section aria-label="Short">
      <SiteFooterBand label="Footer" tagline="Meet people in real life, through hosts who bring them together." wordmark="Catch" />
    </section>
  </CatchRoot>,
};
