import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect, fn, userEvent, within} from "storybook/test";
import {CatchControlSurface} from "./CatchControlSurface";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchControlSurface",
  component: CatchControlSurface,
  args: {child: <CatchText as="span" variant="bodyM">Choose a city</CatchText>},
} satisfies Meta<typeof CatchControlSurface>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SurfaceMd: Story = {};
export const RaisedCompact: Story = {args: {tone: "raised", size: "compact"}};
export const Floating: Story = {args: {size: "floating"}};
export const Pill: Story = {args: {variant: "pill"}};
export const Focused: Story = {args: {status: "focused"}};
export const Error: Story = {args: {status: "error"}};
export const Disabled: Story = {
  args: {enabled: false, status: "focused", onTap: fn()},
  play: async ({canvasElement, args}) => {
    const button = within(canvasElement).getByRole("button");
    await expect(button).toBeDisabled();
    await userEvent.click(button);
    await userEvent.tab();
    await userEvent.keyboard("{Enter} ");
    await expect(args.onTap).not.toHaveBeenCalled();
    await expect(button).not.toHaveFocus();
  },
};
export const SemanticButton: Story = {
  args: {semanticButton: true, onTap: fn()},
  play: async ({canvasElement, args}) => {
    const button = within(canvasElement).getByRole("button");
    button.focus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onTap).toHaveBeenCalledTimes(1);
    await userEvent.keyboard(" ");
    await expect(args.onTap).toHaveBeenCalledTimes(2);
  },
};
