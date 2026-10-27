import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchDateTile} from "./CatchDateTile";
import {CatchGap} from "./CatchGap";
import {CatchGrid} from "./CatchGrid";
import {CatchIndexRow} from "./CatchIndexRow";
import {CatchSkeleton} from "./CatchSkeleton";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchSkeleton",
  component: CatchSkeleton,
  args: {shape: "card"},
} satisfies Meta<typeof CatchSkeleton>;

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

function States() {
  return (
    <CatchGrid columns={3} compactColumns={1}>
      <State label="card"><CatchSkeleton shape="card" /></State>
      <State label="box"><CatchSkeleton height={72} radius={14} shape="box" width={72} /></State>
      <State label="text"><CatchSkeleton shape="text" width="70%" /></State>
      <State label="text-block"><CatchSkeleton lines={3} shape="textBlock" /></State>
      <State label="circle"><CatchSkeleton shape="circle" /></State>
      <State label="custom"><CatchSkeleton shape="custom"><span style={{borderRadius: 999, display: "block", height: 24, width: 96}} /></CatchSkeleton></State>
      <State label="derived-content">
        <CatchSkeleton shape="content">
          <CatchIndexRow
            leading={<CatchDateTile dateTime="2026-11-02" day="2" ground="paper" month="Nov" weekday="Sun" />}
            subtitle="Loading location"
            title="Loading event"
          />
        </CatchSkeleton>
      </State>
    </CatchGrid>
  );
}

/**
 * catch.skeleton on the web: every shape and paint derived from a real event
 * row. No board capture shows a loading state.
 */
export const Contract: Story = {
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Light" pb="compact" pt="compact"><States /></CatchBand>
      <CatchBand aria-label="Dark" ground="ink" pb="compact" pt="compact"><States /></CatchBand>
    </StoryPage>
  ),
};
