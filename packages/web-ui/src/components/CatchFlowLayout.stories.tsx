import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchBanner} from "./CatchBanner";
import {CatchButton} from "./CatchButton";
import {CatchFlowLayout} from "./CatchFlowLayout";
import {CatchFormStepList, type CatchFormStepListStatus} from "./CatchFormStepList";
import {CatchPageTabBar} from "./CatchPageTabBar";
import {CatchRoot} from "./CatchRoot";
import {CatchScreenPreview} from "./CatchScreenPreview";
import {CatchText} from "./CatchText";

const labels: Record<CatchFormStepListStatus, string> = {complete: "Done", needsInformation: "To do", optional: "Optional"};
const steps = (
  <CatchFormStepList
    current={1}
    direction="row"
    items={[
      {index: 0, title: "Details", status: "complete"},
      {index: 1, title: "Review", status: "needsInformation"},
      {index: 2, title: "Payment", status: "needsInformation"},
      {index: 3, title: "Confirmed", status: "needsInformation"},
    ]}
    label="Sample steps"
    statusLabelBuilder={(status) => labels[status]}
  />
);

// The content column holds the page's own blocks; flat screen previews stand in for them here.
const block = (title: string) => (
  <CatchScreenPreview
    flat
    rows={[{title: "A sample row", subtitle: "A sample note", tag: "Sample", tone: "neutral"}]}
    semanticsLabel={`${title}: a sample block`}
    title={title}
  />
);

const fine = <CatchText as="p" tone="secondary" variant="body-meta">Sample fine print under the content.</CatchText>;

const meta = {
  title: "Web UI/CatchFlowLayout",
  component: CatchFlowLayout,
  args: {kicker: "Sample kicker", title: "Review the sample", lead: "A sample lead about this step."},
} satisfies Meta<typeof CatchFlowLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every state: the step rail with a block and fine print; the wide frame with tabs and a banner; and the head alone. */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchFlowLayout footer={fine} kicker="Sample kicker" lead="A sample lead about this step." navigation={steps} title="Review the sample">
        {block("First block")}
        <CatchButton label="Continue" onPressed={() => undefined} />
      </CatchFlowLayout>
      <CatchFlowLayout
        banner={<CatchBanner message="A sample notice above the flow." tone="warning" />}
        level={2}
        navigation={<CatchPageTabBar label="Sample tabs" onChanged={() => undefined} options={[{value: "one", label: "First"}, {value: "two", label: "Second"}]} selected="one" />}
        title="A wide frame with tabs"
        wide
      >
        {block("First block")}
        {block("Second block")}
      </CatchFlowLayout>
      <CatchFlowLayout level={2} title="The head alone" />
    </CatchRoot>
  ),
};

/** The phone layout: a wide frame's blocks stack. */
export const Compact: Story = {
  render: () => (
    <CatchRoot size="compact" theme="day">
      <CatchFlowLayout footer={fine} navigation={steps} title="Review the sample" wide>
        {block("First block")}
        {block("Second block")}
      </CatchFlowLayout>
    </CatchRoot>
  ),
};

export const WithSteps: Story = {args: {navigation: steps, children: block("A block")}};
export const Wide: Story = {args: {wide: true, children: [block("First"), block("Second")]}};
