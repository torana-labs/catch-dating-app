import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchButton} from "./CatchButton";
import {CatchErrorState} from "./CatchErrorState";
import {CatchGap} from "./CatchGap";
import {CatchGrid} from "./CatchGrid";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchErrorState",
  component: CatchErrorState,
  args: {message: "Check your connection and try again.", title: "We couldn't load this page"},
} satisfies Meta<typeof CatchErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;

function State({children, label}: {children: ReactNode; label: string}) {
  return (
    <CatchGap size="related">
      <CatchText as="span" color="ink2" variant="bodyS">{label}</CatchText>
      {children}
    </CatchGap>
  );
}

// Lucide "wifi-off" (ISC).
const offline = (
  <svg fill="none" focusable="false" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M12 20h.01M8.5 16.43a5 5 0 0 1 7 0M2 8.82a15 15 0 0 1 4.18-2.65M19 12.86a10 10 0 0 0-2.27-1.84M22 8.82a15 15 0 0 0-11.29-3.76M5 12.86a10 10 0 0 1 5.17-2.69M2 2l20 20" />
  </svg>
);

function States() {
  return (
    <CatchGrid columns={3} compactColumns={1}>
      <State label="full-screen, with-retry">
        <CatchErrorState message="Check your connection and try again." onRetry={noop} retryLabel="Try again" title="We couldn't load this page" />
      </State>
      <State label="inline, secondary-action">
        <CatchErrorState actions={[<CatchButton key="home" label="Go home" onPressed={noop} variant="secondary" />]}
          message="This event has ended or was removed." mode="inline" onRetry={noop} retryLabel="Try again" title="Event not found" />
      </State>
      <State label="compact, icon">
        <CatchErrorState icon={offline} message="You're offline. Reviews load when you're back." mode="compact" onRetry={noop} retryLabel="Retry" title="Reviews didn't load" />
      </State>
      <State label="scaffold: a full-screen state as a page's body">
        <div style={{alignItems: "center", display: "flex", minHeight: 320}}>
          <CatchErrorState message="Check your connection and try again." onRetry={noop} retryLabel="Try again" title="We couldn't load this page" />
        </div>
      </State>
      <State label="sliver: an inline state in a list">
        <CatchErrorState message="Pull to try again." mode="inline" title="Past events didn't load" />
      </State>
      <State label="from-error">
        <CatchErrorState message={"TypeError: Failed to fetch\n    at loadReviews (reviews.ts:41)\n    at async OrganiserPage"} mode="compact" title="Something went wrong" />
      </State>
    </CatchGrid>
  );
}

/**
 * catch.error_state on the web: full screen, inline and compact, with retry,
 * a secondary action, a custom icon and a capped error message, light and
 * dark. The scaffold and sliver states are Flutter placements; on the web the
 * page places the same component. No board capture shows an error state.
 */
export const Contract: Story = {
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Light" pb="compact" pt="compact"><States /></CatchBand>
      <CatchBand aria-label="Dark" ground="ink" pb="compact" pt="compact"><States /></CatchBand>
    </StoryPage>
  ),
};
