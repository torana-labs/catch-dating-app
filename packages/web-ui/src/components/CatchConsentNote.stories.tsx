import type {Meta, StoryObj} from "@storybook/react-vite";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchConsentNote} from "./CatchConsentNote";
import {CatchStack} from "./CatchStack";

const meta = {
  title: "Web UI/CatchConsentNote",
  component: CatchConsentNote,
  args: {href: "/privacy/", linkLabel: "Privacy", text: "From Catch. Stop any time."},
} satisfies Meta<typeof CatchConsentNote>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["home", "city_format", "playbook_guide"];

/** The short lines under the website's WhatsApp forms, on white, on paper and as a long line that wraps with the link. */
export const States: Story = {
  parameters: {catchComponent: {id: "shared_consent_note", routeIds: storyRoutes, states: ["white", "paper", "long-line"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="On white" pb="compact" pt="compact">
        <CatchStack gap={8}>
          <CatchConsentNote href="/privacy/" linkLabel="Privacy" text="One WhatsApp message from Catch when the app launches." />
          <CatchConsentNote href="/privacy/" linkLabel="Privacy" text="Catch will reply on WhatsApp." />
        </CatchStack>
      </CatchBand>
      <CatchBand aria-label="On paper" ground="paper" pb="compact" pt="compact">
        <CatchConsentNote href="/privacy/" linkLabel="Privacy" text="From Catch. Stop any time." />
      </CatchBand>
      <CatchBand aria-label="Long line" pb="compact" pt="compact">
        <CatchConsentNote href="/privacy/" linkLabel="Privacy"
          text="Tapping Notify me means you agree to get new plans in Mumbai on WhatsApp, about once a week. You can stop any time." />
      </CatchBand>
    </StoryPage>
  ),
};
