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
