import {expect, fireEvent, within} from "storybook/test";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchRoot} from "@catch/web-ui";
import {applyBrand} from "@content/brand";
import page from "@content/playbook/pages/product/reports.json";
import {validatedPlaybookPage} from "@content/playbook/playbookContract";
import {LastEventReport} from "../features/marketing/LastEventReport";

const meta = {
  title: "Marketing Website/Tools/Last event report",
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

// The numbers band as /product/reports-and-payouts/ writes it: its words come from the page's labels.
const section = applyBrand(validatedPlaybookPage(page)).sections.find((item) => item.type === "custom" && item.component === "lastEventReport");
const custom = section?.type === "custom" ? section : undefined;
const labels = Object.fromEntries((custom?.labels ?? []).map((label) => [label.key, label.text]));
const storyRoutes = ["product_reports"];

function Report() {
  return (
    <CatchRoot theme="day">
      <LastEventReport ground="paper" id="numbers" kicker={custom?.kicker} labels={labels} lead={custom?.lead} title={custom?.title} />
    </CatchRoot>
  );
}

/** Before the host types anything: empty fields with the try card's hints, and no figure. */
export const Empty: Story = {
  name: "Last event report · empty",
  parameters: {layout: "fullscreen", catchComponent: {id: "last_event_report", routeIds: storyRoutes, states: ["empty"]}},
  render: () => <Report />,
  play: async ({canvasElement}) => {
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent(labels.emptyResults);
  },
};

/** A paid event and the host's current fee: the sales, who came, and the two fees side by side. */
export const PaidEvent: Story = {
  name: "Last event report · paid event",
  parameters: {layout: "fullscreen", catchComponent: {id: "last_event_report", routeIds: storyRoutes, states: ["paid"]}},
  render: () => <Report />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    fireEvent.change(canvas.getByRole("textbox", {name: labels.sold}), {target: {value: "52"}});
    fireEvent.change(canvas.getByRole("textbox", {name: labels.price}), {target: {value: "400"}});
    fireEvent.change(canvas.getByRole("textbox", {name: labels.came}), {target: {value: "46"}});
    fireEvent.change(canvas.getByRole("textbox", {name: labels.feePercent}), {target: {value: "8"}});
    await expect(canvas.getByRole("status")).toHaveTextContent("46 of 52 came. On ₹20,800 of ticket sales, Catch’s fee would have been ₹1,040.");
    await expect(canvas.getByText("₹1,664")).toBeInTheDocument();
  },
};

/** More came than bought tickets: the field says so and no report is shown. */
export const CameMoreThanSold: Story = {
  name: "Last event report · came more than sold",
  parameters: {layout: "fullscreen", catchComponent: {id: "last_event_report", routeIds: storyRoutes, states: ["invalid"]}},
  render: () => <Report />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    fireEvent.change(canvas.getByRole("textbox", {name: labels.sold}), {target: {value: "52"}});
    fireEvent.change(canvas.getByRole("textbox", {name: labels.price}), {target: {value: "400"}});
    fireEvent.change(canvas.getByRole("textbox", {name: labels.came}), {target: {value: "60"}});
    await expect(canvas.getByText(labels.errorCameMoreThanSold)).toBeInTheDocument();
  },
};
