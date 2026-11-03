import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchFilePickerButton} from "./CatchFilePickerButton";
import {CatchGap} from "./CatchGap";
import {CatchLegacyIcon} from "./CatchLegacyIcon";

const meta = {
  title: "Web UI/CatchFilePickerButton",
  component: CatchFilePickerButton,
  args: {label: "Choose CSV", onChanged: () => undefined},
} satisfies Meta<typeof CatchFilePickerButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Contract: Story = {
  render: (args) => (
    <CatchGap direction="horizontal" size="related" wrap>
      <CatchFilePickerButton {...args} />
      <CatchFilePickerButton {...args} label="With an icon" leading={<CatchLegacyIcon icon="upload" size="sm" />} />
      <CatchFilePickerButton {...args} label="Disabled" onChanged={null} />
    </CatchGap>
  ),
};
