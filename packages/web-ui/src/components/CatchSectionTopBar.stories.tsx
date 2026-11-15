import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchButton} from "./CatchButton";
import {CatchSectionTopBar} from "./CatchSectionTopBar";

const sections = [
  {id: "night", label: "On the night"},
  {id: "ways", label: "Ways to use Catch"},
  {id: "pricing", label: "Pricing"},
  {id: "faq", label: "Questions"},
];
const noop = () => undefined;
// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["host", "weddings"];

const meta = {
  title: "Web UI/CatchSectionTopBar",
  component: CatchSectionTopBar,
  args: {label: "On this page", sections, action: <CatchButton href="#start" label="Start free trial" onPressed={noop} size="sm" />},
} satisfies Meta<typeof CatchSectionTopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const frame = (theme?: "dark") => (args: Story["args"]) => (
  <div data-catch-theme={theme}>
    <div style={{height: 64}}>Site top bar</div>
    <CatchSectionTopBar {...(args as Parameters<typeof CatchSectionTopBar>[0])} />
    {sections.map((section) => <section id={section.id} key={section.id} style={{minHeight: 480}}>{section.label}</section>)}
  </div>
);

/**
 * Scroll the frame: the bar is hidden while the page's top sits under the
 * window's top, slides in once it has scrolled away, and underlines the
 * section in view.
 */
export const Contract: Story = {
  parameters: {catchComponent: {id: "shared_section_top_bar", routeIds: storyRoutes, states: ["hidden-until-scrolled", "shown", "current-section"]}},
  render: frame(),
};

/** The same, in the night theme. */
export const Night: Story = {
  parameters: {catchComponent: {id: "shared_section_top_bar", routeIds: storyRoutes, states: ["night"]}},
  render: frame("dark"),
};
