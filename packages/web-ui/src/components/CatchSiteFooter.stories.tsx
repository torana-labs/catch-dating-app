import type {Meta, StoryObj} from "@storybook/react-vite";
import {PageFrame, ReferenceComparison} from "../stories/referenceScreens";
import {CatchGap} from "./CatchGap";
import {CatchSiteFooter, type CatchSiteFooterProps} from "./CatchSiteFooter";

const meta = {
  title: "Web UI/CatchSiteFooter",
  component: CatchSiteFooter,
  args: {brandHref: "/", brandLabel: "Catch", groups: [], navLabel: "Footer", tagline: ""},
  parameters: {layout: "fullscreen"},
} satisfies Meta<typeof CatchSiteFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["home", "visitor_discovery"];

const footer: CatchSiteFooterProps = {
  brandHref: "/",
  brandLabel: "Catch",
  groups: [
    {title: "Explore", links: [{href: "/explore/", label: "What’s on"}, {href: "/organizers/", label: "Organisers"}, {href: "#app", label: "Get the app"}]},
    {title: "Cities", links: [
      {href: "/mumbai/", label: "Mumbai"},
      {href: "/pune/", label: "Pune", note: "soon"},
      {href: "/bengaluru/", label: "Bengaluru", note: "soon"},
      {href: "/delhi-ncr/", label: "Delhi NCR", note: "soon"},
      {href: "/hyderabad/", label: "Hyderabad", note: "soon"},
    ]},
    {title: "Hosts", links: [{href: "/host/", label: "Catch for hosts"}, {href: "/host/#pricing", label: "Pricing"}, {href: "/claim/", label: "Claim your page"}]},
    {title: "Help and legal", links: [{href: "/help/", label: "Help"}, {href: "/privacy/", label: "Privacy"}, {href: "/terms/", label: "Terms"}]},
  ],
  navLabel: "Footer",
  tagline: "Meet people in real life, through hosts who bring them together.",
};

/** Four columns at 1280 and two at 390, with the cities not yet open marked soon. */
export const Widths: Story = {
  parameters: {catchComponent: {id: "shared_catch_site_footer", routeIds: storyRoutes, states: ["wide", "compact", "soon-notes"]}},
  render: () => (
    // Each frame is a section, so its footer is not a second content info landmark.
    <CatchGap size="section">
      <section aria-label="1280px page"><PageFrame width={1280}><CatchSiteFooter {...footer} /></PageFrame></section>
      <section aria-label="390px page"><PageFrame width={390}><CatchSiteFooter {...footer} navLabel="Footer, phone" /></PageFrame></section>
    </CatchGap>
  ),
};

/** The board's footer beside the library rendering, at both widths. */
export const BoardReference: Story = {
  parameters: {catchComponent: {id: "shared_catch_site_footer", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "home/mumbai_live/1280", height: 420, y: 6513}}
      label="Site footer"
      phone={{capture: "home/mumbai_live/390", height: 560, y: 8485}}
      render={() => <CatchSiteFooter {...footer} />}
    />
  ),
};
