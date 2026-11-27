import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {expect, userEvent, within} from "storybook/test";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchButton} from "./CatchButton";
import {CatchGap} from "./CatchGap";
import {CatchGrid} from "./CatchGrid";
import {CatchNotice, type CatchNoticeData, type CatchNoticeFloatingProps, type CatchNoticeInlineProps} from "./CatchNotice";
import {CatchNoticeRegion} from "./CatchNoticeRegion";
import {CatchLegacyText} from "./CatchLegacyText";

const meta = {
  title: "Web UI/CatchNotice",
  component: CatchNotice,
  args: {dismissLabel: "Dismiss", notice: {id: "copied", title: "Link copied"}},
} satisfies Meta<CatchNoticeFloatingProps>;

export default meta;
// The inline recipe has its own required props; the stories render both by hand.
type Story = StoryObj<CatchNoticeFloatingProps>;

const noop = () => undefined;

function State({children, label}: {children: ReactNode; label: string}) {
  return (
    <CatchGap size="related">
      <CatchLegacyText as="span" color="ink2" variant="bodyS">{label}</CatchLegacyText>
      {children}
    </CatchGap>
  );
}

const notices: {label: string; notice: CatchNoticeData; dismiss?: boolean}[] = [
  {label: "status", notice: {id: "status", title: "Link copied", message: "Paste it in your Instagram bio."}},
  {label: "success", notice: {id: "success", title: "You're booked", message: "Sun 23 Nov · 5:45 AM at Carter Road jetty.", tone: "success"}},
  {label: "warning", notice: {id: "warning", title: "Only 3 spots left", tone: "warning"}},
  {label: "danger", notice: {id: "danger", title: "That code didn't work", message: "Check the 6 digits and try again.", tone: "danger"}},
  {label: "event", notice: {id: "event", title: "Booking opens 23 Nov", message: "We'll text you when it does.", tone: "event"}},
  {label: "with-action", notice: {actionLabel: "Undo", id: "action", onAction: noop, title: "Review hidden"}},
  {dismiss: true, label: "dismissible", notice: {id: "dismiss", title: "Your page is live", message: "Share it from the top of the page.", tone: "success"}},
  {dismiss: true, label: "arrival-tap-to-open", notice: {id: "arrival", message: "Sunday Social Run · 6:30 AM", onOpen: noop, person: {name: "Kabir Mehta"}, title: "Kabir sent the route"}},
  {dismiss: true, label: "arrival-swipe-to-dismiss: Escape dismisses on the web", notice: {id: "arrival-escape", onOpen: noop, title: "Booking opens in 10 minutes"}},
  {dismiss: true, label: "arrival-reduced-motion: no motion to reduce", notice: {id: "arrival-still", onOpen: noop, title: "Your run starts at 6:30", tone: "success"}},
];

// Flutter `CatchNotice.inline`: the Widgetbook board states, in fictional copy.
const inlineNotices: {label: string; notice: CatchNoticeInlineProps}[] = [
  {label: "inline-info", notice: {body: "Guests pay into your own payout account. After 30 days free, Catch bills you 5% of ticket sales.", recipe: "inline"}},
  {label: "inline-success", notice: {body: "Last scan · 7:41 PM · 1 place · paid", recipe: "inline", title: "Kabir Rao is in", tone: "success"}},
  {label: "inline-neutral", notice: {body: "About 62 rupees to send, at messaging rates. It goes on your Catch bill.", recipe: "inline", tone: "neutral"}},
  {label: "inline-action", notice: {action: {label: "Offer places", onPressed: noop}, body: "Pick several to offer places at once.", recipe: "inline", tone: "neutral"}},
  {
    label: "inline-footer",
    notice: {
      body: "Flight 214 is on the ground. No car is there yet.",
      footer: (
        <CatchGap direction="horizontal" size="inline" wrap>
          <CatchButton label="Call them" onPressed={noop} size="sm" variant="secondary" />
          <CatchButton label="Tell the planner" onPressed={noop} size="sm" variant="quiet" />
        </CatchGap>
      ),
      recipe: "inline",
      title: "Kabir landed early",
      tone: "warning",
    },
  },
];

function States() {
  return (
    <CatchGrid columns={2} compactColumns={1}>
      {notices.map(({dismiss, label, notice}) => (
        <State key={label} label={label}><CatchNotice dismissLabel="Dismiss" notice={notice} onDismiss={dismiss ? noop : undefined} /></State>
      ))}
      {inlineNotices.map(({label, notice}) => (
        <State key={label} label={label}><CatchNotice {...notice} /></State>
      ))}
    </CatchGrid>
  );
}

/**
 * catch.notice on the web: every tone, an action, dismissal and an arrival,
 * and the inline recipe (Flutter's `CatchNotice.inline`) with its info,
 * success and neutral tints, a quiet action and a footer, light and dark. Arrivals open as a whole; Escape dismisses them, standing in
 * for the app's swipe, and they carry no motion to reduce. No board capture
 * shows a notice: the boards' toasts are the prototype's stand-in for
 * navigation.
 */
export const Contract: Story = {
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Light" pb="compact" pt="compact"><States /></CatchBand>
      <CatchBand aria-label="Dark" ground="ink" pb="compact" pt="compact"><States /></CatchBand>
    </StoryPage>
  ),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const [arrival] = canvas.getAllByRole("button", {name: /Kabir sent the route/});
    await userEvent.click(arrival);
    await expect(canvas.getAllByRole("button", {name: "Dismiss"})).toHaveLength(2);
    await expect(canvas.getAllByRole("button", {name: "Offer places"})).toHaveLength(2);
    await expect(canvas.getAllByRole("button", {name: "Tell the planner"})).toHaveLength(2);
  },
};

/** The region the host mounts once: notices stack above the page's bottom edge. */
export const Region: Story = {
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Page" pb="spacious" pt="compact">
        <CatchLegacyText as="p" variant="bodyM">The region sits fixed above the bottom edge and safe area.</CatchLegacyText>
      </CatchBand>
      <CatchNoticeRegion label="Notifications">
        <CatchNotice dismissLabel="Dismiss" notice={{id: "copied", title: "Link copied"}} onDismiss={noop} />
      </CatchNoticeRegion>
    </StoryPage>
  ),
};
