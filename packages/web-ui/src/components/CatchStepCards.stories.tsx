import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchRoot} from "./CatchRoot";
import {CatchStepCards} from "./CatchStepCards";
import {CatchSurface} from "./CatchSurface";

const steps = [{title: "A first step", body: "A line under the first step."}, {title: "A second step", body: "A line under the second step."}, {title: "A third step"}];

const meta = {
  title: "Web UI/CatchStepCards",
  component: CatchStepCards,
  args: {steps},
  parameters: {layout: "fullscreen"},
} satisfies Meta<typeof CatchStepCards>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Step cards on a colour panel with the first step current (the host landing's start band), and every card filled on the ink panel. */
export const Contract: Story = {
  parameters: {catchComponent: {id: "shared_catch_step_cards", routeIds: ["host", "home"], states: ["current", "night"]}},
  render: (args) => (
    <CatchRoot theme="day">
      <CatchSurface block="band" color="games"><CatchStepCards {...args} current={0} on="colour" /></CatchSurface>
      <CatchSurface block="band" color="ink"><CatchStepCards {...args} on="night" /></CatchSurface>
    </CatchRoot>
  ),
};
