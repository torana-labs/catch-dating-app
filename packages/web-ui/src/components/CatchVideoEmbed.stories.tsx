import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect, userEvent, within} from "storybook/test";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchRoot} from "./CatchRoot";
import {CatchStack} from "./CatchStack";
import {CatchSurface} from "./CatchSurface";
import {CatchVideoEmbed} from "./CatchVideoEmbed";

// A drawn still, so the story fetches nothing; pages pass the video host's still.
const still = `data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'><defs><linearGradient id='g' x2='1' y2='1'><stop offset='0' stop-color='#3a2f2a'/><stop offset='1' stop-color='#c9643f'/></linearGradient></defs><rect width='16' height='9' fill='url(#g)'/></svg>")}`;
// Pressing play loads this address; about:blank keeps the story off the network.
const embedSrc = "about:blank";

const meta = {
  title: "Web UI/CatchVideoEmbed",
  component: CatchVideoEmbed,
  parameters: {layout: "fullscreen"},
  args: {
    title: "Last Tuesday’s final round",
    caption: "Every final round goes up a week later.",
    still: {src: still, alt: "Teams at their tables during the final round"},
    source: "YouTube · Lantern Lane Social",
    duration: "6:12",
    embedSrc,
  },
} satisfies Meta<typeof CatchVideoEmbed>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Proposal WebEventVideo: the still with its source and running time, at an event page's main-column width and a phone's. */
export const Contract: Story = {
  parameters: {a11y: {test: "error"}},
  render: (args) => (
    <StoryPage>
      <CatchRoot size="expanded" theme="day">
        <CatchSurface block="plain" padding="lg">
          <CatchStack direction="row" gap={32} wrap>
            <div style={{width: 640}}><CatchVideoEmbed {...args} /></div>
            <div style={{width: 342}}><CatchVideoEmbed {...args} caption={undefined} duration="18:40" title="The Lantern Lane Quiz · episode 12" /></div>
          </CatchStack>
        </CatchSurface>
      </CatchRoot>
    </StoryPage>
  ),
};

/** Pressing play swaps the still for the player in place. */
export const Playing: Story = {
  render: (args) => (
    <CatchRoot size="expanded" theme="day">
      <CatchSurface block="plain" padding="lg"><div style={{width: 640}}><CatchVideoEmbed {...args} /></div></CatchSurface>
    </CatchRoot>
  ),
  play: async ({canvasElement, args}) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {name: `Play ${args.title}`}));
    await expect(canvas.getByTitle(args.title)).toBeInTheDocument();
  },
};
