import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect} from "storybook/test";
import {CatchBadge, type CatchBadgeTone} from "./CatchBadge";
import {CatchGap} from "./CatchGap";
import {CatchPageBody} from "./CatchPageBody";

const meta = {
  title: "Web UI/CatchBadge",
  component: CatchBadge,
  args: {label: "Badge"},
} satisfies Meta<typeof CatchBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

const tones: CatchBadgeTone[] = ["neutral", "brand", "success", "warning", "danger", "gold", "affinity"];

function CheckGlyph() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M5 12.5 10 17 19 7" />
    </svg>
  );
}

function Badges() {
  return (
    <CatchGap size="formField">
      <CatchGap size="inline" direction="horizontal" wrap>
        {tones.map((tone) => <CatchBadge key={tone} tone={tone} label={tone} />)}
      </CatchGap>
      <CatchGap size="inline" direction="horizontal" wrap>
        {tones.map((tone) => <CatchBadge key={tone} recipe="functional" tone={tone} label={tone} />)}
      </CatchGap>
      <CatchGap size="inline" direction="horizontal" wrap>
        {tones.map((tone) => <CatchBadge key={tone} recipe="status" tone={tone} label={`${tone} status`} />)}
      </CatchGap>
      <CatchGap size="inline" direction="horizontal" wrap>
        <CatchBadge size="md" label="Medium" icon={<CheckGlyph />} />
        <CatchBadge size="action" label="Action" />
        <CatchBadge recipe="solid" label="Solid" />
        <CatchBadge recipe="solidStatus" label="Solid status" />
        <CatchBadge recipe="live" label="Live" />
        <CatchBadge recipe="privacy" label="Private" icon={<CheckGlyph />} />
      </CatchGap>
      <CatchGap size="inline" direction="horizontal" wrap>
        <CatchBadge recipe="ticketStatus" color="rgb(214 92 52)" label="Going" />
        <CatchBadge recipe="ticketStatus" emphasis="strong" label="Sold out" />
        <CatchBadge recipe="optional" label="Optional" />
        <CatchBadge recipe="optional" hasError label="Optional" />
      </CatchGap>
      <div style={{background: "#16140f", padding: 12, borderRadius: 8}}>
        <CatchGap size="inline" direction="horizontal" wrap>
          <CatchBadge recipe="onDark" label="On dark" />
          <CatchBadge recipe="onDarkStatus" label="On dark status" />
        </CatchGap>
      </div>
    </CatchGap>
  );
}

/**
 * catch.badge on the web: every recipe and tone, in both themes.
 * Small labels meet AA on the real composited badge backgrounds (CAT-271).
 */
export const Contract: Story = {
  play: checkContrast,
  parameters: {
    a11y: {test: "error"},
  },
  render: () => (
    <>
      <CatchPageBody constrainToContentWidth>
        <Badges />
      </CatchPageBody>
      <div data-catch-theme="dark" style={{background: "var(--catch-theme-bg)"}}>
        <CatchPageBody constrainToContentWidth>
          <Badges />
        </CatchPageBody>
      </div>
    </>
  ),
};

// Canvas resolves browser colour syntax, including color-mix and translucent
// pigments. Composite every ancestor: a transparent privacy badge must be
// checked against its actual themed ground, never an assumed white surface.
async function checkContrast({canvasElement}: {canvasElement: HTMLElement}) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d")!;
  const rgba = (value: string) => {
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data].map((n) => n / 255);
  };
  const over = (foreground: number[], background: number[]) =>
    foreground.slice(0, 3).map((c, i) => c * foreground[3] + background[i] * (1 - foreground[3]));
  const luminance = (rgb: number[]) => rgb.map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const badges = canvasElement.querySelectorAll<HTMLElement>("[data-recipe]");
  await expect(badges.length).toBeGreaterThan(50);
  for (const badge of badges) {
    const ancestors: HTMLElement[] = [];
    for (let node: HTMLElement | null = badge; node; node = node.parentElement) ancestors.unshift(node);
    const background = ancestors.reduce((back, node) => over(rgba(getComputedStyle(node).backgroundColor), back), [1, 1, 1]);
    const foreground = over(rgba(getComputedStyle(badge).color), background);
    const [lo, hi] = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
    await expect((hi + 0.05) / (lo + 0.05), `${badge.dataset.recipe}/${badge.dataset.tone}: ${badge.textContent}`).toBeGreaterThanOrEqual(4.5);
  }
}

const activityPigments = ["social-run", "running", "walking", "pickleball", "padel", "tennis", "badminton", "cycling", "spin-class", "yoga", "strength-training", "dinner", "pub-quiz", "bar-crawl", "singles-mixer", "open-activity"];
const edgePigments = ["#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff", "#d65c3480", "transparent"];

/** Every affected recipe on paper, surface, raised and page grounds. */
export const ContrastMatrix: Story = {
  parameters: {a11y: {test: "error"}},
  play: checkContrast,
  render: () => <>
    {(["light", "dark"] as const).map((theme) =>
      (theme === "light" ? ["bg", "surface", "raised", "paper"] : ["bg", "surface", "raised"]).map((ground) =>
        <div key={`${theme}-${ground}`} data-catch-theme={theme} style={{background: ground === "paper" ? "var(--catch-palette-paper)" : `var(--catch-theme-${ground})`}}>
          <CatchPageBody constrainToContentWidth>
            <Badges />
            <CatchGap size="inline" direction="horizontal" wrap>
              {[...activityPigments.map((name) => `var(--catch-activity-${name}-accent)`), ...edgePigments].map((pigment, index) =>
                <CatchBadge key={pigment} recipe="ticketStatus" color={pigment} label={`Pigment ${index + 1}`} />)}
            </CatchGap>
          </CatchPageBody>
        </div>))}
  </>,
};
