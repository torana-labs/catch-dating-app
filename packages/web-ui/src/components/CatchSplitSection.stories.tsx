import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchRoot} from "./CatchRoot";
import {CatchScreenPreview} from "./CatchScreenPreview";
import {CatchSplitSection} from "./CatchSplitSection";

// Neutral sample copy: no figure here is a real measurement.
const sample = {
  kicker: "Sample kicker",
  title: "A sample band headline",
  lead: "A sample lead of one or two sentences about this band.",
};

const media = (
  <CatchScreenPreview
    buttons={[{label: "Sample action"}, {label: "Other", variant: "secondary"}]}
    rows={[{title: "A sample question", subtitle: "A sample answer"}]}
    semanticsLabel="A sample screen with a question and two buttons"
    title="Sample screen"
  />
);

const steps = [
  {marker: "Morning", title: "First step", body: "A sample line about the first step."},
  {marker: "Noon", title: "Second step", body: "A sample line about the second step."},
  {marker: "Evening", title: "Third step", body: "A sample line about the third step."},
];

const meta = {
  title: "Web UI/CatchSplitSection",
  component: CatchSplitSection,
  args: sample,
} satisfies Meta<typeof CatchSplitSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Every state on an expanded page: ticks and actions beside media; steps in
 * the second column; the timeline (time-marked steps beside flush media on
 * ink); the checklist on paper; groups with a metric on ink, aligned to the
 * top; and the copy alone.
 */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchSplitSection
        {...sample}
        actions={[{label: "Primary action", href: "#"}, {label: "Second action", href: "#"}]}
        media={media}
        ticks={["A first ticked line", "A second ticked line", "A third ticked line"]}
      />
      <CatchSplitSection {...sample} ground="mint" steps={steps.map((step) => ({...step, marker: undefined}))} title="Numbered steps in the second column" />
      <CatchSplitSection
        {...sample}
        flush
        ground="ink"
        kickerTone="warning"
        media={<CatchScreenPreview kind="tablet" semanticsLabel="A sample tablet screen" />}
        steps={steps}
        title="The timeline: time-marked steps beside flush media"
      />
      <CatchSplitSection
        {...sample}
        align="start"
        checks={[
          {title: "First check", body: "A sample line."},
          {title: "Second check", body: "A sample line."},
          {title: "Third check", body: "A sample line."},
          {title: "Fourth check", body: "A sample line."},
        ]}
        ground="paper"
        kickerTone="success"
        title="The checklist"
      />
      <CatchSplitSection
        {...sample}
        align="start"
        body="A closing paragraph of sample copy."
        ground="ink"
        groups={[
          {marker: "01", title: "First group", list: ["A line", "Another line"], link: {label: "A group link", href: "#"}},
          {marker: "02", title: "Second group", list: ["A line", "Another line"]},
        ]}
        id="sample-anchor"
        media={media}
        metric={{value: "[N]", label: "A sample figure", note: "Placeholder"}}
        title="Groups and a metric on ink"
      />
      <CatchSplitSection {...sample} title="The copy alone" />
    </CatchRoot>
  ),
};

/** The phone layout: the columns stack in source order. */
export const Compact: Story = {
  render: () => (
    <CatchRoot size="compact" theme="day">
      <CatchSplitSection {...sample} media={media} ticks={["A ticked line", "Another ticked line"]} />
      <CatchSplitSection {...sample} checks={[{title: "First check"}, {title: "Second check"}]} ground="paper" title="A sample checklist headline" />
    </CatchRoot>
  ),
};

export const Split: Story = {args: {media, ticks: ["A ticked line", "Another ticked line"]}};
export const Timeline: Story = {args: {flush: true, ground: "ink", media, steps}};
export const Checklist: Story = {args: {ground: "paper", checks: [{title: "First check", body: "A line"}, {title: "Second check"}]}};
