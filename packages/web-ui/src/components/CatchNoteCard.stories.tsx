import type {Meta, StoryObj} from "@storybook/react-vite";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchNoteCard} from "./CatchNoteCard";
import {CatchRoot} from "./CatchRoot";
import {CatchStack} from "./CatchStack";
import {CatchSurface} from "./CatchSurface";

// A drawn photo, so the story fetches nothing; pages pass the note's own photo.
const photo = `data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'><rect width='4' height='3' fill='#d9c8a8'/><circle cx='2' cy='1.6' r='0.9' fill='#a1673c'/></svg>")}`;

const meta = {
  title: "Web UI/CatchNoteCard",
  component: CatchNoteCard,
  parameters: {layout: "fullscreen"},
  args: {when: "Yesterday", body: "From next week we’re on the first floor of Harbour Room. Same time, eight more tables, and a lift from the lane side."},
} satisfies Meta<typeof CatchNoteCard>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Proposal WebOrgNote: a pinned note, a note with its photo in a 2:1 crop and a link, and a plain note, as an organiser page lists them. */
export const Contract: Story = {
  parameters: {a11y: {test: "error"}},
  render: (args) => (
    <StoryPage>
      <CatchRoot size="expanded" theme="day">
        <CatchSurface block="plain" padding="lg">
          <CatchStack as="ul" gap={12}>
            <CatchNoteCard {...args} as="li" pinned />
            <CatchNoteCard action={{label: "Book Tuesday 3 Nov", href: "#tuesday"}} as="li"
              body="Quizzy Rascals won for the third week running. Can anyone stop them? Next Tuesday’s theme, picked by the winners: 90s Bollywood."
              photo={{src: photo, alt: "The winning team holding up their answer sheet"}} when="2 days ago" />
            <CatchNoteCard as="li" body="Supper club tickets go to followers first, on Friday at 6 PM. Everyone else on Saturday." when="5 days ago" />
          </CatchStack>
        </CatchSurface>
      </CatchRoot>
    </StoryPage>
  ),
};
