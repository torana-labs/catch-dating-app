import type {Meta, StoryObj} from "@storybook/react-vite";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchButton} from "./CatchButton";
import {CatchGrid} from "./CatchGrid";
import {CatchOrganizerCard, type CatchOrganizerCardProps} from "./CatchOrganizerCard";

const meta = {
  title: "Web UI/CatchOrganizerCard",
  component: CatchOrganizerCard,
  args: {footnote: "", monogramGround: "coral", name: "", next: "", subtitle: ""},
} satisfies Meta<typeof CatchOrganizerCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["home", "visitor_discovery"];

const follow = (name: string, following = false) => (
  <CatchButton label={following ? "Following" : "Follow"} onPressed={() => undefined} semanticsLabel={`${following ? "Following" : "Follow"} ${name}`}
    size="md" variant={following ? "primary" : "secondary"} />
);

const organizers: CatchOrganizerCardProps[] = [
  {action: follow("Evening Club"), footnote: "74 followers", href: "#evening", monogramGround: "yellow", name: "Evening Club",
    next: "Next: Sat 6:30 PM · Saturday Game Night", subtitle: "Trivia nights and socials"},
  {action: follow("Carter Road Runners", true), footnote: "213 followers", href: "#carter", monogramGround: "coral", name: "Carter Road Runners",
    next: "Next: Fri 6:30 AM · Carter Road Social Run", subtitle: "Sunday social runs"},
  {action: <a href="#claim">Is this you? Claim it</a>, footnote: "Not claimed yet", href: "#swap", monogramGround: "paper", name: "Bandra Book Swap",
    next: "Next: first Sunday of the month · listed from their Instagram", subtitle: "Monthly book swaps"},
  {footnote: "Joining at launch", monogramGround: "mint", name: "Koregaon Park Runners",
    next: "Next: first plan announced when Catch opens", subtitle: "Saturday social runs"},
];

const grid = (
  <CatchGrid columns={3} compactColumns={1}>
    {organizers.map((organizer) => <CatchOrganizerCard key={organizer.name} {...organizer} />)}
  </CatchGrid>
);

/** Follow and following, an unclaimed listing with its claim link, and an organiser joining a city before launch. */
export const Organizers: Story = {
  parameters: {catchComponent: {id: "shared_organizer_card", routeIds: storyRoutes, states: ["follow", "following", "unclaimed", "joining", "no-page"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Organiser cards" pb="compact" pt="compact">{grid}</CatchBand>
    </StoryPage>
  ),
};

/** The board's organiser cards beside the library rendering, at both widths. */
export const BoardReference: Story = {
  parameters: {catchComponent: {id: "shared_organizer_card", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "home/mumbai_live/1280", height: 360, y: 3930}}
      label="Organiser cards"
      phone={{capture: "home/mumbai_live/390", height: 220, y: 6120}}
      render={() => <CatchBand aria-label="Organiser cards" pb="none" pt="none">{grid}</CatchBand>}
    />
  ),
};
