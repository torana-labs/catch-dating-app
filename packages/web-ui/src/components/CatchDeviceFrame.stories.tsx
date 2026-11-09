import type {Meta, StoryObj} from "@storybook/react-vite";
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
const screenImage = (alt: string, src: string) => <img alt={alt} src={src} />;

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
            <CatchDeviceFrame kind="phone" tilt="left">{screenImage("Explore with tonight's plans", "/assets/app-screenshots/member-event-discovery.png")}</CatchDeviceFrame>
          </div>
          <div style={{width: 240}}>
            <CatchDeviceFrame kind="android">{screenImage("Joining an event", "/assets/app-screenshots/guest-join-phone.png")}</CatchDeviceFrame>
          </div>
          <div style={{width: 420}}>
            <CatchDeviceFrame kind="tablet" tilt="right">{screenImage("Host app, today", "/assets/app-screenshots/host-today-dashboard.png")}</CatchDeviceFrame>
          </div>
          <div style={{width: 240}}>
            <CatchDeviceFrame kind="tablet" orientation="portrait">{screenImage("Host app, held upright", "/assets/app-screenshots/host-today-dashboard.png")}</CatchDeviceFrame>
          </div>
        </CatchGap>
      </CatchBand>
      <CatchBand aria-label="Device frames on ink" ground="ink" pb="compact" pt="compact">
        <CatchGap crossAxisAlignment="start" direction="horizontal" size="section" wrap>
          <div style={{width: 240}}>
            <CatchDeviceFrame kind="android">{screenImage("After the event", "/assets/app-screenshots/post-run-catch-window.png")}</CatchDeviceFrame>
          </div>
          <div style={{width: 96}}>
            <CatchDeviceFrame kind="phone">{screenImage("A small phone", "/assets/app-screenshots/member-event-discovery.png")}</CatchDeviceFrame>
          </div>
        </CatchGap>
      </CatchBand>
    </StoryPage>
  ),
};
