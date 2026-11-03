// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
const read = (path: string) => fs.readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const native = read("../../../catch_ui/lib/src/primitives/catch_kicker_text.dart");
const metadata = read("../../../catch_ui/lib/src/primitives/catch_metadata_text.dart");
const styles = read("../../../catch_ui/lib/src/foundations/catch_text_styles.dart");
const css = read("./CatchKickerText.module.css");
const source = read("./CatchKickerText.tsx");
const tokens = read("../../../web-config/generated/catch-tokens.css");
const fonts = read("../../../catch_ui/lib/src/foundations/catch_fonts.dart");
const roles = [["kicker", "kicker", ".kicker"], ["kickerLg", "kicker-lg", '.kicker[data-variant="lg"]'], ["fieldSectionKicker", "field-section-kicker", '.kicker[data-variant="fieldSection"]'], ["monoLabel", "mono-label", ".metadata"], ["monoCapsLabel", "mono-caps-label", ".metadata[data-uppercase]"]];
function body(role: string) {
  const start = styles.indexOf(`static TextStyle ${role}(`);
  expect(start).toBeGreaterThan(-1);
  return styles.slice(start, styles.indexOf(";", start) + 1);
}
describe("Typography atom source parity", () => {
  it("offers exactly the native kicker variants and uppercase rendering", () => {
    const variants = native.match(/enum CatchKickerTextVariant \{([^}]*)\}/)?.[1].split(",").map((x) => x.trim());
    expect(variants).toEqual(["md", "lg", "fieldSection"]);
    expect(source).toContain('CatchKickerTextVariant = "md" | "lg" | "fieldSection"');
    expect(native).toContain("label.toUpperCase()"); expect(source).toContain("label.toUpperCase()");
  });
  for (const [role, token, selector] of roles) {
    it(`reads every ${role} metric from existing generated tokens`, () => {
      const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const block = css.match(new RegExp(`${escape(selector)}\\s*\\{([^}]*)\\}`))?.[1];
      expect(block, selector).toBeDefined();
      for (const [metric, property] of [["family", "font-family"], ["size", "font-size"], ["weight", "font-weight"], ["line-height", "line-height"], ["tracking", "letter-spacing"]]) {
        const key = `--catch-typography-brand-${token}-${metric}`;
        expect(tokens).toContain(`${key}:`); expect(block).toContain(`${property}: var(${key})`);
      }
      // Flutter reads the system role directly; the web's older token aliases it.
      const systemRole = body(role).match(/GeneratedCatchTypeRoleTokens\.(\w+)/)?.[1];
      expect(systemRole, role).toBeDefined();
      const kebab = systemRole!.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      const value = (name: string) => tokens.match(new RegExp(`${name}: ([^;]+);`))?.[1];
      for (const metric of ["family", "size", "weight", "line-height", "tracking"]) {
        const expected = value(`--catch-typography-role-${kebab}-${metric}`);
        expect(expected, `${systemRole} ${metric}`).toBeDefined();
        expect(value(`--catch-typography-brand-${token}-${metric}`), `${role} ${metric}`).toBe(expected);
      }
    });
  }
  it("retains native defaults and fixed metadata clamping", () => {
    expect(body("kicker")).toContain("CatchTokens.of(context).ink2");
    expect(body("kickerLg")).toContain("CatchTokens.of(context).ink");
    expect(native).toContain("maxLines == null ? TextOverflow.clip : TextOverflow.ellipsis");
    expect(metadata).toContain("maxLines: 1"); expect(metadata).toContain("overflow: TextOverflow.ellipsis");
    expect(fonts).toContain("const [FontFeature.tabularFigures()]");
    expect(css).toContain("font-variant-numeric: tabular-nums");
    expect(css).toContain("white-space: nowrap"); expect(css).toContain("text-overflow: ellipsis");
  });
});
