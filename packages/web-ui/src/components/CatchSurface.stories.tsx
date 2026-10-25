import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import {expect, userEvent, within} from "storybook/test";
import {CatchSurface} from "./CatchSurface";
import {CatchInset} from "./CatchInset";
import {CatchGap} from "./CatchGap";
import {CatchPageBody} from "./CatchPageBody";
import {CatchText} from "./CatchText";
const copy = (label: string) => <CatchInset padding="contentRelaxed"><CatchText variant="bodyM">{label}</CatchText></CatchInset>;
const meta = {title: "Web UI/CatchSurface", component: CatchSurface, args: {child: copy("A bounded group of content")}} satisfies Meta<typeof CatchSurface>;
export default meta;
type Story = StoryObj<typeof meta>;
function States() {
  return <CatchPageBody constrainToContentWidth><CatchGap size="formField">
    {(["surface", "raised", "primarySoft", "transparent"] as const).map((tone) => <CatchSurface key={tone} tone={tone} child={copy(tone)} />)}
    {(["flat", "subtle", "raised", "floating"] as const).map((emphasis) => <CatchSurface key={emphasis} emphasis={emphasis} child={copy(`${emphasis} emphasis`)} />)}
    <CatchSurface recipe="card" child={copy("Card recipe, with composed padding")} />
    <CatchSurface recipe="tinted" child={copy("Only attendees can see this matching detail.")} />
    <CatchSurface onTap={() => {}} child={copy("Open candidate details")} />
  </CatchGap></CatchPageBody>;
}
export const Contract: Story = {render: () => <><States /><div data-catch-theme="dark" style={{background: "var(--catch-theme-bg)"}}><States /></div></>};
export const Surface: Story = {};
export const Raised: Story = {args: {tone: "raised"}};
export const PrimarySoft: Story = {args: {tone: "primarySoft"}};
export const Transparent: Story = {args: {tone: "transparent"}};
export const Card: Story = {args: {recipe: "card"}};
export const Tinted: Story = {args: {recipe: "tinted"}};
export const Elevated: Story = {args: {emphasis: "floating"}};
export const LongContent: Story = {args: {child: copy("A long candidate summary remains complete and can wrap at a narrow viewport without clipping or changing its meaning. ".repeat(5))}};
function InteractiveSurface() {
  const [count, setCount] = useState(0);
  return <CatchGap size="formField"><CatchSurface recipe="card" onTap={() => setCount((n) => n + 1)} child={copy("Open candidate")} /><CatchText variant="bodyM">{`Opened ${count} times`}</CatchText></CatchGap>;
}
export const Interactive: Story = {render: () => <InteractiveSurface />, play: async ({canvasElement}) => {
  const canvas = within(canvasElement), control = canvas.getByRole("button", {name: "Open candidate"});
  await userEvent.click(control); await expect(canvas.getByText("Opened 1 times")).toBeVisible();
  control.focus(); await userEvent.keyboard("{Enter}"); await userEvent.keyboard(" ");
  await expect(canvas.getByText("Opened 3 times")).toBeVisible();
}};
