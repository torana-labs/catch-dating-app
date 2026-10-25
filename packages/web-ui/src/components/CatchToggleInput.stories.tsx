import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import {expect, userEvent, within} from "storybook/test";
import {CatchToggleInput} from "./CatchToggleInput";
import {CatchGap} from "./CatchGap";
import {CatchText} from "./CatchText";
import {CatchPageBody} from "./CatchPageBody";
const noop = () => {};
const meta = {title: "Web UI/CatchToggleInput", component: CatchToggleInput,
  args: {value: false, onChanged: noop, semanticLabel: "Show attendance reminders"}} satisfies Meta<typeof CatchToggleInput>;
export default meta;
type Story = StoryObj<typeof CatchToggleInput>;
function States() {
  return <CatchPageBody constrainToContentWidth><CatchGap size="formField">
    {(["toggle", "field"] as const).map((recipe) => <CatchGap key={recipe} size="inline">
      <CatchText variant="bodyM">{`${recipe} settings controls`}</CatchText>
      <CatchGap direction="horizontal" size="inline" wrap>
        <CatchToggleInput recipe={recipe} value={false} onChanged={noop} semanticLabel={`${recipe} setting off`} />
        <CatchToggleInput recipe={recipe} value onChanged={noop} semanticLabel={`${recipe} setting on`} />
        <CatchToggleInput recipe={recipe} value={false} onChanged={null} semanticLabel={`${recipe} disabled off`} />
        <CatchToggleInput recipe={recipe} value onChanged={null} semanticLabel={`${recipe} disabled on`} />
      </CatchGap>
    </CatchGap>)}
  </CatchGap></CatchPageBody>;
}
export const Contract: Story = {render: () => <><States /><div data-catch-theme="dark" style={{background: "var(--catch-theme-bg)"}}><States /></div></>};
export const Off: Story = {};
export const On: Story = {args: {value: true}};
export const DisabledOff: Story = {args: {onChanged: null}};
export const DisabledOn: Story = {args: {value: true, onChanged: null}};
export const Field: Story = {args: {recipe: "field"}};
export const RightToLeft: Story = {render: () => <div dir="rtl"><States /></div>, play: async ({canvasElement}) => {
  for (const control of within(canvasElement).getAllByRole("switch")) {
    const track = control.firstElementChild!.getBoundingClientRect();
    const knob = control.firstElementChild!.firstElementChild!.getBoundingClientRect();
    const inset = control.getAttribute("aria-checked") === "true" ? knob.left - track.left : track.right - knob.right;
    await expect(Math.abs(inset - 3)).toBeLessThan(0.1);
  }
}};
export const LongSemanticCopy: Story = {args: {semanticLabel: "Show attendance reminders for upcoming club activities and notify me when the schedule changes"}};
function InteractiveToggle() {
  const [value, setValue] = useState(false);
  return <CatchToggleInput value={value} onChanged={setValue} semanticLabel="Show attendance reminders" />;
}
export const Interactive: Story = {render: () => <InteractiveToggle />, play: async ({canvasElement}) => {
  const control = within(canvasElement).getByRole("switch", {name: "Show attendance reminders"});
  await expect(control).toHaveAttribute("aria-checked", "false"); await userEvent.click(control);
  await expect(control).toHaveAttribute("aria-checked", "true"); control.focus(); await userEvent.keyboard(" ");
  await expect(control).toHaveAttribute("aria-checked", "false"); await userEvent.keyboard("{Enter}");
  await expect(control).toHaveAttribute("aria-checked", "true");
}};
