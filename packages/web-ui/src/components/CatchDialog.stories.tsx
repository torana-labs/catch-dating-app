import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchDialog} from "./CatchDialog";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchDialog",
  component: CatchDialog,
} satisfies Meta<typeof CatchDialog>;

export default meta;
type Story = StoryObj<typeof CatchDialog>;

/** catch.confirm_dialog on the web: a destructive confirmation with its message, open over the scrim. */
export const Contract: Story = {
  render: () => (
    <CatchDialog
      confirm={{label: "Ban account", onPressed: () => undefined, tone: "danger"}}
      message="They are signed out, and their phone and device cannot make a new account. The reporter hears the case was handled."
      onClose={() => undefined}
      open
      title="Ban this account?"
    />
  ),
};

/** The content recipe: page content too big for a dropdown, under a title with a close button. */
export const Content: Story = {
  render: () => (
    <CatchDialog closeLabel="Close" onClose={() => undefined} open recipe="content" subtitle="Carter Road Runners" title="Sunday Social Run">
      <CatchText as="p" variant="body">Show this at the start. Sun 15 Nov · 6:15 AM, Carter Road promenade, Bandra West.</CatchText>
    </CatchDialog>
  ),
};
