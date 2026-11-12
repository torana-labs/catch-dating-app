import type {Meta, StoryObj} from "@storybook/react-vite";

import {CatchButton, CatchRoot, CatchSurface, CatchText} from "@catch/web-ui";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../shared/site";

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

/** The one site footer with a page's Cities column, and named for a product. */
export const PublicSiteFooterVariantsStory: Story = {
  // A page holds one contentinfo landmark: each footer sits in its own labelled section.
  render: () => <CatchRoot theme="day">
    <section aria-label="With cities">
      <PublicSiteFooter cities={[{href: "/mumbai/", label: "Mumbai", soon: false}, {href: "/pune/", label: "Pune", soon: true}]} />
    </section>
    <section aria-label="Product">
      <PublicSiteFooter tagline="Part of Catch. For planners running weddings and destination events in India." wordmark="Catch for weddings" />
    </section>
  </CatchRoot>,
};
