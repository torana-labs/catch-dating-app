import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {CatchTopBar} from "./CatchTopBar";
import {CatchViewport} from "./CatchViewport";
import {CatchButton} from "./CatchButton";
import {CatchRoot} from "./CatchRoot";
import {CatchStack} from "./CatchStack";

const meta = {
  title: "Web UI/CatchTopBar",
  component: CatchTopBar,
  args: {title: "Booking questions"},
} satisfies Meta<typeof CatchTopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;

function In({label, size, children}: {label: string; size: "compact" | "expanded"; children: ReactNode}) {
  return (
    <section aria-label={label} style={{border: "var(--catch-stroke-hairline) solid var(--catch-theme-line2)", height: 140, width: size === "compact" ? 390 : 900}}>
      <CatchViewport fill="parent" sizeClass={size} topBar={children} />
    </section>
  );
}

/** catch.top_bar on the web: the wide 56px row, then the phone tool, tab-home, step, live and moment shapes. */
export const Contract: Story = {
  render: () => (
    <div style={{display: "grid", gap: 16}}>
      <In label="Wide row" size="expanded"><CatchTopBar action={{label: "Preview", onPressed: noop}} back={{label: "Back", onPressed: noop}} kicker="Settings" title="Intake" /></In>
      <In label="Phone tool" size="compact"><CatchTopBar action={{label: "Save", onPressed: noop}} back={{label: "Back", onPressed: noop}} kicker="Used by 3 events" title="Booking questions" /></In>
      <In label="Phone tab home" size="compact"><CatchTopBar kicker="Saturday" title="Tonight" variant="tab-home" /></In>
      <In label="Phone step" size="compact"><CatchTopBar back={{label: "Back", onPressed: noop}} step={{index: 2, total: 4}} title="Your page" variant="step" /></In>
      <In label="Phone live" size="compact"><CatchTopBar back={{label: "Back", onPressed: noop}} live="Live · 9:04 PM" title="Door" variant="live" /></In>
      <In label="Phone moment" size="compact"><CatchTopBar back={{label: "Close", onPressed: noop}} variant="moment" /></In>
    </div>
  ),
};

/** variant="site": the website header with the wordmark, page links (folded away under 600px) and actions. */
export const Site: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchStack gap={24}>
        <CatchTopBar
          actions={<><CatchButton label="Mumbai" onPressed={noop} size="sm" trailingIcon="expand" variant="secondary" /><CatchButton href="#" label="Get the app" size="sm" /></>}
          homeHref="#"
          links={[{label: "Explore", href: "#"}, {label: "Organisers", href: "#"}, {label: "For hosts", href: "#"}]}
          title="Catch"
          variant="site"
        />
        <CatchTopBar
          actions={<CatchButton href="#" label="Apply for a pilot" size="sm" />}
          homeHref="#"
          links={[{label: "On the night", href: "#"}, {label: "Ways to use Catch", href: "#"}, {label: "Pricing", href: "#"}]}
          title="Catch for hosts"
          variant="site"
        />
      </CatchStack>
    </CatchRoot>
  ),
};
