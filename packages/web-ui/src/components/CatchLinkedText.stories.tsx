import type {Meta, StoryObj} from "@storybook/react-vite";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchLinkedText} from "./CatchLinkedText";
import {CatchStack} from "./CatchStack";

const meta = {
  title: "Web UI/CatchLinkedText",
  component: CatchLinkedText,
  args: {parts: ["Prefer a person? ", {label: "WhatsApp us", href: "#chat"}, " or ", {label: "book a 15-minute walkthrough", href: "#walkthrough"}, "."]},
} satisfies Meta<typeof CatchLinkedText>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["host", "home", "privacy"];

/** Sentences with links inside them: two links, a link that ends in an arrow, and a long line that wraps. */
export const States: Story = {
  parameters: {catchComponent: {id: "shared_linked_text", routeIds: storyRoutes, states: ["two-links", "arrow", "long-line"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="On paper" ground="paper" pb="compact" pt="compact">
        <CatchStack gap={12}>
          <CatchLinkedText parts={["Prefer a person? ", {label: "WhatsApp us", href: "#chat"}, " or ", {label: "book a 15-minute walkthrough", href: "#walkthrough"}, "."]} />
          <CatchLinkedText parts={["Run plans in a new city? ", {label: "Host on the sample app", href: "#host", arrow: true}]} />
          <CatchLinkedText parts={["Or email ", {label: "help@example.com", href: "mailto:help@example.com"}, ", or see the ", {label: "contact page", href: "#contact"}, ". A longer sentence that wraps onto a second line keeps its links in the flow."]} tone="primary" />
        </CatchStack>
      </CatchBand>
    </StoryPage>
  ),
};
