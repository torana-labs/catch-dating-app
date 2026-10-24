import type {Meta, StoryObj} from "@storybook/react-vite";
import {catchActivityKinds} from "./activityArtwork";
import {CatchText} from "./CatchText";
import {EventBackdropImage} from "./EventBackdropImage";

const meta = {
  title: "Web UI/Event backdrop image",
  component: EventBackdropImage,
  args: {activityKind: "socialRun"},
  decorators: [Story => <div style={{inlineSize: 360, blockSize: 240}}><Story /></div>],
} satisfies Meta<typeof EventBackdropImage>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry entry (design/website/components.json).
export const AllActivities: Story = {
  parameters: {catchComponent: {id: "shared_event_backdrop_image", routeIds: ["home", "visitor_discovery", "event_detail_canonical"], states: ["activity-pigment", "full-artwork"]}},
  decorators: [() => (
    <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, inlineSize: 720}}>
      {catchActivityKinds.map((kind) => (
        <figure key={kind} style={{margin: 0}}>
          <div style={{blockSize: 112}}><EventBackdropImage activityKind={kind} /></div>
          <CatchText as="figcaption" variant="supporting">{kind}</CatchText>
        </figure>
      ))}
    </div>
  )],
};

export const Dense: Story = {
  parameters: {catchComponent: {id: "shared_event_backdrop_image", routeIds: ["home", "visitor_discovery", "event_detail_canonical"], states: ["dense"]}},
  args: {activityKind: "dinner", dense: true},
};
