import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchButton} from "./CatchButton";
import {CatchCtaSection} from "./CatchCtaSection";
import {CatchRoot} from "./CatchRoot";
import {CatchScreenPreview} from "./CatchScreenPreview";
import {CatchStack} from "./CatchStack";
import {CatchText} from "./CatchText";

const sample = {
  kicker: "Sample kicker",
  title: "A sample closing headline",
  lead: "A sample lead that asks the reader to take the next step.",
  actions: [{label: "Primary action", href: "#"}],
};

// A stand-in for the page's own capture form: the section only places it.
const capture = (
  <CatchStack direction="row" gap={8}>
    <CatchText tone="secondary" variant="body-small">The page's phone form goes here.</CatchText>
    <CatchButton label="Sample submit" onPressed={() => undefined} variant="secondary" />
  </CatchStack>
);

const stores = [
  {store: "appStore" as const, label: "Download on the App Store", badgeSrc: "", comingSoon: {kicker: "Coming soon on", store: "the App Store"}},
  {store: "googlePlay" as const, label: "Get it on Google Play", badgeSrc: "", comingSoon: {kicker: "Coming soon on", store: "Google Play"}},
];

const media = <CatchScreenPreview kind="phone" semanticsLabel="A sample phone screen" />;

const meta = {
  title: "Web UI/CatchCtaSection",
  component: CatchCtaSection,
  args: sample,
} satisfies Meta<typeof CatchCtaSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Every state on an expanded page: actions with flush media on pink; the
 * capture slot and store badges on ink; and the copy alone.
 */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchCtaSection {...sample} flush ground="pink" media={media} />
      <CatchCtaSection {...sample} actions={[{label: "Light action", href: "#", variant: "light"}]} capture={capture} ground="ink" media={media} stores={stores} title="A sample headline with the capture slot" />
      <CatchCtaSection {...sample} actions={[{label: "Primary action", href: "#"}, {label: "Second action", href: "#"}]} title="A sample headline with the copy alone" />
    </CatchRoot>
  ),
};

/** The phone layout: the media stacks under the copy. */
export const Compact: Story = {
  render: () => (
    <CatchRoot size="compact" theme="day">
      <CatchCtaSection {...sample} capture={capture} ground="yellow" media={media} stores={stores} />
    </CatchRoot>
  ),
};

export const WithMedia: Story = {args: {flush: true, ground: "pink", media}};
export const WithCapture: Story = {args: {capture, stores}};
