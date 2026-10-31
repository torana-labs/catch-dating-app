import type {Meta, StoryObj} from "@storybook/react-vite";
import {OrganizerCover} from "./OrganizerCover";

// A drawn stand-in for an organiser's photo, so the story needs no network.
const photo = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="740" height="400" viewBox="0 0 740 400">'
  + '<rect width="740" height="400" fill="#2a2824"/>'
  + '<path d="M0 320 C200 250 420 360 740 260 L740 400 L0 400 Z" fill="#d85a3c"/>'
  + '<circle cx="580" cy="110" r="54" fill="#f4f0e8"/>'
  + "</svg>",
)}`;

const meta = {
  title: "Web UI/Club cover",
  component: OrganizerCover,
  args: {name: "AFTER FLY", city: "Mumbai", activityKind: "socialRun"},
  decorators: [Story => <div style={{inlineSize: 400, aspectRatio: 1.85}}><Story /></div>],
} satisfies Meta<typeof OrganizerCover>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry entry (design/website/components.json).
export const Photo: Story = {
  parameters: {catchComponent: {id: "shared_club_cover", routeIds: ["home", "organizer_listing_canonical"], states: ["photo"]}},
  args: {photoUrl: photo, semanticLabel: "Runners at the start line"},
};

export const Fallback: Story = {
  parameters: {catchComponent: {id: "shared_club_cover", routeIds: ["home", "organizer_listing_canonical"], states: ["fallback"]}},
};
