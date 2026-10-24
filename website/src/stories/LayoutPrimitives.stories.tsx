import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import {SectionHeader} from "../shared/site/SectionHeader";
import {ActionGroup, Button, ButtonLink, ChoiceCard, ChoiceChip, ChoiceChipGrid, ContentGrid, ListingSuccessMetricGrid, PanelShell, StepRail, UiLabel, VerificationMethodGrid} from "../shared/ui/primitives";

const meta = {
  title: "Marketing Website/Shared/Layout And Form Primitives",
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

export const UiLabelShellStory: Story = {
  name: "UI labels",
  parameters: {
    catchComponent: {
      id: "shared_ui_label_shell",
      routeIds: ["home", "host", "claim", "claim_lookup", "organizer_search", "organizer_listing_canonical", "organizer_listing_legacy"],
      states: ["eyebrow", "metadata-label"],
    },
  },
  render: () => (
    <ContentGrid variant="surface">
      <article>
        <UiLabel>Public proof</UiLabel>
        <h3>Source-backed profile</h3>
        <p>Small metadata labels stay visually consistent across public sections and flow panels.</p>
      </article>
      <article>
        <UiLabel>Owner review</UiLabel>
        <h3>Claim packet ready</h3>
        <p>The same label primitive is used for route copy, field groups, and public proof rails.</p>
      </article>
    </ContentGrid>
  ),
};

export const SectionHeaderStory: Story = {
  name: "Section header",
  parameters: {
    catchComponent: {
      id: "shared_section_header",
      routeIds: ["home", "host", "organizer_search", "organizer_listing_canonical", "organizer_listing_legacy"],
      states: ["default", "wide", "h1"],
    },
  },
  render: () => (
    <ContentGrid variant="surface">
      <SectionHeader
        eyebrow="Organizer discovery"
        title="Find source-backed organizers"
        body="Shared section headers keep route sections aligned without duplicating heading markup."
      />
      <SectionHeader
        eyebrow="Host launch"
        title="Publish safer social events"
        body="Wide headers give route-level sections a denser intro when the section owns more evidence."
        headingLevel="h1"
        wide
      />
    </ContentGrid>
  ),
};

export const ActionGroupStory: Story = {
  name: "Action groups",
  parameters: {
    catchComponent: {
      id: "shared_action_group",
      routeIds: ["home", "host", "claim", "organizer_listing_canonical", "organizer_listing_legacy"],
      states: ["flow", "hero", "host-create-flow"],
    },
  },
  render: () => (
    <ContentGrid variant="surface">
      <ActionGroup>
        <Button type="button">Continue</Button>
        <Button type="button" variant="ghost">Save draft</Button>
      </ActionGroup>
      <ActionGroup variant="hero" reveal>
        <ButtonLink href="/organizers/">Browse organizers</ButtonLink>
        <ButtonLink href="/host/" variant="ghost">Host with Catch</ButtonLink>
      </ActionGroup>
      <ActionGroup variant="host-create-flow">
        <Button type="button">Publish preview</Button>
        <Button type="button" variant="ghost">Review evidence</Button>
      </ActionGroup>
    </ContentGrid>
  ),
};

export const StepRailStory: Story = {
  name: "Step rail",
  parameters: {
    a11y: {test: "todo"},
    catchComponent: {
      id: "shared_operational_step_rail",
      routeIds: ["host", "claim"],
      states: ["current", "complete", "disabled"],
    },
  },
  render: () => <StepRailDemo />,
};

export const ChoiceChipControlsStory: Story = {
  name: "Choice chip controls",
  parameters: {
    catchComponent: {
      id: "shared_choice_chip_controls",
      routeIds: ["host", "claim"],
      states: ["chip-grid", "selected"],
    },
  },
  render: () => <ChoiceChipControlsDemo />,
};

export const ChoiceCardControlsStory: Story = {
  name: "Choice card controls",
  parameters: {
    catchComponent: {
      id: "shared_choice_card_controls",
      routeIds: ["host", "claim"],
      states: ["choice-card", "selected"],
    },
  },
  render: () => <ChoiceCardControlsDemo />,
};

export const ContentGridStory: Story = {
  name: "Content grids",
  parameters: {
    catchComponent: {
      id: "shared_content_grid",
      routeIds: ["home", "host", "claim", "organizer_listing_canonical", "organizer_listing_legacy"],
      states: ["format", "trust", "surface", "claim-review", "listing-event"],
    },
  },
  render: () => (
    <ContentGrid variant="trust">
      <article>
        <UiLabel>Trust</UiLabel>
        <h3>Source review</h3>
        <p>Content grids own repeated card layouts for route sections and proof panels.</p>
      </article>
      <article>
        <UiLabel>Safety</UiLabel>
        <h3>Owner controls</h3>
        <p>Feature sections configure the cards; the primitive owns the grid contract.</p>
      </article>
    </ContentGrid>
  ),
};

export const PanelShellStory: Story = {
  name: "Panel shells",
  parameters: {
    catchComponent: {
      id: "shared_panel_shell",
      routeIds: ["home", "organizer_listing_canonical", "organizer_listing_legacy"],
      states: ["hero", "event-ticket", "listing", "claim-unlocks"],
    },
  },
  render: () => (
    <ContentGrid variant="surface">
      <PanelShell variant="hero" reveal>
        <UiLabel>Hero panel</UiLabel>
        <h3>Launch proof</h3>
        <p>Hero panels hold dense proof beside route copy.</p>
      </PanelShell>
      <PanelShell variant="event-ticket" reveal>
        <UiLabel>Event ticket</UiLabel>
        <h3>Dinner club preview</h3>
        <p>Ticket panels keep generated event previews visually consistent.</p>
      </PanelShell>
      <PanelShell variant="claim-unlocks" reveal>
        <UiLabel>Claim unlocks</UiLabel>
        <h3>Owner controls</h3>
        <p>Claim panels show what unlocks after review.</p>
      </PanelShell>
    </ContentGrid>
  ),
};

export const ListingSuccessMetricGridStory: Story = {
  name: "Listing success metric grid",
  parameters: {
    catchComponent: {
      id: "shared_listing_success_metric_grid",
      routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"],
      states: ["listing-metrics"],
    },
  },
  render: () => (
    <ListingSuccessMetricGrid
      items={[
        {label: "Verified check-ins", value: "164"},
        {label: "Repeat hosts", value: "7"},
        {label: "Post-event score", value: "4.8"},
      ]}
    />
  ),
};

function StepRailDemo() {
  const [activeId, setActiveId] = useState("proof");
  const items = [
    {
      id: "identity",
      label: "Identity",
      body: "Organizer, city, and source proof.",
    },
    {
      id: "proof",
      label: "Proof",
      body: "Events, links, and ownership checks.",
    },
    {
      id: "publish",
      label: "Publish",
      body: "Route and review evidence ready.",
    },
  ];
  const currentIndex = Math.max(0, items.findIndex((item) => item.id === activeId));

  return (
    <StepRail
      currentIndex={currentIndex}
      getDisabled={(_, index) => index > currentIndex + 1}
      items={items}
      label="Storybook operational steps"
      onSelect={setActiveId}
    />
  );
}

function ChoiceChipControlsDemo() {
  const [format, setFormat] = useState("Dinner");
  const formats = ["Dinner", "Run club", "Venue mixer"];

  return (
    <div>
      <UiLabel>Host formats</UiLabel>
      <ChoiceChipGrid aria-label="Host formats">
        {formats.map((item) => (
          <ChoiceChip
            key={item}
            onClick={() => setFormat(item)}
            selected={format === item}
          >
            {item}
          </ChoiceChip>
        ))}
      </ChoiceChipGrid>
    </div>
  );
}

function ChoiceCardControlsDemo() {
  const [method, setMethod] = useState("domain");
  const methods = [
    {
      id: "domain",
      title: "Domain email",
      body: "Verify with a business or venue email tied to the listing.",
    },
    {
      id: "source",
      title: "Source proof",
      body: "Attach public event links and ownership context for staff review.",
    },
  ];

  return (
    <div>
      <UiLabel>Verification</UiLabel>
      <VerificationMethodGrid aria-label="Verification methods">
        {methods.map((item) => (
          <ChoiceCard
            body={item.body}
            key={item.id}
            onClick={() => setMethod(item.id)}
            selected={method === item.id}
            title={item.title}
          />
        ))}
      </VerificationMethodGrid>
    </div>
  );
}
