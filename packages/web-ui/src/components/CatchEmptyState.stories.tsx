import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {StoryCta, StoryGlyph, StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchEmptyState} from "./CatchEmptyState";
import {CatchGap} from "./CatchGap";
import {CatchGrid} from "./CatchGrid";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchEmptyState",
  component: CatchEmptyState,
  args: {title: "No events yet"},
} satisfies Meta<typeof CatchEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

function State({children, label}: {children: ReactNode; label: string}) {
  return (
    <CatchGap size="related">
      <CatchText as="span" color="ink2" variant="bodyS">{label}</CatchText>
      {children}
    </CatchGap>
  );
}

const calendar = <StoryGlyph name="calendar" />;

function States() {
  return (
    <CatchGrid columns={3} compactColumns={1}>
      <State label="stacked"><CatchEmptyState icon={calendar} message="New runs show up here as soon as they're announced." title="No upcoming runs" /></State>
      <State label="inline"><CatchEmptyState icon={calendar} message="Past events and photos appear after the first run." title="Nothing here yet" variant="inline" /></State>
      <State label="surface"><CatchEmptyState icon={calendar} message="Reviews from people who booked appear here." surface title="No reviews yet" /></State>
      <State label="bubble-icon"><CatchEmptyState icon={calendar} iconVariant="bubble" title="You're all caught up" /></State>
      <State label="with-action">
        <CatchEmptyState actions={[<StoryCta key="follow" label="Get notified" primary />, <StoryCta key="ig" label="See Instagram" />]}
          icon={calendar} message="Follow to hear about the next one." title="No upcoming runs" />
      </State>
      <State label="title-only"><CatchEmptyState title="No links yet" /></State>
      <State label="message-only"><CatchEmptyState message="This organiser hasn't added any links." /></State>
      <State label="done"><CatchEmptyState kind="done" message="Nothing is waiting on you." title="All caught up" /></State>
    </CatchGrid>
  );
}

/**
 * catch.empty_state on the web: every Flutter contract state, light and dark.
 * No board capture shows an empty section. Actions take CatchButton once it
 * has a web twin; the stand-in is a passive button look.
 */
export const Contract: Story = {
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Light" pb="compact" pt="compact"><States /></CatchBand>
      <CatchBand aria-label="Dark" ground="ink" pb="compact" pt="compact"><States /></CatchBand>
    </StoryPage>
  ),
};
