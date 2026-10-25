import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import {expect, userEvent, within} from "storybook/test";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchCodeInput, type CatchCodeInputProps} from "./CatchCodeInput";
import {CatchGap} from "./CatchGap";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchCodeInput",
  component: CatchCodeInput,
  args: {onChanged: () => undefined, onSubmitted: () => undefined, semanticsLabel: "6-digit code"},
} satisfies Meta<typeof CatchCodeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;

function Labelled({label, ...props}: Partial<CatchCodeInputProps> & {label: string}) {
  return (
    <CatchGap size="inline">
      <CatchText as="span" color="ink2" variant="bodyS">{label}</CatchText>
      <CatchCodeInput onChanged={noop} onSubmitted={noop} semanticsLabel={label} {...props} />
    </CatchGap>
  );
}

/**
 * catch.code_input on the web: empty with the caret, partial, complete, four
 * digits, no caret, and the error outline, on light and dark.
 */
export const Contract: Story = {
  render: () => {
    const states = (
      <CatchGap size="section">
        <Labelled label="Empty code" />
        <Labelled label="Partly typed code" value="482" />
        <Labelled label="Complete code" value="482913" />
        <Labelled label="4-digit code" length={4} value="12" />
        <Labelled caret={false} label="Code without caret" value="4" />
        <Labelled label="Code that did not match" status="error" value="482913" />
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

function Verify() {
  const [submitted, setSubmitted] = useState<string | null>(null);
  return (
    <CatchGap size="related">
      <CatchCodeInput onChanged={noop} onSubmitted={setSubmitted} semanticsLabel="Enter the 6-digit code" />
      <CatchText as="p" color="ink2" variant="bodyS">{submitted ? `Submitted ${submitted}` : "Not submitted"}</CatchText>
    </CatchGap>
  );
}

/** Typing keeps digits only, fills the cells and submits on Enter. */
export const Typing: Story = {
  render: () => <StoryPage><CatchBand aria-label="Verify" pb="compact" pt="compact"><Verify /></CatchBand></StoryPage>,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", {name: "Enter the 6-digit code"});
    await userEvent.type(input, "48a29 13x7");
    await expect(input).toHaveValue("482913");
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByText("Submitted 482913")).toBeVisible();
  },
};
