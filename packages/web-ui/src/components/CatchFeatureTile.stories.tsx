import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchBandHeader} from "./CatchBandHeader";
import {CatchFeatureTile, type CatchFeatureTileProps} from "./CatchFeatureTile";
import {CatchRoot} from "./CatchRoot";
import {CatchStack} from "./CatchStack";
import {CatchSurface} from "./CatchSurface";
import {paletteAccents} from "./palette";

const meta = {
  title: "Web UI/CatchFeatureTile",
  component: CatchFeatureTile,
  args: {
    body: "A sentence or two about what this sample feature does.",
    fix: "A sample line about what is done about it.",
    title: "Sample feature",
  },
} satisfies Meta<typeof CatchFeatureTile>;

export default meta;
type Story = StoryObj<typeof meta>;

const body = "A sentence or two about what this sample feature does.";

/** One tile of each anatomy: a problem and its fix, a figure, ticked lines, and a link. */
const anatomies: (CatchFeatureTileProps & {key: string})[] = [
  {key: "fix", title: "A sample problem", body, fix: "A sample line about what is done about it."},
  {key: "figure", title: "A sample figure", figure: "00", figureNote: "Sample unit", body, then: "A sample line about what happens afterwards."},
  {key: "list", title: "A sample checklist", list: ["The first sample line", "The second sample line", "A third sample line that runs long enough to wrap"]},
  {key: "link", title: "A sample link", body, link: {label: "Sample link", href: "#sample"}},
];

function Row({tiles, ground}: {tiles: (CatchFeatureTileProps & {key: string})[]; ground?: CatchFeatureTileProps["ground"]}) {
  return (
    <CatchStack collapseBelow="medium" direction="row" equal gap={16}>
      {tiles.map(({key, ...tile}) => <CatchFeatureTile key={key} {...tile} ground={ground ?? tile.ground} />)}
    </CatchStack>
  );
}

/**
 * Every anatomy on an expanded page: paper tiles on the white band, white
 * tiles on the tile band, glass on the ink band (by default there), every
 * accent ground, and a full tile under a band header.
 */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchSurface block="band">
        <Row tiles={anatomies} />
      </CatchSurface>
      <CatchSurface block="band" color="tile">
        <Row ground="white" tiles={anatomies} />
      </CatchSurface>
      <CatchSurface block="band" color="ink">
        <Row tiles={anatomies} />
      </CatchSurface>
      <CatchSurface block="band">
        <Row tiles={paletteAccents.map((accent) => ({key: accent, ground: accent, title: `On ${accent}`, body, list: ["A sample ticked line"], fix: "A sample fix line."}))} />
      </CatchSurface>
      <CatchSurface block="band" color="ink">
        <CatchBandHeader align="center" kicker="Sample kicker" kickerTone="warning" lead="A sample lead for a band of features." title="A sample band of features" />
        <Row
          tiles={[1, 2, 3].map((index) => ({
            key: String(index),
            title: `Sample feature ${index}`,
            figure: "00",
            figureNote: "Sample unit",
            body,
            list: ["A sample ticked line", "Another sample ticked line"],
            fix: "A sample fix line.",
            then: "A sample afterwards line.",
            link: {label: "Sample link", href: `#sample-${index}`},
          }))}
        />
      </CatchSurface>
    </CatchRoot>
  ),
};

/** The phone layout: tiles stack and their padding steps down to 20px. */
export const Compact: Story = {
  render: () => (
    <CatchRoot size="compact" theme="day">
      <CatchSurface block="band">
        <Row tiles={anatomies} />
      </CatchSurface>
    </CatchRoot>
  ),
};

export const Paper: Story = {};
export const White: Story = {args: {ground: "white"}};
export const Glass: Story = {
  args: {ground: "ink"},
  render: (args) => (
    <CatchSurface block="band" color="ink">
      <CatchFeatureTile {...args} />
    </CatchSurface>
  ),
};
export const Figure: Story = {args: {figure: "00", figureNote: "Sample unit", fix: undefined, then: "A sample afterwards line."}};
export const Checklist: Story = {args: {body: undefined, fix: undefined, list: ["The first sample line", "The second sample line"]}};
export const WithLink: Story = {args: {fix: undefined, link: {label: "Sample link", href: "#sample"}}};
