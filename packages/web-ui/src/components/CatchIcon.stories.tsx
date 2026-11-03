import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {catchIconSizeSteps} from "./catchCoreVocabulary";
import {CatchIcon} from "./CatchIcon";
import {CatchRoot} from "./CatchRoot";
import {CatchStack} from "./CatchStack";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchIcon",
  component: CatchIcon,
  args: {name: "ticket"},
} satisfies Meta<typeof CatchIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

function State({label, children}: {label: string; children: ReactNode}) {
  return (
    <CatchStack gap={8}>
      <CatchText tone="secondary" variant="label-kicker">{label}</CatchText>
      {children}
    </CatchStack>
  );
}

/** catch.icon on the web: the four sizes (stroke 2, and 1.75 at 24), a labelled icon, and tones: an icon has none of its own and takes its text's. */
export const Contract: Story = {
  render: () => (
    <CatchRoot theme="day">
      <CatchSurface block="plain" padding="lg">
        <CatchStack gap={24}>
          <State label="sizes">
            <CatchStack align="center" direction="row" gap={16}>
              {catchIconSizeSteps.map((size) => <CatchIcon key={size} name="ticket" size={size} />)}
            </CatchStack>
          </State>
          <State label="labelled">
            <CatchStack align="center" direction="row" gap={8}>
              <CatchIcon label="Checked in" name="checkIn" />
              <CatchText variant="body">The icon alone carries the meaning, so it is read aloud.</CatchText>
            </CatchStack>
          </State>
          <State label="tones">
            <CatchText as="div" tone="danger" variant="title-row">
              <CatchStack align="center" direction="row" gap={6}>
                <CatchIcon name="warning" size={18} />
                Payment failed
              </CatchStack>
            </CatchText>
          </State>
        </CatchStack>
      </CatchSurface>
    </CatchRoot>
  ),
};

/** Direction roles mirror in right-to-left layouts. */
export const RightToLeft: Story = {
  render: () => (
    <CatchRoot theme="day">
      <CatchSurface block="plain" dir="rtl" padding="lg">
        <CatchStack direction="row" gap={16}>
          <CatchIcon name="back" />
          <CatchIcon name="forward" />
          <CatchIcon name="disclosure" />
        </CatchStack>
      </CatchSurface>
    </CatchRoot>
  ),
};
