import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import {expect, userEvent, within} from "storybook/test";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchFormatMatrix, type CatchFormatMatrixProps} from "./CatchFormatMatrix";
import {CatchSurface} from "./CatchSurface";

const meta = {
  title: "Web UI/CatchFormatMatrix",
  component: CatchFormatMatrix,
  args: {formats: [], heading: "", properties: [], selected: 0, values: {}},
} satisfies Meta<typeof CatchFormatMatrix>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["host"];

const matrix: Omit<CatchFormatMatrixProps, "selected" | "onSelect"> = {
  heading: "How Catch reads each one",
  note: "Same app, five different nights. Pick one to follow it moment by moment.",
  formats: [
    {format: "run", title: "Run clubs"}, {format: "dinner", title: "Dinners"}, {format: "games", title: "Games and quizzes"},
    {format: "courts", title: "Pickleball"}, {format: "nightsOut", title: "Pub crawls"},
  ],
  properties: [
    {key: "Phones", label: "When phones come out"}, {key: "Groups", label: "How people are grouped"},
    {key: "Rhythm", label: "The rhythm of the night"}, {key: "Catch tracks", label: "What Catch keeps count of"}, {key: "Ends with", label: "How it ends"},
  ],
  values: {
    run: {"Phones": "Before and after only", "Groups": "Pace groups of 6 to 8", "Rhythm": "One route, start to finish", "Catch tracks": "Who’s back at the finish", "Ends with": "Next week’s run"},
    dinner: {"Phones": "Nearby, rarely needed", "Groups": "Tables of 6", "Rhythm": "Three courses", "Catch tracks": "Who sits where", "Ends with": "Who’d sit together again"},
    games: {"Phones": "Between rounds", "Groups": "Balanced teams of 5", "Rhythm": "Six rounds", "Catch tracks": "Scores, hidden till the end", "Ends with": "The reveal"},
    courts: {"Phones": "Between rounds", "Groups": "Doubles on 3 courts", "Rhythm": "15-minute rounds", "Catch tracks": "Court time and partners", "Ends with": "Standings"},
    nightsOut: {"Phones": "Between stops", "Groups": "Groups of 10, each with a lead", "Rhythm": "Four stops", "Catch tracks": "Who’s at each stop", "Ends with": "Everyone accounted for"},
  },
};

function Interactive() {
  const [selected, setSelected] = useState(0);
  return <CatchFormatMatrix {...matrix} onSelect={setSelected} selected={selected} />;
}

/** The table on a wide band and the chips with the selected format's properties on a phone-width band. */
export const Contract: Story = {
  parameters: {catchComponent: {id: "shared_format_matrix", routeIds: storyRoutes, states: ["table", "selected-column", "chips", "pick"]}},
  render: () => (
    <StoryPage>
      <CatchSurface aria-label="Wide band" block="band"><Interactive /></CatchSurface>
      <div style={{width: 390}}>
        <CatchSurface aria-label="Phone-width band" block="band"><CatchFormatMatrix {...matrix} selected={3} /></CatchSurface>
      </div>
    </StoryPage>
  ),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    // The table is hidden on a phone-width viewport, where the chips take over.
    const table = canvas.queryByRole("table");
    if (!table) return;
    await userEvent.click(within(table).getByRole("button", {name: "Dinners"}));
    await expect(within(table).getByRole("button", {name: "Dinners"})).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(within(table).getByRole("button", {name: "Run clubs"}));
  },
};
