import {CatchField, CatchGap} from "@catch/web-ui";
import type {Meta, StoryObj} from "@storybook/react-vite";
import type {FormEvent} from "react";
import {PageShell, WebsitePageMain} from "../shared/site/PageShell";
import {Button, ClaimFlowHero, ClaimFlowMain, ClaimFlowPanel, ClaimFlowStage, ClaimFlowWorkspace, ClaimListingResults, ClaimRequestForm, ClaimResultButton, ContentGrid, FormStatus, HostApplicationCompletenessSummary, HostApplicationPanel, HostApplicationReviewCard, HostApplicationReviewGrid, HostApplicationShell, HostApplicationStage, HostApplicationSubmitted, HostPreviewFaqList, HostPreviewSection, HostPreviewSectionHead, OperationalNote, OwnerUnlockBoard, SelectedListingCard, UiLabel, VerificationMethodGrid} from "../shared/ui/primitives";

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
      states: ["route-root", "hero", "workspace", "panel", "listing-results", "verification"],
    },
  },
  render: () => (
    <ClaimFlowMain>
      <ClaimFlowHero
        eyebrow="Claim organizer page"
        title="Prove ownership before controls unlock"
        body="The route shell holds the hero, workspace, selected listing, and verification stages."
        summaryTitle="Review path"
        summaryBody="Owner proof, public sources, and staff review"
      />
      <ClaimFlowWorkspace onSubmit={preventSubmit}>
        <ClaimFlowPanel>
          <ClaimFlowStage>
            <CatchGap size="formField">
              <CatchField
                recipe="input"
                id="storybook-claim-name"
                title="Requester name"
                name="requesterName"
                initialValue="Taylor Host"
              />
              <CatchField recipe="select" id="storybook-claim-role" title="Role" name="requesterRole"
                values={["owner", "manager"]} itemLabelBuilder={(role) => role === "owner" ? "Owner" : "Manager"}
                initialValue="owner" />
            </CatchGap>
            <ClaimListingResults>
              <ClaimResultButton activityToken="var(--activity-dinner)" selected>
                Sunday Table Club
              </ClaimResultButton>
              <SelectedListingCard>
                <strong>Selected listing</strong>
                <p>Profile evidence and source links are ready for staff review.</p>
              </SelectedListingCard>
            </ClaimListingResults>
            <VerificationMethodGrid aria-label="Verification evidence">
              <article>
                <UiLabel>Public proof</UiLabel>
                <p>Link to event pages or social profiles that show ownership.</p>
              </article>
              <article>
                <UiLabel>Business contact</UiLabel>
                <p>Add a reachable email or phone number for the review packet.</p>
              </article>
            </VerificationMethodGrid>
            <OwnerUnlockBoard
              items={[
                {title: "Owner response", body: "Reply to public review signals after approval."},
                {title: "Event controls", body: "Publish app-created events from the host surface."},
              ]}
            />
          </ClaimFlowStage>
        </ClaimFlowPanel>
      </ClaimFlowWorkspace>
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
