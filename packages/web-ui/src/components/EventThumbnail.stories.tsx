import type {Meta, StoryObj} from "@storybook/react-vite";
import {EventThumbnail} from "./EventThumbnail";

// A drawn stand-in for an uploaded poster, so the story needs no network.
const poster = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420" viewBox="0 0 600 420">'
  + '<rect width="600" height="420" fill="#16140f"/>'
  + '<rect x="40" y="40" width="300" height="56" fill="#f4f4f1"/>'
  + '<rect x="40" y="120" width="200" height="24" fill="#9c958a"/>'
  + '<circle cx="470" cy="290" r="90" fill="#c44d6a"/>'
  + "</svg>",
)}`;

const meta = {
  title: "Web UI/Event thumbnail",
  component: EventThumbnail,
  args: {activityKind: "dinner"},
  decorators: [Story => <div style={{inlineSize: 360, aspectRatio: 1.18}}><Story /></div>],
} satisfies Meta<typeof EventThumbnail>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry entry (design/website/components.json).
export const Photo: Story = {
  parameters: {catchComponent: {id: "shared_event_thumbnail", routeIds: ["home", "visitor_discovery", "event_detail_canonical"], states: ["photo"]}},
  args: {photoUrl: poster, semanticLabel: "Supper club poster"},
};

export const ActivityFallback: Story = {
  parameters: {catchComponent: {id: "shared_event_thumbnail", routeIds: ["home", "visitor_discovery", "event_detail_canonical"], states: ["activity-fallback"]}},
};
