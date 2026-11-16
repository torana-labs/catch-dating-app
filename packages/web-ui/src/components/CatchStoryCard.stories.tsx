import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchRoot} from "./CatchRoot";
import {CatchStack} from "./CatchStack";
import {CatchStoryCard} from "./CatchStoryCard";
import {CatchSurface} from "./CatchSurface";

const sample = {
  meta: "Sample meta · Sample area",
  title: "A sample story title",
  body: "A sample body of one or two sentences about the story.",
  stat: {label: "A sample figure", value: "[N]"},
  href: "#",
};

const meta = {
  title: "Web UI/CatchStoryCard",
  component: CatchStoryCard,
  args: sample,
} satisfies Meta<typeof CatchStoryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every state: linked with a figure on a coral photo box, unlinked on mint, and the title alone, on the plain and ink bands. */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchSurface block="band">
        <CatchStack direction="row" equal gap={16}>
          <CatchStoryCard {...sample} ground="coral" />
          <CatchStoryCard {...sample} ground="mint" href={undefined} />
          <CatchStoryCard title="A title alone" />
        </CatchStack>
      </CatchSurface>
      <CatchSurface block="band" color="ink">
        <CatchStack direction="row" equal gap={16}>
          <CatchStoryCard {...sample} ground="yellow" />
          <CatchStoryCard {...sample} ground="indigo" />
          <CatchStoryCard {...sample} />
        </CatchStack>
      </CatchSurface>
    </CatchRoot>
  ),
};

export const Linked: Story = {};
export const Plain: Story = {args: {href: undefined, stat: undefined}};
