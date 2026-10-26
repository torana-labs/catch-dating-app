// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";

// The Flutter implementation is the reference (blueprint D11). These tests
// read its sources so the web stepper and code input cannot drift from them.
const read = (relative: string) => fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const fieldTokens = read("../../../catch_tokens/lib/src/components/catch_field_tokens.dart");
const layoutTokens = read("../../../catch_tokens/lib/src/semantic/catch_layout.dart");
const spacingCss = read("../../../web-config/generated/catch-tokens.css");
const textStyles = read("../../../catch_ui/lib/src/foundations/catch_text_styles.dart");
const stepperCss = read("./CatchStepper.module.css");
const stepperTs = read("./CatchStepper.tsx");
const codeCss = read("./CatchCodeInput.module.css");

const spacing = (step: string) => Number(spacingCss.match(new RegExp(`--catch-space-${step}:\\s*([\\d.]+)px`))?.[1]);
const dartSpacing = (source: string, name: string) => source.match(new RegExp(`${name} = CatchSpacing\\.(\\w+);`))?.[1];
const dartNumber = (source: string, name: string) => Number(source.match(new RegExp(`${name} = ([\\d.]+);`))?.[1]);
const dartMs = (name: string) => Number(fieldTokens.match(new RegExp(`${name} = Duration\\(milliseconds: (\\d+)\\)`))?.[1]);

describe("CatchStepper parity", () => {
  it("draws Flutter's target, circle, gap and value width", () => {
    expect(dartSpacing(fieldTokens, "stepperHitExtent")).toBe("s11");
    expect(stepperCss).toContain("width: var(--catch-space-s11)");
    expect(dartSpacing(fieldTokens, "stepperVisualExtent")).toBe("s8");
    expect(stepperCss).toContain("width: var(--catch-space-s8)");
    // layoutGap = stepperGap - (hit - visual) / 2.
    const gap = spacing(dartSpacing(fieldTokens, "stepperGap")!) - (spacing("s11") - spacing("s8")) / 2;
    expect(gap).toBe(spacing("micro10"));
    expect(stepperCss).toContain("gap: var(--catch-space-micro10)");
    expect(stepperCss).toContain(`min-width: ${dartNumber(fieldTokens, "stepperValueMinWidth")}px`);
    expect(stepperCss).toContain(`width: ${dartNumber(fieldTokens, "stepperGlyphExtent")}px`);
    expect(stepperCss).toContain(`scale(${dartNumber(fieldTokens, "stepperPressedScale")})`);
    expect(stepperCss).toContain(`opacity: ${dartNumber(fieldTokens, "boundedStepperOpacity")}`);
  });

  it("repeats on Flutter's cadence", () => {
    expect(stepperTs).toContain(`repeatDelayMs = ${dartMs("repeatDelay")}`);
    expect(stepperTs).toContain(`repeatNormalMs = ${dartMs("repeatNormal")}`);
    expect(stepperTs).toContain(`repeatAcceleratedMs = ${dartMs("repeatAccelerated")}`);
    expect(stepperTs).toContain(`repeatAccelerationTicks = ${dartNumber(fieldTokens, "repeatAccelerationTicks")}`);
  });
});

describe("CatchCodeInput parity", () => {
  it("draws Flutter's cell height, gap, caret and digit size", () => {
    expect(dartSpacing(layoutTokens, "otpDigitHeight")).toBe("s16");
    expect(codeCss).toContain("--catch-code-height: var(--catch-space-s16)");
    expect(dartSpacing(layoutTokens, "otpDigitGap")).toBe("micro10");
    expect(codeCss).toContain("--catch-code-gap: var(--catch-space-micro10)");
    expect(dartSpacing(layoutTokens, "otpCaretHeight")).toBe("s6");
    expect(codeCss).toContain("height: var(--catch-space-s6)");
    expect(codeCss).toContain(`width: ${dartNumber(layoutTokens, "otpCaretWidth")}px`);
    const digit = textStyles.match(/static TextStyle otpDigit[\s\S]*?size: (\d+),\s*weight: FontWeight\.w(\d+)/);
    expect(codeCss).toContain(`font-size: ${digit?.[1]}px`);
    expect(codeCss).toContain(`font-weight: ${digit?.[2]}`);
  });
});
