import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchField} from "./CatchField";
import {CatchIndexRow} from "./CatchIndexRow";
import {CatchSection} from "./CatchSection";
import {CatchViewport} from "./CatchViewport";
import {CatchRoot} from "./CatchRoot";
import {CatchStack} from "./CatchStack";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchSection",
  component: CatchSection,
  args: {title: "Oldest first"},
} satisfies Meta<typeof CatchSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;

/** catch.section on the web: titled rows with a count and action, a pick list, a tile group, a journey timeline, columns and empty. */
export const Contract: Story = {
  render: () => (
    <CatchViewport fill="parent" register="quiet" sizeClass="expanded">
      <div style={{display: "grid", gap: 32, maxWidth: 720, padding: 24}}>
        <CatchSection action={{label: "All 14", onPressed: noop}} count={14} title="Oldest first">
          <CatchIndexRow onTap={noop} subtitle="Listing · nominated by Riya" title="Afterfly" />
          <CatchIndexRow onTap={noop} subtitle="Claim · Dev recommends approval" title="Bhag Club" />
        </CatchSection>
        <CatchSection title="Settings">
          <CatchIndexRow onTap={noop} title="Intake" />
          <CatchIndexRow onTap={noop} selected title="Payments" />
          <CatchIndexRow onTap={noop} title="Safety" />
        </CatchSection>
        <CatchSection dividers="none" title="Which host is it?">
          <CatchField onChanged={noop} recipe="input" title="Search organizers" value="Harbor" />
          <CatchIndexRow onTap={noop} selected subtitle="Mumbai" title="Harbor Social Club" />
          <CatchIndexRow onTap={noop} subtitle="Goa" title="Harbor Run Club" />
        </CatchSection>
        <CatchSection container="tile" note="3 of 4" title="Checks">
          <CatchIndexRow title="One real organizer" />
          <CatchIndexRow title="Runs events in Mumbai" />
        </CatchSection>
        <CatchSection
          timeline={[
            {title: "Riya sent a link on WhatsApp", subtitle: "luma.com/afterfly", meta: "Mon 9:41 PM", state: "done"},
            {title: "Read 2 pages", meta: "9:42 PM", state: "done"},
            {title: "Waiting for a review", subtitle: "No image rights", meta: "Now", state: "current", tone: "warning"},
            {title: "Published unclaimed", meta: "Next", state: "next"},
          ]}
          title="How it got here"
        />
        <CatchSection columns={2} title="Guests">
          {["Aarav", "Meher", "Kabir", "Rhea", "Dev"].map((name) => <CatchIndexRow key={name} title={name} />)}
        </CatchSection>
        <CatchSection empty={<p>Nothing is waiting.</p>} title="Claims" />
      </div>
    </CatchViewport>
  ),
};

/** timeline={true}: CatchIndexRow children joined by their markers or times, ink under a filled ink marker. */
export const TimelineRows: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchSurface block="plain" padding="lg">
        <CatchStack direction="row" equal gap={32}>
          <CatchSection dividers="none" timeline>
            <CatchIndexRow body="Two things left: the arrival message and a quizmaster for round two." density="regular" marker={{tone: "muted", size: 12}} time="6:00 PM" title="Before doors" wrap />
            <CatchIndexRow body="Partner rotations run on a timer." density="regular" marker={{tone: "format", format: "games", live: true, size: 12}} onTap={noop} selected time="8:16 PM" title="Round two" wrap />
            <CatchIndexRow body="A ten-second countdown, then everyone sees their next partner." density="regular" marker={{kind: "ring", size: 12}} onTap={noop} time="8:24 PM" title="The reveal" wrap />
          </CatchSection>
          <CatchSection timeline>
            <CatchIndexRow density="compact" marker={{size: 12}} title="Applied" />
            <CatchIndexRow density="compact" marker={{size: 12}} title="Approved" />
            <CatchIndexRow density="compact" marker={{kind: "ring", size: 12}} title="Paid" />
          </CatchSection>
        </CatchStack>
      </CatchSurface>
    </CatchRoot>
  ),
};
