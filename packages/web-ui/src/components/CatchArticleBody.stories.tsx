import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchArticleBody} from "./CatchArticleBody";
import {CatchButton} from "./CatchButton";
import {CatchGroundCard} from "./CatchGroundCard";
import {CatchRoot} from "./CatchRoot";
import {CatchText} from "./CatchText";

const paragraph = "A sample paragraph of plain copy that runs long enough to wrap across several lines of the reading column.";
const sections = [
  {id: "sample-first", title: "A first sample section", paragraphs: [paragraph, paragraph], list: ["A first ticked line", "A second ticked line"], tip: {label: "Tip:", text: "A sample tip."}},
  {id: "sample-second", title: "A second sample section", paragraphs: [paragraph]},
  {id: "sample-third", title: "A third sample section", paragraphs: [paragraph, paragraph]},
];

const aside = (
  <CatchGroundCard ground="yellow" padding="spacious">
    <CatchText as="p" variant="title-bar">A sample aside</CatchText>
    <CatchText as="p" variant="body-small">A sample line in the aside.</CatchText>
    <CatchButton href="#" label="Sample action" size="sm" />
  </CatchGroundCard>
);

const meta = {
  title: "Web UI/CatchArticleBody",
  component: CatchArticleBody,
  args: {kicker: "Sample kicker", title: "A sample guide", lead: "A sample lead about the guide.", meta: "A sample meta line", sections, tocLabel: "In this guide"},
} satisfies Meta<typeof CatchArticleBody>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every state: contents and an aside beside the text; and the text alone in one centred column. */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchArticleBody aside={aside} kicker="Sample kicker" lead="A sample lead about the guide." meta="A sample meta line" sections={sections} title="A sample guide" tocLabel="In this guide" />
      <CatchArticleBody level={2} sections={sections.slice(0, 1)} title="The text alone" />
    </CatchRoot>
  ),
};

/** The phone layout: the contents and aside follow the text. */
export const Compact: Story = {
  render: () => (
    <CatchRoot size="compact" theme="day">
      <CatchArticleBody aside={aside} sections={sections} title="A sample guide" tocLabel="In this guide" />
    </CatchRoot>
  ),
};

export const WithContents: Story = {};
export const Solo: Story = {args: {tocLabel: undefined}};
