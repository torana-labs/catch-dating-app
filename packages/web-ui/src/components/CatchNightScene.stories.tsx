import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import {referenceScreenUrl} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchNightScene, type CatchNightSceneJourney, type CatchNightSceneProps} from "./CatchNightScene";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";

// Unframed stand-in screens from the approved website board captures; pages use app captures.
const screen = (alt: string) => <img alt={alt} src={referenceScreenUrl("organizer/guest/390")} />;

const journeys: CatchNightSceneJourney[] = [
  {accent: "coral", event: "Sunday Social Run", where: "Carter Road Runners · Carter Road, Bandra",
    lead: "People are moving, so phones stay in pockets. Catch does its work before the start and after the finish.",
    moments: [
      {time: "Thursday", badge: "Grouped by pace", title: "Pace groups, set before Sunday", body: "Every booking brings a pace. Catch builds groups of six to eight at a similar pace.", screen: screen("Pace groups")},
      {time: "6:20 AM", badge: "Phones away while running", title: "Check in, then pocket the phone", body: "Runners tap in at the fountain and see their group and its lead once.", screen: screen("Check-in")},
      {time: "7:15 AM", badge: "Counts who’s back", title: "Nobody left on the road", body: "Group leads mark runners back at the finish.", screen: screen("The finish")},
    ]},
  {accent: "mint", event: "Pickleball Social", where: "Dink and Drink · Andheri West",
    lead: "Forty players, three courts. Phones come out between games.",
    moments: [
      {time: "Friday", badge: "Doubles on three courts", title: "Levels in, courts balanced", body: "Each booking brings a skill level.", screen: screen("Courts")},
      {time: "5:00 PM", badge: "Phones out between games", title: "A new partner every round", body: "Between games, phones buzz with the next court and partner.", screen: screen("Next court")},
    ]},
];

const formats: CatchNightSceneProps["formats"] = [{format: "run", title: "Run clubs"}, {format: "courts", title: "Pickleball"}];

function Scene() {
  const [selected, setSelected] = useState(0);
  const journey = journeys[selected];
  return (
    <CatchNightScene formats={formats} journey={journey} label={`${journey.event}, moment by moment`} onSelect={setSelected}
      pickerLabel="Event type" pickerLead="Show me a" position={(index, total) => `${index} of ${total}`} selected={selected}
      timelineLabel="Moments in the evening" />
  );
}

const meta = {
  title: "Web UI/CatchNightScene",
  component: CatchNightScene,
  args: {formats, journey: journeys[0], label: "", pickerLabel: "", position: () => "", selected: 0, timelineLabel: ""},
} satisfies Meta<typeof CatchNightScene>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["host"];

/** On the ink band: the pinned scene at the first moment; scroll the story frame to move through the evening. */
export const Contract: Story = {
  parameters: {catchComponent: {id: "shared_night_scene", routeIds: storyRoutes, states: ["first-moment", "badge", "format-picker"]}},
  render: () => (
    <StoryPage>
      <CatchSurface aria-label="On the night" block="band" color="ink">
        <CatchText as="h2" variant="display-xl">Run the whole night from one screen.</CatchText>
        <Scene />
      </CatchSurface>
    </StoryPage>
  ),
};

/** The phone-width arrangement: chips, phone, progress and caption in one viewport. */
export const Compact: Story = {
  parameters: {catchComponent: {id: "shared_night_scene", routeIds: storyRoutes, states: ["compact"]}},
  render: () => (
    <div style={{width: 390}}>
      <StoryPage>
        <CatchSurface aria-label="On the night" block="band" color="ink"><Scene /></CatchSurface>
      </StoryPage>
    </div>
  ),
};
