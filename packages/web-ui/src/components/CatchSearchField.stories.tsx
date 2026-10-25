import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect, userEvent, within} from "storybook/test";
import {type CSSProperties, useState} from "react";
import {CatchSearchField, type CatchSearchFieldCopy} from "./CatchSearchField";
import {CatchGap} from "./CatchGap";
import {CatchPageBody} from "./CatchPageBody";

const copy: CatchSearchFieldCopy = {
  searchLabel: "Search organizers",
  clearTooltip: (placeholder) => `Clear ${placeholder}`,
  closeSearchLabel: "Close search",
};
const meta = {
  title: "Web UI/CatchSearchField",
  component: CatchSearchField,
  args: {copy},
} satisfies Meta<typeof CatchSearchField>;
export default meta;
type Story = StoryObj<typeof meta>;

function Transient() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  return <CatchSearchField.expanding copy={copy} value={query} onChanged={setQuery}
    status={open ? "expanded" : "collapsed"} onOpenSearch={() => setOpen(true)}
    onCloseSearch={() => setOpen(false)} autofocus />;
}
function States() {
  return <CatchGap size="formField">
    <CatchSearchField copy={copy} />
    <CatchSearchField copy={copy} value="Fort Greene Run Club" />
    <CatchSearchField.expanded copy={copy} placeholder="Search paid-event organizers" />
    <CatchSearchField copy={copy} value="Disabled search" enabled={false} />
    <CatchSearchField.expanding copy={copy} status="collapsed" />
    <CatchSearchField.expanding copy={copy} status="expanded" onCloseSearch={() => {}} />
    <Transient />
  </CatchGap>;
}
export const Contract: Story = {
  render: () => <>
    <CatchPageBody constrainToContentWidth><States /></CatchPageBody>
    <div data-catch-theme="dark" style={{background: "var(--catch-theme-bg)"}}>
      <CatchPageBody constrainToContentWidth><States /></CatchPageBody>
    </div>
  </>,
};
export const Empty: Story = {};
export const Filled: Story = {args: {value: "Delhi"}};
export const Focused: Story = {args: {autofocus: true}};
export const Disabled: Story = {args: {value: "Delhi", enabled: false}};
export const Collapsed: Story = {render: () => <CatchSearchField.expanding copy={copy} status="collapsed" />};
export const Expanded: Story = {render: () => <CatchSearchField.expanding copy={copy} onCloseSearch={() => {}} />};
export const LargeText: Story = {
  render: () => <div style={{"--catch-typography-web-secondary-size": "28px", "--catch-typography-web-secondary-line-height": "40px"} as CSSProperties}><States /></div>,
};

export const Interactive: Story = {
  render: () => <Transient />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {name: copy.searchLabel}));
    const input = canvas.getByRole("searchbox");
    await expect(input).toHaveFocus();
    await userEvent.type(input, "Delhi");
    await expect(input).toHaveValue("Delhi");
    await userEvent.click(canvas.getByRole("button", {name: "Clear Search organizers"}));
    await expect(input).toHaveValue("");
    await expect(input).toHaveFocus();
    await userEvent.click(canvas.getByRole("button", {name: copy.closeSearchLabel}));
    await expect(canvas.queryByRole("searchbox")).not.toBeInTheDocument();
    await expect(canvas.getByRole("button", {name: copy.searchLabel})).toBeVisible();
  },
};
