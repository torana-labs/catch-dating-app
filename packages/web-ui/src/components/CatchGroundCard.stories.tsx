import type {Meta, StoryObj} from "@storybook/react-vite";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchAvatar} from "./CatchAvatar";
import {CatchBand} from "./CatchBand";
import {CatchButton} from "./CatchButton";
import {CatchGap} from "./CatchGap";
import {CatchGrid} from "./CatchGrid";
import {CatchGroundCard} from "./CatchGroundCard";
import {CatchText} from "./CatchText";
import {grounds} from "./palette";

const meta = {
  title: "Web UI/CatchGroundCard",
  component: CatchGroundCard,
  args: {children: null},
} satisfies Meta<typeof CatchGroundCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["event_detail_canonical"];

/** Every ground, then an outlined white card and the roomy padding. */
export const Grounds: Story = {
  parameters: {catchComponent: {id: "shared_ground_card", routeIds: storyRoutes, states: ["grounds", "outlined", "roomy", "phone-size"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Grounds" pb="compact" pt="compact">
        <CatchGrid columns={3} compactColumns={1}>
          {grounds.map((ground) => (
            <CatchGroundCard ground={ground} key={ground}>
              <CatchGap size="headerTitleToSubtitle">
                <CatchText as="span" variant="sectionTitle">{`On ${ground}`}</CatchText>
                <CatchText color="ink2" variant="bodyM">Library text takes the ground’s inks.</CatchText>
              </CatchGap>
            </CatchGroundCard>
          ))}
          <CatchGroundCard outlined>
            <CatchText variant="sectionTitle">Outlined on white</CatchText>
          </CatchGroundCard>
          <CatchGroundCard ground="ink" padding="roomy">
            <CatchText variant="displayS">Roomy on ink</CatchText>
          </CatchGroundCard>
        </CatchGrid>
      </CatchBand>
    </StoryPage>
  ),
};

/** The event page's organiser card: a composition on an outlined card. */
export const Reference: Story = {
  parameters: {catchComponent: {id: "shared_ground_card", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "event/catch_bare/1280", height: 108, width: 654, x: 99, y: 1170}}
      label="Organiser card"
      render={() => (
        <CatchGroundCard outlined>
          <CatchGap crossAxisAlignment="center" direction="horizontal" mainAxisAlignment="spaceBetween" size="formField" wrap>
            <CatchGap crossAxisAlignment="center" direction="horizontal" size="formField">
              <CatchAvatar ground="coral" initials="CR" name="Carter Road Runners" recipe="monogram" size={64} />
              <CatchGap size="headerTitleToSubtitle">
                <CatchText variant="sectionTitle">Carter Road Runners</CatchText>
                <CatchText color="ink2" variant="bodyM">Social runs in Bandra since 2024 · 2,140 followers</CatchText>
              </CatchGap>
            </CatchGap>
            <CatchButton href="#" label="See their page" onPressed={() => undefined} size="md" variant="secondary" />
          </CatchGap>
        </CatchGroundCard>
      )}
    />
  ),
};
