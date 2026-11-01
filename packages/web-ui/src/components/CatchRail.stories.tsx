import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchBadge} from "./CatchBadge";
import {CatchRail} from "./CatchRail";
import {CatchText} from "./CatchText";
import {CatchViewport} from "./CatchViewport";

const meta = {
  title: "Web UI/CatchRail",
  component: CatchRail,
  args: {children: null, label: "Rail"},
} satisfies Meta<typeof CatchRail>;

export default meta;
type Story = StoryObj<typeof meta>;

const cards = ["Sunday Long Run", "Trivia at Lantern Lane", "Padel Social", "Rooftop Supper", "Bandra Walk"];

/** catch.rail on the web: a scrolling rail of cards with a faded edge, a wrapped grid on a desktop, and fitted chips. */
export const Contract: Story = {
  render: () => (
    <div style={{display: "grid", gap: 24}}>
      <div style={{width: 390}}>
        <CatchViewport fill="parent" sizeClass="compact">
          <CatchRail itemWidth={200} label="More from Afterfly, phone">
            {cards.map((title) => (
              <div key={title} style={{background: "var(--catch-theme-bg)", borderRadius: "var(--catch-radius-md)", height: 120, padding: 16}}>
                <CatchText as="span" variant="bodyM">{title}</CatchText>
              </div>
            ))}
          </CatchRail>
        </CatchViewport>
      </div>
      <CatchViewport fill="parent" sizeClass="expanded">
        <CatchRail itemWidth={200} label="More from Afterfly, desktop">
          {cards.map((title) => <CatchText as="span" key={title} variant="bodyM">{title}</CatchText>)}
        </CatchRail>
      </CatchViewport>
      <CatchRail itemWidth="auto" label="Event formats" wrap="never">
        {["Runs", "Dinners", "Games", "Courts", "Nights out"].map((label) => <CatchBadge key={label} label={label} />)}
      </CatchRail>
    </div>
  ),
};
