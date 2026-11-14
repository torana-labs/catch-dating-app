import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import {expect, userEvent, waitFor, within} from "storybook/test";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchAdaptiveSheet, type CatchAdaptiveSheetWide} from "./CatchAdaptiveSheet";
import {CatchBand} from "./CatchBand";
import {CatchButton} from "./CatchButton";
import {CatchField} from "./CatchField";
import {CatchGap} from "./CatchGap";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchAdaptiveSheet",
  component: CatchAdaptiveSheet,
  args: {children: null, closeLabel: "Close", onClose: () => undefined, open: false, title: "Sign in", wide: "dropdown"},
} satisfies Meta<typeof CatchAdaptiveSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

function SignIn({initiallyOpen = false}: {initiallyOpen?: boolean}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [phone, setPhone] = useState("");
  return (
    <CatchAdaptiveSheet closeLabel="Close" footer={<CatchText as="p" tone="secondary" variant="body-meta">Signing in does not subscribe you to marketing messages.</CatchText>}
      onClose={() => setOpen(false)} open={open} subtitle="One Catch account for your plans, follows and reviews." title="Sign in"
      trigger={<CatchButton label="Sign in" onPressed={() => setOpen((value) => !value)} size="sm" variant="quiet" />} wide="dropdown" width={380}>
      <CatchGap size="formField">
        <CatchField autoComplete="tel" keyboardType="phone" onChanged={setPhone} recipe="input" title="Phone number with country code" value={phone} />
        <CatchButton fullWidth label="Text me a code" onPressed={() => undefined} />
      </CatchGap>
    </CatchAdaptiveSheet>
  );
}

function Launcher({label, wide, align, width}: {label: string; wide: CatchAdaptiveSheetWide; align?: "start" | "end"; width?: number}) {
  const [open, setOpen] = useState(false);
  return (
    <CatchAdaptiveSheet align={align} closeLabel="Close" onClose={() => setOpen(false)} open={open}
      subtitle="Carter Road Runners" title={wide === "dialog" ? "Sunday Social Run" : "Choose your city"}
      trigger={<CatchButton label={label} onPressed={() => setOpen(true)} size="md" variant="secondary" />} wide={wide} width={width}>
      <CatchText as="p" tone="secondary" variant="body">
        {wide === "dialog" ? "Show this at the start. Sun 15 Nov · 6:15 AM, Carter Road promenade." : "Mumbai, Indore, Bengaluru, Delhi NCR and Pune."}
      </CatchText>
    </CatchAdaptiveSheet>
  );
}

/**
 * catch.sheet's adaptive member on the web: under 900px every launcher opens
 * the bottom sheet; at 900px and wider a top-bar control drops a panel down
 * (Sign in at its start edge, the city at its end edge) and page content
 * opens a centred dialog.
 */
export const Contract: Story = {
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Adaptive sheets" pb="compact" pt="compact">
        <CatchGap direction="horizontal" size="inline" wrap>
          <SignIn />
          <Launcher align="end" label="Mumbai" wide="dropdown" width={340} />
          <Launcher label="View pass" wide="dialog" />
        </CatchGap>
      </CatchBand>
    </StoryPage>
  ),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", {name: "Sign in"});
    await userEvent.click(trigger);
    const panel = await body.findByRole("dialog", {name: "Sign in"});
    await userEvent.keyboard("+91 98765 43210");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(panel).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    await userEvent.click(trigger);
    const field = await body.findByRole("textbox", {name: "Phone number with country code"});
    await expect(field).toHaveValue("+91 98765 43210");
    await userEvent.click(canvas.getByRole("button", {name: "View pass"}));
    const pass = await body.findByRole("dialog", {name: "Sunday Social Run"});
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(pass).not.toBeVisible());
  },
};

/** The dropdown open under Sign in, as the top bar draws it at 900px and wider (the sheet on phones). */
export const SignInOpen: Story = {
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Top bar" pb="compact" pt="compact">
        <SignIn initiallyOpen />
      </CatchBand>
    </StoryPage>
  ),
};
