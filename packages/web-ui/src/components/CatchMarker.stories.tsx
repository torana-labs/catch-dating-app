import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {catchFormats} from "./catchCoreVocabulary";
import {CatchMarker, catchMarkerSizes, catchMarkerTones} from "./CatchMarker";
import {CatchRoot} from "./CatchRoot";
import {CatchStack} from "./CatchStack";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";

const meta = {title: "Web UI/CatchMarker", component: CatchMarker} satisfies Meta<typeof CatchMarker>;

export default meta;
type Story = StoryObj<typeof meta>;

function State({label, children}: {label: string; children: ReactNode}) {
  return (
    <CatchStack gap={8}>
      <CatchText tone="secondary" variant="label-kicker">{label}</CatchText>
      <CatchStack align="center" direction="row" gap={16} wrap>{children}</CatchStack>
    </CatchStack>
  );
}

/** catch.marker: each kind, size, tone and format, and a live pulse, on day and night. */
export const Contract: Story = {
  render: () => (
    <CatchStack gap={0}>
      {(["day", "night"] as const).map((theme) => (
        <CatchRoot key={theme} size="expanded" theme={theme}>
          <CatchSurface block="plain" padding="lg">
            <CatchStack gap={20}>
              <State label="dot">{catchMarkerSizes.map((size) => <CatchMarker key={size} size={size} />)}</State>
              <State label="ring">{catchMarkerSizes.map((size) => <CatchMarker key={size} kind="ring" size={size} />)}</State>
              <State label="check"><CatchMarker kind="check" /><CatchMarker kind="check" tone="success" /></State>
              <State label="number">{[1, 2, 3].map((value) => <CatchMarker key={value} kind="number" value={value} />)}</State>
              <State label="tones">{catchMarkerTones.map((tone) => <CatchMarker key={tone} size={12} tone={tone} />)}</State>
              <State label="format">{catchFormats.map((format) => <CatchMarker format={format} key={format} size={12} tone="format" />)}</State>
              <State label="live"><CatchMarker live size={12} tone="format" format="games" /><CatchMarker live size={12} tone="danger" /></State>
            </CatchStack>
          </CatchSurface>
        </CatchRoot>
      ))}
    </CatchStack>
  ),
};
