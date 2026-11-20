import {CatchAccountButton, CatchButton, CatchSiteDock} from "@catch/web-ui";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect} from "storybook/test";
import {PublicSiteHeader, SiteAccountActionProvider} from "../shared/site";

/**
 * The site header on the narrowest phones, crowded on purpose: the longest
 * city name in the picker, a page action that folds into the phone dock, and
 * a signed-in reader. Each play checks that no two controls overlap and that
 * every control stays inside the row, so a header that no longer fits fails
 * here instead of drawing a picker over the wordmark (issue: logo overlap on
 * the homepage, 20 Nov 2026).
 */
const viewports = {
  phone320: {name: "Phone 320", styles: {width: "320px", height: "640px"}, type: "mobile"},
  phone375: {name: "Phone 375", styles: {width: "375px", height: "740px"}, type: "mobile"},
} as const;

const meta = {
  title: "Marketing Website/Shared/Phone header",
  component: PublicSiteHeader,
  parameters: {layout: "fullscreen", viewport: {options: viewports}},
  globals: {viewport: {value: "phone320", isRotated: false}},
} satisfies Meta<typeof PublicSiteHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;
const signedIn = {
  bar: <CatchAccountButton label="Account, Sample Reader" name="Sample Reader" onPressed={noop} />,
  menu: {label: "Account", href: "/account/"},
  phoneMenu: () => <CatchAccountButton label="Menu, signed in as Sample Reader" name="Sample Reader" onPressed={noop} popup="dialog" />,
};

/** The header's visible controls and the wordmark: none overlaps another, and each stays inside the header. */
async function expectRoomForEveryControl(canvasElement: HTMLElement) {
  const header = canvasElement.querySelector("header")!;
  const bounds = header.getBoundingClientRect();
  const controls = [...header.querySelectorAll<HTMLElement>("a, button")]
    .map((node) => ({node, box: node.getBoundingClientRect()}))
    .filter(({node, box}) => box.width > 0 && box.height > 0 && getComputedStyle(node).visibility !== "hidden")
    // A control inside another (the wordmark's text in its link) is one control.
    .filter(({node}, _, all) => !all.some((other) => other.node !== node && other.node.contains(node)));
  await expect(controls.length).toBeGreaterThanOrEqual(3);
  for (const {node, box} of controls) {
    await expect(box.left, `${node.textContent} starts inside the header`).toBeGreaterThanOrEqual(bounds.left - 0.5);
    await expect(box.right, `${node.textContent} ends inside the header`).toBeLessThanOrEqual(bounds.right + 0.5);
  }
  for (const [index, a] of controls.entries()) {
    for (const b of controls.slice(index + 1)) {
      const overlap = Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left);
      await expect(overlap, `${a.node.textContent} and ${b.node.textContent} do not overlap`).toBeLessThanOrEqual(0.5);
    }
  }
}

const crowded = (
  <PublicSiteHeader
    actions={<CatchButton label="Delhi NCR" onPressed={noop} size="sm" trailingIcon="expand" variant="secondary" />}
    wideActions={<CatchButton href="#app" label="Get notified" size="sm" />}
  />
);

/** Signed out at 320px: the wordmark, the city and the menu, with Get notified left to the dock. */
export const SignedOut320: Story = {
  render: () => <>{crowded}<CatchSiteDock label="Quick actions" primary={{label: "Get notified", href: "#app"}} /></>,
  play: async ({canvasElement}) => expectRoomForEveryControl(canvasElement),
};

/** Signed in at 320px: the avatar is the menu, the size of the signed-out menu button. */
export const SignedIn320: Story = {
  render: () => <SiteAccountActionProvider value={signedIn}>{crowded}</SiteAccountActionProvider>,
  play: async ({canvasElement}) => expectRoomForEveryControl(canvasElement),
};

/** Signed in at 375px, the width the overlap was reported at. */
export const SignedIn375: Story = {
  globals: {viewport: {value: "phone375", isRotated: false}},
  render: () => <SiteAccountActionProvider value={signedIn}>{crowded}</SiteAccountActionProvider>,
  play: async ({canvasElement}) => expectRoomForEveryControl(canvasElement),
};
