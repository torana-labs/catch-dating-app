import type {Meta, StoryObj} from "@storybook/react-vite";
import {marketingCaptures} from "../app/marketingCaptures";
import type {ReactNode} from "react";
import {expect, userEvent, within} from "storybook/test";
import {HomePage} from "../features/home/HomePage";
import type {HomeCatalog} from "../features/home/homeTypes";
import {homeCatalogFixture, mumbaiLiveCatalog, mumbaiThinCatalog, puneLaunchingSoonCatalog} from "./fixtures/homeCatalogs";

const meta = {
  title: "Marketing Website/Homepage",
  parameters: {
    a11y: {test: "error"},
    catchComponentRegistry: {path: "design/website/components.json"},
    catchRouteContract: {path: "design/website/routes.json"},
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The page at the board's widths: the bands' container queries read the frame. */
function Width({children, width}: {children: ReactNode; width: 390 | 1280}) {
  return <div style={{margin: "0 auto", width}}>{children}</div>;
}

// Storybook has no server: city changes stay on the story.
const stay = () => undefined;
// Stories show the catalog they are given; the browser's city lookup stays off.
const keepCatalog = async () => null;
// Storybook's preview targets links at the parent frame, so an in-page "#" link would
// navigate the test runner away; keep fragment links on the story.
const stayOnFragmentLinks = () => {
  const keep = (event: MouseEvent) => {
    if (event.target instanceof Element && event.target.closest('a[href^="#"]')) event.preventDefault();
  };
  document.addEventListener("click", keep, true);
  return () => document.removeEventListener("click", keep, true);
};
const page = (catalog: HomeCatalog, width: 390 | 1280) => <Width width={width}><HomePage captures={marketingCaptures} catalog={catalog} loadCatalog={keepCatalog} navigate={stay} /></Width>;

/** Mumbai busy on a 1280px page, as the playbook homepage board's "live and busy" state. */
export const MumbaiLive1280: Story = {
  name: "Mumbai live · 1280",
  parameters: {
    catchRoute: {id: "home", path: "/", reviewStates: ["mumbai-live", "launching-soon", "thin-city", "catalog-unavailable", "format-filter", "city-picker"],
      stateCoverage: {storybook: ["mumbai-live", "launching-soon", "thin-city", "catalog-unavailable", "format-filter", "city-picker"], manual: []}},
    catchComponent: {id: "route_home", routeIds: ["home"], states: ["mumbai-live"]},
  },
  render: () => page(mumbaiLiveCatalog, 1280),
};

/** Mumbai busy on a 390px page: the first screen holds the headline and both buttons. */
export const MumbaiLive390: Story = {
  name: "Mumbai live · 390",
  parameters: {catchComponent: {id: "home_page_sections", routeIds: ["home"], states: ["phone-live"]}},
  render: () => page(mumbaiLiveCatalog, 390),
};

/** Pune launching soon on a 1280px page, as the board's "launching" state: the hero leads with hosts. */
export const LaunchingSoon1280: Story = {
  name: "Pune launching soon · 1280",
  parameters: {catchComponent: {id: "route_home", routeIds: ["home"], states: ["launching-soon"]}},
  render: () => page(puneLaunchingSoonCatalog, 1280),
};

/** Pune launching soon on a 390px page. */
export const LaunchingSoon390: Story = {
  name: "Pune launching soon · 390",
  parameters: {catchComponent: {id: "home_page_sections", routeIds: ["home"], states: ["phone-launching-soon"]}},
  render: () => page(puneLaunchingSoonCatalog, 390),
};

/** An open city with fewer than five plans in two weeks reads as thin: everything ahead, and the host band moves up. */
export const ThinCity: Story = {
  name: "Indore, too few plans · 1280",
  parameters: {catchComponent: {id: "route_home", routeIds: ["home"], states: ["thin-city"]}},
  render: () => page(homeCatalogFixture("indore"), 1280),
};

/** Mumbai with three plans in two weeks, as the board's "live but thin" state: the plans dated, nearest first, and the host band moved up. */
export const MumbaiThin1280: Story = {
  name: "Mumbai thin · 1280",
  parameters: {catchComponent: {id: "route_home", routeIds: ["home"], states: ["thin-city"]}},
  render: () => page(mumbaiThinCatalog, 1280),
};

/** Mumbai thin on a 390px page, with the phone action bar. */
export const MumbaiThin390: Story = {
  name: "Mumbai thin · 390",
  parameters: {catchComponent: {id: "home_page_sections", routeIds: ["home"], states: ["phone-live"]}},
  render: () => page(mumbaiThinCatalog, 390),
};

/** Nothing could be read: the live city stays live and says so. */
export const CatalogUnavailable: Story = {
  name: "Mumbai, plans unavailable · 1280",
  parameters: {catchComponent: {id: "route_home", routeIds: ["home"], states: ["catalog-unavailable"]}},
  render: () => page({...mumbaiLiveCatalog, phase: "unavailable", plans: {...mumbaiLiveCatalog.plans, plans: [], organizers: []}}, 1280),
};

/** A format chip filters the week; the city picker lists every city with its status. */
export const FormatFilterAndCityPicker: Story = {
  name: "Format filter and city picker · 1280",
  parameters: {catchComponent: {id: "route_home", routeIds: ["home"], states: ["format-filter", "city-picker"]}},
  beforeEach: stayOnFragmentLinks,
  render: () => page(mumbaiLiveCatalog, 1280),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", {name: "Games and quizzes"}));
    await expect(canvas.getByText("Showing 3 of 3 this week · Games and quizzes")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", {name: "Mumbai"}));
    await expect(within(canvasElement.ownerDocument.body).getByRole("menuitemradio", {name: /Pune/})).toBeInTheDocument();
  },
};

/**
 * Storybook has no lead intake: the stories answer the site's lead posts
 * themselves (accepted, refused or never), and leave every other request alone.
 */
const answerLeads = (answer: "accepted" | "failed" | "pending") => () => {
  const original = window.fetch;
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const body = typeof init?.body === "string" ? JSON.parse(init.body) as {requestKind?: string} : {};
    if (!String(input).includes("/api/join-waitlist") || !body.requestKind) return original(input, init);
    if (answer === "pending") return new Promise<Response>(() => undefined);
    return answer === "accepted" ?
      new Response(JSON.stringify({ok: true, alreadyJoined: false, lead: {leadId: "0".repeat(64), requestKind: body.requestKind, isNew: true}}), {status: 200}) :
      new Response(JSON.stringify({error: "Unavailable"}), {status: 503});
  }) as typeof fetch;
  return () => {
    window.fetch = original;
  };
};
type Canvas = ReturnType<typeof within>;
const notifyBar = (canvas: Canvas) => within(canvas.getByRole("form", {name: "Want to hear first?"}));
const referForm = (canvas: Canvas) => within(canvas.getByRole("form", {name: "Know a host who’d be great here?"}));
async function fillReferral(form: Canvas) {
  await userEvent.type(form.getByRole("textbox", {name: /Your name/}), "Asha Rao");
  await userEvent.type(form.getByRole("textbox", {name: /Your WhatsApp number/}), "98765 43210");
  await userEvent.type(form.getByRole("textbox", {name: /Host or club name/}), "Lantern Lane Social");
  await userEvent.type(form.getByRole("textbox", {name: /Their Instagram or website/}), "@lanternlanesocial");
  await userEvent.type(form.getByRole("textbox", {name: /How do you know them/}), "I go to their supper club");
}

/** A thin week's notify bar, sent: new Mumbai plans on WhatsApp, as a city alerts lead. */
export const CityAlertsSent1280: Story = {
  name: "Thin week notify bar, sent · 1280",
  beforeEach: answerLeads("accepted"),
  render: () => page(mumbaiThinCatalog, 1280),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const bar = notifyBar(canvas);
    await userEvent.type(bar.getByRole("textbox", {name: /Your WhatsApp number/}), "98765 43210");
    await userEvent.click(bar.getByRole("button", {name: "Notify me"}));
    await expect(await canvas.findByText("Done. We’ll message you on WhatsApp when new Mumbai plans go up.")).toBeInTheDocument();
  },
};

/** The notify bar on a phone: a short number is refused under the field, then a send that fails offers to try again. */
export const CityAlertsRetry390: Story = {
  name: "Thin week notify bar, refused and retry · 390",
  beforeEach: answerLeads("failed"),
  render: () => page(mumbaiThinCatalog, 390),
  play: async ({canvasElement}) => {
    const bar = notifyBar(within(canvasElement));
    const phone = bar.getByRole("textbox", {name: /Your WhatsApp number/});
    await userEvent.type(phone, "98765");
    await userEvent.click(bar.getByRole("button", {name: "Notify me"}));
    await expect(await bar.findByText("Check your WhatsApp number. Include the country code if it isn’t a local number.")).toBeInTheDocument();
    await userEvent.type(phone, "43210");
    await userEvent.click(bar.getByRole("button", {name: "Notify me"}));
    await expect(await bar.findByRole("button", {name: "Try again"})).toBeInTheDocument();
  },
};

/** The refer form, sending: the fields are held and the button shows it is working. */
export const HostReferralSubmitting1280: Story = {
  name: "Know a host form, sending · 1280",
  beforeEach: answerLeads("pending"),
  render: () => page(mumbaiLiveCatalog, 1280),
  play: async ({canvasElement}) => {
    const form = referForm(within(canvasElement));
    await fillReferral(form);
    await userEvent.click(form.getByRole("button", {name: "Introduce them"}));
    await expect(canvasElement.querySelector("form[aria-busy='true']")).not.toBeNull();
  },
};

/** The refer form, sent: a referral lead, and the thanks in its place. */
export const HostReferralSent1280: Story = {
  name: "Know a host form, sent · 1280",
  beforeEach: answerLeads("accepted"),
  render: () => page(mumbaiLiveCatalog, 1280),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const form = referForm(canvas);
    await fillReferral(form);
    await userEvent.click(form.getByRole("button", {name: "Introduce them"}));
    await expect(await canvas.findByText("Thanks for introducing Lantern Lane Social. We’ll message you on WhatsApp about it.")).toBeInTheDocument();
  },
};

/** The refer form on a phone: each empty field says what it needs, then a send that fails offers to try again. */
export const HostReferralRetry390: Story = {
  name: "Know a host form, missing fields and retry · 390",
  beforeEach: answerLeads("failed"),
  render: () => page(mumbaiLiveCatalog, 390),
  play: async ({canvasElement}) => {
    const form = referForm(within(canvasElement));
    await userEvent.click(form.getByRole("button", {name: "Introduce them"}));
    await expect(await form.findByText("Enter your name.")).toBeInTheDocument();
    await fillReferral(form);
    await userEvent.click(form.getByRole("button", {name: "Introduce them"}));
    await expect(await form.findByRole("button", {name: "Try again"})).toBeInTheDocument();
  },
};
