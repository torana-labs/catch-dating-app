import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState, type ReactNode} from "react";
import {expect, userEvent, within} from "storybook/test";
import {catchFormats, catchSurfaceBlocks, type CatchSurfaceColor} from "./catchCoreVocabulary";
import {useGround} from "./catchRootContext";
import {CatchRoot} from "./CatchRoot";
import {CatchStack} from "./CatchStack";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchSurface",
  component: CatchSurface,
  args: {children: null},
} satisfies Meta<typeof CatchSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Names the ground the content sits on, so each state shows what its block tells its children. */
function Ground({title}: {title: string}) {
  const ground = useGround();
  return (
    <CatchStack gap={2}>
      <CatchText variant="title-row">{title}</CatchText>
      <CatchText variant="body-meta">{`On ${ground}`}</CatchText>
    </CatchStack>
  );
}

function State({label, children}: {label: string; children: ReactNode}) {
  return (
    <CatchStack gap={8}>
      <CatchText tone="secondary" variant="label-kicker">{label}</CatchText>
      {children}
    </CatchStack>
  );
}

const bandColours: Array<CatchSurfaceColor | undefined> = [undefined, "tile", "ink", ...catchFormats];

function PressableSurface() {
  const [count, setCount] = useState(0);
  return (
    <CatchStack gap={8}>
      <CatchSurface onPress={() => setCount((value) => value + 1)}>
        <CatchText variant="title-row">Open the event</CatchText>
      </CatchSurface>
      <CatchSurface href="#surface">
        <CatchText variant="title-row">A tile that links</CatchText>
      </CatchSurface>
      <CatchText variant="body-small">{`Opened ${count} times`}</CatchText>
    </CatchStack>
  );
}

/**
 * catch.surface on the web: the five blocks, a tile in a tile, a tile in a
 * spotlight of each format, floating on night, a band in each colour, and a
 * pressable block.
 */
export const Contract: Story = {
  render: () => (
    <CatchRoot size="expanded">
      <CatchStack gap={32}>
        <CatchSurface block="plain" padding="lg">
          <CatchStack gap={24}>
            <State label="five-blocks">
              <CatchStack direction="row" equal gap={16}>
                {catchSurfaceBlocks.filter((block) => block !== "band").map((block) => (
                  <CatchSurface block={block} key={block}><Ground title={block} /></CatchSurface>
                ))}
              </CatchStack>
            </State>
            <State label="tile-in-tile">
              <CatchSurface><Ground title="Tile" /><CatchSurface><Ground title="Nested tile" /></CatchSurface></CatchSurface>
            </State>
            <State label="tile-in-spotlight">
              <CatchStack direction="row" equal gap={12} wrap>
                {catchFormats.map((format) => (
                  <CatchSurface block="spotlight" color={format} key={format}>
                    <Ground title={format} />
                    <CatchSurface><CatchText variant="body-small">A tile on the colour</CatchText></CatchSurface>
                  </CatchSurface>
                ))}
                <CatchSurface block="spotlight" color="ink">
                  <Ground title="ink" />
                  <CatchSurface><CatchText variant="body-small">A tile on ink</CatchText></CatchSurface>
                </CatchSurface>
              </CatchStack>
            </State>
            <State label="floating-on-night">
              <CatchRoot size="expanded" theme="night">
                <CatchSurface block="plain" padding="lg">
                  <CatchSurface block="floating"><Ground title="Floating on night" /></CatchSurface>
                </CatchSurface>
              </CatchRoot>
            </State>
            <State label="pressable"><PressableSurface /></State>
          </CatchStack>
        </CatchSurface>
        <State label="band-colours">
          <CatchStack gap={0}>
            {bandColours.map((color) => (
              <CatchSurface block="band" color={color} key={color ?? "ground"}>
                <Ground title={`Band ${color ?? "ground"}`} />
              </CatchSurface>
            ))}
          </CatchStack>
        </State>
      </CatchStack>
    </CatchRoot>
  ),
};

/** onPress makes the whole block one button; Enter and Space press it. */
export const Pressable: Story = {
  render: () => <CatchRoot><CatchSurface block="plain" padding="lg"><PressableSurface /></CatchSurface></CatchRoot>,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const control = canvas.getByRole("button", {name: /Open the event/u});
    await userEvent.click(control);
    await expect(canvas.getByText("Opened 1 times")).toBeVisible();
    control.focus();
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByText("Opened 2 times")).toBeVisible();
  },
};

/** aspect holds a fixed shape with the content at the bottom. */
export const Aspect: Story = {
  render: () => (
    <CatchRoot>
      <CatchSurface block="plain" padding="lg">
        <CatchStack direction="row" equal gap={12}>
          <CatchSurface aspect={1} block="spotlight" color="dinner"><CatchText variant="title-row">Square</CatchText></CatchSurface>
          <CatchSurface aspect={4 / 3}><CatchText variant="title-row">Four by three</CatchText></CatchSurface>
        </CatchStack>
      </CatchSurface>
    </CatchRoot>
  ),
};
