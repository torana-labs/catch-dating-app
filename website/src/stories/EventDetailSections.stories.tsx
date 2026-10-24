import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {useRevealAnimations} from "../app/usePageLifecycle";
import {
  EventDetailFactsSection,
  EventDetailHeroSection,
  EventDetailProvenanceSection,
  EventDetailReviewsSection,
} from "../features/events/sections/EventDetailSections";
import {
  catchEventDetailFixture,
  completePastEventDetailFixture,
  externalEventDetailFixture,
  reviewerName,
} from "./fixtures/eventDetails";
import {demoEventId, guestsAt, momentMillis} from "./fixtures/demoWorld";

const meta = {
  title: "Marketing Website/Events/Event Detail Sections",
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

export const EventDetailShells: Story = {
  name: "Shared shells",
  parameters: {
    catchComponent: {
      id: "shared_event_detail_shells",
      routeIds: ["event_detail_canonical"],
      states: [
        "catch-native",
        "web-otp-registration",
        "external-source",
        "fact-grid",
        "provenance",
        "event-media",
        "organizer-panel",
        "optional-event-content",
      ],
    },
  },
  render: () => (
    <EventDetailRevealStory routeKey="shared-shells">
      <EventDetailFactsSection event={externalEventDetailFixture} />
      <EventDetailProvenanceSection event={externalEventDetailFixture} />
    </EventDetailRevealStory>
  ),
};

export const EventDetailHero: Story = {
  name: "Hero · Catch",
  parameters: {
    catchComponent: {
      id: "event_detail_hero_section",
      routeIds: ["event_detail_canonical"],
      states: [
        "catch-native",
        "web-otp-registration",
        "external-source",
        "desktop-invitation",
        "mobile-sticky-action",
        "optional-event-content",
      ],
    },
  },
  render: () => <CatchHeroStory />,
};

export const EventDetailHeroExternal: Story = {
  name: "Hero · external",
  render: () => <ExternalHeroStory />,
};

export const EventDetailHeroWebOtp: Story = {
  name: "Hero · website OTP registration",
  parameters: {
    catchComponent: {
      id: "event_detail_public_registration",
      routeIds: ["event_detail_canonical"],
      states: ["details", "otp-code", "success", "error"],
    },
  },
  render: () => <CatchHeroStory webOtp />,
};

export const EventDetailFacts: Story = {
  name: "Facts",
  parameters: {
    catchComponent: {
      id: "event_detail_facts_section",
      routeIds: ["event_detail_canonical"],
      states: ["complete", "missing-optional-details"],
    },
  },
  render: () => (
    <EventDetailRevealStory routeKey="facts">
      <EventDetailFactsSection event={externalEventDetailFixture} />
    </EventDetailRevealStory>
  ),
};

export const EventDetailReviews: Story = {
  name: "Reviews",
  parameters: {
    catchComponent: {
      id: "event_detail_reviews_section",
      routeIds: ["event_detail_canonical"],
      states: ["verified-event-reviews", "empty"],
    },
  },
  render: () => (
    <EventDetailRevealStory routeKey="reviews">
      <EventDetailReviewsSection event={{...completePastEventDetailFixture, eventReviews: [{
        id: "preview-verified-review", eventId: demoEventId,
        reviewerName: reviewerName(guestsAt(demoEventId, "followUp").find((guest) => guest.checkedIn)!), rating: 5,
        comment: "A welcoming host and a lovely evening of trivia.",
        createdAt: new Date(momentMillis("followUp")).toISOString(), verificationStatus: "verified",
        source: "catchEvent", isAnonymous: false, ownerResponse: null,
      }]}} />
    </EventDetailRevealStory>
  ),
};

export const EventDetailProvenance: Story = {
  name: "Provenance",
  parameters: {
    catchComponent: {
      id: "event_detail_provenance_section",
      routeIds: ["event_detail_canonical"],
      states: ["catch-native", "external-source"],
    },
  },
  render: () => (
    <EventDetailRevealStory routeKey="provenance">
      <EventDetailProvenanceSection event={externalEventDetailFixture} />
    </EventDetailRevealStory>
  ),
};

function CatchHeroStory({webOtp = false}: {webOtp?: boolean}) {
  useRevealAnimations("event_detail", "hero-catch");
  return (
    <EventDetailHeroSection
      event={webOtp ? {
        ...catchEventDetailFixture,
        registrationState: "webOtp",
      } : catchEventDetailFixture}
    />
  );
}

function ExternalHeroStory() {
  useRevealAnimations("event_detail", "hero-external");
  return (
    <EventDetailHeroSection
      event={externalEventDetailFixture}
    />
  );
}

function EventDetailRevealStory({
  children,
  routeKey,
}: {
  children: ReactNode;
  routeKey: string;
}) {
  useRevealAnimations("event_detail", routeKey);
  return children;
}
