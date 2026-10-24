import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchBadge, type CatchBadgeTone} from "./CatchBadge";
import {CatchGap} from "./CatchGap";
import {CatchPageBody} from "./CatchPageBody";

const meta = {
  title: "Web UI/CatchBadge",
  component: CatchBadge,
  args: {label: "Badge"},
} satisfies Meta<typeof CatchBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

const tones: CatchBadgeTone[] = ["neutral", "brand", "success", "warning", "danger", "gold", "affinity"];

function CheckGlyph() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M5 12.5 10 17 19 7" />
    </svg>
  );
}

function Badges() {
  return (
    <CatchGap size="formField">
      <CatchGap size="inline" direction="horizontal" wrap>
        {tones.map((tone) => <CatchBadge key={tone} tone={tone} label={tone} />)}
      </CatchGap>
      <CatchGap size="inline" direction="horizontal" wrap>
        {tones.map((tone) => <CatchBadge key={tone} recipe="functional" tone={tone} label={tone} />)}
      </CatchGap>
      <CatchGap size="inline" direction="horizontal" wrap>
        {tones.map((tone) => <CatchBadge key={tone} recipe="status" tone={tone} label={`${tone} status`} />)}
      </CatchGap>
      <CatchGap size="inline" direction="horizontal" wrap>
        <CatchBadge size="md" label="Medium" icon={<CheckGlyph />} />
        <CatchBadge size="action" label="Action" />
        <CatchBadge recipe="solid" label="Solid" />
        <CatchBadge recipe="solidStatus" label="Solid status" />
        <CatchBadge recipe="live" label="Live" />
        <CatchBadge recipe="privacy" label="Private" icon={<CheckGlyph />} />
      </CatchGap>
      <CatchGap size="inline" direction="horizontal" wrap>
        <CatchBadge recipe="ticketStatus" color="rgb(214 92 52)" label="Going" />
        <CatchBadge recipe="ticketStatus" emphasis="strong" label="Sold out" />
        <CatchBadge recipe="optional" label="Optional" />
        <CatchBadge recipe="optional" hasError label="Optional" />
      </CatchGap>
      <div style={{background: "#16140f", padding: 12, borderRadius: 8}}>
        <CatchGap size="inline" direction="horizontal" wrap>
          <CatchBadge recipe="onDark" label="On dark" />
          <CatchBadge recipe="onDarkStatus" label="On dark status" />
        </CatchGap>
      </div>
    </CatchGap>
  );
}

/** catch.badge on the web: every recipe and tone, in both themes. */
export const Contract: Story = {
  render: () => (
    <>
      <CatchPageBody constrainToContentWidth>
        <Badges />
      </CatchPageBody>
      <div data-catch-theme="dark" style={{background: "var(--catch-theme-bg)"}}>
        <CatchPageBody constrainToContentWidth>
          <Badges />
        </CatchPageBody>
      </div>
    </>
  ),
};
