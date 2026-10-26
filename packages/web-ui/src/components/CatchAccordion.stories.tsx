import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect, userEvent, within} from "storybook/test";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchAccordion, type CatchAccordionItem} from "./CatchAccordion";
import {CatchBand} from "./CatchBand";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchAccordion",
  component: CatchAccordion,
  args: {items: []},
} satisfies Meta<typeof CatchAccordion>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["home", "host_landing"];

const questions: CatchAccordionItem[] = [
  {answer: "No. You can browse and book on the website. The app adds reminders, your plans and check-in.", id: "app", question: "Do I need the app?"},
  {answer: "Yes. About a third of people come on their own, and hosts plan for it with a first hello and small groups.", id: "alone", question: "Can I come on my own?"},
  {answer: "Run clubs, supper clubs, quiz nights and other local organisers. Each page shows who hosts and what people say.", id: "hosts", question: "Who runs these events?"},
  {answer: "Browsing is free. Some events are free and some are ticketed; the price is on the event before you book.", id: "free", question: "Is Catch free?"},
  {answer: "Your name stays private until you're booked, and only the people at that event can see it.", id: "privacy", question: "Who can see what I share?"},
  {answer: "Pick your city and leave your number. We'll text you when the first events go live there.", id: "city", question: "What if Catch isn't in my city yet?"},
];

/** Closed, one open, several open at once (not exclusive), and on an ink band. */
export const States: Story = {
  parameters: {catchComponent: {id: "shared_accordion", routeIds: storyRoutes, states: ["closed", "open", "exclusive", "multiple", "on-ink"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Exclusive" pb="compact" pt="compact">
        <CatchAccordion defaultOpen={["alone"]} items={questions} name="faq-exclusive" />
      </CatchBand>
      <CatchBand aria-label="Several open" pb="compact" pt="compact">
        <CatchAccordion defaultOpen={["app", "free"]} exclusive={false} items={questions.slice(0, 4)} />
      </CatchBand>
      <CatchBand aria-label="On ink" ground="ink" pb="compact" pt="compact">
        <CatchAccordion
          items={[{answer: <CatchText as="p" color="ink2" variant="bodyL">Answers can carry links and lists.</CatchText>, id: "rich", question: "Can an answer hold more than text?"}]}
          name="faq-ink"
        />
      </CatchBand>
    </StoryPage>
  ),
  play: async ({canvasElement}) => {
    const band = within(within(canvasElement).getByRole("region", {name: "Exclusive"}));
    const free = band.getByText("Is Catch free?").closest("details")!;
    const alone = band.getByText("Can I come on my own?").closest("details")!;
    await expect(alone).toHaveAttribute("open");
    await userEvent.click(band.getByText("Is Catch free?"));
    await expect(free).toHaveAttribute("open");
    await expect(alone).not.toHaveAttribute("open");
  },
};

/** The homepage's questions. */
export const Reference: Story = {
  parameters: {catchComponent: {id: "shared_accordion", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "home/mumbai_live/1280", height: 480, width: 548, x: 668, y: 5930}}
      label="FAQ"
      phone={{capture: "home/mumbai_live/390", height: 446, width: 358, x: 16, y: 7920}}
      render={() => <CatchAccordion items={questions} name="faq-reference" />}
    />
  ),
};
