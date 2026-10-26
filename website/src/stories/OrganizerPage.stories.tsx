import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchBand, CatchGap, CatchSplit} from "@catch/web-ui";
import type {ReactNode} from "react";
import {MemoryRouter} from "react-router";
import {expect, userEvent, within} from "storybook/test";
import {HostListingPage} from "../features/organizers/HostListingPage";
import type {OrganizerPageRecord} from "../features/organizers/organizerPage";
import {OrganizerAboutSection, OrganizerClaimSection, OrganizerPageFooter} from "../features/organizers/sections/organizerPage/OrganizerAboutSections";
import {OrganizerEventsSection, OrganizerMomentsSection} from "../features/organizers/sections/organizerPage/OrganizerEventsSections";
import {OrganizerIdentitySection} from "../features/organizers/sections/organizerPage/OrganizerIdentitySection";
import {OrganizerLinksSection, OrganizerNextUpSection} from "../features/organizers/sections/organizerPage/OrganizerRailSections";
import {OrganizerReviewsSection} from "../features/organizers/sections/organizerPage/OrganizerReviewsSection";
import {
  organizerPageBackends,
  useOrganizerPageController,
  type OrganizerPageBackends,
  type OrganizerPageController,
} from "../features/organizers/useOrganizerPageController";
import {WebsiteQueryProvider} from "../shared/query/queryClient";
import {
  claimedOrganizerPage,
  emptyCalendarOrganizerPage,
  generatedOrganizerPage,
  noReviewsOrganizerPage,
  organizerPageReadAt,
  organizerStoryListing,
} from "./fixtures/organizerPages";

const meta = {
  title: "Marketing Website/Organiser page",
  parameters: {
    a11y: {test: "error"},
    catchComponentRegistry: {path: "design/website/components.json"},
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// Storybook-only backends that show the follow sheet and review form, which
// production hides until follow by phone (CAT-253) and reviews (CAT-169) land.
const previewBackends: OrganizerPageBackends = {
  followByPhone: {confirm: async () => undefined, sendCode: async () => undefined},
  submitReview: async () => undefined,
};

function Providers({children, page}: {children: ReactNode; page: OrganizerPageRecord}) {
  return (
    <WebsiteQueryProvider>
      <MemoryRouter initialEntries={[page.path]}>{children}</MemoryRouter>
    </WebsiteQueryProvider>
  );
}

function PageStory({backends = organizerPageBackends, page}: {backends?: OrganizerPageBackends; page: OrganizerPageRecord}) {
  return (
    <Providers page={page}>
      <HostListingPage backends={backends} listing={organizerStoryListing(page)} page={page} readAt={organizerPageReadAt} />
    </Providers>
  );
}

function SectionHarness({backends, page, render}: {
  backends: OrganizerPageBackends;
  page: OrganizerPageRecord;
  render: (controller: OrganizerPageController) => ReactNode;
}) {
  const controller = useOrganizerPageController({backends, listing: organizerStoryListing(page), page, readAt: organizerPageReadAt});
  return <>{render(controller)}</>;
}

/** One section on the claimed page and on the generated one, in the page's rail or main column width. */
function SectionStory({backends = organizerPageBackends, column, pages = [claimedOrganizerPage, generatedOrganizerPage], render}: {
  backends?: OrganizerPageBackends;
  column: "rail" | "main";
  pages?: OrganizerPageRecord[];
  render: (controller: OrganizerPageController) => ReactNode;
}) {
  return (
    <Providers page={pages[0]}>
      <CatchBand pb="compact" pt="compact">
        <CatchGap size="majorSection">
          {pages.map((page) => {
            const section = <SectionHarness backends={backends} page={page} render={render} />;
            return (
              <CatchSplit
                end={column === "main" ? section : null}
                key={page.organizerId}
                ratio="wideRail"
                start={column === "rail" ? section : null}
              />
            );
          })}
        </CatchGap>
      </CatchBand>
    </Providers>
  );
}

/** The claimed page as a visitor from the organiser's Instagram bio sees it. */
export const Guest: Story = {
  parameters: {catchComponent: {id: "listing_sections_assembly", routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], states: ["guest-page", "first-phone-screen"]}},
  render: () => <PageStory page={claimedOrganizerPage} />,
};

/** Built from public Luma and Instagram pages before the club claims it, with the claim pitch. */
export const Generated: Story = {
  parameters: {catchComponent: {id: "organizer_claim_section", routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], states: ["generated-page", "claim-pitch"]}},
  render: () => <PageStory page={generatedOrganizerPage} />,
};

/** A claimed page between plans: nothing on the calendar. */
export const EmptyCalendar: Story = {
  parameters: {catchComponent: {id: "organizer_events_section", routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], states: ["empty-calendar"]}},
  render: () => <PageStory page={emptyCalendarOrganizerPage} />,
};

/** A claimed page nobody has reviewed yet. */
export const NoReviews: Story = {
  parameters: {catchComponent: {id: "organizer_reviews_section", routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], states: ["no-reviews"]}},
  render: () => <PageStory page={noReviewsOrganizerPage} />,
};

/** Identity, follow and share; the share card holds the page's QR code. */
export const Identity: Story = {
  parameters: {catchComponent: {id: "organizer_identity_section", routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], states: ["claimed", "generated", "share-open"]}},
  render: () => <SectionStory column="rail" render={(controller) => <OrganizerIdentitySection controller={controller} />} />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole("button", {name: "Share"})[0]);
    await expect(canvas.getByRole("img", {name: "QR code for catchdates.com/organizers/lantern-lane-runners"})).toBeInTheDocument();
  },
};

/** Follow by phone, which production shows once CAT-253 lands. */
export const FollowByPhone: Story = {
  parameters: {catchComponent: {id: "organizer_identity_section", routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], states: ["follow-by-phone"]}},
  render: () => (
    <SectionStory backends={previewBackends} column="rail" pages={[claimedOrganizerPage]}
      render={(controller) => <OrganizerIdentitySection controller={controller} />} />
  ),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {name: "Follow"}));
    await userEvent.type(canvas.getByLabelText(/Mobile number/u), "98765 43210");
    await userEvent.click(canvas.getByRole("button", {name: "Send code"}));
    await expect(canvas.getByText("Sent to +91 98765 43210.")).toBeInTheDocument();
  },
};

/** The next event, from Catch on the claimed page and from Luma on the generated one. */
export const NextUp: Story = {
  parameters: {catchComponent: {id: "organizer_next_up_section", routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], states: ["catch-event", "luma-event"]}},
  render: () => <SectionStory column="rail" render={(controller) => <OrganizerNextUpSection controller={controller} />} />,
};

/** Owner links with one pinned, then the public pages a generated listing came from. */
export const Links: Story = {
  parameters: {catchComponent: {id: "organizer_links_section", routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], states: ["owner-links", "source-links"]}},
  render: () => <SectionStory column="rail" render={(controller) => <OrganizerLinksSection controller={controller} />} />,
};

/** Catch and Luma events in one list, each with where it is sold. */
export const ComingUp: Story = {
  parameters: {catchComponent: {id: "organizer_events_section", routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], states: ["catch-and-luma", "luma-only"]}},
  render: () => <SectionStory column="main" render={(controller) => <OrganizerEventsSection controller={controller} />} />,
};

/** Past photos and figures, or what a generated page found. */
export const Moments: Story = {
  parameters: {catchComponent: {id: "organizer_moments_section", routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], states: ["photos-and-figures", "generated-figures"]}},
  render: () => <SectionStory column="main" render={(controller) => <OrganizerMomentsSection controller={controller} />} />,
};

/** Verified and unverified reviews with replies; a generated page cannot reply yet. */
export const Reviews: Story = {
  parameters: {catchComponent: {id: "organizer_reviews_section", routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], states: ["verified-and-unverified", "unclaimed-notes"]}},
  render: () => <SectionStory column="main" render={(controller) => <OrganizerReviewsSection controller={controller} />} />,
};

/** Anyone's review, which production shows once CAT-169 lands. */
export const ReviewForm: Story = {
  parameters: {catchComponent: {id: "organizer_reviews_section", routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], states: ["review-form"]}},
  render: () => (
    <SectionStory backends={previewBackends} column="main" pages={[generatedOrganizerPage]}
      render={(controller) => <OrganizerReviewsSection controller={controller} />} />
  ),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {name: "Write a review"}));
    await userEvent.click(canvas.getByRole("button", {name: "Post review"}));
    await expect(canvas.getByRole("alert")).toHaveTextContent("Choose a star rating");
  },
};

/** The organiser's own words, formats, facts and host. */
export const About: Story = {
  parameters: {catchComponent: {id: "organizer_about_section", routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], states: ["claimed", "generated"]}},
  render: () => <SectionStory column="main" render={(controller) => <OrganizerAboutSection controller={controller} />} />,
};

/** "Made with Catch", or where a generated page came from. */
export const Footer: Story = {
  parameters: {catchComponent: {id: "organizer_page_footer", routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], states: ["claimed", "generated"]}},
  render: () => <SectionStory column="main" render={(controller) => <OrganizerPageFooter controller={controller} />} />,
};

/** The claim pitch alone, as the generated page's main column opens with it. */
export const ClaimPitch: Story = {
  parameters: {catchComponent: {id: "organizer_claim_section", routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], states: ["claim-pitch"]}},
  render: () => (
    <SectionStory column="main" pages={[generatedOrganizerPage]}
      render={(controller) => <OrganizerClaimSection controller={controller} />} />
  ),
};
