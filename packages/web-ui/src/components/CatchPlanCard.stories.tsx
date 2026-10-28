import type {Meta, StoryObj} from "@storybook/react-vite";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchGrid} from "./CatchGrid";
import {CatchPlanCard, type CatchPlanCardProps} from "./CatchPlanCard";

const meta = {
  title: "Web UI/CatchPlanCard",
  component: CatchPlanCard,
  args: {detail: "", href: "#", label: "", posterLabel: "", price: "", title: ""},
} satisfies Meta<typeof CatchPlanCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["home", "visitor_discovery"];

const plans: CatchPlanCardProps[] = [
  {posterLabel: "Quiz night", availability: "6 left", detail: "The Quizzicals · Khar Social", format: "games", href: "#quiz",
    label: "Games and quizzes · Thu 7:30 PM", price: "Free", title: "Thursday Evening Pub Quiz"},
  {posterLabel: "Supper club", availability: "2 left", detail: "Khar Table · Khar West", format: "dinner", href: "#supper",
    label: "Dinners · Thu 8:30 PM", photoUrl: "/assets/marketing/home-dinner.jpg", price: "₹1,800", title: "Strangers’ Supper"},
  {posterLabel: "Run club", availability: "9 left", detail: "Carter Road Runners · Carter Road, Bandra", format: "run", href: "#run",
    label: "Run clubs · Fri 6:30 AM", photoUrl: "/assets/events/social-run-music-hero-960.jpg", price: "Free", title: "Carter Road Social Run"},
  {posterLabel: "Pub crawl", availability: "11 left", detail: "Night Shift Socials · Four stops in Bandra", format: "nightsOut", href: "#crawl",
    label: "Nights out · Fri 7:30 PM", price: "₹999", title: "Friday Bandra Pub Crawl"},
  {posterLabel: "Pickleball", availability: "Full", detail: "Dink and Drink · Andheri West", format: "courts", href: "#courts",
    label: "Pickleball · Sat 5:00 PM", price: "₹450", title: "Pickleball Social"},
  {posterLabel: "Yoga", detail: "Sunrise Yoga Club · Joggers Park, a plan imported from its own booking page", href: "#yoga",
    label: "Sun 7:00 AM", price: "₹300", title: "Sunrise yoga on the lawn with a long title that wraps to a second line"},
];

const grid = (
  <CatchGrid columns={4} compactColumns={1}>
    {plans.map((plan) => <CatchPlanCard key={plan.href} {...plan} />)}
  </CatchGrid>
);

/** Photo and poster media, every format colour, a full plan, and a plan with no format or availability. */
export const Plans: Story = {
  parameters: {catchComponent: {id: "shared_plan_card", routeIds: storyRoutes, states: ["photo", "poster", "formats", "full", "no-format", "long-title", "compact-row"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Plan cards" ground="paper" pb="compact" pt="compact">{grid}</CatchBand>
    </StoryPage>
  ),
};

/** The board's plan grid beside the library rendering, at both widths. */
export const BoardReference: Story = {
  parameters: {catchComponent: {id: "shared_plan_card", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "home/mumbai_live/1280", height: 700, y: 1880}}
      label="Plan cards"
      phone={{capture: "home/mumbai_live/390", height: 760, y: 2050}}
      render={() => <CatchBand aria-label="Plan cards" ground="paper" pb="none" pt="none">{grid}</CatchBand>}
    />
  ),
};
