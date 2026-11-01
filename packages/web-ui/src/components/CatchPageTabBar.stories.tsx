import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import {CatchPageTabBar} from "./CatchPageTabBar";

const meta = {
  title: "Web UI/CatchPageTabBar",
  component: CatchPageTabBar,
  args: {label: "Money", options: [{value: "bills", label: "Bills"}], selected: "bills"},
} satisfies Meta<typeof CatchPageTabBar>;

export default meta;
type Story = StoryObj<typeof meta>;

function Views({fill, size, label}: {fill?: boolean; size?: "md" | "sm"; label: string}) {
  const [active, setActive] = useState("bills");
  return (
    <CatchPageTabBar
      selected={active}
      fill={fill}
      options={[{value: "bills", label: "Bills", count: 4}, {value: "bookings", label: "Bookings"}, {value: "refunds", label: "Refunds", count: 1}]}
      label={label}
      onChanged={setActive}
      size={size}
    />
  );
}

/** catch.tab_rail on the web: views with counts, filled with a sliding pill, small, and a narrow bar that scrolls. */
export const Contract: Story = {
  render: () => (
    <div style={{display: "grid", gap: 16, maxWidth: 480}}>
      <Views label="Money views" />
      <Views fill label="Money views, filled" />
      <Views label="Money views, small" size="sm" />
      <div style={{width: 200}}><Views label="Money views, narrow" /></div>
    </div>
  ),
};
