import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchHeroSection} from "./CatchHeroSection";
import {CatchRoot} from "./CatchRoot";
import {CatchScreenPreview} from "./CatchScreenPreview";
import {CatchText} from "./CatchText";

// Neutral sample copy: no figure here is a real measurement.
const sample = {
  kicker: "Sample kicker",
  title: "A sample page headline",
  lead: "A sample lead of one or two sentences that says what the page offers.",
  actions: [{label: "Primary action", href: "#"}, {label: "Second action", href: "#"}],
};

const media = (
  <CatchScreenPreview
    kind="phonecard"
    rows={[{title: "First row", subtitle: "A note", tag: "Ready", tone: "success"}, {title: "Second row", subtitle: "A note"}]}
    semanticsLabel="A sample screen with two rows"
    title="Sample screen"
  />
);

// Cut-outs stand in for crops of the media's own screen: blank rows with
// their place on the screen (the real ones are app captures).
const cutout = (width: number, height: number) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="white"/><rect x="24" y="24" width="${width * 0.5}" height="28" rx="14" fill="gainsboro"/></svg>`)}`;
const fragments = [
  {src: cutout(724, 232), width: 724, height: 232, rect: {x: 0.05, y: 0.3, width: 0.9, height: 0.133}},
  {src: cutout(724, 150), width: 724, height: 150, rect: {x: 0.05, y: 0.5, width: 0.9, height: 0.086}},
  {src: cutout(600, 120), width: 600, height: 120, rect: {x: 0.2, y: 0.75, width: 0.746, height: 0.069}},
];

const meta = {
  title: "Web UI/CatchHeroSection",
  component: CatchHeroSection,
  args: sample,
} satisfies Meta<typeof CatchHeroSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Every state on an expanded page: the split hero on a coral ground with
 * labels, proof and a footnote mark, a note, a side link, media and three
 * cut-outs lifted in place over the phone; the copy alone on the plain band; the ink ground (dark
 * theme); and the photo layout over the no-photo fill.
 */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchHeroSection
        {...sample}
        fragments={fragments}
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

/** The phone layout: the media hangs under the copy, two cut-outs lifted in place, the band cropping the phone's foot. */
export const Compact: Story = {
  render: () => (
    <CatchRoot size="compact" theme="day">
      <CatchHeroSection {...sample} fragments={fragments} ground="pink" media={media} />
    </CatchRoot>
  ),
};

export const Split: Story = {args: {ground: "yellow", media}};
export const Photo: Story = {args: {layout: "photo"}};
export const Ink: Story = {args: {ground: "ink"}};

/** The homepage hero: a white notice card under the actions, and the plan chip with its date square over the media. */
export const NoticeAndChip: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchHeroSection
        {...sample}
        aside={{title: "A sample plan", meta: "Sample place · Places left", date: {weekday: "Thu", day: "20", month: "Nov", ground: "yellow"}}}
        ground="pink"
        media={media}
        notice={{title: "A sample notice", body: "A sample line about what the form sends.", children: (
          <CatchText tone="secondary" variant="body-small">The page's form goes here.</CatchText>
        )}}
      />
    </CatchRoot>
  ),
};
