import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchField} from "@catch/web-ui";
import {consumerHomeStoryListings} from "./fixtures/consumerHome";
import {publicEventListingsContext} from "../features/organizers/usePublicEventListingsController";
import {MemoryRouter} from "react-router";
import {useRevealAnimations} from "../app/usePageLifecycle";
import {ClaimPage} from "../features/claims/ClaimPage";
import {emptyClaimRouteState} from "../features/claims/claimRouting";
import {HomePage, VisitorDiscoveryPage} from "../features/home/HomePage";
import {HostPage} from "../features/host/HostPage";
import {EventDetailPage} from "../features/events/EventDetailPage";
import {EventInvitePage} from "../features/events/EventInvitePage";
import {NotFoundPage} from "../features/notFound/NotFoundPage";
import {LegalPage} from "../features/legal/LegalPage";
import {publishedLegalContent} from "../content/legal";
import type {PublishedLegalPageKey} from "../content/types";
import {hostListings} from "./fixtures/hostListings";
import {HostListingPage} from "../features/organizers/HostListingPage";
import {OrganizerSearchPage} from "../features/organizers/OrganizerSearchPage";
import type {HostListing} from "../features/organizers/types";
import {WebsiteQueryProvider} from "../shared/query/queryClient";
import {PageShell} from "../shared/site";
import {marketingCaptures as captures} from "../app/marketingCaptures";
import {
  catchEventDetailFixture,
  completeEventDetailFixture,
  completePastEventDetailFixture,
  externalEventDetailFixture,
} from "./fixtures/eventDetails";
import type {EventDetailRecord} from "../features/events/eventDetailModel";
import {eventRuntimeCopy} from "../content/eventRuntime";
import {
  Button,
  EventRuntimeForm,
  EventRuntimeFrame,
  EventRuntimeKicker,
  EventRuntimeLive,
  EventRuntimeLiveHeader,
  EventRuntimePanel,
  EventRuntimeStageMarquee,
} from "../shared/ui/primitives";
import {
  deriveEventRuntimeMarqueeParticles,
  eventRuntimeVisualAssetPath,
} from "../features/eventRuntime/eventRuntimeMotion";

const generatedOrganizerListing = requireListing("afterfly");
// Synthetic, Storybook-only review permissions to exercise the populated public state.
const communityProfileFixture: HostListing = {
  ...requireListing("club-sales-sunday-table"),
  capabilities: {...requireListing("club-sales-sunday-table").capabilities,
    publicReviews: {targetState: "enabled", readState: "enabled", writeState: "disabled", reason: "Review submission is disabled in this illustrative preview."}},
};

const meta = {
  title: "Marketing Website/Routes",
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

export const Home: Story = {
  name: "/ · Discover",
  parameters: {
    a11y: {test: "error"},
    catchRoute: {id: "home", path: "/", reviewStates: ["default", "empty-city", "catalog-unavailable", "city-and-format", "mobile-menu"], stateCoverage: {storybook: ["default", "empty-city", "catalog-unavailable"], manual: ["city-and-format", "mobile-menu"]}},
    catchComponent: {id: "route_home", routeIds: ["home"], states: ["default", "empty-city", "catalog-unavailable", "city-and-format", "mobile-menu"]},
  },
  render: () => <publicEventListingsContext.Provider value={{listings: consumerHomeStoryListings, phase: "ready", readAt: Date.parse("2030-01-01")}}><HomePage captures={captures} /></publicEventListingsContext.Provider>,
};

export const HomeEmptyCity: Story = {
  name: "/ · Empty city",
  render: () => <publicEventListingsContext.Provider value={{listings: [], phase: "ready", readAt: 0}}><HomePage captures={captures} routeState={{city: "indore", category: "all"}} /></publicEventListingsContext.Provider>,
};
export const HomeUnavailable: Story = {
  name: "/ · Catalogue unavailable",
  render: () => <publicEventListingsContext.Provider value={{listings: [], phase: "unavailable"}}><HomePage captures={captures} /></publicEventListingsContext.Provider>,
};

export const VisitorDiscovery: Story = {
  name: "/explore/",
  parameters: {
    a11y: {test: "error"},
    catchRoute: {id: "visitor_discovery", path: "/explore/", reviewStates: ["default", "empty-city", "no-results", "experience-filter", "catalog-unavailable", "search-and-date", "mobile-menu"], stateCoverage: {storybook: ["default", "empty-city", "catalog-unavailable"], manual: ["no-results", "experience-filter", "search-and-date", "mobile-menu"]}},
    catchComponent: {id: "route_visitor_discovery", routeIds: ["visitor_discovery"], states: ["default", "empty-city", "no-results", "experience-filter", "catalog-unavailable", "search-and-date", "mobile-menu"]},
  },
  render: () => <publicEventListingsContext.Provider value={{listings: consumerHomeStoryListings, phase: "ready", readAt: Date.parse("2030-01-01")}}><VisitorDiscoveryPage captures={captures} /></publicEventListingsContext.Provider>,
};
export const ExploreEmptyCity: Story = {
  name: "/explore/ · Empty city",
  render: () => <publicEventListingsContext.Provider value={{listings: [], phase: "ready", readAt: 0}}><VisitorDiscoveryPage captures={captures} /></publicEventListingsContext.Provider>,
};
export const ExploreUnavailable: Story = {
  name: "/explore/ · Catalogue unavailable",
  render: () => <publicEventListingsContext.Provider value={{listings: [], phase: "unavailable"}}><VisitorDiscoveryPage captures={captures} /></publicEventListingsContext.Provider>,
};

export const Host: Story = {
  name: "/host/",
  parameters: {
    a11y: {test: "error"},
    catchRoute: {
      id: "host", path: "/host/",
      reviewStates: ["default", "run-club", "dinner", "games", "pickleball", "pub-crawl", "pilot-offer", "application-link", "existing-tools", "adoption-tools", "adoption-booking", "adoption-network", "participation-privacy"],
      stateCoverage: {storybook: ["default"], manual: ["run-club", "dinner", "games", "pickleball", "pub-crawl", "pilot-offer", "application-link", "existing-tools", "adoption-tools", "adoption-booking", "adoption-network", "participation-privacy"]},
    },
    catchComponent: {
      id: "route_host", routeIds: ["host"],
      states: ["default", "run-club", "dinner", "games", "pickleball", "pub-crawl", "pilot-offer", "application-link", "existing-tools", "adoption-tools", "adoption-booking", "adoption-network", "participation-privacy"],
    },
  },
  render: () => <HostPage captures={captures} />,
};

export const EventRuntime: Story = {
  name: "/join/:publicRuntimeId/",
  parameters: {
    a11y: {test: "error"},
    catchRoute: {
      id: "event_runtime",
      pathPattern: "/join/:publicRuntimeId/",
      reviewStates: [
        "phone-entry",
        "otp",
        "event-intake",
        "pending-approval",
        "live-runtime",
        "unavailable",
      ],
      stateCoverage: {
        storybook: ["phone-entry"],
        manual: ["otp", "event-intake", "pending-approval", "live-runtime", "unavailable"],
      },
    },
    catchComponent: {
      id: "route_event_runtime",
      routeIds: ["event_runtime"],
      states: ["phone-entry"],
    },
  },
  render: () => (
    <PageShell pageClassName="event-runtime-page">
      <EventRuntimeFrame
        brandLabel={eventRuntimeCopy.brand}
        brandWord={eventRuntimeCopy.brandWord}
        eventTitle={eventRuntimeCopy.demoEventTitle}
      >
        <EventRuntimePanel
          body={eventRuntimeCopy.phoneBody}
          kicker={eventRuntimeCopy.phoneKicker}
          title={eventRuntimeCopy.phoneTitle}
        >
          <EventRuntimeForm onSubmit={(event) => event.preventDefault()}>
            <CatchField
              recipe="input"
              id="storybook-event-runtime-phone"
              title={eventRuntimeCopy.phoneLabel}
              inputHint={eventRuntimeCopy.phonePlaceholder}
              keyboardType="phone"
            />
            <Button type="submit">{eventRuntimeCopy.sendCode}</Button>
          </EventRuntimeForm>
        </EventRuntimePanel>
      </EventRuntimeFrame>
    </PageShell>
  ),
};

export const EventRuntimeShells: Story = {
  name: "Event runtime shells",
  parameters: {
    a11y: {test: "error"},
    catchComponent: {
      id: "shared_event_runtime_shells",
      routeIds: ["event_runtime", "event_rehearsal"],
      states: ["phone-entry", "live-module-shell"],
    },
  },
  render: EventRuntime.render,
};

export const EventRuntimeMotionParity: Story = {
  name: "Event runtime motion parity · anticipation midpoint",
  parameters: {
    a11y: {test: "error"},
  },
  render: () => (
    <PageShell pageClassName="event-runtime-page">
      <EventRuntimeFrame
        brandLabel={eventRuntimeCopy.brand}
        brandWord={eventRuntimeCopy.brandWord}
        eventTitle="Event parity 2026"
      >
        <EventRuntimeLive
          activityId="tennis"
          background={(
            <EventRuntimeStageMarquee
              participantCount={24}
              particles={deriveEventRuntimeMarqueeParticles(2_263_797_243, 72)}
              phase="anticipation"
              phaseProgress={0.5}
              seedAngleTurns={2_263_797_243 / 0x1_0000_0000}
              stageSource={eventRuntimeVisualAssetPath("pulse")}
              sunriseSource={eventRuntimeVisualAssetPath("sunrise")}
              tickProgress={0}
            />
          )}
        >
          <EventRuntimeLiveHeader badge={null}>
            <EventRuntimeKicker>Live reveal</EventRuntimeKicker>
            <h1>The room is watching together</h1>
            <p>Everyone here sees this same server-clocked moment.</p>
          </EventRuntimeLiveHeader>
        </EventRuntimeLive>
      </EventRuntimeFrame>
    </PageShell>
  ),
};

export const EventInvite: Story = {
  name: "/invite/:inviteToken/",
  parameters: {
    a11y: {test: "error"},
    catchRoute: {
      id: "event_invite",
      pathPattern: "/invite/:inviteToken/",
      reviewStates: ["loading", "resolved-external", "resolved-runtime", "unavailable"],
      stateCoverage: {
        storybook: ["resolved-external"],
        manual: ["loading", "resolved-runtime", "unavailable"],
      },
    },
    catchComponent: {
      id: "route_event_invite",
      routeIds: ["event_invite"],
      states: ["resolved-external"],
    },
  },
  render: () => (
    <MemoryRouter initialEntries={["/invite/v2_story_abcdefghijklmnopqrstuvwxyz12345678901234567/"]}>
      <EventInvitePage initialLanding={{
        destinationKind: "externalBooking",
        destinationUrl: "https://luma.com/courtyard-social?catch_ref=story",
        endTimeMillis: Date.parse("2026-08-18T16:00:00.000Z"),
        eventId: "event-story",
        locationName: "The Courtyard",
        sourceLabel: "Luma",
        startTimeMillis: Date.parse("2026-08-18T13:30:00.000Z"),
        title: "Courtyard Social",
      }} />
    </MemoryRouter>
  ),
};

export const Claim: Story = {
  name: "/claim/",
  parameters: {
    a11y: {test: "todo"},
    catchRoute: {
      id: "claim",
      path: "/claim/",
      reviewStates: [
        "default",
        "not-found",
        "pending-claim",
        "already-claimed",
        "claim-unavailable",
      ],
      stateCoverage: {
        storybook: ["default"],
        manual: [
          "not-found",
          "pending-claim",
          "already-claimed",
          "claim-unavailable",
        ],
      },
    },
    catchComponent: {
      id: "route_claim",
      routeIds: ["claim", "claim_lookup"],
      states: [
        "default",
        "not-found",
        "pending-claim",
        "already-claimed",
        "claim-unavailable",
      ],
    },
  },
  render: () => (
    <WebsiteQueryProvider>
      <MemoryRouter initialEntries={["/claim/"]}>
        <ClaimPage routeState={emptyClaimRouteState} />
      </MemoryRouter>
    </WebsiteQueryProvider>
  ),
};

export const NotFound: Story = {
  name: "/404/",
  parameters: {
    catchRoute: {
      id: "not_found",
      path: "/404/",
      reviewStates: ["unknown-route", "missing-organizer-listing"],
      stateCoverage: {
        storybook: ["unknown-route"],
        manual: ["missing-organizer-listing"],
      },
    },
    catchComponent: {
      id: "route_not_found",
      routeIds: ["not_found"],
      states: ["unknown-route"],
    },
  },
  render: () => (
    <PageShell pageClassName="not-found-page">
      <NotFoundPage />
    </PageShell>
  ),
};

export const Privacy: Story = {
  name: "/privacy/",
  parameters: {
    catchRoute: {
      id: "privacy",
      path: "/privacy/",
      reviewStates: ["published"],
      stateCoverage: {storybook: ["published"], manual: []},
    },
    catchComponent: {
      id: "route_legal",
      routeIds: ["privacy", "terms", "help"],
      states: ["privacy", "terms", "help"],
    },
  },
  render: () => <LegalStoryPage pageKey="privacy" />,
};

export const Terms: Story = {
  name: "/terms/",
  parameters: {
    catchRoute: {
      id: "terms",
      path: "/terms/",
      reviewStates: ["published"],
      stateCoverage: {storybook: ["published"], manual: []},
    },
  },
  render: () => <LegalStoryPage pageKey="terms" />,
};

export const Help: Story = {
  name: "/help/",
  parameters: {
    catchRoute: {
      id: "help",
      path: "/help/",
      reviewStates: ["published"],
      stateCoverage: {storybook: ["published"], manual: []},
    },
  },
  render: () => <LegalStoryPage pageKey="help" />,
};

export const AccountDeletion: Story = {
  name: "/delete-account/",
  parameters: {
    catchRoute: {
      id: "account_deletion",
      path: "/delete-account/",
      reviewStates: ["published"],
      stateCoverage: {storybook: ["published"], manual: []},
    },
  },
  render: () => <LegalStoryPage pageKey="account_deletion" />,
};

export const LegalDocumentShell: Story = {
  name: "Legal document shell",
  parameters: {
    catchComponent: {
      id: "shared_legal_document_shell",
      routeIds: ["privacy", "terms", "help"],
      states: ["document", "sections", "contact"],
    },
  },
  render: () => <LegalStoryPage pageKey="privacy" />,
};

export const OrganizerSearch: Story = {
  name: "/organizers/",
  parameters: {
    a11y: {test: "error"},
    catchRoute: {
      id: "organizer_search",
      path: "/organizers/",
      reviewStates: ["default", "filtered", "empty-results", "catalog-unavailable", "mobile-menu"],
      stateCoverage: {
        storybook: ["default", "empty-results", "catalog-unavailable"],
        manual: ["filtered", "mobile-menu"],
      },
    },
    catchComponent: {
      id: "route_organizer_search",
      routeIds: ["organizer_search"],
      states: ["default", "filtered", "empty-results", "catalog-unavailable", "mobile-menu"],
    },
  },
  render: () => (
    <MemoryRouter initialEntries={["/organizers/"]}>
      <OrganizerSearchPage listings={hostListings} />
    </MemoryRouter>
  ),
};

export const OrganisersEmpty: Story = {
  name: "/organizers/ · Empty results",
  parameters: {a11y: {test: "error"}},
  render: () => <MemoryRouter initialEntries={["/organizers/?q=not-found"]}><OrganizerSearchPage listings={hostListings} /></MemoryRouter>,
};
export const OrganisersUnavailable: Story = {
  name: "/organizers/ · Catalogue unavailable",
  parameters: {a11y: {test: "error"}},
  render: () => <MemoryRouter><publicEventListingsContext.Provider value={{listings:[],phase:"unavailable"}}><OrganizerSearchPage /></publicEventListingsContext.Provider></MemoryRouter>,
};

export const OrganizerListing: Story = {
  name: "/organizers/:slug/",
  parameters: {
    a11y: {test: "error"},
    catchRoute: {
      id: "organizer_listing_canonical",
      path: generatedOrganizerListing.path,
      reviewStates: [
        "indexable",
        "noindex",
        "public-api-disabled",
        "external-events",
        "claim-cta",
      ],
      stateCoverage: {
        storybook: ["claim-cta"],
        manual: [
          "indexable",
          "noindex",
          "public-api-disabled",
          "external-events",
        ],
      },
    },
    catchComponent: {
      id: "route_organizer_listing",
      routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"],
      states: ["claimable-unclaimed", "missing-evidence", "listing-reviews"],
    },
  },
  render: () => (
    <WebsiteQueryProvider>
      <MemoryRouter initialEntries={[generatedOrganizerListing.path]}>
        <OrganizerListingRouteStory listing={generatedOrganizerListing} />
      </MemoryRouter>
    </WebsiteQueryProvider>
  ),
};

export const EventDetailCatch: Story = {
  name: "/events/:eventId/ · Catch",
  parameters: {
    a11y: {test: "error"},
    catchRoute: {
      id: "event_detail_canonical",
      path: catchEventDetailFixture.path,
      reviewStates: [
        "catch-native",
        "web-otp-registration",
        "external-source",
        "event-reviews",
        "missing-event",
      ],
      stateCoverage: {
        storybook: [
          "catch-native",
          "web-otp-registration",
          "external-source",
          "event-reviews",
        ],
        manual: ["missing-event"],
      },
    },
    catchComponent: {
      id: "route_event_detail",
      routeIds: ["event_detail_canonical"],
      states: [
        "catch-native",
        "web-otp-registration",
        "external-source",
        "event-reviews",
        "desktop-invitation",
        "mobile-sticky-action",
      ],
    },
  },
  render: () => <EventDetailRouteStory event={{
    ...catchEventDetailFixture,
    registrationState: "webOtp",
  }} />,
};

export const EventDetailExternal: Story = {
  name: "/events/:eventId/ · external",
  parameters: {a11y: {test: "error"}},
  render: () => <EventDetailRouteStory event={externalEventDetailFixture} />,
};

function EventDetailRouteStory({event}: {event: EventDetailRecord}) {
  useRevealAnimations("event_detail", event.eventId);
  return <EventDetailPage event={event} />;
}

function OrganizerListingRouteStory({listing}: {listing: HostListing}) {
  useRevealAnimations("listing", listing.id);
  return <HostListingPage listing={listing} />;
}

function requireListing(id: string): HostListing {
  const listing = hostListings.find((item) => item.id === id);
  if (!listing) {
    throw new Error(`Missing generated organizer listing fixture: ${id}`);
  }
  return listing;
}

function LegalStoryPage({pageKey}: {pageKey: PublishedLegalPageKey}) {
  return (
    <PageShell pageClassName="legal-page">
      <LegalPage
        page={publishedLegalContent.pages[pageKey]}
        effectiveDate={publishedLegalContent.effectiveDate}
      />
    </PageShell>
  );
}

export const OrganiserProfileCommunity: Story = {
  name: "/organizers/:slug/ · Events and community reviews",
  parameters: {a11y: {test: "error"}},
  render: () => <WebsiteQueryProvider><MemoryRouter><OrganizerListingRouteStory listing={communityProfileFixture} /></MemoryRouter></WebsiteQueryProvider>,
};
export const OrganiserProfileEmpty: Story = {
  name: "/organizers/:slug/ · No events yet",
  parameters: {a11y: {test: "error"}},
  render: () => <WebsiteQueryProvider><MemoryRouter><OrganizerListingRouteStory listing={{...consumerHomeStoryListings[0], catchEvents: [], externalEvents: [], eventEvidence: []}} /></MemoryRouter></WebsiteQueryProvider>,
};

export const EventDetailExperience: Story = {
  name: "/events/:eventId/ · Catch Experience",
  parameters: {a11y: {test: "error"}},
  render: () => <EventDetailRouteStory event={{...catchEventDetailFixture, catchExperienceActivities: ["introductions", "sharedActivities"]}} />,
};
export const EventDetailSparse: Story = {
  name: "/events/:eventId/ · Sparse event",
  parameters: {a11y: {test: "error"}},
  render: () => <EventDetailRouteStory event={{...catchEventDetailFixture, photoUrl: null, itinerary: [], summary: "", requirements: "", accessibility: ""}} />,
};

export const EventDetailComplete: Story = {
  name: "/events/:eventId/ · Fully populated preview",
  parameters: {a11y: {test: "error"}, catchComponent: {id: "route_event_detail", routeIds: ["event_detail_canonical"], states: ["catch-native", "desktop-invitation", "mobile-sticky-action"]}},
  render: () => <><aside aria-label="Preview disclosure" style={{padding: "14px 24px", background: "#e9ece3", color: "#16140f", fontSize: 14}}>
    <strong>Design preview · fictional event.</strong> Artwork, venue information and organiser figures are examples. This uses the real page component with supplied fixture data; it does not prove the live data connection or complete a booking.
  </aside><EventDetailRouteStory event={completeEventDetailFixture} /></>,
};
export const EventDetailCompletePast: Story = {
  name: "/events/:eventId/ · Completed event with reviews",
  parameters: {a11y: {test: "error"}, catchComponent: {id: "route_event_detail", routeIds: ["event_detail_canonical"], states: ["catch-native", "event-reviews"]}},
  render: () => <><aside aria-label="Preview disclosure" style={{padding: "14px 24px", background: "#e9ece3", color: "#16140f", fontSize: 14}}>
    <strong>Past-event design preview · all reviews are fictional.</strong> This demonstrates event-scoped reviews and a host reply using supplied fixture data. No reviews of a future event are implied; booking actions are not live acceptance evidence.
  </aside><EventDetailRouteStory event={completePastEventDetailFixture} /></>,
};
