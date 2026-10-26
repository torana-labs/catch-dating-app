import type {Meta, StoryObj} from "@storybook/react-vite";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchButton} from "./CatchButton";
import {CatchGap} from "./CatchGap";
import {CatchGrid} from "./CatchGrid";
import {CatchGroundCard} from "./CatchGroundCard";
import {CatchQrCode} from "./CatchQrCode";
import {CatchText} from "./CatchText";
import {grounds} from "./palette";

const meta = {
  title: "Web UI/CatchGroundCard",
  component: CatchGroundCard,
  args: {children: "A card on a ground"},
} satisfies Meta<typeof CatchGroundCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["organizer_listing_canonical"];

/** Every ground at the regular padding, and the compact and spacious paddings. */
export const Grounds: Story = {
  parameters: {catchComponent: {id: "shared_ground_card", routeIds: storyRoutes, states: ["grounds", "compact", "spacious", "dark-ground", "outlined"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Grounds" pb="compact" pt="compact">
        <CatchGap size="section">
          <CatchGrid columns={3} compactColumns={1}>
            {grounds.map((ground) => (
              <CatchGroundCard ground={ground} key={ground}>
                <CatchGap size="headerTitleToSubtitle">
                  <CatchText variant="sectionTitle">{`On ${ground}`}</CatchText>
                  <CatchText color="ink2" variant="bodyM">Library text takes the ground’s inks.</CatchText>
                </CatchGap>
              </CatchGroundCard>
            ))}
          </CatchGrid>
          <CatchGroundCard ground="white" outlined>
            <CatchText variant="bodyM">An outlined white card, for a white page.</CatchText>
          </CatchGroundCard>
          <CatchGroundCard ground="indigo" padding="spacious">
            <CatchGrid columns={2} compactColumns={1}>
              <CatchGroundCard ground="white" padding="compact"><CatchText variant="bodyM">A compact card inside a spacious one.</CatchText></CatchGroundCard>
              <CatchGroundCard ground="white" padding="compact"><CatchText variant="bodyM">Radius md at the compact padding.</CatchText></CatchGroundCard>
            </CatchGrid>
          </CatchGroundCard>
        </CatchGap>
      </CatchBand>
    </StoryPage>
  ),
};

/** The organiser page's share card: the page's QR code, its address and a copy action. */
export const ShareCard: Story = {
  parameters: {catchComponent: {id: "shared_ground_card", routeIds: storyRoutes, states: ["share-card"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Share card" pb="compact" pt="compact">
        <CatchGroundCard>
          <CatchGap crossAxisAlignment="center" direction="horizontal" size="formField">
            <CatchQrCode label="QR code for catchdates.com/organizers/lantern-lane-runners" value="https://catchdates.com/organizers/lantern-lane-runners/" />
            <CatchGap size="inline">
              <CatchText color="ink2" variant="bodyM">Print it on a poster or show it at the start line.</CatchText>
              <CatchText variant="sectionTitle">catchdates.com/organizers/lantern-lane-runners</CatchText>
              <CatchGap crossAxisAlignment="start" size="inline">
                <CatchButton label="Copy link" onPressed={() => undefined} size="md" />
              </CatchGap>
            </CatchGap>
          </CatchGap>
        </CatchGroundCard>
      </CatchBand>
    </StoryPage>
  ),
};

const pitch = () => (
  <CatchGroundCard ground="indigo" padding="spacious">
    <CatchGap size="formField">
      <CatchText color="inherit" variant="titleS">Is this your club?</CatchText>
      <CatchText as="h2" variant="displayM">This page is already working for you.</CatchText>
      <CatchText variant="bodyL">
        <CatchText as="strong" variant="sectionTitle">38 people</CatchText>{" asked to hear about your next event, and "}
        <CatchText as="strong" variant="sectionTitle">2 people</CatchText>{" left reviews. We built this page from your public Luma and Instagram pages. Claim it free and make it yours."}
      </CatchText>
      <CatchGrid columns={2} compactColumns={1}>
        {["Your Instagram link.", "Every event in one place.", "Your links.", "Who clicks."].map((title) => (
          <CatchGroundCard ground="white" key={title} padding="compact">
            <CatchText variant="bodyM"><CatchText as="strong" variant="titleS">{title}</CatchText>{" What claiming adds."}</CatchText>
          </CatchGroundCard>
        ))}
      </CatchGrid>
      <CatchGap crossAxisAlignment="start" size="inline"><CatchButton label="Claim this page" onPressed={() => undefined} /></CatchGap>
    </CatchGap>
  </CatchGroundCard>
);

/** The generated organiser page's claim pitch. */
export const Reference: Story = {
  parameters: {catchComponent: {id: "shared_ground_card", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "organizer/generated/1280", height: 520, width: 580, x: 535, y: 155}}
      label="Claim pitch"
      phone={{capture: "organizer/generated/390", height: 710, width: 358, x: 16, y: 1185}}
      render={pitch}
    />
  ),
};
