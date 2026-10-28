import type {Meta, StoryObj} from "@storybook/react-vite";
import {PageFrame, ReferenceComparison} from "../stories/referenceScreens";
import {CatchButton} from "./CatchButton";
import {CatchGap} from "./CatchGap";
import {CatchSiteHeader, type CatchSiteHeaderProps} from "./CatchSiteHeader";

const meta = {
  title: "Web UI/CatchSiteHeader",
  component: CatchSiteHeader,
  args: {brandHref: "/", brandLabel: "Catch", links: [], navLabel: "Main"},
  parameters: {layout: "fullscreen"},
} satisfies Meta<typeof CatchSiteHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["home", "visitor_discovery"];

// The city picker is the page's own control; a plain button stands in for it.
const header: CatchSiteHeaderProps = {
  actions: <CatchButton label="Mumbai" onPressed={() => undefined} size="md" variant="secondary" />,
  brandHref: "/",
  brandLabel: "Catch",
  links: [
    {href: "/explore/", label: "Explore"},
    {href: "/organizers/", label: "Organisers"},
    {href: "/host/", label: "For hosts", compact: true},
  ],
  navLabel: "Main",
  wideActions: <CatchButton href="#app" label="Get the app" onPressed={() => undefined} size="md" />,
};

/** Every link and control at 1280; only the compact link and the page's controls at 390. */
export const Widths: Story = {
  parameters: {catchComponent: {id: "shared_catch_site_header", routeIds: storyRoutes, states: ["wide", "compact", "current-link"]}},
  render: () => (
    // Each frame is a section, so its header is not a second banner landmark.
    <CatchGap size="section">
      <section aria-label="1280px page"><PageFrame width={1280}><CatchSiteHeader {...header} /></PageFrame></section>
      <section aria-label="390px page"><PageFrame width={390}><CatchSiteHeader {...header} navLabel="Main, phone" /></PageFrame></section>
      <section aria-label="1280px page on Explore">
        <PageFrame width={1280}>
          <CatchSiteHeader {...header} links={header.links.map((link, index) => ({...link, current: index === 0}))} navLabel="Main, Explore current" />
        </PageFrame>
      </section>
    </CatchGap>
  ),
};

/** The board's header beside the library rendering, at both widths. */
export const BoardReference: Story = {
  parameters: {catchComponent: {id: "shared_catch_site_header", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "home/mumbai_live/1280", height: 84, y: 0}}
      label="Site header"
      phone={{capture: "home/mumbai_live/390", height: 70, y: 0}}
      render={() => <CatchSiteHeader {...header} />}
    />
  ),
};
