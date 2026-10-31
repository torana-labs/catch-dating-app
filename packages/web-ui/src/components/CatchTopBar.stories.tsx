import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {CatchTopBar} from "./CatchTopBar";
import {CatchViewport} from "./CatchViewport";

const meta = {
  title: "Web UI/CatchTopBar",
  component: CatchTopBar,
  args: {title: "Booking questions"},
} satisfies Meta<typeof CatchTopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;

function In({size, children}: {size: "compact" | "expanded"; children: ReactNode}) {
  return (
    <div style={{border: "var(--catch-stroke-hairline) solid var(--catch-theme-line2)", height: 140, width: size === "compact" ? 390 : 900}}>
      <CatchViewport fill="parent" sizeClass={size} topBar={children} />
    </div>
  );
}

/** catch.top_bar on the web: the wide 56px row, then the phone tool, tab-home, step, live and moment shapes. */
export const Contract: Story = {
  render: () => (
    <div style={{display: "grid", gap: 16}}>
      <In size="expanded"><CatchTopBar action={{label: "Preview", onPressed: noop}} back={{label: "Back", onPressed: noop}} kicker="Settings" title="Intake" /></In>
      <In size="compact"><CatchTopBar action={{label: "Save", onPressed: noop}} back={{label: "Back", onPressed: noop}} kicker="Used by 3 events" title="Booking questions" /></In>
      <In size="compact"><CatchTopBar kicker="Saturday" title="Tonight" variant="tab-home" /></In>
      <In size="compact"><CatchTopBar back={{label: "Back", onPressed: noop}} step={{index: 2, total: 4}} title="Your page" variant="step" /></In>
      <In size="compact"><CatchTopBar back={{label: "Back", onPressed: noop}} live="Live · 9:04 PM" title="Door" variant="live" /></In>
      <In size="compact"><CatchTopBar back={{label: "Close", onPressed: noop}} variant="moment" /></In>
    </div>
  ),
};
