import type {Meta, StoryObj} from "@storybook/react-vite";
import {referenceScreenUrl} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchDeviceFrame} from "./CatchDeviceFrame";
import {CatchGap} from "./CatchGap";

const meta = {
  title: "Web UI/CatchDeviceFrame",
  component: CatchDeviceFrame,
  args: {children: null, kind: "phone"},
} satisfies Meta<typeof CatchDeviceFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["home", "host"];
// Unframed screens: the approved website board captures, so no drawn hardware
// from an older framed app capture shows inside the generic frame.
const screenImage = (alt: string, src: string) => <img alt={alt} src={src} />;
const phoneScreen = referenceScreenUrl("organizer/guest/390");
const androidScreen = referenceScreenUrl("event/catch_bare/390");
const tabletScreen = referenceScreenUrl("organizer/owner/1280");
const portraitScreen = referenceScreenUrl("event/catch_full/390");

/** The generic kinds, upright and turned, on white and on the ink ground, at two sizes. */
export const Kinds: Story = {
  parameters: {
    catchComponent: {
      id: "shared_device_frame",
      routeIds: storyRoutes,
      states: ["phone", "android", "tablet", "tablet-portrait", "tilt-left", "tilt-right", "on-ink", "small"],
    },
  },
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Device frames on white" pb="compact" pt="compact">
        <CatchGap crossAxisAlignment="start" direction="horizontal" size="section" wrap>
          <div style={{width: 240}}>
            <CatchDeviceFrame kind="phone" tilt="left">{screenImage("An organiser's page", phoneScreen)}</CatchDeviceFrame>
          </div>
          <div style={{width: 240}}>
            <CatchDeviceFrame kind="android">{screenImage("An event page", androidScreen)}</CatchDeviceFrame>
          </div>
          <div style={{width: 420}}>
            <CatchDeviceFrame kind="tablet" tilt="right">{screenImage("An organiser's own page", tabletScreen)}</CatchDeviceFrame>
          </div>
          <div style={{width: 240}}>
            <CatchDeviceFrame kind="tablet" orientation="portrait">{screenImage("An event page, held upright", portraitScreen)}</CatchDeviceFrame>
          </div>
        </CatchGap>
      </CatchBand>
      <CatchBand aria-label="Device frames on ink" ground="ink" pb="compact" pt="compact">
        <CatchGap crossAxisAlignment="start" direction="horizontal" size="section" wrap>
          <div style={{width: 240}}>
            <CatchDeviceFrame kind="android">{screenImage("An event page on ink", androidScreen)}</CatchDeviceFrame>
          </div>
          <div style={{width: 96}}>
            <CatchDeviceFrame kind="phone">{screenImage("A small phone", phoneScreen)}</CatchDeviceFrame>
          </div>
        </CatchGap>
      </CatchBand>
    </StoryPage>
  ),
};
