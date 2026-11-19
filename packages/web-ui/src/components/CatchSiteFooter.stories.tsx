import type {Meta, StoryObj} from "@storybook/react-vite";
import {PageFrame, ReferenceComparison} from "../stories/referenceScreens";
import {CatchButton} from "./CatchButton";
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
    {
      title: "Help and legal",
      links: [{href: "/help/", label: "Help"}, {href: "/report/", label: "Report or remove a listing"}, {href: "/privacy/", label: "Privacy"}, {href: "/terms/", label: "Terms"}],
      action: {label: "Privacy choices", onPressed: () => {}},
    },
  ],
  navLabel: "Footer",
  tagline: "Meet people in real life, through hosts who bring them together.",
};

/**
 * One row at 1280; at 820 the groups flow down as many columns as fit, each
 * as wide as the longest link; two flowing columns at 390. Cities not yet
 * open are marked soon, and Help and legal ends with an action drawn as a link.
 */
export const Widths: Story = {
  parameters: {catchComponent: {id: "shared_catch_site_footer", routeIds: storyRoutes, states: ["wide", "compact", "soon-notes"]}},
  render: () => (
    // Each frame is a section, so its footer is not a second content info landmark.
    <CatchGap size="section">
      <section aria-label="1280px page"><PageFrame width={1280}><CatchSiteFooter {...footer} /></PageFrame></section>
      <section aria-label="820px page"><PageFrame width={820}><CatchSiteFooter {...footer} navLabel="Footer, tablet" /></PageFrame></section>
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

const sampleGroups = Array.from({length: 5}, (_, group) => ({
  title: `Sample group ${group + 1}`,
  links: Array.from({length: 4}, (_, link) => ({href: `#group-${group + 1}-link-${link + 1}`, label: `Sample link ${link + 1}`})),
}));

const sample: CatchSiteFooterProps = {
  brandHref: "#",
  brandLabel: "Catch",
  groups: sampleGroups.slice(0, 4),
  navLabel: "Footer",
  tagline: "A sample tagline across from the wordmark.",
};

const headerActions = (
  <>
    <CatchButton href="#first-action" label="First action" size="sm" variant="light" />
    <CatchButton href="#second-action" label="Second action" size="sm" variant="ghost" />
  </>
);
const header = {headerTitle: "A sample help line.", headerActions};

const footnotes = ["1. A sample footnote that names its source.", "2. A second sample footnote."];

/**
 * Every state with neutral copy: the default four columns; five columns with
 * the canvas's top band and footnotes at 1440 and 390 (two columns); and a footer
 * with no groups, as a landing page's, which leaves out the navigation.
 */
export const Contract: Story = {
  render: () => (
    // Each frame is a section, so its footer is not a second content info landmark.
    <CatchGap size="section">
      <section aria-label="Default four columns"><PageFrame width={1280}><CatchSiteFooter {...sample} /></PageFrame></section>
      <section aria-label="Five columns with a header and footnotes">
        <PageFrame width={1440}>
          <CatchSiteFooter {...sample} columns={5} footnotes={footnotes} groups={sampleGroups} {...header} navLabel="Footer, five columns" />
        </PageFrame>
      </section>
      <section aria-label="390px page with a header and footnotes">
        <PageFrame width={390}>
          <CatchSiteFooter {...sample} columns={5} footnotes={footnotes} groups={sampleGroups} {...header} navLabel="Footer, phone" />
        </PageFrame>
      </section>
      <section aria-label="No groups"><PageFrame width={1280}><CatchSiteFooter {...sample} groups={[]} /></PageFrame></section>
    </CatchGap>
  ),
};
