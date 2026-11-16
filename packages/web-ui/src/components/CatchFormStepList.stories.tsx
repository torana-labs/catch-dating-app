import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {CatchFormStepList, type CatchFormStepListStatus, type CatchFormStepReviewItem} from "./CatchFormStepList";
import {CatchRoot} from "./CatchRoot";
import {CatchStack} from "./CatchStack";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";

const labels: Record<CatchFormStepListStatus, string> = {complete: "Done", needsInformation: "Needs information", optional: "Optional"};
const statusLabelBuilder = (status: CatchFormStepListStatus) => labels[status];

const steps = (statuses: readonly CatchFormStepListStatus[], titles = ["Details", "Review", "Payment", "Confirmed"]): CatchFormStepReviewItem[] =>
  statuses.map((status, index) => ({index, title: titles[index] ?? `Step ${index + 1}`, status}));

const meta = {
  title: "Web UI/CatchFormStepList",
  component: CatchFormStepList,
  args: {
    items: steps(["complete", "needsInformation", "needsInformation", "optional"]),
    label: "Sample steps",
    statusLabelBuilder,
    current: 1,
  },
} satisfies Meta<typeof CatchFormStepList>;

export default meta;
type Story = StoryObj<typeof meta>;

function State({name, children}: {name: string; children: ReactNode}) {
  return (
    <CatchStack gap={8}>
      <CatchText tone="secondary" variant="label-kicker">{name}</CatchText>
      {children}
    </CatchStack>
  );
}

/**
 * catch.form_step_list's registry states, as a column and as the flow's
 * progress rail: complete, needs-information, optional, mixed-progress
 * and long-title.
 */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchSurface block="band">
        <CatchStack collapseBelow="medium" direction="row" equal gap={40}>
          <CatchStack gap={24}>
            <State name="complete"><CatchFormStepList items={steps(["complete", "complete", "complete"])} label="Complete" statusLabelBuilder={statusLabelBuilder} /></State>
            <State name="needs-information"><CatchFormStepList items={steps(["needsInformation", "needsInformation"])} label="Needs information" onStepSelected={() => undefined} statusLabelBuilder={statusLabelBuilder} /></State>
            <State name="optional"><CatchFormStepList items={steps(["optional", "optional"])} label="Optional" statusLabelBuilder={statusLabelBuilder} /></State>
            <State name="mixed-progress"><CatchFormStepList current={1} items={steps(["complete", "needsInformation", "optional"])} label="Mixed" onStepSelected={() => undefined} statusLabelBuilder={statusLabelBuilder} /></State>
            <State name="long-title">
              <CatchFormStepList
                items={steps(["complete", "needsInformation"], ["A long sample step title that wraps onto a second line on a narrow column", "Review"])}
                label="Long title"
                statusLabelBuilder={statusLabelBuilder}
              />
            </State>
          </CatchStack>
          <CatchStack gap={24}>
            <State name="complete (row)"><CatchFormStepList direction="row" items={steps(["complete", "complete", "complete", "complete"])} label="Complete rail" statusLabelBuilder={statusLabelBuilder} /></State>
            <State name="needs-information (row)"><CatchFormStepList current={0} direction="row" items={steps(["needsInformation", "needsInformation", "needsInformation", "needsInformation"])} label="Rail" statusLabelBuilder={statusLabelBuilder} /></State>
            <State name="optional (row)"><CatchFormStepList direction="row" items={steps(["optional", "optional"])} label="Optional rail" statusLabelBuilder={statusLabelBuilder} /></State>
            <State name="mixed-progress (row)"><CatchFormStepList current={1} direction="row" items={steps(["complete", "needsInformation", "needsInformation", "optional"])} label="Mixed rail" statusLabelBuilder={statusLabelBuilder} /></State>
            <State name="long-title (row)">
              <CatchFormStepList
                current={1}
                direction="row"
                items={steps(["complete", "needsInformation", "needsInformation"], ["Details", "A long sample step title", "Payment"])}
                label="Long rail"
                statusLabelBuilder={statusLabelBuilder}
              />
            </State>
          </CatchStack>
        </CatchStack>
      </CatchSurface>
    </CatchRoot>
  ),
};

export const Column: Story = {};
export const Rail: Story = {args: {direction: "row"}};
