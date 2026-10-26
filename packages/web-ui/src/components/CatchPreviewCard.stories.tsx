import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect, within} from "storybook/test";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchGrid} from "./CatchGrid";
import {CatchPreviewCard, type CatchPreviewCardProps} from "./CatchPreviewCard";
import {grounds} from "./palette";

const meta = {
  title: "Web UI/CatchPreviewCard",
  component: CatchPreviewCard,
  args: {href: "#", label: "Sun 2 Nov · 6:30 AM", title: "Sunday Social Run"},
} satisfies Meta<typeof CatchPreviewCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["event_detail_canonical"];

/** Every ground, with and without a meta line. */
export const Grounds: Story = {
  parameters: {catchComponent: {id: "shared_preview_card", routeIds: storyRoutes, states: ["grounds", "no-meta", "phone-size"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Grounds" pb="compact" pt="compact">
        <CatchGrid columns={3} compactColumns={1}>
          {grounds.map((ground, index) => (
            <CatchPreviewCard ground={ground} href={`#${ground}`} key={ground} label="Sat 15 Nov · 5:30 PM"
              meta={index % 4 === 3 ? undefined : "₹799 · Luma"} title={`Run & Rave on ${ground}`} />
          ))}
        </CatchGrid>
      </CatchBand>
    </StoryPage>
  ),
  play: async ({canvasElement}) => {
    const link = within(canvasElement).getByRole("link", {name: /Run & Rave on coral/});
    await expect(link).toHaveAttribute("href", "#coral");
  },
};

const more: (CatchPreviewCardProps & {key: string})[] = [
  {href: "#sunday", key: "sunday", label: "Sun 2 Nov · 6:30 AM", meta: "Free · On Catch", title: "Sunday Social Run"},
  {ground: "indigo", href: "#rave", key: "rave", label: "Sat 15 Nov · 5:30 PM", meta: "₹799 · Luma", title: "Run & Rave: Sunset Edition"},
  {ground: "mint", href: "#tempo", key: "tempo", label: "Wed 5 Nov · 7:00 PM", meta: "Free · On Catch", title: "Wednesday Tempo 6K"},
];

/** The organiser page's "Next up" card: the feature size on ink, with a tag, a detail line and an action. */
export const Feature: Story = {
  parameters: {catchComponent: {id: "shared_preview_card", routeIds: ["organizer_listing_canonical"], states: ["feature", "tag", "action"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Feature" pb="compact" pt="compact">
        <CatchGrid columns={2} compactColumns={1}>
          <CatchPreviewCard action="Book" actionAccent="coral" detail="Sun 2 Nov, 6:30 AM · Lantern Lane jetty" ground="ink" href="#next"
            label="Next up · in 2 days" labelAccent="coral" meta="Free · 31 spots left" size="feature" tag="On Catch" title="Sunday Social Run" />
          <CatchPreviewCard action="Get tickets" detail="Sat 15 Nov, 5:30 PM · Worli Sea Face" ground="paper" href="#luma"
            label="Next up · in 3 weeks" labelAccent="coral" meta="₹799 · Tickets on Luma" size="feature" tag="Luma" title="Sunset Run: Harbour Edition" />
        </CatchGrid>
      </CatchBand>
    </StoryPage>
  ),
};

/** The event page's "More from" row. */
export const Reference: Story = {
  parameters: {catchComponent: {id: "shared_preview_card", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "event/catch_full/1280", height: 156, width: 660, x: 96, y: 3224}}
      label="More from the organiser"
      phone={{capture: "event/catch_full/390", height: 362, width: 366, x: 12, y: 4080}}
      render={() => (
        <CatchGrid columns={3} compactColumns={1}>
          {more.map(({key, ...card}) => <CatchPreviewCard key={key} {...card} />)}
        </CatchGrid>
      )}
    />
  ),
};
