import type {Meta, StoryObj} from "@storybook/react-vite";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchGap} from "./CatchGap";
import {CatchShareBar, type CatchShareBarSegment} from "./CatchShareBar";

const meta = {
  title: "Web UI/CatchShareBar",
  component: CatchShareBar,
  args: {label: "Where visitors came from", segments: []},
} satisfies Meta<typeof CatchShareBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["organizer_listing_canonical"];

const sources: CatchShareBarSegment[] = [
  {ground: "pink", label: "Instagram bio", value: 71, valueLabel: "71%"},
  {ground: "mint", label: "WhatsApp", value: 14, valueLabel: "14%"},
  {ground: "indigo", label: "Direct", value: 9, valueLabel: "9%"},
  {ground: "yellow", label: "Other", value: 6, valueLabel: "6%"},
];

/** Four sources, two even halves, one source, and no visits yet. */
export const States: Story = {
  parameters: {catchComponent: {id: "shared_share_bar", routeIds: storyRoutes, states: ["sources", "even", "single", "empty"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Shares" pb="compact" pt="compact">
        <CatchGap size="section">
          <CatchShareBar label="Where visitors came from" segments={sources} />
          <CatchShareBar label="Bookings by source" segments={[{ground: "coral", label: "Catch", value: 50, valueLabel: "half"}, {ground: "indigo", label: "Luma", value: 50, valueLabel: "half"}]} />
          <CatchShareBar label="Ticket types" segments={[{ground: "mint", label: "General", value: 40, valueLabel: "100%"}]} />
          <CatchShareBar label="No visits yet" segments={[{ground: "pink", label: "Instagram bio", value: 0, valueLabel: "0%"}]} />
        </CatchGap>
      </CatchBand>
    </StoryPage>
  ),
};

/** The owner view's "Where visitors came from". */
export const Reference: Story = {
  parameters: {catchComponent: {id: "shared_share_bar", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "organizer/owner/1280", height: 48, width: 572, x: 588, y: 410}}
      label="Visitor sources"
      phone={{capture: "organizer/owner/390", height: 76, width: 318, x: 36, y: 2226}}
      render={() => <CatchShareBar label="Where visitors came from" segments={sources} />}
    />
  ),
};
