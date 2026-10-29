import type {Meta, StoryObj} from "@storybook/react-vite";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchEventPoster} from "./CatchEventPoster";
import {CatchGrid} from "./CatchGrid";
import {grounds} from "./palette";

const meta = {
  title: "Web UI/CatchEventPoster",
  component: CatchEventPoster,
  args: {date: "Sun 22 Nov", kicker: "Salt Air Run Club", place: "Seaface Steps, Bandra West", title: "15K training run"},
} satisfies Meta<typeof CatchEventPoster>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["event_detail_canonical"];

/** Every ground, with a short and a long title. */
export const Grounds: Story = {
  parameters: {catchComponent: {id: "shared_event_poster", routeIds: storyRoutes, states: ["grounds", "long-title", "phone-size"]}},
  render: (args) => (
    <StoryPage>
      <CatchBand aria-label="Grounds" pb="compact" pt="compact">
        <CatchGrid columns={2} compactColumns={1}>
          {grounds.map((ground, index) => (
            <CatchEventPoster {...args} ground={ground} key={ground}
              title={index % 3 === 2 ? "Half-marathon training: a long, steady Sunday 15K by the sea" : args.title} />
          ))}
        </CatchGrid>
      </CatchBand>
    </StoryPage>
  ),
};

/** The event page's media without a photo. */
export const Reference: Story = {
  parameters: {catchComponent: {id: "shared_event_poster", routeIds: storyRoutes, states: ["board-reference"]}},
  render: (args) => (
    <ReferenceComparison
      desktop={{capture: "event/catch_bare/1280", height: 410, width: 654, x: 99, y: 237}}
      label="Event poster"
      phone={{capture: "event/luma_import/390", height: 270, width: 360, x: 15, y: 212}}
      render={(width) => width === 390 ?
        <CatchEventPoster date="Sat 15 Nov" ground="indigo" kicker="Carter Road Runners" place="Worli Sea Face, Mumbai" title="Run & Rave" /> :
        <CatchEventPoster {...args} kicker="Carter Road Runners" place="Carter Road jetty, Bandra West" date="Sun 23 Nov" />}
    />
  ),
};
