import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchBandHeader} from "./CatchBandHeader";
import {CatchGroundCard} from "./CatchGroundCard";
import {CatchRoot} from "./CatchRoot";
import {CatchSurface} from "./CatchSurface";

const meta = {
  title: "Web UI/CatchBandHeader",
  component: CatchBandHeader,
  args: {
    kicker: "Sample kicker",
    lead: "A sample lead of one or two sentences that says what the band below it is about.",
    title: "A sample band headline",
  },
} satisfies Meta<typeof CatchBandHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

const lead = "A sample lead of one or two sentences that says what the band below it is about.";

/**
 * Every state on an expanded page: a column at the start and centred, an h1,
 * a row with its lead across from the headline, on the ground, tile and ink
 * bands (which the header reads), and on a Website v2 ground given by prop.
 */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchSurface block="band">
        <CatchBandHeader kicker="Sample kicker" lead={lead} title="A column header at the start" />
      </CatchSurface>
      <CatchSurface block="band" color="tile">
        <CatchBandHeader align="center" kicker="Sample kicker" lead={lead} title="A centred column header" />
      </CatchSurface>
      <CatchSurface block="band">
        <CatchBandHeader level={1} lead={lead} title="A page headline at level one" />
      </CatchSurface>
      <CatchSurface block="band">
        <CatchBandHeader direction="row" lead={lead} title="A row header with its lead across" />
      </CatchSurface>
      <CatchSurface block="band" color="ink">
        <CatchBandHeader kicker="Sample kicker" kickerTone="warning" lead={lead} title="A header on the ink band" />
      </CatchSurface>
      <CatchSurface block="band" color="ink">
        <CatchBandHeader align="center" direction="row" lead={lead} title="A row on ink ignores centring" />
      </CatchSurface>
      <CatchSurface block="band">
        <CatchGroundCard ground="ink" padding="spacious">
          <CatchBandHeader ground="ink" kicker="Sample kicker" lead={lead} title="On the ink ground by prop" />
        </CatchGroundCard>
        <CatchGroundCard ground="mint" padding="spacious">
          <CatchBandHeader align="center" ground="mint" kicker="Sample kicker" lead={lead} title="On the mint ground by prop" />
        </CatchGroundCard>
      </CatchSurface>
      <CatchSurface block="band">
        <CatchBandHeader title="A headline alone" />
      </CatchSurface>
    </CatchRoot>
  ),
};

/** The phone layout: the headline steps down to 38px and a row stacks. */
export const Compact: Story = {
  render: () => (
    <CatchRoot size="compact" theme="day">
      <CatchSurface block="band">
        <CatchBandHeader kicker="Sample kicker" lead={lead} title="A column header on a phone" />
      </CatchSurface>
      <CatchSurface block="band" color="ink">
        <CatchBandHeader direction="row" lead={lead} title="A row header stacks on a phone" />
      </CatchSurface>
    </CatchRoot>
  ),
};

export const Column: Story = {};
export const Centered: Story = {args: {align: "center"}};
export const Row: Story = {args: {direction: "row"}};
export const PageHeadline: Story = {args: {level: 1}};
