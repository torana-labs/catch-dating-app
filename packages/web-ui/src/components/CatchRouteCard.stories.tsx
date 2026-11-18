import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchGrid} from "./CatchGrid";
import {CatchRoot} from "./CatchRoot";
import {CatchRouteCard} from "./CatchRouteCard";
import {CatchSurface} from "./CatchSurface";

const meta = {
  title: "Web UI/CatchRouteCard",
  component: CatchRouteCard,
  args: {title: "A sample way forward", body: "A sample line that says where this card leads.", action: {label: "Sample link", href: "#"}},
} satisfies Meta<typeof CatchRouteCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Link cards (where you are today) and button cards (however you like to start) on every ground the host landing uses. */
export const Contract: Story = {
  parameters: {catchComponent: {id: "shared_catch_route_card", routeIds: ["host"], states: ["link", "button", "ink"]}},
  render: (args) => (
    <CatchRoot theme="day">
      <CatchSurface block="band">
        <CatchGrid columns={3}>
          <CatchRouteCard {...args} ground="coral" />
          <CatchRouteCard {...args} ground="mint" />
          <CatchRouteCard {...args} ground="ink" />
        </CatchGrid>
        <CatchGrid columns={4}>
          <CatchRouteCard {...args} action={{label: "Primary", href: "#"}} ground="coral" kicker="Sample label" kind="button" />
          <CatchRouteCard {...args} action={{label: "Secondary", href: "#", variant: "secondary"}} kicker="Sample label" kind="button" />
          <CatchRouteCard {...args} action={{label: "Primary", href: "#"}} ground="mint" kicker="Sample label" kind="button" />
          <CatchRouteCard {...args} action={{label: "Light", href: "#", variant: "light"}} ground="ink" kicker="Sample label" kind="button" />
        </CatchGrid>
      </CatchSurface>
    </CatchRoot>
  ),
};
