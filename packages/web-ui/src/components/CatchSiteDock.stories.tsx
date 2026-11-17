import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchGap} from "./CatchGap";
import {CatchSiteDock} from "./CatchSiteDock";
import {PageFrame} from "../stories/referenceScreens";

const meta = {
  title: "Web UI/CatchSiteDock",
  component: CatchSiteDock,
  args: {label: "Quick actions", primary: {label: "Get notified", href: "#notify", accent: "pink"}, secondary: {label: "See plans", href: "#plans"}},
  parameters: {layout: "fullscreen"},
} satisfies Meta<typeof CatchSiteDock>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The phone action bar in a 390px frame: the homepage's pink main action with
 * an outlined second, and the kit's coral action with the WhatsApp button. It
 * draws nothing on a wide page.
 */
export const Contract: Story = {
  parameters: {catchComponent: {id: "shared_catch_site_dock", routeIds: ["home"], states: ["two-actions", "whatsapp", "wide-hidden"]}},
  render: (args) => (
    <CatchGap size="section">
      <PageFrame width={390}><CatchSiteDock {...args} /></PageFrame>
      <PageFrame width={390}>
        <CatchSiteDock label="Quick actions, kit" primary={{label: "Book a place", href: "#book"}} whatsapp={{label: "Chat on WhatsApp", href: "#chat"}} />
      </PageFrame>
      <PageFrame width={1280}><CatchSiteDock {...args} label="Quick actions, wide" /></PageFrame>
    </CatchGap>
  ),
};
