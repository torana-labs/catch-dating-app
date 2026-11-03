import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchGap} from "./CatchGap";
import {CatchLegacyIcon, catchIconSizes, type CatchIconTone} from "./CatchLegacyIcon";
import {CatchLegacyText} from "./CatchLegacyText";

const meta = {
  title: "Web UI/CatchLegacyIcon",
  component: CatchLegacyIcon,
  args: {icon: "event"},
} satisfies Meta<typeof CatchLegacyIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

const tones: CatchIconTone[] = ["inherit", "ink", "muted", "primary", "success", "warning", "danger"];

function Row({label, children}: {label: string; children: ReactNode}) {
  return (
    <CatchGap size="inline">
      <CatchLegacyText as="span" color="ink2" variant="bodyS">{label}</CatchLegacyText>
      <CatchGap crossAxisAlignment="center" direction="horizontal" size="related" wrap>{children}</CatchGap>
    </CatchGap>
  );
}

/**
 * catch.icon on the web: every CatchIconSize step, every tone, and a labelled
 * icon, on light and dark.
 */
export const Contract: Story = {
  render: () => {
    const states = (
      <CatchGap size="section">
        <Row label="Sizes">
          {Object.keys(catchIconSizes).map((size) => (
            <CatchLegacyIcon icon="event" key={size} size={size as keyof typeof catchIconSizes} />
          ))}
        </Row>
        <Row label="Tones">
          {tones.map((tone) => <CatchLegacyIcon icon="success" key={tone} size="lg" tone={tone} />)}
        </Row>
        <Row label="Labelled">
          <CatchLegacyIcon icon="search" semanticLabel="Search" size="lg" tone="ink" />
        </Row>
      </CatchGap>
    );
    return (
      <StoryPage>
        <CatchBand aria-label="Light" pb="compact" pt="compact">{states}</CatchBand>
        <CatchBand aria-label="Dark" ground="ink" pb="compact" pt="compact">{states}</CatchBand>
      </StoryPage>
    );
  },
};
