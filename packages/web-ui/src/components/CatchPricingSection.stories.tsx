import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchButton} from "./CatchButton";
import {CatchPricingSection} from "./CatchPricingSection";
import {CatchRoot} from "./CatchRoot";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";

// Placeholders in square brackets stand for figures the owner has not set; none is a real price.
const sample = {
  kicker: "Sample kicker",
  rate: "[N]%",
  title: "of a sample amount, never more than a sample cap.",
  cap: "A sample cap line.",
  trial: "A sample trial line.",
  actions: [{label: "Primary action", href: "#", variant: "light" as const}, {label: "Second action", href: "#", variant: "ghost" as const}],
  examples: [
    {title: "A first worked example", value: "[N]", body: "How the first figure is reached."},
    {title: "A second worked example", value: "[N]", body: "How the second figure is reached."},
    {title: "A third worked example", value: "[N]"},
  ],
};

const calculator = (
  <CatchSurface block="floating">
    <CatchText tone="secondary" variant="body">The page's calculator goes here.</CatchText>
    <CatchButton label="Sample" onPressed={() => undefined} size="sm" variant="secondary" />
  </CatchSurface>
);

const footnotes = [{id: "footnote-1", body: "A first sample footnote."}, {id: "footnote-2", body: "A second sample footnote."}];

const meta = {
  title: "Web UI/CatchPricingSection",
  component: CatchPricingSection,
  args: sample,
} satisfies Meta<typeof CatchPricingSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every state: the ink band with examples, a calculator and footnotes; the plain band without examples. */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchPricingSection {...sample} calculator={calculator} footnotes={footnotes} ground="ink" />
      <CatchPricingSection {...sample} actions={[{label: "Primary action", href: "#"}]} examples={undefined} title="The rate alone on the plain band" />
    </CatchRoot>
  ),
};

/** The phone layout: the examples stack under the copy and the rate steps down. */
export const Compact: Story = {
  render: () => (
    <CatchRoot size="compact" theme="day">
      <CatchPricingSection {...sample} footnotes={footnotes} ground="ink" />
    </CatchRoot>
  ),
};

export const Ink: Story = {args: {ground: "ink"}};
export const WithCalculator: Story = {args: {calculator, footnotes}};
