import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchGap} from "./CatchGap";
import {CatchLoadingIndicator} from "./CatchLoadingIndicator";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchLoadingIndicator",
  component: CatchLoadingIndicator,
} satisfies Meta<typeof CatchLoadingIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

function State({children, label}: {children: ReactNode; label: string}) {
  return (
    <CatchGap crossAxisAlignment="center" size="inline">
      {children}
      <CatchText as="span" color="ink2" variant="bodyS">{label}</CatchText>
    </CatchGap>
  );
}

function States() {
  return (
    <CatchGap direction="horizontal" size="section" wrap>
      <State label="default"><CatchLoadingIndicator label="Loading events" /></State>
      <State label="small"><CatchLoadingIndicator recipe="inline" size={12} /></State>
      <State label="tinted"><CatchLoadingIndicator color="var(--catch-theme-success)" label="Saving" /></State>
      <State label="dots-primary">
        <span style={{background: "var(--catch-theme-primary)", borderRadius: "var(--catch-radius-xs)", display: "inline-flex", padding: "14px 20px"}}>
          <CatchLoadingIndicator color="var(--catch-theme-primary-ink)" label="Booking" recipe="dots" />
        </span>
      </State>
      <State label="dots-light"><CatchLoadingIndicator color="var(--catch-theme-ink)" recipe="dots" /></State>
      <State label="inline-status"><CatchLoadingIndicator color="var(--catch-theme-ink2)" recipe="inline" /></State>
      <State label="inline-commit"><CatchLoadingIndicator color="var(--catch-theme-primary)" label="Saving the field" recipe="inline" /></State>
    </CatchGap>
  );
}

/**
 * catch.loading_indicator on the web: every Flutter contract state, light and
 * dark. No board capture shows a loading state. Reduced motion holds them still.
 */
export const Contract: Story = {
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Light" pb="compact" pt="compact"><States /></CatchBand>
      <CatchBand aria-label="Dark" ground="ink" pb="compact" pt="compact"><States /></CatchBand>
    </StoryPage>
  ),
};
