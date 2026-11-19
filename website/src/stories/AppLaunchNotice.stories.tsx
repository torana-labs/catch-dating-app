import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchRoot} from "@catch/web-ui";
import {AppLaunchNotice} from "../features/marketing/AppLaunchNotice";

const meta = {
  title: "Marketing Website/Shared/App launch notice",
  parameters: {
    catchComponentRegistry: {
      path: "design/website/components.json",
    },
    catchRouteContract: {
      path: "design/website/routes.json",
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** /app/'s form on its own: a WhatsApp number and a city for one message on launch, new plans only if ticked. */
export const AppLaunchNoticeForm: Story = {
  name: "/app/ launch notice",
  parameters: {layout: "fullscreen", catchComponent: {id: "app_launch_notice", routeIds: ["app_notify"], states: ["form"]}},
  render: () => (
    <CatchRoot theme="day">
      <AppLaunchNotice ground="paper" id="notify" kicker="Get notified" labels={{city: "Your city"}} title="One message, the day it launches." />
    </CatchRoot>
  ),
};
