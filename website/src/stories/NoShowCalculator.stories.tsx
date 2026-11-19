import {expect, fireEvent, within} from "storybook/test";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchRoot} from "@catch/web-ui";
import {applyBrand} from "@content/brand";
import page from "@content/playbook/pages/resources/tools-no-show-calculator.json";
import {validatedPlaybookPage} from "@content/playbook/playbookContract";
import {NoShowCalculator} from "../features/marketing/NoShowCalculator";

const meta = {
  title: "Marketing Website/Tools/No-show calculator",
  parameters: {
    catchComponentRegistry: {
      path: "design/website/components.json",
    },
    catchRouteContract: {
      path: "design/website/routes.json",
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// The calculator section as /tools/no-show-calculator/ writes it: its words come from the page's labels.
const section = applyBrand(validatedPlaybookPage(page)).sections.find((item) => item.type === "custom" && item.component === "noShowCalculator");
const custom = section?.type === "custom" ? section : undefined;
const labels = Object.fromEntries((custom?.labels ?? []).map((label) => [label.key, label.text]));
const storyRoutes = ["tools_no_show_calculator"];

function Calculator() {
  return (
    <CatchRoot theme="day">
      <NoShowCalculator ground="white" id="calculator" kicker={custom?.kicker} labels={labels} lead={custom?.lead} title={custom?.title} />
    </CatchRoot>
  );
}

/** A paid event at the starting numbers: what no-shows cost per event and per month, then the host's own what-if rate. */
export const PaidEvent: Story = {
  name: "No-show calculator · paid event",
  parameters: {layout: "fullscreen", catchComponent: {id: "no_show_calculator", routeIds: storyRoutes, states: ["paid"]}},
  render: () => <Calculator />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("status")).toHaveTextContent("At 20%, no-shows cost you ₹16,000 a month.");
    fireEvent.change(canvas.getByRole("slider", {name: labels.target}), {target: {value: "5"}});
    await expect(canvas.getByText("If your no-show rate fell to 5%")).toBeInTheDocument();
  },
};

/** A free event: the ticket price is 0, so the calculator asks what each held place costs and costs the no-shows by that. */
export const FreeEvent: Story = {
  name: "No-show calculator · free event",
  parameters: {layout: "fullscreen", catchComponent: {id: "no_show_calculator", routeIds: storyRoutes, states: ["free"]}},
  render: () => <Calculator />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    fireEvent.change(canvas.getByRole("textbox", {name: labels.price}), {target: {value: "0"}});
    fireEvent.change(canvas.getByRole("textbox", {name: labels.costPerHead}), {target: {value: "300"}});
    await expect(canvas.getByRole("status")).toHaveTextContent("At 20%, no-shows cost you ₹9,600 a month.");
  },
};
