import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchRoot} from "./CatchRoot";
import {CatchScreenPreview} from "./CatchScreenPreview";
import {CatchTabSection, type CatchTabSectionItem} from "./CatchTabSection";

const preview = (title: string) => <CatchScreenPreview kind="phonecard" rows={[{title: "A sample row", subtitle: "A note"}]} semanticsLabel={`${title}: a sample screen`} title={title} />;

const tabs: CatchTabSectionItem[] = [
  {
    id: "first", label: "First format", accent: "coral", title: "A first sample panel", subtitle: "A sample subtitle", body: "A sample body about the first item.",
    list: [{time: "Morning", title: "A first moment", body: "A sample line."}, {time: "Evening", title: "A second moment", body: "A sample line."}],
    media: preview("First"),
  },
  {id: "second", label: "Second format", accent: "pink", title: "A second sample panel", body: "A sample body about the second item.", media: preview("Second")},
  {id: "third", label: "Third format", accent: "mint", title: "A third sample panel", body: "A sample body without media."},
];

const steps: CatchTabSectionItem[] = [
  {id: "a", label: "A first step", time: "Week one", body: "A sample body about the first step.", tips: ["A first tip", "A second tip"]},
  {id: "b", label: "A second step", time: "Week two", body: "A sample body about the second step."},
  {id: "c", label: "A third step", time: "Week three", body: "A sample body about the third step."},
];

const meta = {
  title: "Web UI/CatchTabSection",
  component: CatchTabSection,
  args: {items: tabs, kicker: "Sample kicker", tabsLabel: "Sample formats", title: "A sample switcher"},
} satisfies Meta<typeof CatchTabSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every state: centred tabs with dots, a run of show and media; tabs at the start on paper; and the steps layout on ink. */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchTabSection items={tabs} kicker="Sample kicker" lead="A sample lead." tabsLabel="Sample formats" title="A sample switcher" />
      <CatchTabSection align="start" defaultSelected="third" ground="paper" items={tabs} tabsLabel="Sample formats" title="Tabs at the start, on paper" />
      <CatchTabSection ground="ink" items={steps} layout="steps" tabsLabel="Sample steps" title="The steps layout on ink" />
    </CatchRoot>
  ),
};

/** The phone layout: the tab bar scrolls and the panel stacks; steps stack over the pane. */
export const Compact: Story = {
  render: () => (
    <CatchRoot size="compact" theme="day">
      <CatchTabSection items={tabs} tabsLabel="Sample formats" title="A sample switcher" />
      <CatchTabSection items={steps} layout="steps" tabsLabel="Sample steps" title="Steps" />
    </CatchRoot>
  ),
};

export const Tabs: Story = {};
export const Steps: Story = {args: {items: steps, layout: "steps", tabsLabel: "Sample steps"}};
