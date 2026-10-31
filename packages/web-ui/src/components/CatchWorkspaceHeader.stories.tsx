import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchWorkspaceHeader} from "./CatchWorkspaceHeader";

const meta = {
  title: "Web UI/CatchWorkspaceHeader",
  component: CatchWorkspaceHeader,
  args: {title: "Inbox"},
} satisfies Meta<typeof CatchWorkspaceHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;

/** catch.workspace_header on the web: a queue header with views and filters, an item with its position, and a page header. */
export const Contract: Story = {
  render: () => (
    <div style={{display: "grid", gap: 32, maxWidth: 960}}>
      <div>
        <CatchWorkspaceHeader
          count={23}
          filters={{chips: [{label: "All", count: 23, selected: true}, {label: "Listings", count: 12}, {label: "Events", count: 5}, {label: "Claims", count: 4}, {label: "Stuck", count: 2}], search: {placeholder: "Search the inbox"}}}
          note="oldest 3 days · 6 ready to decide"
          title="Inbox"
          views={{items: [{value: "waiting", label: "Waiting", count: 23}, {value: "mine", label: "Mine", count: 4}, {value: "done", label: "Done"}], value: "waiting"}}
        />
      </div>
      <div>
        <CatchWorkspaceHeader
          back={{label: "Back to the inbox", onPressed: noop}}
          kicker="Inbox"
          position={{label: "1 of 23", previous: {label: "Previous", onPressed: noop}, next: {label: "Next", onPressed: noop}}}
          title="Harbor Social"
        />
      </div>
      <div><CatchWorkspaceHeader note="last 30 days" title="Growth" /></div>
    </div>
  ),
};
