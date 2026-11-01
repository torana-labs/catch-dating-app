import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchIndexRow} from "./CatchIndexRow";
import {CatchSection} from "./CatchSection";
import {CatchViewport} from "./CatchViewport";

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
