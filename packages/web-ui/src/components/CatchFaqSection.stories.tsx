import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchButton} from "./CatchButton";
import {CatchFaqSection} from "./CatchFaqSection";
import {CatchRoot} from "./CatchRoot";
import {CatchText} from "./CatchText";

const items = [
  {id: "first", question: "A first sample question?", answer: "A first sample answer of one or two sentences."},
  {id: "second", question: "A second sample question?", answer: "A second sample answer of one or two sentences."},
  {id: "third", question: "A third, longer sample question that wraps onto a second line?", answer: "A third sample answer."},
];

// The footer slot holds the page's own line, such as a link to ask on WhatsApp.
const footer = (
  <CatchText as="p" tone="secondary" variant="body">
    Something else? <CatchButton href="#" label="Ask us" recipe="text" />
  </CatchText>
);

const meta = {
  title: "Web UI/CatchFaqSection",
  component: CatchFaqSection,
  args: {items, kicker: "Sample kicker", title: "Sample questions"},
} satisfies Meta<typeof CatchFaqSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every state on an expanded page: the first question open with a footer line, none open on paper, and the ink ground. */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchFaqSection footer={footer} items={items} kicker="Sample kicker" title="Sample questions" />
      <CatchFaqSection defaultOpen={[]} ground="paper" items={items} lead="A sample lead." title="None open, on paper" />
      <CatchFaqSection ground="ink" items={items} title="On the ink ground" />
    </CatchRoot>
  ),
};

/** The phone layout: the questions stack under the header. */
export const Compact: Story = {
  render: () => (
    <CatchRoot size="compact" theme="day">
      <CatchFaqSection footer={footer} items={items} title="Sample questions" />
    </CatchRoot>
  ),
};

export const Default: Story = {};
export const WithFooter: Story = {args: {footer}};
