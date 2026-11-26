import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState, type ReactNode} from "react";
import {expect, userEvent, within} from "storybook/test";
import {CatchChoiceTile} from "./CatchChoiceTile";
import {CatchGap} from "./CatchGap";
import {CatchText} from "./CatchText";
const noop = () => {};
const meta = {title: "Web UI/CatchChoiceTile", component: CatchChoiceTile,
  args: {title: "Public activity", subtitle: "Anyone can request a place", onTap: noop},
} satisfies Meta<typeof CatchChoiceTile>;
export default meta;
type Story = StoryObj<typeof CatchChoiceTile>;
function State({label, children}: {label: string; children: ReactNode}) {
  return <CatchGap size="inline">
    <CatchText tone="secondary" variant="label-kicker">{label}</CatchText>
    {children}
  </CatchGap>;
}
function States() {
  return <CatchGap size="inline"><div role="radiogroup" aria-label="Activity visibility">
    <CatchGap size="inline">
      <State label="default">
        <CatchChoiceTile title="Public activity" subtitle="Anyone can request a place" onTap={noop} />
        <CatchChoiceTile title="A complete activity name that wraps at smaller viewports and larger text scales"
          subtitle="The entire explanation stays inside the checked target without truncation or a separate nested action." onTap={noop} />
      </State>
      <State label="selected"><CatchChoiceTile title="Members activity" subtitle="Only current club members can request a place" selected onTap={noop} /></State>
      <State label="focused">
        <CatchChoiceTile title="Keyboard focus target" subtitle="The focus edge is thicker without changing layout." onTap={noop} />
      </State>
      <State label="disabled-by-null-action">
        <CatchChoiceTile title="Disabled public" />
        <CatchChoiceTile title="Disabled selected" selected />
      </State>
    </CatchGap>
  </div></CatchGap>;
}
const days = [["Mon", "26"], ["Tue", "27"], ["Wed", "28"], ["Thu", "29"]] as const;
/** Flutter's board states (row, tile, day, add, format) and wave 3 emphases (attention, vacant), in fictional copy. */
function SystemStates() {
  return <CatchGap size="inline">
    <State label="row"><div role="radiogroup" aria-label="Who can come">
      <CatchChoiceTile variant="row" title="Anyone can book" subtitle="Paid places are confirmed straight away" selected onTap={noop} />
    </div></State>
    <State label="tile"><div role="radiogroup" aria-label="Tables" style={{width: "var(--catch-space-s28)"}}>
      <CatchChoiceTile variant="tile" title="Table 4" subtitle="Courtyard" meta="4 of 4" selected onTap={noop} />
    </div></State>
    <State label="day"><div role="radiogroup" aria-label="Dates" style={{display: "flex", gap: "var(--catch-space-s2)"}}>
      {days.map(([day, date]) => <div key={date} style={{width: "var(--catch-space-s12)"}}>
        <CatchChoiceTile variant="day" title={day} subtitle={date} selected={date === "27"} onTap={noop} />
      </div>)}
    </div></State>
    <State label="add"><CatchChoiceTile variant="add" title="Add a step" onTap={noop} /></State>
    <State label="format"><div role="radiogroup" aria-label="Formats" style={{width: "var(--catch-space-s28)"}}>
      <CatchChoiceTile variant="tile" title="Supper" format="dinner" selected onTap={noop} />
    </div></State>
    <State label="attention"><div role="radiogroup" aria-label="Rooms" style={{width: "50%"}}>
      <CatchChoiceTile variant="tile" title="216" subtitle="Ravi · Asha" meta="Twin" emphasis="attention" onTap={noop} />
    </div></State>
    <State label="vacant"><div role="radiogroup" aria-label="Free rooms" style={{width: "50%"}}>
      <CatchChoiceTile variant="tile" title="222" subtitle="Free" meta="King" emphasis="vacant" onTap={noop} />
    </div></State>
  </CatchGap>;
}
function ThemeStates() {
  return <CatchGap size="inline"><States /><SystemStates /></CatchGap>;
}
// Contract states, each labelled, in each theme: default, selected, focused (the play moves
// keyboard focus onto the first tile) and disabled-by-null-action for the leading-radio tile,
// then the system card's row, tile, day, add, format, attention and vacant.
export const Contract: Story = {
  render: () => <><ThemeStates /><div data-catch-theme="dark" style={{background: "var(--catch-theme-bg)"}}><ThemeStates /></div></>,
  play: async ({canvasElement}) => {
    // Tab past the two default tiles and the selected one onto the focused state's tile.
    for (let step = 0; step < 4; step += 1) await userEvent.tab();
    await expect(within(canvasElement).getAllByRole("radio", {name: "Keyboard focus target"})[0]).toHaveFocus();
    await expect(within(canvasElement).getAllByRole("button", {name: "Add a step"})).toHaveLength(2);
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
