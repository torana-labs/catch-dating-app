import type {Meta, StoryObj} from "@storybook/react-vite";
import type {CSSProperties} from "react";
import {CatchGap} from "./CatchGap";
import {CatchInset} from "./CatchInset";
import {CatchPageBody} from "./CatchPageBody";
import {CatchText} from "./CatchText";
import {
  contrastRatio,
  type Format,
  formatAccents,
  formatActivityKinds,
  formatVar,
  type Ground,
  groundTextColors,
  groundVar,
  grounds,
  nightSurfaceTextColors,
  type PaletteColor,
  paletteColors,
  paletteVar,
} from "./palette";

/**
 * Token specimen for the Website v2 palette (CAT-245). Every ratio is measured
 * on the generated CSS the page loads. Text is set only in pairs the ground is
 * meant to carry, which palette.test.ts holds to WCAG AA; every other colour
 * appears as a fill swatch, with its ratio printed in the ground's own ink.
 */
const meta = {
  title: "Web UI/Palette",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function tokenValue(name: string) {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function measure(text: string, ground: string) {
  const [foreground, background] = [tokenValue(text), tokenValue(ground)];
  if (!/^#[0-9A-F]{6}$/i.test(foreground) || !/^#[0-9A-F]{6}$/i.test(background)) return "unmeasured";
  const ratio = contrastRatio(foreground, background);
  const minimum = Number(tokenValue("--catch-accessibility-minimum-text-contrast"));
  const large = Number(tokenValue("--catch-accessibility-large-text-contrast"));
  const rating = ratio >= minimum ? "AA" : ratio >= large ? "AA large text" : "below AA";
  return `${ratio.toFixed(2)}:1 ${rating}`;
}

const title = (name: string) => name[0].toUpperCase() + name.slice(1).replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`);

const fillStyle = (fill: string, ink: string): CSSProperties => ({background: `var(${fill})`, color: `var(${ink})`});

// The edge is the ground's ink, so a colour that matches its ground stays visible.
const swatchStyle: CSSProperties = {
  borderRadius: "var(--catch-radius-xs)",
  flex: "none",
  height: "var(--catch-space-s6)",
  outline: "var(--catch-stroke-hairline) solid currentColor",
  width: "var(--catch-space-s6)",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gap: "var(--catch-space-s3) var(--catch-space-s5)",
  gridTemplateColumns: "repeat(auto-fill, minmax(14rem, 1fr))",
};

/** A palette colour as text, in a pair the ground is meant to carry. */
function TextSample({color, ground}: {color: PaletteColor; ground: string}) {
  return (
    <div style={{color: `var(${paletteVar(color)})`}}>
      <CatchText color="inherit" variant="bodyM">
        {`${color} · ${measure(paletteVar(color), ground)}`}
      </CatchText>
    </div>
  );
}

/** A palette colour as a fill on the ground; the label stays in the ground's ink. */
function Swatch({color, ground}: {color: PaletteColor; ground: string}) {
  return (
    <CatchGap crossAxisAlignment="center" direction="horizontal" size="inline">
      <span aria-hidden="true" style={{...swatchStyle, background: `var(${paletteVar(color)})`}} />
      <CatchText color="inherit" variant="supporting">
        {`${color} ${measure(paletteVar(color), ground)}`}
      </CatchText>
    </CatchGap>
  );
}

function GroundPanel({ground}: {ground: Ground}) {
  const fill = groundVar(ground, "fill");
  return (
    <div style={fillStyle(fill, groundVar(ground, "ink"))}>
      <CatchPageBody pb="s8" pt="s8">
        <CatchGap size="section">
          <CatchGap size="related">
            <CatchText as="h2" color="inherit" variant="sectionTitle">{`${title(ground)} ground`}</CatchText>
            {groundTextColors(ground).map((color) => <TextSample color={color} ground={fill} key={color} />)}
          </CatchGap>
          <div style={gridStyle}>
            {paletteColors.map((color) => <Swatch color={color} ground={fill} key={color} />)}
          </div>
          {ground === "ink" ? <NightSurface /> : null}
        </CatchGap>
      </CatchPageBody>
    </div>
  );
}

/** The night surface is a palette colour, not a ground: a raised card on the ink ground. */
function NightSurface() {
  const fill = paletteVar("nightSurface");
  return (
    <div style={{...fillStyle(fill, paletteVar("nightInk")), borderRadius: "var(--catch-radius-md)"}}>
      <CatchInset padding="content">
        <CatchGap size="related">
          <CatchText as="h3" color="inherit" variant="titleS">Night surface</CatchText>
          {nightSurfaceTextColors.map((color) => <TextSample color={color} ground={fill} key={color} />)}
        </CatchGap>
      </CatchInset>
    </div>
  );
}

/** palette, ground: every palette colour on every ground, with WCAG contrast ratios. */
export const Grounds: Story = {
  render: () => (
    <>
      {grounds.map((ground) => <GroundPanel ground={ground} key={ground} />)}
    </>
  ),
};

function FormatTile({format}: {format: Format}) {
  return (
    <CatchGap size="inline">
      <div style={{...fillStyle(formatVar(format, "accent"), formatVar(format, "ink")), borderRadius: "var(--catch-radius-md)"}}>
        <CatchInset padding="content">
          <CatchGap size="headerTitleToSubtitle">
            <CatchText as="h2" color="inherit" variant="titleL">{title(format)}</CatchText>
            <div style={{color: `var(${formatVar(format, "inkSecondary")})`}}>
              <CatchText color="inherit" variant="supporting">
                {`${title(formatAccents[format])} · ${formatActivityKinds[format].join(", ")}`}
              </CatchText>
            </div>
          </CatchGap>
        </CatchInset>
      </div>
      <div style={{color: `var(${formatVar(format, "deep")})`}}>
        <CatchText color="inherit" variant="statusLabel">
          {`${title(format)} label · ${measure(formatVar(format, "deep"), groundVar("paper", "fill"))} on paper`}
        </CatchText>
      </div>
    </CatchGap>
  );
}

/** format: each activity format on its accent, and its deep label on paper. singlesMixer has none. */
export const Formats: Story = {
  render: () => (
    <div style={fillStyle(groundVar("paper", "fill"), groundVar("paper", "ink"))}>
      <CatchPageBody pb="s8" pt="s8">
        <div style={gridStyle}>
          {(Object.keys(formatAccents) as Format[]).map((format) => <FormatTile format={format} key={format} />)}
        </div>
      </CatchPageBody>
    </div>
  ),
};
