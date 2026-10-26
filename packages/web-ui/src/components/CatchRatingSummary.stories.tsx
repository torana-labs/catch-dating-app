import type {Meta, StoryObj} from "@storybook/react-vite";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchGrid} from "./CatchGrid";
import {CatchRatingSummary, type CatchRatingSummaryRow} from "./CatchRatingSummary";

const meta = {
  title: "Web UI/CatchRatingSummary",
  component: CatchRatingSummary,
  args: {average: "4.8", countLabel: "186 reviews", distribution: []},
} satisfies Meta<typeof CatchRatingSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["organizer_listing_canonical"];

const rows = (counts: [number, number, number, number, number]): CatchRatingSummaryRow[] =>
  counts.map((count, index) => {
    const stars = (5 - index) as CatchRatingSummaryRow["stars"];
    return {count, label: `${stars} ${stars === 1 ? "star" : "stars"}: ${count} ${count === 1 ? "review" : "reviews"}`, stars};
  });

const claimed = {
  average: "4.8",
  countLabel: "186 reviews",
  distribution: rows([142, 32, 8, 3, 1]),
  note: "Reviews from people who booked on Catch are marked verified. Anyone can review; the rest are labelled unverified.",
};

const generated = {
  average: "4.5",
  countLabel: "2 reviews",
  distribution: rows([1, 1, 0, 0, 0]),
  note: "Anyone can review this page. Reviews stay unverified until guests book through Catch.",
};

/** A claimed page with many reviews, a generated page with two, and no note. */
export const Distributions: Story = {
  parameters: {catchComponent: {id: "shared_rating_summary", routeIds: storyRoutes, states: ["many-reviews", "few-reviews", "empty-rows", "without-note"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Rating summaries" pb="compact" pt="compact">
        <CatchGrid align="start" columns={3} gap="majorSection">
          <CatchRatingSummary {...claimed} />
          <CatchRatingSummary {...generated} />
          <CatchRatingSummary average="5.0" countLabel="1 review" distribution={rows([1, 0, 0, 0, 0])} />
        </CatchGrid>
      </CatchBand>
    </StoryPage>
  ),
};

/** On paper and on ink, the rows take the ground's inks. */
export const OnGrounds: Story = {
  parameters: {catchComponent: {id: "shared_rating_summary", routeIds: storyRoutes, states: ["on-paper", "on-ink"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="On paper" ground="paper" pb="compact" pt="compact"><CatchRatingSummary {...claimed} /></CatchBand>
      <CatchBand aria-label="On ink" ground="ink" pb="compact" pt="compact"><CatchRatingSummary {...claimed} /></CatchBand>
    </StoryPage>
  ),
};

/** The organiser page's review summary. */
export const Reference: Story = {
  parameters: {catchComponent: {id: "shared_rating_summary", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "organizer/guest/1280", height: 290, width: 240, x: 568, y: 1170}}
      label="Rating summary"
      phone={{capture: "organizer/guest/390", height: 270, width: 358, x: 16, y: 2560}}
      render={() => <CatchRatingSummary {...claimed} />}
    />
  ),
};
