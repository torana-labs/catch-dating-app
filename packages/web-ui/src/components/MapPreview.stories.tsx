import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage, storyMapImage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchGap} from "./CatchGap";
import {CatchGrid} from "./CatchGrid";
import {CatchText} from "./CatchText";
import {MapPreview} from "./MapPreview";

const meta = {
  title: "Web UI/MapPreview",
  component: MapPreview,
  args: {fallbackLabel: "Carter Road jetty, Bandra West"},
} satisfies Meta<typeof MapPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

const jetty = {latitude: 19.0656, longitude: 72.8226};
const label = "Route from Carter Road jetty to Bandstand and back";

function State({children, title}: {children: ReactNode; title: string}) {
  return (
    <CatchGap size="related">
      <span style={{display: "block", height: 160}}>{children}</span>
      <CatchText as="span" color="ink2" variant="bodyS">{title}</CatchText>
    </CatchGap>
  );
}

function States() {
  return (
    <CatchGrid columns={3} compactColumns={1}>
      <State title="exact-location"><MapPreview coordinate={jetty} fallbackLabel={label} imageUrl={storyMapImage} /></State>
      <State title="missing-coordinate"><MapPreview fallbackLabel="Carter Road jetty, Bandra West" /></State>
      <State title="no map image"><MapPreview coordinate={jetty} fallbackLabel="Carter Road jetty, Bandra West" /></State>
    </CatchGrid>
  );
}

/** catch.map_preview on the web: the provider's map, and the fallback without a coordinate or map. Light and dark. */
export const Contract: Story = {
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Light" pb="compact" pt="compact"><States /></CatchBand>
      <CatchBand aria-label="Dark" ground="ink" pb="compact" pt="compact"><States /></CatchBand>
    </StoryPage>
  ),
};

/** The event page's map card, framed. */
export const Reference: Story = {
  render: () => (
    <ReferenceComparison
      desktop={{capture: "event/catch_full/1280", height: 264, width: 660, x: 96, y: 1784}}
      label="Event map"
      phone={{capture: "event/catch_full/390", height: 176, width: 366, x: 12, y: 2238}}
      render={() => <MapPreview coordinate={jetty} fallbackLabel={label} framed imageUrl={storyMapImage} />}
    />
  ),
};
