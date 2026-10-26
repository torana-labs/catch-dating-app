import {CatchBadge} from "@catch/web-ui";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {ActivityMark, BadgeRow, ButtonLink, ContentGrid, ListingEventEvidenceList, ListingFactGrid, ListingFormatRow, ListingPolaroid, ListingProfileLayout, ListingProfilePrimary, ListingProfileRail, ListingRailActions, ListingRailIdentity, ListingRailLinkList, ListingRailSection, ListingReviewLanes, ListingReviewSummary, ListingReviewWorkspace, ListingSection, ListingSectionIntro, ListingStatusLedger, OrganizerEventHighlights, OrganizerResultCardBody, OrganizerResultCardFooter, OrganizerResultCardShell, OrganizerResultCardTopline, ReviewSignalLane, type ActivityMeta, type PublicReviewCardModel} from "../shared/ui/primitives";

const listingRouteIds = ["organizer_listing_canonical", "organizer_listing_legacy"];

const dinnerActivity: ActivityMeta = {
  label: "Dinner",
  short: "DN",
  token: "var(--activity-dinner)",
};

const runActivity: ActivityMeta = {
  label: "Run club",
  short: "SR",
  token: "var(--activity-run)",
};

const reviewCards: PublicReviewCardModel[] = [
  {
    id: "verified-guest-review",
    comment: "Thoughtful seating and a host response before the event made the room feel considered.",
    createdAtLabel: "2 weeks ago",
    rating: 5,
    reviewerName: "Verified guest",
    sourceLabel: "Catch review",
    verificationLabel: "Verified attendee",
    verified: true,
    ownerResponse: {
      hostName: "Sunday Table Club",
      message: "We tune the table mix after every dinner and keep safety notes in the owner console.",
      updatedAtLabel: "Responded 3 days ago",
    },
  },
  {
    id: "public-source-review",
    comment: "The run was beginner-friendly and had a clear meetup point.",
    createdAtLabel: "Last month",
    rating: 4,
    reviewerName: "Public source",
    sourceLabel: "Imported signal",
    verificationLabel: "Public source",
    verified: false,
  },
];

const meta = {
  title: "Marketing Website/Shared/Listing Primitives",
  parameters: {
    catchComponentRegistry: {
      path: "design/website/components.json",
    },
    catchRouteContract: {
      path: "design/website/routes.json",
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const IdentityDisplayShellStory: Story = {
  name: "Identity display shell",
  parameters: {
    a11y: {test: "todo"},
    catchComponent: {
      id: "shared_identity_display_shell",
      routeIds: ["claim", "claim_lookup", "host", "organizer_search", "organizer_listing_canonical", "organizer_listing_legacy"],
      states: ["activity-mark", "status-badges"],
    },
  },
  render: () => (
    <ContentGrid variant="surface">
      <article>
        <ActivityMark
          activity={dinnerActivity}
          listing={{logo: {text: "ST"}, status: "verified"}}
          size="lg"
        />
        <h3>Sunday Table Club</h3>
        <BadgeRow>
          <CatchBadge recipe="solidStatus" label="Verified on Catch" />
          <CatchBadge recipe="functional" label="Owner claimed" />
        </BadgeRow>
      </article>
      <article>
        <ActivityMark
          activity={runActivity}
          listing={{logo: {text: "AF"}, status: "unclaimed"}}
          size="lg"
        />
        <h3>Afterfly</h3>
        <BadgeRow>
          <CatchBadge recipe="functional" label="Claimable" />
        </BadgeRow>
      </article>
    </ContentGrid>
  ),
};

export const ListingHeroShellStory: Story = {
  name: "Listing polaroid profile shell",
  parameters: {
    catchComponent: {
      id: "shared_listing_hero_shell",
      routeIds: listingRouteIds,
      states: ["polaroid", "status-ledger", "action-rail"],
    },
  },
  render: () => (
    <ListingProfileLayout activityToken={runActivity.token}>
      <ListingProfilePrimary>
        <ListingPolaroid
          caption="Indore · India"
          fallback={null}
          media={{
            alt: "A social run moving past an outdoor music setup.",
            mobileSrcSet: "/assets/events/social-run-music-hero-960.jpg",
            src: "/assets/events/social-run-music-hero.jpg",
          }}
          provenance="Source-backed listing"
          title="After Fly"
          titleId="storybook-listing-hero-title"
        />
        <ListingStatusLedger
          items={[
            {label: "Sources", value: "2 sources"},
            {label: "Claim", value: "Unclaimed"},
            {label: "Surface", value: "Web only"},
            {label: "Freshness", value: "Jun '26 reviewed"},
            {label: "Ownership", value: "Ownership not verified"},
          ]}
        />
      </ListingProfilePrimary>
      <ListingProfileRail aria-label="After Fly listing actions">
        <ListingRailIdentity
          activity={(
            <ActivityMark
              activity={runActivity}
              listing={{logo: {text: "AF"}, status: "unclaimed"}}
              size="lg"
            />
          )}
          eyebrow="Organizer"
          location="Indore · India"
          name="After Fly"
          status={<CatchBadge recipe="functional" label="Source-backed listing" />}
        />
        <ListingRailActions description="Claim to manage copy, publish events and respond to reviews.">
          <ButtonLink href="/claim/?listing=afterfly">Claim this listing</ButtonLink>
          <ButtonLink href="#sources" variant="ghost">View sources</ButtonLink>
        </ListingRailActions>
        <ListingRailSection eyebrow="Sources" id="sources">
          <ListingRailLinkList
            items={[
              {href: "https://luma.com/", label: "Luma"},
              {href: "https://instagram.com/", label: "Instagram"},
            ]}
          />
        </ListingRailSection>
      </ListingProfileRail>
    </ListingProfileLayout>
  ),
};

export const ListingSectionShellStory: Story = {
  name: "Listing section shell",
  parameters: {
    catchComponent: {
      id: "shared_listing_shell",
      routeIds: listingRouteIds,
      states: ["default", "split", "events", "reviews", "success"],
    },
  },
  render: () => (
    <ContentGrid variant="listing-event">
      <ListingSection variant="default">
        <ListingSectionIntro
          eyebrow="Profile facts"
          title="What the public page can prove"
          body="Listing sections own the repeated section spacing and let each route configure copy and evidence."
        />
      </ListingSection>
      <ListingSection variant="split">
        <ListingSectionIntro
          eyebrow="Claim fit"
          title="Owner proof and missing evidence"
          body="Split sections pair a compact intro with a configured rail or form panel."
        />
      </ListingSection>
      <ListingSection variant="events">
        <ListingSectionIntro
          eyebrow="Event supply"
          title="Catch events and public sources"
          body="Event sections keep app-created and source-attributed supply visually consistent."
        />
      </ListingSection>
    </ContentGrid>
  ),
};

export const ListingCardGridShellStory: Story = {
  name: "Listing card grids",
  parameters: {
    catchComponent: {
      id: "shared_listing_card_grid_shell",
      routeIds: listingRouteIds,
      states: ["fact-grid", "format-row"],
    },
  },
  render: () => (
    <ContentGrid variant="listing-event">
      <ListingFactGrid
        items={[
          {label: "City", value: "Mumbai"},
          {label: "Format", value: "Dinner club"},
          {label: "Owner status", value: "Verified"},
        ]}
      />
      <ListingFormatRow items={["Dinner", "Curated seating", "Owner response"]} />
    </ContentGrid>
  ),
};

export const ListingEventSectionShellStory: Story = {
  name: "Listing event section shell",
  parameters: {
    catchComponent: {
      id: "shared_listing_event_section_shell",
      routeIds: listingRouteIds,
      states: ["event-evidence"],
    },
  },
  render: () => (
    <ListingSection variant="events">
      <ListingEventEvidenceList
        items={[
          {
            date: "Sun, 12 Jul",
            facts: ["120 RSVPs", "Outdoor social run", "Public source verified"],
            location: "Mumbai, Maharashtra",
            sourceHref: "https://example.com/afterfly-run-club",
            sourceLabel: "Public event page",
            summary: "A public event listing ties this organizer to an upcoming run-and-social format.",
            title: "Afterfly twilight run social",
          },
        ]}
      />
    </ListingSection>
  ),
};

export const ListingReviewShellStory: Story = {
  name: "Listing review shell",
  parameters: {
    a11y: {test: "todo"},
    catchComponent: {
      id: "shared_listing_review_shell",
      routeIds: listingRouteIds,
      states: ["review-summary", "review-lanes", "empty-lane"],
    },
  },
  render: () => (
    <ListingReviewWorkspace>
      <ListingReviewSummary>
        <h3>Reviews separate verified attendee feedback from imported public signals.</h3>
        <p>Listing review shells keep owner responses, empty lanes, and review badges aligned.</p>
      </ListingReviewSummary>
      <ListingReviewLanes>
        <ReviewSignalLane
          title="Verified reviews"
          body="Attendee feedback that Catch can connect to app-created events."
          emptyTitle="No verified reviews yet"
          emptyBody="Verified attendee reviews appear here after the organizer runs Catch events."
          reviews={reviewCards.filter((review) => review.verified)}
        />
        <ReviewSignalLane
          title="Public signals"
          body="Imported source notes are shown separately from verified Catch reviews."
          emptyTitle="No public signals yet"
          emptyBody="Approved public review sources will appear here after intake."
          reviews={reviewCards.filter((review) => !review.verified)}
        />
      </ListingReviewLanes>
    </ListingReviewWorkspace>
  ),
};

export const OrganizerResultShellStory: Story = {
  name: "Organizer result shell",
  parameters: {
    a11y: {test: "todo"},
    catchComponent: {
      id: "shared_organizer_result_shell",
      routeIds: ["organizer_search"],
      states: ["result-card", "event-highlights", "footer-actions"],
    },
  },
  render: () => (
    <OrganizerResultCardShell activityToken="var(--activity-run)">
      <OrganizerResultCardBody>
        <OrganizerResultCardTopline>
          <ActivityMark
            activity={runActivity}
            listing={{logo: {text: "AF"}, status: "unclaimed"}}
          />
          <div>
            <h3>Afterfly</h3>
            <BadgeRow>
              <CatchBadge recipe="functional" label="Claimable" />
            </BadgeRow>
          </div>
        </OrganizerResultCardTopline>
        <p>Run club profile with public event evidence and open owner claim.</p>
        <OrganizerEventHighlights
          ariaLabel="Afterfly event highlights"
          items={[
            {
              activityToken: "var(--activity-run)",
              detail: "Mumbai",
              id: "afterfly-run",
              kind: "Run club",
              title: "Twilight run social",
            },
            {
              activityToken: "var(--activity-social)",
              detail: "Open RSVP",
              id: "afterfly-social",
              kind: "Social",
              title: "Post-run mixer",
            },
          ]}
        />
      </OrganizerResultCardBody>
      <OrganizerResultCardFooter>
        <ButtonLink href="/organizers/afterfly/" size="small">
          View listing
        </ButtonLink>
      </OrganizerResultCardFooter>
    </OrganizerResultCardShell>
  ),
};
