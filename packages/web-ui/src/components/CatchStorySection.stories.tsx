import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchRoot} from "./CatchRoot";
import {CatchScreenPreview} from "./CatchScreenPreview";
import {CatchStorySection} from "./CatchStorySection";

// A sample storyteller and placeholder figures: none of it is a real result.
const sample = {
  kicker: "Sample story · Sample area",
  title: "Sample Organiser",
  meta: "A sample line about what they run",
  avatar: {initials: "SO", ground: "pink" as const},
  quote: "A sample quote of one or two sentences in the storyteller's words.",
  metrics: [
    {label: "A first figure", value: "[N]", source: "Placeholder source", footnote: {label: "1", href: "#footnote-1"}},
    {label: "A second figure", value: "[N]", source: "Placeholder source"},
    {label: "A third figure", value: "[N]"},
  ],
  link: {label: "Read the story", href: "#"},
};

const photo = <CatchScreenPreview kind="photo" semanticsLabel="A sample photo" tag="Replace with real photography" />;

const meta = {
  title: "Web UI/CatchStorySection",
  component: CatchStorySection,
  args: sample,
} satisfies Meta<typeof CatchStorySection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every state: initials with metrics beside a photo; on paper without media; and on the ink ground. */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchStorySection {...sample} media={photo} />
      <CatchStorySection {...sample} ground="paper" link={undefined} title="Without media, on paper" />
      <CatchStorySection {...sample} avatar={{initials: "SO", ground: "yellow"}} ground="ink" media={photo} metrics={undefined} title="On the ink ground" />
    </CatchRoot>
  ),
};

/** The phone layout: the photo stacks under the copy and the metrics stack. */
export const Compact: Story = {
  render: () => (
    <CatchRoot size="compact" theme="day">
      <CatchStorySection {...sample} media={photo} />
    </CatchRoot>
  ),
};

export const WithPhoto: Story = {args: {media: photo}};
export const QuoteOnly: Story = {args: {metrics: undefined, link: undefined}};
