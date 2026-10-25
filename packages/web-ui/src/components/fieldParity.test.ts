// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";

// CatchField's geometry and motion must equal the Dart values Flutter's
// CatchField reads (blueprint D11). Radius, tints, disabled opacity and the
// active elevation come from generated tokens, pinned on the Flutter side.
const read = (relative: string) =>
  fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const fieldTokensDart = read("../../../catch_tokens/lib/src/components/catch_field_tokens.dart");
const fieldCss = read("./CatchField.module.css");

function dartConstant(source: string, name: string) {
  const match = source.match(new RegExp(`static const (?:double|Duration|Curve) ${name} =\\s*([^;]+);`));
  expect(match, `missing Dart constant ${name}`).not.toBeNull();
  return match![1].trim();
}

function cssValue(property: string, css = fieldCss) {
  const match = css.match(new RegExp(`${property}:\\s*([^;]+);`));
  expect(match, `missing CSS ${property}`).not.toBeNull();
  return match![1].replace(/\s+/g, " ").trim();
}

const spacingStep = (dartValue: string) => dartValue.replace(/^CatchSpacing\./, "");

describe("CatchField parity", () => {
  it("pads the row and spaces its support line as CatchFieldTokens does", () => {
    const vertical = spacingStep(dartConstant(fieldTokensDart, "rowVerticalPadding"));
    const horizontal = spacingStep(dartConstant(fieldTokensDart, "rowHorizontalPadding"));
    expect(fieldCss).toContain(
      `padding: var(--catch-space-${vertical}) var(--catch-space-${horizontal});`,
    );
    const supportTop = spacingStep(dartConstant(fieldTokensDart, "supportingTopGap"));
    expect(fieldCss).toContain(`margin-top: var(--catch-space-${supportTop});`);
    const counterGap = spacingStep(dartConstant(fieldTokensDart, "supportingCounterGap"));
    expect(fieldCss).toContain(`gap: var(--catch-space-${counterGap});`);
    const leadingGap = spacingStep(dartConstant(fieldTokensDart, "leadingGap"));
    expect(fieldCss).toContain(`column-gap: var(--catch-space-${leadingGap});`);
  });

  it("sizes the leading lane as CatchFieldTokens.leadingIconExtent", () => {
    expect(dartConstant(fieldTokensDart, "leadingIconExtent")).toBe("CatchIconSize.md");
    const iconDart = read("../../../catch_tokens/lib/src/primitives/catch_icon_size.dart");
    const extent = Number(dartConstant(iconDart, "md"));
    expect(cssValue("--catch-field-leading-extent")).toBe(`${extent}px`);
  });

  it("animates with CatchFieldTokens motion", () => {
    const fast = dartConstant(fieldTokensDart, "fast").match(/milliseconds: (\d+)/)?.[1];
    expect(cssValue("--catch-field-motion-fast")).toBe(`${fast}ms`);
    const curve = dartConstant(fieldTokensDart, "curve").match(/Cubic\(([^)]+)\)/)?.[1];
    expect(cssValue("--catch-field-motion-curve")).toBe(
      `cubic-bezier(${curve!.split(",").map((value) => value.trim()).join(", ")})`,
    );
  });
});
