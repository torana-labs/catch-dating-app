import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect, userEvent, within} from "storybook/test";
import {CatchNavMenu, type CatchNavMenuLink} from "./CatchNavMenu";
import {CatchRoot} from "./CatchRoot";
import {CatchStack} from "./CatchStack";
import {CatchSurface} from "./CatchSurface";

const links: CatchNavMenuLink[] = [
  {href: "#first", label: "First page", sublabel: "A sample line about this page"},
  {href: "#second", label: "Second page", sublabel: "Another sample line"},
  {href: "#third", label: "Third page"},
];

const meta = {
  title: "Web UI/CatchNavMenu",
  component: CatchNavMenu,
  args: {label: "Sample group", links},
} satisfies Meta<typeof CatchNavMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Every state on an expanded page: closed menus beside each other as in a
 * header, one marked as the current section with its current page, a panel
 * lined up with the trigger's end, and the same on the ink band. The play
 * opens the first menu, closes it with Escape and checks focus returns to its
 * button. Below 600px the menu renders nothing.
 */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      {(["ground", "ink"] as const).map((color) => (
        <CatchSurface aria-label={color === "ink" ? "On the ink band" : "On the ground"} block="band" color={color === "ink" ? "ink" : undefined} key={color}>
          <CatchStack direction="row" gap={16} justify="between">
            <CatchStack direction="row" gap={8}>
              <CatchNavMenu label={color === "ink" ? "Sample group on ink" : "Sample group"} links={links} />
              <CatchNavMenu
                current
                label={color === "ink" ? "Current section on ink" : "Current section"}
                links={[links[0], {...links[1], current: true}, links[2]]}
              />
            </CatchStack>
            <CatchNavMenu align="end" label={color === "ink" ? "End aligned on ink" : "End aligned"} links={links} />
          </CatchStack>
        </CatchSurface>
      ))}
    </CatchRoot>
  ),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", {name: "Sample group"});
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{Escape}");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toHaveFocus();
  },
};

/**
 * A sectioned panel (the playbook's "For hosts" menu): titled columns side
 * by side, each list named by its title. The play opens it from the
 * keyboard, walks from the first column into the second, and closes it with
 * Escape, focus back on its button.
 */
export const Sections: Story = {
  render: () => (
    <CatchRoot size="expanded" theme="day">
      <CatchSurface aria-label="Sectioned menu" block="band">
        <CatchNavMenu
          appearance="link"
          label="Sectioned group"
          sections={[
            {title: "First column", links: [{href: "#a", label: "Page A"}, {href: "#b", label: "Page B"}, {href: "#c", label: "Page C"}]},
            {title: "Second column", links: [{href: "#d", label: "Page D"}, {href: "#e", label: "Page E"}]},
            {title: "Third column", links: [{href: "#f", label: "Page F"}]},
          ]}
        />
      </CatchSurface>
    </CatchRoot>
  ),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", {name: "Sectioned group"});
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByRole("link", {name: "Page A"})).toHaveFocus();
    await userEvent.keyboard("{End}");
    await expect(canvas.getByRole("link", {name: "Page F"})).toHaveFocus();
    await expect(canvas.getByRole("list", {name: "Second column"})).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect(trigger).toHaveFocus();
  },
};
