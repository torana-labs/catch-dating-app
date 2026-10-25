import type {Meta, StoryObj} from "@storybook/react-vite";
import {type CSSProperties, useState} from "react";
import {expect, userEvent, within} from "storybook/test";
import {CatchChip, type CatchChipData} from "./CatchChip";
import {CatchGap} from "./CatchGap";
import {CatchPageBody} from "./CatchPageBody";
const glyph = <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="m6 12 4 4 8-9" /></svg>;
const data: CatchChipData = {label: "Pickleball", icon: glyph, accent: "pickleball"};
const noop = () => {};
const meta = {title: "Web UI/CatchChip", component: CatchChip, args: {recipe: "tag", label: "Tonight"}} satisfies Meta<typeof CatchChip>;
export default meta;
type Story = StoryObj<typeof meta>;
function States() {
  return <CatchGap size="formField">
    <CatchGap direction="horizontal" size="inline" wrap>
      <CatchChip recipe="tag" label="Tonight" /><CatchChip recipe="tag" label="Weekend" leading={glyph} />
      <CatchChip recipe="selectable" label="Resting" selected={false} onChanged={noop} />
      <CatchChip recipe="selectable" label="Selected" selected onChanged={noop} />
      <CatchChip recipe="selectable" label="Disabled" selected={false} enabled={false} onChanged={noop} />
      <CatchChip recipe="selectable" label="Accent" selected accent="running" onChanged={noop} />
      <CatchChip recipe="selectable" label="With icon" selected={false} leading={glyph} onChanged={noop} />
      <CatchChip recipe="removable" label="Rooftop" onRemove={noop} />
      <CatchChip recipe="activity" data={data} /><CatchChip recipe="activity" data={data} emphasis="solid" />
      <CatchChip recipe="activity" data={{...data, label: "Dinner", accent: "dinner"}} onTap={noop} />
    </CatchGap>
    <CatchGap direction="horizontal" size="inline" wrap role="radiogroup" aria-label="Single choice">
      <CatchChip recipe="choice" label="Single" mode="single" selected onPressed={noop} />
    </CatchGap>
    <CatchGap direction="horizontal" size="inline" wrap>
      <CatchChip recipe="choice" label="Multiple" mode="multiple" selected onPressed={noop} />
      <CatchChip recipe="choice" label="Disabled choice" mode="multiple" selected={false} onPressed={null} />
    </CatchGap>
    <div style={{maxWidth: "180px"}}><CatchChip recipe="tag" label="A very long passive metadata label" /></div>
  </CatchGap>;
}
function InteractiveChip() {
  const [selected, setSelected] = useState(false);
  return <CatchChip recipe="selectable" label="Nearby" selected={selected} onChanged={setSelected} />;
}
export const Contract: Story = {render: () => <>
  <CatchPageBody constrainToContentWidth><States /></CatchPageBody>
  <div data-catch-theme="dark" style={{background: "var(--catch-theme-bg)"}}><CatchPageBody constrainToContentWidth><States /></CatchPageBody></div>
</>};
export const Passive: Story = {};
export const Selectable: Story = {render: () => <InteractiveChip />};
export const Choices: Story = {render: () => <div role="radiogroup" aria-label="Activities"><CatchChip recipe="choice" label="Dinner" selected mode="single" onPressed={noop} /></div>};
export const Removable: Story = {render: () => <CatchChip recipe="removable" label="Rooftop" onRemove={noop} />};
export const ActivitySoft: Story = {render: () => <CatchChip recipe="activity" data={data} />};
export const ActivitySolid: Story = {render: () => <CatchChip recipe="activity" data={data} emphasis="solid" />};
export const LargeText: Story = {render: () => <div style={{"--catch-typography-web-secondary-size": "28px", "--catch-typography-web-secondary-line-height": "40px", "--catch-typography-web-field-value-size": "32px", "--catch-typography-web-field-value-line-height": "48px"} as CSSProperties}><States /></div>};
export const Interactive: Story = {
  render: () => <InteractiveChip />,
  play: async ({canvasElement}) => {
    const control = within(canvasElement).getByRole("button", {name: "Nearby"});
    await expect(control).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(control); await expect(control).toHaveAttribute("aria-pressed", "true");
    control.focus(); await userEvent.keyboard(" ");
    await expect(control).toHaveAttribute("aria-pressed", "false");
  },
};
