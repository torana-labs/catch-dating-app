import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import {expect, userEvent, within} from "storybook/test";
import {CatchChoiceTile} from "./CatchChoiceTile";
import {CatchGap} from "./CatchGap";
const noop = () => {};
const meta = {title: "Web UI/CatchChoiceTile", component: CatchChoiceTile,
  args: {title: "Public activity", subtitle: "Anyone can request a place", onTap: noop},
} satisfies Meta<typeof CatchChoiceTile>;
export default meta;
type Story = StoryObj<typeof CatchChoiceTile>;
function States() {
  return <CatchGap size="inline"><div role="radiogroup" aria-label="Activity visibility">
    <CatchChoiceTile title="Public activity" subtitle="Anyone can request a place" onTap={noop} />
    <CatchChoiceTile title="Members activity" subtitle="Only current club members can request a place" selected onTap={noop} />
    <CatchChoiceTile title="Disabled public" />
    <CatchChoiceTile title="Disabled selected" selected />
    <CatchChoiceTile title="A complete activity name that wraps at smaller viewports and larger text scales"
      subtitle="The entire explanation stays inside the checked target without truncation or a separate nested action." onTap={noop} />
  </div></CatchGap>;
}
// Contract states: default, selected and disabled-by-null-action in each theme; the play
// moves keyboard focus onto the first tile for the focused state.
export const Contract: Story = {
  render: () => <><States /><div data-catch-theme="dark" style={{background: "var(--catch-theme-bg)"}}><States /></div></>,
  play: async ({canvasElement}) => {
    await userEvent.tab();
    await expect(within(canvasElement).getAllByRole("radio", {name: /Public activity/})[0]).toHaveFocus();
  },
};
export const Unselected: Story = {render: (args) => <div role="radiogroup" aria-label="Visibility"><CatchChoiceTile {...args} /></div>};
export const Selected: Story = {args: {selected: true}, render: Unselected.render};
export const Disabled: Story = {args: {onTap: null}, render: Unselected.render};
export const DisabledSelected: Story = {args: {onTap: null, selected: true}, render: Unselected.render};
function InteractiveChoice() {
  const [selected, setSelected] = useState(false);
  return <div role="radiogroup" aria-label="Visibility"><CatchChoiceTile title="Public activity" selected={selected} onTap={() => setSelected(true)} /></div>;
}
export const Interactive: Story = {render: () => <InteractiveChoice />, play: async ({canvasElement}) => {
  const target = within(canvasElement).getByRole("radio", {name: "Public activity"});
  target.focus(); await userEvent.keyboard(" "); await expect(target).toHaveAttribute("aria-checked", "true");
}};
