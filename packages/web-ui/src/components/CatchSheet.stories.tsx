import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import {expect, userEvent, waitFor, within} from "storybook/test";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchButton} from "./CatchButton";
import {CatchGap} from "./CatchGap";
import {CatchSheet, type CatchSheetProps} from "./CatchSheet";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchSheet",
  component: CatchSheet,
  args: {children: null, onClose: () => undefined, open: false},
} satisfies Meta<typeof CatchSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

// Lucide "ticket" (ISC).
const ticket = (
  <svg fill="none" focusable="false" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2ZM13 5v2M13 17v2M13 11v2" />
  </svg>
);

const body = <CatchText as="p" color="ink2" variant="bodyM">Pick 6:00, 6:45 or 7:30 per km when you book. Nobody gets dropped.</CatchText>;
const long = Array.from({length: 14}, (_, index) => <CatchText as="p" key={index} variant="bodyM">{`Choice ${index + 1}`}</CatchText>);

type WithoutState<T> = T extends unknown ? Omit<T, "onClose" | "open"> : never;
type Variant = {label: string; props: WithoutState<CatchSheetProps>};

const variants: Variant[] = [
  {label: "plain", props: {children: body, subtitle: "One pace group per booking", title: "Choose your pace"}},
  {label: "branded", props: {children: body, glyph: ticket, subtitle: "Sun 23 Nov · 5:45 AM", title: "Your booking"}},
  {label: "badge", props: {badge: "New", badgeTone: "brand", children: body, title: "Pace groups"}},
  {label: "action", props: {children: body, footer: <CatchButton fullWidth label="Save pace" onPressed={() => undefined} />, title: "Choose your pace"}},
  {label: "scrollable", props: {children: long, mode: "scrollable", title: "All choices"}},
  {label: "without-grabber", props: {children: body, grabber: false, title: "Choose your pace"}},
  {label: "keyboard-safe", props: {children: body, keyboardSafe: true, title: "Add a note"}},
  {label: "standard, pinned footer", props: {children: long, footer: <CatchButton fullWidth label="Apply" onPressed={() => undefined} />, pinFooter: true, recipe: "standard", title: "Filter events"}},
  {label: "filter", props: {children: long, closeLabel: "Close", recipe: "filter", title: "Activity"}},
];

function Launcher({label, props}: Variant) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <CatchButton label={`Open ${label}`} onPressed={() => setOpen(true)} size="md" variant="secondary" />
      <CatchSheet {...(props as CatchSheetProps)} onClose={() => setOpen(false)} open={open} />
    </>
  );
}

/**
 * catch.sheet on the web: every Flutter contract state as a launcher. Each
 * opens a modal bottom sheet; Escape, the backdrop or a filter's Close
 * dismiss it.
 */
export const Contract: Story = {
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Sheets" pb="compact" pt="compact">
        <CatchGap direction="horizontal" size="inline" wrap>
          {variants.map((variant) => <Launcher key={variant.label} {...variant} />)}
        </CatchGap>
      </CatchBand>
    </StoryPage>
  ),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {name: "Open filter"}));
    const sheet = await within(canvasElement.ownerDocument.body).findByRole("dialog", {name: "Activity"});
    await userEvent.click(within(sheet).getByRole("button", {name: "Close"}));
    await waitFor(() => expect(sheet).not.toBeVisible());
    await userEvent.click(canvas.getByRole("button", {name: "Open branded"}));
    const branded = await within(canvasElement.ownerDocument.body).findByRole("dialog", {name: "Your booking"});
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(branded).not.toBeVisible());
  },
};
