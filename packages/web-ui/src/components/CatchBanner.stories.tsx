import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {expect, userEvent, within} from "storybook/test";
import {CatchBanner, type CatchBannerStatus} from "./CatchBanner";
import {CatchButton} from "./CatchButton";
import {CatchGrid} from "./CatchGrid";
import {CatchIcon} from "./CatchIcon";
import {CatchRoot} from "./CatchRoot";
import {CatchStack} from "./CatchStack";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchBanner",
  component: CatchBanner,
  args: {message: "Sample message."},
} satisfies Meta<typeof CatchBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;

function State({children, label}: {children: ReactNode; label: string}) {
  return (
    <CatchStack gap={8}>
      <CatchText tone="secondary" variant="body-meta">{label}</CatchText>
      {children}
    </CatchStack>
  );
}

const offline: CatchBannerStatus = {
  id: "offline",
  label: "Offline",
  message: "Changes save when the connection returns.",
  icon: <CatchIcon name="offline" />,
  color: "var(--catch-theme-warning)",
};

const rehearsal: CatchBannerStatus = {
  id: "rehearsal",
  label: "Rehearsal",
  message: "Sample data only. Nothing here is sent.",
  icon: <CatchIcon name="people" />,
  color: "var(--catch-theme-danger)",
  actions: [
    {label: "Sample action", onPressed: noop},
    {icon: "more", label: "More tools", onPressed: noop},
  ],
};

function States() {
  return (
    <CatchStack gap={24}>
      <CatchGrid columns={2} compactColumns={1}>
        {(["primary", "success", "warning", "danger", "neutral"] as const).map((tone) => (
          <State key={tone} label={tone}><CatchBanner message="Sample message in this tone." tone={tone} /></State>
        ))}
        <State label="with-title"><CatchBanner message="A sample message under its title." title="Sample title" /></State>
        <State label="with-action">
          <CatchBanner actions={<CatchButton label="Open" onPressed={noop} recipe="text" />} message="A sample message with an action." />
        </State>
        <State label="inline"><CatchBanner message="The sample could not be saved." variant="error" /></State>
        <State label="from-error: the caller maps the error to copy">
          <CatchBanner message="The sample request failed." variant="error" />
        </State>
        <State label="with-retry">
          <CatchBanner message="The sample request failed." onRetry={noop} retryLabel="Try again" variant="error" />
        </State>
      </CatchGrid>
      <State label="offline"><CatchBanner statuses={[offline]} variant="statuses" /></State>
      <State label="rehearsal"><CatchBanner statuses={[rehearsal]} variant="statuses" /></State>
      <State label="stacked"><CatchBanner statuses={[rehearsal, offline]} variant="statuses" /></State>
      <State label="empty: renders nothing"><CatchBanner statuses={[]} variant="statuses" /></State>
    </CatchStack>
  );
}

/**
 * catch.banner on the web: every tone, a title, an action, the inline error,
 * an error with retry, and the status bands one at a time, stacked and empty,
 * in the day and night themes. A banner has no dismiss control; CatchNotice
 * owns dismissible delivery.
 */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchSurface aria-label="Day" block="band"><States /></CatchSurface>
      <CatchSurface aria-label="Night" block="band" color="ink"><States /></CatchSurface>
    </CatchRoot>
  ),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const [retry] = canvas.getAllByRole("button", {name: "Try again"});
    await userEvent.click(retry);
    await expect(canvas.queryAllByRole("button", {name: /dismiss/i})).toHaveLength(0);
  },
};
