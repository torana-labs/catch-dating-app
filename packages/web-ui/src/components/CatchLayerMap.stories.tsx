import type {Meta, StoryObj} from "@storybook/react-vite";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchLayerMap, type CatchLayerMapProps} from "./CatchLayerMap";
import {CatchSurface} from "./CatchSurface";

const labels: CatchLayerMapProps["labels"] = {
  on: "Catch runs this",
  off: "Stays on your own tools",
  everyLayer: "Every layer",
  fromLayer: (layer) => `From layer ${layer}`,
  newHere: "new here",
  youKeep: (yours) => `You keep ${yours}`,
};

const nodes: CatchLayerMapProps["nodes"] = [
  {label: "Get found", from: 2, yours: "Instagram and your own page"},
  {label: "Bookings and payments", from: 1, yours: "Luma, forms and UPI screenshots"},
  {label: "Messages", from: 1, yours: "your WhatsApp groups"},
  {label: "Check-in", from: 0}, {label: "The night", from: 0}, {label: "Follow-up", from: 0},
];

const meta = {
  title: "Web UI/CatchLayerMap",
  component: CatchLayerMap,
  args: {labels, layer: 0, nodes},
} satisfies Meta<typeof CatchLayerMap>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["host"];

/** Each of the three layers on the indigo band, and the first on a phone-width band. */
export const Layers: Story = {
  parameters: {catchComponent: {id: "shared_layer_map", routeIds: storyRoutes, states: ["layer-1", "layer-2", "layer-3", "compact"]}},
  render: () => (
    <StoryPage>
      {[0, 1, 2].map((layer) => (
        <CatchSurface aria-label={`Layer ${layer + 1}`} block="band" color="indigo" key={layer}>
          <CatchLayerMap labels={labels} layer={layer} nodes={nodes} />
        </CatchSurface>
      ))}
      <div style={{width: 390}}>
        <CatchSurface aria-label="Phone width" block="band" color="indigo"><CatchLayerMap labels={labels} layer={0} nodes={nodes} /></CatchSurface>
      </div>
    </StoryPage>
  ),
};
