import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import {expect, userEvent, within} from "storybook/test";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryHeading, StoryPage, StoryPhone} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchGap} from "./CatchGap";
import {CatchScrollStory, type CatchScrollStoryChapter} from "./CatchScrollStory";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchScrollStory",
  component: CatchScrollStory,
  args: {chapters: [], label: "On the night", nextLabel: "Next moment", previousLabel: "Previous moment"},
} satisfies Meta<typeof CatchScrollStory>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["home", "host"];

const night = [
  {
    body: "Every booking brings a distance and a pace, so you know who is chasing a 5K time and who is coming to chat.",
    marker: "Saturday",
    screen: "/assets/app-screenshots/host-today-dashboard.png",
    title: "Know your runners",
  },
  {
    body: "Tap runners in as they arrive. Late arrivals get a message with the route.",
    marker: "6:20 AM",
    screen: "/assets/app-screenshots/host-live-console.png",
    title: "Check in at the fountain",
  },
  {
    body: "Pace groups set off together, and every newcomer has someone to run beside.",
    marker: "6:30 AM",
    screen: "/assets/app-screenshots/host-event-setup.png",
    title: "Split into pace groups",
  },
  {
    body: "The report lands with arrivals, first-timers and who came back.",
    marker: "8:30 AM",
    screen: "/assets/app-screenshots/host-post-event-report.png",
    title: "See how it went",
  },
  {
    body: "Everyone who came gets next week's run first.",
    marker: "Monday",
    screen: "/assets/app-screenshots/guest-join-phone.png",
    title: "Invite them back",
  },
];

const chapters: CatchScrollStoryChapter[] = night.map((moment, index) => ({
  content: (
    <CatchGap size="related">
      <CatchText as="span" variant="supportingStrong">{`${String(index + 1).padStart(2, "0")} · ${moment.marker}`}</CatchText>
      <CatchText as="h3" variant="displayL">{moment.title}</CatchText>
      <CatchText as="p" color="ink2" variant="bodyL">{moment.body}</CatchText>
    </CatchGap>
  ),
  id: moment.title,
  marker: moment.marker,
  media: <StoryPhone alt={`Host app: ${moment.title}`} src={moment.screen} />,
  title: moment.title,
}));

const story = (props: {accent?: "yellow" | "mint"; mediaSide?: "start" | "end"}) => (
  <CatchScrollStory
    {...props}
    chapters={chapters}
    label="A Sunday run, from the first booking to next week"
    nextLabel="Next moment"
    previousLabel="Previous moment"
  />
);

/** On the ink ground, as the host page has it. */
export const OnInk: Story = {
  parameters: {catchComponent: {id: "shared_scroll_story", routeIds: storyRoutes, states: ["ink-ground", "media-end"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="On the night" ground="ink" pt="spacious">
        <CatchGap size="majorSection">
          <StoryHeading eyebrow="On the night" lead="Follow one Sunday run, from the first booking to next week's invitation." title="Run the whole night from one screen." />
          {story({accent: "yellow"})}
        </CatchGap>
      </CatchBand>
    </StoryPage>
  ),
};

/** On a light ground the accent takes its deep shade; the media can lead. */
export const OnPaperMediaStart: Story = {
  parameters: {catchComponent: {id: "shared_scroll_story", routeIds: storyRoutes, states: ["light-ground", "media-start"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="How a night works" ground="paper">
        {story({accent: "mint", mediaSide: "start"})}
      </CatchBand>
    </StoryPage>
  ),
};

function Controlled() {
  const [active, setActive] = useState(0);
  return (
    <StoryPage>
      <CatchBand aria-label="Controlled" ground="ink">
        <CatchGap size="section">
          <CatchText as="p" variant="bodyM">{`Active chapter: ${active + 1}`}</CatchText>
          <CatchScrollStory
            activeIndex={active}
            chapters={chapters}
            label="Controlled story"
            nextLabel="Next moment"
            onActiveIndexChange={setActive}
            previousLabel="Previous moment"
          />
        </CatchGap>
      </CatchBand>
    </StoryPage>
  );
}

/**
 * The arrows step through chapters and report the change. The chapter in the
 * viewport's middle starts active, so the step is checked relative to it.
 */
export const Arrows: Story = {
  parameters: {catchComponent: {id: "shared_scroll_story", routeIds: storyRoutes, states: ["arrows", "controlled"]}},
  render: () => <Controlled />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const activeChapter = () => Number(canvas.getByText(/^Active chapter: \d+$/).textContent?.match(/\d+/)?.[0]);
    const start = activeChapter();
    const forward = start < chapters.length;
    await userEvent.click(canvas.getByRole("button", {name: forward ? "Next moment" : "Previous moment"}));
    await expect(activeChapter()).toBe(forward ? start + 1 : start - 1);
    await expect(canvas.getByRole("button", {name: forward ? "Previous moment" : "Next moment"})).toBeEnabled();
  },
};

/** The host page's "On the night" journey. */
export const Reference: Story = {
  parameters: {catchComponent: {id: "shared_scroll_story", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "host_landing/default/1280", height: 900, y: 2030}}
      label="Scroll story"
      phone={{capture: "host_landing/default/390", height: 1050, y: 2230}}
      render={() => <CatchBand aria-label="On the night" ground="ink" pt="none">{story({accent: "yellow"})}</CatchBand>}
    />
  ),
};
