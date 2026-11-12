import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect, userEvent, within} from "storybook/test";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchPipelineBoard, type CatchPipelineBoardProps} from "./CatchPipelineBoard";
import {CatchSurface} from "./CatchSurface";

const board: CatchPipelineBoardProps = {
  label: "Booking steps",
  boardLabel: "Guests moving from applied to booked",
  replayLabel: "Play again",
  steps: [
    {label: "Applied", title: "They apply", accent: "indigo", stat: "10 applications", body: "Applications arrive with the answers you asked for: who they are, who they’re bringing, what they’re hoping for."},
    {label: "Approved", title: "You approve", accent: "mint", stat: "9 approved · 1 on the waitlist", body: "Approve with a tap. Offers stay open for as long as you choose, and the waitlist stays warm."},
    {label: "Paid", title: "They pay", accent: "yellow", stat: "7 paid · ₹4,200", body: "UPI or card. Every payment lands next to the right name, with no screenshots to chase."},
    {label: "Booked", title: "They show up", accent: "coral", stat: "7 booked · arrival details sent", body: "Booked guests get where to meet and a reminder the day before. You get a guest list that’s ready."},
  ],
  guests: [
    {name: "Asha", reached: 3}, {name: "Kabir", reached: 3}, {name: "Ishaan", reached: 3}, {name: "Neha", reached: 3}, {name: "Rohan", reached: 1},
    {name: "Zara", reached: 3}, {name: "Tara", reached: 3}, {name: "Vikram", reached: 1}, {name: "Meera", reached: 3}, {name: "Dev", reached: 0},
  ],
};

const meta = {
  title: "Web UI/CatchPipelineBoard",
  component: CatchPipelineBoard,
  args: board,
} satisfies Meta<typeof CatchPipelineBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["host"];

/** Stopped on the last step (a still for the visual check) on a wide and a phone-width band. */
export const Contract: Story = {
  parameters: {catchComponent: {id: "shared_pipeline_board", routeIds: storyRoutes, states: ["booked", "compact", "chosen-step"]}},
  render: () => (
    <StoryPage>
      <CatchSurface aria-label="Wide band" block="band"><CatchPipelineBoard {...board} /></CatchSurface>
      <div style={{width: 390}}>
        <CatchSurface aria-label="Phone-width band" block="band"><CatchPipelineBoard {...board} /></CatchSurface>
      </div>
    </StoryPage>
  ),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    for (const tab of canvas.getAllByRole("tab", {name: /They show up/})) await userEvent.click(tab);
    await expect(canvas.getAllByRole("tab", {name: /They show up/})[0]).toHaveAttribute("aria-selected", "true");
  },
};
