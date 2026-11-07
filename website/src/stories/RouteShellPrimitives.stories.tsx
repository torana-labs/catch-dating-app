import {CatchField} from "@catch/web-ui";
import type {Meta, StoryObj} from "@storybook/react-vite";
import type {FormEvent} from "react";
import {PageShell, WebsitePageMain} from "../shared/site/PageShell";
import {Button, ClaimFlowMain, ClaimRequestForm, ContentGrid, FormStatus, HostApplicationCompletenessSummary, HostApplicationPanel, HostApplicationReviewCard, HostApplicationReviewGrid, HostApplicationShell, HostApplicationStage, HostApplicationSubmitted, HostPreviewFaqList, HostPreviewSection, HostPreviewSectionHead, OperationalNote, UiLabel} from "../shared/ui/primitives";

const listingRouteIds = ["organizer_listing_canonical", "organizer_listing_legacy"];

const meta = {
  title: "Marketing Website/Shared/Route Shells",
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

export const PageShellStory: Story = {
  name: "Page shell",
  parameters: {
    catchComponent: {
      id: "shared_page_shell",
      routeIds: ["home", "host", "claim", "claim_lookup", "not_found", "organizer_search", "organizer_listing_canonical", "organizer_listing_legacy"],
      states: ["page-shell", "website-main"],
    },
  },
  render: () => (
    <PageShell pageClassName="home-page">
      <WebsitePageMain aria-label="Storybook page shell preview">
        <ContentGrid variant="surface">
          <article>
            <UiLabel>Route shell</UiLabel>
            <h1>Shared page shell</h1>
            <p>App routes configure the page class; feature sections own the content.</p>
          </article>
        </ContentGrid>
      </WebsitePageMain>
    </PageShell>
  ),
};

export const ClaimFlowShellStory: Story = {
  name: "Claim flow shell",
  parameters: {
    catchComponent: {
      id: "shared_claim_flow_shell",
      routeIds: ["claim", "claim_lookup"],
      states: ["route-root"],
    },
  },
  render: () => (
    <ClaimFlowMain>
      <ContentGrid variant="surface">
        <article>
          <UiLabel>Demo continuation</UiLabel>
          <h1>Claim flow route root</h1>
          <p>Only the demo continuation still renders inside this main; the claim flow itself is drawn from the system.</p>
        </article>
      </ContentGrid>
    </ClaimFlowMain>
  ),
};

export const ListingClaimShellStory: Story = {
  name: "Listing claim form shell",
  parameters: {
    catchComponent: {
      id: "shared_listing_claim_shell",
      routeIds: listingRouteIds,
      states: ["claim-request-form", "status"],
    },
  },
  render: () => (
    <ClaimRequestForm onSubmit={preventSubmit}>
      <CatchField
        recipe="input"
        id="storybook-listing-claim-name"
        title="Requester name"
        name="requesterName"
      />
      <CatchField
        recipe="input"
        id="storybook-listing-claim-email"
        title="Business email"
        name="businessEmail"
        keyboardType="emailAddress"
      />
      <Button type="submit">Send claim request</Button>
      <FormStatus status={{message: "Storybook claim request is ready for review.", tone: "is-success"}} />
    </ClaimRequestForm>
  ),
};

export const HostApplicationShellStory: Story = {
  name: "Host application shell",
  parameters: {
    catchComponent: {
      id: "shared_host_application_shell",
      routeIds: ["host"],
      states: ["form", "panel", "stage", "submitted", "review", "summary"],
    },
  },
  render: () => (
    <HostApplicationShell onSubmit={preventSubmit} reveal>
      <HostApplicationPanel>
        <HostApplicationStage>
          <CatchField
            recipe="input"
            id="storybook-host-application-name"
            title="Organizer name"
            name="organizerName"
            initialValue="Sunday Table Club"
          />
          <OperationalNote title="Review note" body="Host applications use shared panels and stages for all field groups." />
        </HostApplicationStage>
      </HostApplicationPanel>
      <HostApplicationReviewGrid>
        <HostApplicationReviewCard
          title="Profile"
          rows={[
            ["Organizer", "Sunday Table Club"],
            ["City", "Mumbai"],
          ]}
        />
        <HostApplicationReviewCard
          title="Launch"
          rows={[
            ["Format", "Dinner"],
            ["Capacity", "18 guests"],
          ]}
        />
      </HostApplicationReviewGrid>
      <HostApplicationCompletenessSummary
        label="Application completeness"
        meter="3 of 4"
        items={[
          {done: true, label: "Organizer profile"},
          {done: true, label: "Source proof"},
          {done: false, label: "Safety notes"},
        ]}
      />
      <HostApplicationSubmitted
        label="Submitted"
        title="Host application queued"
        body="Staff can review this packet before the host account changes state."
      />
    </HostApplicationShell>
  ),
};

export const HostPreviewShellStory: Story = {
  name: "Host preview shell",
  parameters: {
    a11y: {test: "todo"},
    catchComponent: {
      id: "shared_host_preview_shell",
      routeIds: ["host"],
      states: ["sections", "faq"],
    },
  },
  render: () => (
    <HostPreviewSection variant="trust">
      <HostPreviewSectionHead title="Questions hosts ask" titleId="storybook-host-preview-section" />
      <HostPreviewFaqList
        items={[
          {question: "Can I publish directly?", answer: "Catch reviews the first host packet before launch."},
        ]}
      />
    </HostPreviewSection>
  ),
};
function preventSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
}
