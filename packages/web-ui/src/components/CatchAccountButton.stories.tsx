import type {Meta, StoryObj} from "@storybook/react-vite";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchAccountButton} from "./CatchAccountButton";
import {CatchBand} from "./CatchBand";
import {CatchGap} from "./CatchGap";

const meta = {
  title: "Web UI/CatchAccountButton",
  component: CatchAccountButton,
  args: {label: "Account, Aanya Mehta", name: "Aanya Mehta", onPressed: () => undefined},
} satisfies Meta<typeof CatchAccountButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The top bar's signed-in account avatar, closed and with its menu open. */
export const Contract: Story = {
  render: (args) => (
    <StoryPage>
      <CatchBand aria-label="Account button" pb="compact" pt="compact">
        <CatchGap direction="horizontal" size="inline">
          <CatchAccountButton {...args} />
          <CatchAccountButton {...args} expanded />
        </CatchGap>
      </CatchBand>
    </StoryPage>
  ),
};
