import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchRoot} from "./CatchRoot";
import {CatchScreenPreview} from "./CatchScreenPreview";
import {CatchStack} from "./CatchStack";
import {CatchSurface} from "./CatchSurface";

// Neutral sample copy: the figures are placeholders, not measurements.
const card = {
  semanticsLabel: "A sample list screen with three rows",
  label: "Sample",
  title: "Sample list",
  subtitle: "Second line of sample copy",
  stats: [{value: "12", label: "first"}, {value: "4", label: "second"}, {value: "2", label: "third"}],
  rows: [
    {title: "First row", subtitle: "A note", tag: "Ready", tone: "success" as const},
    {title: "Second row", subtitle: "A note", tag: "Waiting", tone: "warning" as const},
    {title: "Third row", subtitle: "A note", value: "7"},
  ],
  fine: "Illustrative screen",
};

const meta = {
  title: "Web UI/CatchScreenPreview",
  component: CatchScreenPreview,
  args: card,
} satisfies Meta<typeof CatchScreenPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Every kind on an expanded page: a card, a card with every drawn part, the
 * card on a phone, a phone and a tablet image, a photo with its tag and a
 * tile grid, with a caption, on the plain and the ink band (the screen keeps
 * the day theme).
 */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchSurface block="band">
        <CatchStack collapseBelow="medium" direction="row" equal gap={24}>
          <CatchScreenPreview {...card} caption="Illustrative screen" />
          <CatchScreenPreview
            bars={[{label: "First", value: "60%", share: 60, accent: "coral"}, {label: "Second", value: "30%", share: 30, accent: "indigo"}]}
            buttons={[{label: "Sample action"}, {label: "Other action"}]}
            chip="A dark note at the foot"
            choices={[{label: "Pick an option", options: ["First", "Second", "Third"], selected: 1}]}
            counters={[{title: "Places", subtitle: "A note", value: "2"}]}
            fields={[{label: "Name", placeholder: "Sample placeholder"}, {label: "City", value: "Sample city"}]}
            qr="SAMPLE-01"
            search="Search samples"
            semanticsLabel="A sample form screen with every drawn part"
            tilt="right"
            title="Every part"
            tone="paper"
          />
        </CatchStack>
      </CatchSurface>
      <CatchSurface block="band" color="ink">
        <CatchStack collapseBelow="medium" direction="row" equal gap={24}>
          <CatchScreenPreview {...card} kind="phonecard" />
          <CatchScreenPreview kind="phone" semanticsLabel="A sample phone screen" />
          <CatchScreenPreview kind="tablet" semanticsLabel="A sample tablet screen" tilt="left" />
        </CatchStack>
      </CatchSurface>
      <CatchSurface block="band" color="tile">
        <CatchStack collapseBelow="medium" direction="row" equal gap={24}>
          <CatchScreenPreview kind="photo" semanticsLabel="A sample photo" tag="Replace with real photography" />
          <CatchScreenPreview
            kind="tiles"
            semanticsLabel="Four sample tiles"
            tiles={[
              {title: "First", body: "Sample body", ground: "coral"},
              {title: "Second", body: "Sample body", ground: "yellow"},
              {title: "Third", body: "Sample body", ground: "mint"},
              {title: "Fourth", body: "Sample body"},
            ]}
          />
          <CatchScreenPreview {...card} flat />
        </CatchStack>
      </CatchSurface>
    </CatchRoot>
  ),
};

export const Card: Story = {};
export const PhoneCard: Story = {args: {kind: "phonecard"}};
export const Flat: Story = {args: {flat: true}};
export const Captioned: Story = {args: {caption: "Illustrative screen"}};
