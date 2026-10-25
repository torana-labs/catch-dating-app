import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {expect, userEvent, within} from "storybook/test";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryBadge, StoryCta, StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchDateTile, type CatchDateTileProps} from "./CatchDateTile";
import {CatchGap} from "./CatchGap";
import {CatchIndexRow} from "./CatchIndexRow";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchIndexRow",
  component: CatchIndexRow,
  args: {title: "Dinner"},
} satisfies Meta<typeof CatchIndexRow>;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;

function State({children, label}: {children: ReactNode; label: string}) {
  return (
    <CatchGap size="related">
      <CatchText as="span" color="ink2" variant="bodyS">{label}</CatchText>
      {children}
    </CatchGap>
  );
}

function Dot() {
  return <span aria-hidden="true" style={{background: "var(--catch-theme-accent)", borderRadius: "var(--catch-radius-pill)", height: 8, width: 8}} />;
}

function States() {
  return (
    <CatchGap size="section">
      <State label="default"><CatchIndexRow onTap={noop} title="Dinner" /></State>
      <State label="selected, leading and trailing">
        <CatchIndexRow leading={<Dot />} onTap={noop} selected title="Social run" trailing={<CatchText as="span" variant="bodyS">12</CatchText>} />
      </State>
      <State label="stacked: subtitle and footer, as a link">
        <CatchIndexRow
          footer={<><StoryBadge label="On Catch" tone="catch" /><CatchText as="span" variant="supportingStrong">₹500</CatchText></>}
          href="#long-run"
          leading={<CatchDateTile dateTime="2026-11-02" day="2" ground="pink" month="Nov" weekday="Sun" />}
          subtitle="6:30 AM · Carter Road jetty"
          title="Sunday Long Run"
          trailing={<StoryCta label="Book" primary />}
        />
      </State>
      <State label="disabled"><CatchIndexRow onTap={null} title="Coming soon" /></State>
    </CatchGap>
  );
}

/** catch.index_row on the web: every Flutter contract state, the stacked row, and dark. */
export const Contract: Story = {
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Light" pb="compact" pt="compact"><States /></CatchBand>
      <CatchBand aria-label="Dark" ground="ink" pb="compact" pt="compact"><States /></CatchBand>
    </StoryPage>
  ),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const [selected] = canvas.getAllByRole("button", {name: "Social run 12"});
    await expect(selected).toHaveAttribute("aria-current", "true");
    const [link] = canvas.getAllByRole("link", {name: /Sunday Long Run/});
    await userEvent.tab();
    await expect(canvas.getAllByRole("button", {name: "Dinner"})[0]).toHaveFocus();
    await expect(link).toHaveAttribute("href", "#long-run");
  },
};

type EventRow = CatchDateTileProps & {
  cta: string;
  note: string;
  price: string;
  primary?: boolean;
  source: "catch" | "luma";
  subtitle: string;
  title: string;
};

const events: EventRow[] = [
  {cta: "Book", dateTime: "2026-11-02", day: "2", ground: "coral", month: "Nov", note: "31 spots left", price: "Free", primary: true,
    source: "catch", subtitle: "6:30 AM · Carter Road jetty", title: "Sunday Social Run", weekday: "Sun"},
  {cta: "Book", dateTime: "2026-11-05", day: "5", ground: "paper", month: "Nov", note: "18 spots left", price: "Free", primary: true,
    source: "catch", subtitle: "7:00 PM · Carter Road", title: "Wednesday Tempo 6K", weekday: "Wed"},
  {cta: "Tickets ↗", dateTime: "2026-11-15", day: "15", ground: "indigo", month: "Nov", note: "Selling fast", price: "₹799",
    source: "luma", subtitle: "5:30 PM · Worli Sea Face, then Bayview rooftop", title: "Run & Rave: Sunset Edition", weekday: "Sat"},
  {cta: "Book", dateTime: "2026-11-23", day: "23", ground: "mint", month: "Nov", note: "Water and gels included", price: "₹299", primary: true,
    source: "catch", subtitle: "6:00 AM · Bandstand to Worli and back", title: "Half-marathon training: 15K", weekday: "Sun"},
  {cta: "Remind me", dateTime: "2026-11-30", day: "30", ground: "paper", month: "Nov", note: "Booking opens 23 Nov", price: "Free",
    source: "catch", subtitle: "6:30 AM · Carter Road jetty", title: "Sunday Social Run", weekday: "Sun"},
];

function EventRows() {
  return events.map(({cta, note, price, primary, source, subtitle, title, ...date}) => (
    <CatchIndexRow
      footer={
        <>
          <StoryBadge label={source === "catch" ? "On Catch" : "Luma"} tone={source} />
          <CatchText as="span" variant="supportingStrong">{price}</CatchText>
          <CatchText as="span" color="ink2" variant="bodyS">{note}</CatchText>
        </>
      }
      href="#event"
      key={date.dateTime}
      leading={<CatchDateTile {...date} />}
      subtitle={subtitle}
      title={title}
      titleMaxLines={2}
      trailing={<StoryCta label={cta} primary={primary} />}
    />
  ));
}

/** The organiser page's "Coming up" list: date tile, two fact lines, source badge and booking call. */
export const Reference: Story = {
  render: () => (
    <ReferenceComparison
      desktop={{capture: "organizer/guest/1280", height: 570, width: 630, x: 556, y: 162}}
      label="Event rows"
      phone={{capture: "organizer/guest/390", height: 680, width: 366, x: 12, y: 1352}}
      render={() => <div><EventRows /></div>}
    />
  ),
};
