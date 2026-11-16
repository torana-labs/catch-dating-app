import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect, within} from "storybook/test";
import {PageFrame} from "../stories/referenceScreens";
import {CatchBreadcrumbRow} from "./CatchBreadcrumbRow";
import {CatchGroundCard} from "./CatchGroundCard";
import {CatchRoot} from "./CatchRoot";
import {CatchSurface} from "./CatchSurface";

const links = [
  {href: "#section", label: "Section"},
  {href: "#topic", label: "Topic"},
];

const meta = {
  title: "Web UI/CatchBreadcrumbRow",
  component: CatchBreadcrumbRow,
  args: {current: "Sample page", label: "Breadcrumb", links},
} satisfies Meta<typeof CatchBreadcrumbRow>;

export default meta;
type Story = StoryObj<typeof meta>;

const longLinks = [
  {href: "#section", label: "A longer section name"},
  {href: "#topic", label: "A longer topic name"},
  {href: "#subtopic", label: "A subtopic"},
];

/**
 * Every state: a trail of two pages and the current one, the current page
 * alone, on the ink band (which the row reads), on Website v2 grounds given
 * by prop, and a long trail wrapping on a 390px page.
 */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchSurface aria-label="Trail" block="band">
        <CatchBreadcrumbRow current="Sample page" label="Breadcrumb" links={links} />
      </CatchSurface>
      <CatchSurface aria-label="Current page alone" block="band">
        <CatchBreadcrumbRow current="Sample page" label="Breadcrumb, current page alone" links={[]} />
      </CatchSurface>
      <CatchSurface aria-label="On the ink band" block="band" color="ink">
        <CatchBreadcrumbRow current="Sample page" label="Breadcrumb, on ink" links={links} />
      </CatchSurface>
      <CatchSurface aria-label="On grounds given by prop" block="band">
        <CatchGroundCard ground="mint" padding="spacious">
          <CatchBreadcrumbRow current="Sample page" ground="mint" label="Breadcrumb, on mint" links={links} />
        </CatchGroundCard>
        <CatchGroundCard ground="ink" padding="spacious">
          <CatchBreadcrumbRow current="Sample page" ground="ink" label="Breadcrumb, on the ink ground" links={links} />
        </CatchGroundCard>
      </CatchSurface>
      <section aria-label="390px page">
        <PageFrame width={390}>
          <CatchSurface block="band">
            <CatchBreadcrumbRow current="A sample page with a long name" label="Breadcrumb, phone" links={longLinks} />
          </CatchSurface>
        </PageFrame>
      </section>
    </CatchRoot>
  ),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const nav = canvas.getByRole("navigation", {name: "Breadcrumb"});
    await expect(within(nav).getByText("Sample page")).toHaveAttribute("aria-current", "page");
  },
};
