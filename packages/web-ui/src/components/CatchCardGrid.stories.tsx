import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchButton} from "./CatchButton";
import {CatchCardGrid} from "./CatchCardGrid";
import {CatchRoot} from "./CatchRoot";
import {CatchStack} from "./CatchStack";

// Neutral sample data: placeholder names and no real figures.
const plans = [
  {id: "one", href: "#", title: "A first sample plan", label: "Sample label · Sun 7:00 AM", format: "run" as const, detail: "Sample host · Sample area", price: "Free", availability: "Places left", posterLabel: "Sample"},
  {id: "two", href: "#", title: "A second sample plan", label: "Sample label · Thu 7:30 PM", format: "games" as const, detail: "Sample host · Sample area", price: "Paid", posterLabel: "Sample"},
  {id: "three", href: "#", title: "A third sample plan", label: "Sample label · Fri 8:00 PM", detail: "Sample host · Sample area", price: "Paid", posterLabel: "Sample"},
];

const filters = (
  <CatchStack direction="row" gap={8} wrap>
    <CatchButton label="All" onPressed={() => undefined} size="sm" />
    <CatchButton label="First filter" onPressed={() => undefined} size="sm" variant="secondary" />
  </CatchStack>
);

const meta = {
  title: "Web UI/CatchCardGrid",
  component: CatchCardGrid,
  args: {kind: "plan", items: plans, kicker: "Sample kicker", title: "Sample plans"},
} satisfies Meta<typeof CatchCardGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Every kind on an expanded page: plans with filters and actions, organisers
 * on paper, cities with links, reviews, stories four across, people under a
 * level-1 centred headline, and the empty state.
 */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchCardGrid actions={[{label: "See all", href: "#"}]} filters={filters} items={plans} kicker="Sample kicker" kind="plan" title="Plans" />
      <CatchCardGrid
        ground="paper"
        items={[
          {id: "a", name: "First sample organiser", subtitle: "Sample activity", monogramGround: "coral", next: "Next: a sample plan", footnote: "A sample footnote"},
          {id: "b", name: "Second sample organiser", subtitle: "Sample activity", monogramGround: "mint", next: "Next: a sample plan", footnote: "A sample footnote"},
        ]}
        kind="org"
        title="Organisers on paper"
      />
      <CatchCardGrid
        items={[
          {id: "a", title: "First sample city", status: "Open", live: true, body: "A sample line.", action: {label: "See more", href: "#"}},
          {id: "b", title: "Second sample city", status: "Launching soon", body: "A sample line.", action: {label: "Get notified", href: "#"}},
          {id: "c", title: "Third sample city", status: "Launching soon", action: {label: "Get notified", href: "#"}},
        ]}
        kind="city"
        links={[{label: "First link", href: "#first"}, {label: "Second link", href: "#second"}]}
        title="Cities with links"
      />
      <CatchCardGrid
        items={[
          {id: "a", name: "Sample reviewer", body: "A sample review of one or two sentences.", meta: "Sample plan · Sample time", rating: 5, ratingLabel: "5 out of 5"},
          {id: "b", name: "Second reviewer", body: "Another sample review.", rating: 4, ratingLabel: "4 out of 5", reply: {author: "Sample host", verb: "replied:", text: "A sample reply."}},
        ]}
        kind="review"
        title="Reviews"
      />
      <CatchCardGrid
        columns={4}
        ground="ink"
        items={["coral", "pink", "yellow", "mint"].map((ground, index) => ({
          id: ground, title: `Sample story ${index + 1}`, meta: "Sample meta", body: "A sample line.", stat: {label: "A figure", value: "[N]"}, ground: ground as "coral", href: "#",
        }))}
        kind="story"
        title="Stories four across on ink"
      />
      <CatchCardGrid
        align="center"
        items={[{id: "a", name: "Sample person", role: "Sample role", line: "A sample line."}, {id: "b", name: "Second person", role: "Sample role"}]}
        kind="person"
        level={1}
        title="People under a page headline"
      />
      <CatchCardGrid
        empty={{title: "No sample plans yet", message: "Try another filter.", actions: <CatchButton label="Clear filters" onPressed={() => undefined} variant="secondary" />}}
        filters={filters}
        items={[]}
        kind="plan"
        title="The empty state"
      />
    </CatchRoot>
  ),
};

/** The phone layout: one column. */
export const Compact: Story = {
  render: () => (
    <CatchRoot size="compact" theme="day">
      <CatchCardGrid filters={filters} items={plans} kind="plan" title="Plans" />
    </CatchRoot>
  ),
};

export const Plans: Story = {};
export const Empty: Story = {args: {items: [], empty: {title: "No sample plans yet", message: "Try another filter."}}};
