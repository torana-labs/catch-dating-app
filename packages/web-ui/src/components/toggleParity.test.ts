// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
const read = (path: string) => fs.readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const dart = read("../../../catch_ui/lib/src/components/catch_toggle_input.dart");
const layout = read("../../../catch_tokens/lib/src/semantic/catch_layout.dart");
const field = read("../../../catch_tokens/lib/src/components/catch_field_tokens.dart");
const css = read("./CatchToggleInput.module.css"), ts = read("./CatchToggleInput.tsx");
describe("CatchToggleInput native recipe parity", () => {
  it("retains both constructors and controlled nullable callback names", () => {
    expect(dart).toContain("const CatchToggleInput({"); expect(dart).toContain("const CatchToggleInput.field({");
    expect(ts).toContain('recipe?: "toggle" | "field"'); expect(ts).toContain("((value: boolean) => void) | null");
    expect(dart).toContain("toggled: widget.value"); expect(ts).toContain('role="switch"');
    expect(dart).toContain("onChanged(!widget.value)"); expect(ts).toContain("onChanged?.(!value)");
  });
  it("pins native track and knob geometry without borrowing spacing as size tokens", () => {
    for (const [native, web] of [["toggleTrackWidth", "width"], ["toggleTrackHeight", "height"], ["toggleKnobExtent", "knob"]]) {
      const number = layout.match(new RegExp(`static const double ${native} = ([\\d.]+);`))?.[1];
      expect(number).toBeDefined(); expect(css).toContain(`--catch-toggle-${web}: ${Number(number)}px;`);
    }
    expect(field).toContain("toggleTrackWidth = CatchSpacing.s11");
    const tokens = JSON.parse(read("../../../../design/tokens/catch.tokens.json"));
    expect(css).toContain(`--catch-toggle-width: ${tokens.space.s11.$value.value}px;`);
    for (const [native, web] of [["toggleTrackHeight", "height"], ["toggleKnobExtent", "knob"]]) {
      const value = field.match(new RegExp(`static const double ${native} = ([\\d.]+);`))?.[1];
      expect(css).toContain(`--catch-toggle-${web}: ${Number(value)}px;`);
    }
    expect(tokens.space.micro3.$value.value).toBe(3);
    expect(css).toContain("--catch-toggle-inset: var(--catch-space-micro3);");
    expect(css).toContain("var(--catch-interaction-ios-minimum-extent)");
  });
  it("uses native colors, disabled opacities, timing and reduced-motion behavior", () => {
    expect(dart).toContain("widget.value ? t.primary : t.line2");
    for (const role of ["primary", "line2", "surface"]) expect(css).toContain(`var(--catch-theme-${role})`);
    expect(read("../../../catch_tokens/lib/src/semantic/catch_opacity.dart")).toContain("disabledControl = 0.40");
    expect(field).toContain("savingToggleOpacity = 0.55"); expect(css).toContain("--catch-toggle-disabled-opacity: 0.55");
    expect(field).toContain("standard = Duration(milliseconds: 200)"); expect(css).toContain("--catch-toggle-duration: 200ms");
    expect(field).toContain("curve = Cubic(0.2, 0.7, 0.2, 1)"); expect(css).toContain("cubic-bezier(0.2, 0.7, 0.2, 1)");
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*transition: none/);
    expect(dart).toContain("AlignmentDirectional.centerEnd"); expect(css).toContain("inset-inline-start: calc(");
  });
});
