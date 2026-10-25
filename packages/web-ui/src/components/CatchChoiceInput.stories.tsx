import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import {expect, userEvent, within} from "storybook/test";
import {CatchChoiceInput, type CatchChoiceInputVariant} from "./CatchChoiceInput";
import {CatchGap} from "./CatchGap";
import {CatchText} from "./CatchText";
const values = ["Morning", "Afternoon", "Evening"];
const itemLabelBuilder = (value: string) => value;
const noop = () => {};
const copy = {optionalLabel: "Optional", optionalSuffix: " (optional)", optionalSemantics: (label: string) => `${label}, optional`};
const meta = {title: "Web UI/CatchChoiceInput", component: CatchChoiceInput,
  args: {values, selected: new Set(["Morning"]), mode: "single", itemLabelBuilder, onChanged: noop},
} satisfies Meta<typeof CatchChoiceInput<string>>;
export default meta;
type Story = StoryObj<typeof CatchChoiceInput<string>>;
function States() {
  return <CatchGap size="formField">
    <CatchText variant="titleS">Single, multiple, disabled and described</CatchText>
    <CatchChoiceInput values={values} itemLabelBuilder={itemLabelBuilder} selected={new Set(["Morning"])} mode="single" onChanged={noop} />
    <CatchChoiceInput values={values} itemLabelBuilder={itemLabelBuilder} selected={new Set(["Morning", "Evening"])} mode="multiple" onChanged={noop} />
    <CatchChoiceInput values={values} itemLabelBuilder={itemLabelBuilder} selected={new Set(["Morning"])} mode="single" onChanged={null} />
    <CatchChoiceInput recipe="described" values={values} itemLabelBuilder={itemLabelBuilder} selected={new Set(["Morning"])}
      itemSubtitleBuilder={(value) => `${value} activities include the complete supporting explanation, including changes to the venue.`} onChanged={noop} />
    {(["label", "mono", "operational", "summary"] as CatchChoiceInputVariant[]).map((variant) => <CatchChoiceInput
      key={variant} recipe="segmented" variant={variant} options={values.map((value) => ({value, label: `${value} activities`}))}
      selected="Morning" onChanged={noop} />)}
    <CatchChoiceInput recipe="segmented" variant="operational" selected="Morning" onChanged={noop} accent="pickleball"
      options={[{value: "Morning", label: "Morning"}, {value: "Afternoon", label: "Afternoon", enabled: false, disabledReason: "Full"}]}
      trailing={<CatchText as="span" variant="supporting">2 sessions</CatchText>} />
    <CatchChoiceInput recipe="form" label="Preferred time" copy={copy} isOptional values={values} itemLabelBuilder={itemLabelBuilder}
      selected={new Set<string>()} mode="single" onChanged={noop} />
  </CatchGap>;
}
export const Contract: Story = {render: () => <><States /><div data-catch-theme="dark" style={{background: "var(--catch-theme-bg)"}}><States /></div></>};
export const Single: Story = {};
export const Multiple: Story = {args: {mode: "multiple", selected: new Set(["Morning", "Evening"])}};
export const Disabled: Story = {args: {onChanged: null}};
export const Described: Story = {args: {recipe: "described", itemSubtitleBuilder: (value) => `${value}: full supporting copy stays inside this target`}};
export const Segmented: Story = {render: () => <CatchChoiceInput recipe="segmented" options={values.map((value) => ({value, label: value}))} selected="Afternoon" onChanged={noop} />};
export const LongCopy: Story = {render: () => <CatchChoiceInput recipe="segmented" options={values.map((value) => ({value, label: `${value} activities with a long and complete explanation`}))} selected="Evening" onChanged={noop} />};
function InteractiveChoices() {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set(["Morning"]));
  return <CatchChoiceInput values={values} selected={selected} mode="single" itemLabelBuilder={itemLabelBuilder} onChanged={setSelected} />;
}
export const Interactive: Story = {render: () => <InteractiveChoices />, play: async ({canvasElement}) => {
  const canvas = within(canvasElement); const morning = canvas.getByRole("radio", {name: "Morning"});
  await userEvent.click(morning); await expect(morning).toHaveAttribute("aria-checked", "true");
  morning.focus(); await userEvent.keyboard("{ArrowRight}");
  await expect(canvas.getByRole("radio", {name: "Afternoon"})).toHaveAttribute("aria-checked", "true");
  await userEvent.keyboard("{End}"); await expect(canvas.getByRole("radio", {name: "Evening"})).toHaveAttribute("aria-checked", "true");
}};
