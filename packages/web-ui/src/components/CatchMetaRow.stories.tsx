import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchMetaRow} from "./CatchMetaRow";

const meta = {
  title: "Web UI/CatchMetaRow",
  component: CatchMetaRow,
  args: {entries: [{label: "City", value: "Mumbai"}]},
} satisfies Meta<typeof CatchMetaRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** catch.meta_row on the web: a record's facts in two columns with tones, a link and a wide entry, then the flow recipe. */
export const Contract: Story = {
  render: () => (
    <div style={{display: "grid", gap: 32, maxWidth: 560}}>
      <CatchMetaRow
        entries={[
          {label: "Type", value: "Listing · new organizer"},
          {label: "City", value: "Mumbai, Bandra"},
          {label: "Nominated by", value: "Riya Sharma", href: "#riya"},
          {label: "Waiting", value: "3 days", tone: "danger"},
          {label: "Looks like", value: "No published organizer in Mumbai", tone: "success"},
          {label: "Events found", value: "3 upcoming"},
          {label: "About", value: "Weekly social nights for people who would rather meet in person.", wide: true},
        ]}
      />
      <CatchMetaRow entries={[{label: "Kind", value: "Listing"}, {label: "City", value: "Mumbai"}, {label: "Waiting", value: "3 days", tone: "danger"}]} recipe="flow" />
    </div>
  ),
};
