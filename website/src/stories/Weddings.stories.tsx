import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect, userEvent, within} from "storybook/test";
import {weddingsCopy as copy} from "@content/weddings";
import {WeddingsApplicationPage} from "../features/weddings/WeddingsApplicationPage";
import {WeddingsPage} from "../features/weddings/WeddingsPage";
import {marketingCaptures} from "../app/marketingCaptures";
import type {WeddingsStepOneDraft} from "../features/weddings/weddingsModel";

// Catch for weddings at the RbWebWeddings board's widths, and the application
// (RbWebWeddingsApply) at the phone width. The step-1 answers are the board's
// own hints; the stories' submitter only resolves, nothing is sent.
const viewports = {
  weddingsPhone: {name: "Weddings · phone 390", styles: {width: "390px", height: "900px"}, type: "mobile"},
  weddingsDesktop: {name: "Weddings · desktop 1280", styles: {width: "1280px", height: "900px"}, type: "desktop"},
} as const;
const phone = {viewport: {value: "weddingsPhone", isRotated: false}};
const desktop = {viewport: {value: "weddingsDesktop", isRotated: false}};

const one = copy.stepOne;
const stepOne: WeddingsStepOneDraft = {
  who: one.who.options[0],
  what: one.what.options[0],
  name: one.name.hint,
  company: one.company.hint,
  phone: one.phone.hint,
  date: "2026-12-12",
  destination: one.destination.hint,
  guests: one.guests.options[1],
  tools: [one.tools.options[0], one.tools.options[1]],
};
const two = copy.stepTwo;
const resolves = () => Promise.resolve();

const meta = {
  title: "Marketing Website/Weddings",
  parameters: {
    layout: "fullscreen",
    viewport: {options: viewports},
    catchRouteContract: {path: "design/website/routes.json"},
    catchComponentRegistry: {path: "design/website/components.json"},
  },
  globals: desktop,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** The whole landing at 1280, band for band as the RbWebWeddings board. */
export const Desktop: Story = {
  name: "Landing · 1280",
  parameters: {
    a11y: {test: "error"},
    catchRoute: {
      id: "weddings", path: "/weddings/",
      reviewStates: ["default", "phone"],
      stateCoverage: {storybook: ["default", "phone"], manual: []},
    },
    catchComponent: {id: "route_weddings", routeIds: ["weddings"], states: ["default"]},
  },
  render: () => <WeddingsPage captures={marketingCaptures} />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    // The visual check also renders this story at a phone width, where the headline shortens.
    const headline = canvas.getByRole("heading", {level: 1});
    await expect([copy.hero.title, copy.hero.titleShort]).toContain(headline.textContent);
    await expect(headline).toBeVisible();
    await expect(canvas.queryByRole("link", {name: one.continue})).toBeNull();
  },
};

/** The landing on a phone: every row stacks, the headline shortens and the header's links fold into its menu. */
export const Phone: Story = {
  name: "Landing · 390 (phone)",
  globals: phone,
  parameters: {a11y: {test: "error"}, catchComponent: {id: "route_weddings", routeIds: ["weddings"], states: ["phone"]}},
  render: () => <WeddingsPage captures={marketingCaptures} />,
};

/** Step 1 on the application page, when the landing did not hand its answers over. */
export const ApplyStepOne: Story = {
  name: "Application · step 1",
  globals: phone,
  parameters: {
    a11y: {test: "error"},
    catchRoute: {
      id: "weddings_apply", path: "/weddings/apply/",
      reviewStates: ["step-one", "step-two", "sent"],
      stateCoverage: {storybook: ["step-one", "step-two", "sent"], manual: []},
    },
    catchComponent: {id: "route_weddings_apply", routeIds: ["weddings_apply"], states: ["step-one"]},
  },
  render: () => <WeddingsApplicationPage initialStepOne={null} submit={resolves} />,
};

/** Step 2, as RbWebWeddingsApply draws it. */
export const ApplyStepTwo: Story = {
  name: "Application · step 2",
  globals: phone,
  parameters: {catchComponent: {id: "route_weddings_apply", routeIds: ["weddings_apply"], states: ["step-two"]}},
  render: () => <WeddingsApplicationPage initialStepOne={stepOne} submit={resolves} />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", {level: 1, name: two.heading})).toBeVisible();
    await expect(canvas.getByRole("button", {name: two.send})).toBeEnabled();
  },
};

/** After Send: the thanks, what was sent and the way back. Step 2 starts empty, so the story answers it first. */
export const ApplySent: Story = {
  name: "Application · sent",
  globals: phone,
  parameters: {catchComponent: {id: "route_weddings_apply", routeIds: ["weddings_apply"], states: ["sent"]}},
  render: () => <WeddingsApplicationPage initialStepOne={stepOne} submit={resolves} />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", {name: two.flying.options[2]}));
    await userEvent.click(canvas.getByRole("button", {name: two.wants.options[0]}));
    await userEvent.click(canvas.getByRole("radio", {name: two.heard.options[0]}));
    await userEvent.click(canvas.getByRole("button", {name: two.send}));
    await expect(await canvas.findByRole("heading", {level: 1, name: copy.sent.heading})).toBeVisible();
  },
};
