import type {Meta, StoryObj} from "@storybook/react-vite";
import {OrganizerPlaceholderCover} from "./OrganizerPlaceholderCover";

const meta = {
  title: "Web UI/Club placeholder cover",
  component: OrganizerPlaceholderCover,
  args: {name: "AFTER FLY", city: "Mumbai", activityKind: "socialRun"},
  decorators: [Story => <div style={{inlineSize: 400, aspectRatio: 1.85}}><Story /></div>],
} satisfies Meta<typeof OrganizerPlaceholderCover>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry entry (design/website/components.json).
export const Card: Story = {
  parameters: {catchComponent: {id: "shared_club_placeholder_cover", routeIds: ["home", "organizer_listing_canonical"], states: ["card"]}},
};

export const Hero: Story = {
  parameters: {catchComponent: {id: "shared_club_placeholder_cover", routeIds: ["home", "organizer_listing_canonical"], states: ["hero", "long-name"]}},
  args: {name: "Indiranagar Long Table Supper Society", city: "Bengaluru", activityKind: "dinner"},
  decorators: [Story => <div style={{inlineSize: 720, aspectRatio: 2.4}}><Story /></div>],
};

export const Compact: Story = {
  parameters: {catchComponent: {id: "shared_club_placeholder_cover", routeIds: ["home", "organizer_listing_canonical"], states: ["compact"]}},
  args: {name: "Evening Club", activityKind: "pubQuiz", compact: true},
  decorators: [Story => <div style={{inlineSize: 110, blockSize: 110}}><Story /></div>],
};
