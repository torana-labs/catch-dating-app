import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchAvatar} from "./CatchAvatar";
import {CatchBand} from "./CatchBand";
import {CatchButton} from "./CatchButton";
import {CatchDock} from "./CatchDock";
import {CatchGap} from "./CatchGap";
import {CatchGrid} from "./CatchGrid";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchDock",
  component: CatchDock,
  args: {label: "Book", onPressed: () => undefined, recipe: "primary" as const},
} satisfies Meta<typeof CatchDock>;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;

function State({children, label}: {children: ReactNode; label: string}) {
  return (
    <CatchGap size="related">
      <CatchText as="span" color="ink2" variant="bodyS">{label}</CatchText>
      <div style={{border: "var(--catch-stroke-hairline) dashed var(--catch-theme-line2)"}}>{children}</div>
    </CatchGap>
  );
}

function States() {
  return (
    <CatchGrid columns={2} compactColumns={1}>
      <State label="android-anchored (the web's chrome)"><CatchDock label="Book 1 place · ₹299" onPressed={noop} recipe="primary" /></State>
      <State label="leading-content">
        <CatchDock label="Message the host" leading={<CatchAvatar name="Kabir Mehta" size={40} />} onPressed={noop} recipe="primary" />
      </State>
      <State label="catch-line"><CatchDock catchLine="Most people book the 6:45 group" label="Book" onPressed={noop} recipe="primary" /></State>
      <State label="footnote"><CatchDock footnote="Free cancellation up to 24 hours before" label="Book" onPressed={noop} recipe="primary" /></State>
      <State label="loading"><CatchDock isLoading label="Book" onPressed={noop} recipe="primary" /></State>
      <State label="disabled"><CatchDock label="Sold out" onPressed={null} recipe="primary" /></State>
      <State label="rounded-button"><CatchDock buttonMode="rounded" label="Book" onPressed={noop} recipe="primary" /></State>
      <State label="custom">
        <CatchDock>
          <div style={{alignItems: "center", display: "flex", justifyContent: "space-between"}}>
            <CatchText as="span" variant="sectionTitle">₹299</CatchText>
            <CatchButton label="Book" onPressed={noop} size="md" />
          </div>
        </CatchDock>
      </State>
      <State label="custom-no-safe-area"><CatchDock includeSafeArea={false}><CatchText as="span" variant="bodyM">Tools</CatchText></CatchDock></State>
      <State label="embedded (primaryContent)"><CatchDock label="Continue" onPressed={noop} recipe="primaryContent" /></State>
      <State label="page action"><CatchDock label="Save changes" onPressed={noop} recipe="pageAction" /></State>
    </CatchGrid>
  );
}

/**
 * catch.bottom_action on the web: the utility and action recipes on anchored
 * chrome, light and dark. The web has no Cupertino floating chrome, and the
 * caller places the dock (CatchStickyAside fixes it to the bottom edge).
 */
export const Contract: Story = {
  args: meta.args,
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Light" pb="compact" pt="compact"><States /></CatchBand>
      <CatchBand aria-label="Dark" ground="ink" pb="compact" pt="compact"><States /></CatchBand>
    </StoryPage>
  ),
};
