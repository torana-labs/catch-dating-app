import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchFeeCalculator} from "./CatchFeeCalculator";
import {CatchFeeSection} from "./CatchFeeSection";
import {CatchRoot} from "./CatchRoot";

// Placeholders in square brackets stand for figures the page supplies; none is a real price.
const calculator = (
  <CatchFeeCalculator label="Sample amount" max={100} maxLabel="[max]" min={0} minLabel="[min]" onChange={() => undefined} step={10}
    tiles={[{label: "First figure", value: "[N]", note: "what it is of"}, {label: "Second figure", value: "[N]%", note: "what it is of"}]} value={40} valueText="[N]" />
);

const meta = {
  title: "Web UI/CatchFeeSection",
  component: CatchFeeSection,
  args: {
    kicker: "Sample kicker",
    rate: "[N]%",
    rateTitle: "of a sample amount, never more than a sample cap.",
    lead: "A sample lead that says how the fee works.",
    labels: ["First label", "Second label", "Third label"],
    actions: [{label: "Primary action", href: "#", variant: "light"}, {label: "Second action", href: "#", variant: "ghost"}],
    calculator,
  },
  parameters: {layout: "fullscreen"},
} satisfies Meta<typeof CatchFeeSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The fee band on ink: the rate beside the calculator; with worked examples
 * and a foot line (the host landing), and opening its page with a headline
 * over the rate (/pricing/).
 */
export const Contract: Story = {
  parameters: {catchComponent: {id: "shared_catch_fee_section", routeIds: ["host", "pricing"], states: ["examples-foot", "page-title"]}},
  render: (args) => (
    <CatchRoot theme="day">
      <CatchFeeSection {...args}
        examples={[{title: "A first worked example", value: "[N]", body: "How it is reached."}, {title: "A second worked example", value: "[N]", body: "How it is reached."},
          {title: "A third worked example", value: "[N]"}]}
        foot={{text: "A sample foot line.", action: {label: "Small action", href: "#", variant: "ghost"}}} />
      <CatchFeeSection {...args} labels={undefined} level={1} title="A sample page headline." />
    </CatchRoot>
  ),
};
