import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchDialog} from "./CatchDialog";

const meta = {
  title: "Web UI/CatchDialog",
  component: CatchDialog,
  args: {confirm: {label: "Ban", onPressed: () => undefined}, onClose: () => undefined, open: true, title: "Ban this account?"},
} satisfies Meta<typeof CatchDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

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
