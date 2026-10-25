import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchIconTile} from "./CatchIconTile";
import {CatchGap} from "./CatchGap";
import {CatchPageBody} from "./CatchPageBody";
import {CatchText, type CatchTextColor} from "./CatchText";
const glyph = <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 4 4L19 6" /></svg>;
const meta = {title: "Web UI/CatchIconTile", component: CatchIconTile, args: {icon: glyph, iconColor: "primary"}} satisfies Meta<typeof CatchIconTile>;
export default meta;
type Story = StoryObj<typeof CatchIconTile>;
function States() {
  return <CatchPageBody constrainToContentWidth><CatchGap direction="horizontal" wrap size="formField">
    <CatchGap size="inline"><CatchText variant="bodyM">Tile</CatchText><CatchIconTile icon={glyph} iconColor="primary" /></CatchGap>
    <CatchGap size="inline"><CatchText variant="bodyM">Plain empty</CatchText><CatchIconTile recipe="empty" icon={glyph} /></CatchGap>
    <CatchGap size="inline"><CatchText variant="bodyM">Bubble empty</CatchText><CatchIconTile recipe="empty" variant="bubble" icon={glyph} /></CatchGap>
    <CatchGap size="inline"><CatchText variant="bodyM">Error</CatchText><CatchIconTile recipe="error" /></CatchGap>
    <CatchGap size="inline"><CatchText variant="bodyM">Error override</CatchText><CatchIconTile recipe="error" icon={glyph} /></CatchGap>
  </CatchGap></CatchPageBody>;
}
export const Contract: Story = {render: () => <><States /><div data-catch-theme="dark" style={{background: "var(--catch-theme-bg)"}}><States /></div></>};
export const Tile: Story = {};
export const PlainEmpty: Story = {render: () => <CatchIconTile recipe="empty" icon={glyph} />};
export const BubbleEmpty: Story = {render: () => <CatchIconTile recipe="empty" variant="bubble" icon={glyph} />};
export const Error: Story = {render: () => <CatchIconTile recipe="error" />};
export const ErrorOverride: Story = {render: () => <CatchIconTile recipe="error" icon={glyph} />};
export const ThemeRoles: Story = {render: () => <CatchGap direction="horizontal" size="inline" wrap>
  {(["ink", "ink2", "ink3", "primary", "danger", "positiveText", "attentionText", "inherit"] satisfies CatchTextColor[]).map((iconColor) => <CatchIconTile key={iconColor} icon={glyph} iconColor={iconColor} />)}
</CatchGap>};
