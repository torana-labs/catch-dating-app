import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchHeroSection} from "./CatchHeroSection";
import {CatchRoot} from "./CatchRoot";
import {CatchScreenPreview} from "./CatchScreenPreview";

// Neutral sample copy: no figure here is a real measurement.
const sample = {
  kicker: "Sample kicker",
  title: "A sample page headline",
  lead: "A sample lead of one or two sentences that says what the page offers.",
  actions: [{label: "Primary action", href: "#"}, {label: "Second action", href: "#"}],
};

const media = (
  <CatchScreenPreview
    caption="Illustrative screen"
    kind="phonecard"
    rows={[{title: "First row", subtitle: "A note", tag: "Ready", tone: "success"}, {title: "Second row", subtitle: "A note"}]}
    semanticsLabel="A sample screen with two rows"
    title="Sample screen"
  />
);

const meta = {
  title: "Web UI/CatchHeroSection",
  component: CatchHeroSection,
  args: sample,
} satisfies Meta<typeof CatchHeroSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Every state on an expanded page: the split hero on a coral ground with
 * labels, proof and a footnote mark, a note, a side link, media and the
 * floating card; the copy alone on the plain band; the ink ground (dark
 * theme); and the photo layout over the no-photo fill.
 */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchHeroSection
        {...sample}
        aside={{title: "Sample card", rows: [{label: "First", value: "[N]"}, {label: "Second", value: "[N]"}]}}
        ground="coral"
        labels={["First label", "Second label"]}
        link={{label: "A side link", href: "#"}}
        media={media}
        note="A small note under the actions."
        proof={[{text: "A sample proof line", footnote: {label: "1", href: "#footnote-1"}}, {text: "A second proof line"}]}
      />
      <CatchHeroSection {...sample} level={2} title="The copy alone on the plain band" />
      <CatchHeroSection {...sample} actions={[{label: "Light action", href: "#", variant: "light"}]} ground="ink" level={2} media={media} title="On the ink ground" />
      <CatchHeroSection {...sample} labels={["First tag", "Second tag"]} layout="photo" level={2} title="The photo layout" />
    </CatchRoot>
  ),
};

/** The phone layout: the media stacks under the copy and the card stops floating. */
export const Compact: Story = {
  render: () => (
    <CatchRoot size="compact" theme="day">
      <CatchHeroSection {...sample} aside={{title: "Sample card", rows: [{label: "First", value: "[N]"}]}} ground="pink" media={media} />
    </CatchRoot>
  ),
};

export const Split: Story = {args: {ground: "yellow", media}};
export const Photo: Story = {args: {layout: "photo"}};
export const Ink: Story = {args: {ground: "ink"}};
