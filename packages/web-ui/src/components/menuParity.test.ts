// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";

// Flutter's CatchMenu and CatchMenuRow are the reference (blueprint D11). These
// tests read their sources so the web menu keeps their geometry and roles.
const read = (relative: string) => fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const menu = read("../../../catch_ui/lib/src/components/catch_menu.dart");
const row = read("../../../catch_ui/lib/src/components/catch_menu_row.dart");
const layout = read("../../../catch_tokens/lib/src/semantic/catch_layout.dart");
const css = read("./CatchMenu.module.css");
const ts = read("./CatchMenu.tsx");

const layoutNumber = (name: string) => Number(layout.match(new RegExp(`${name} = ([\\d.]+);`))?.[1]);

describe("CatchMenu parity", () => {
  it("keeps the row height, padding, gap, icon and check sizes", () => {
    expect(css).toContain(`min-height: ${layoutNumber("menuRowMinHeight")}px;`);
    expect(layoutNumber("menuRowVerticalPadding")).toBe(10);
    expect(row).toContain("horizontal: _sheet ? 0 : CatchSpacing.micro14");
    expect(css).toContain("padding: var(--catch-space-micro10) var(--catch-space-micro14);");
    expect(layoutNumber("menuRowGap")).toBe(12);
    expect(css).toContain("gap: var(--catch-space-s3);");
    const icon = layoutNumber("menuRowIconSize");
    expect(css).toContain(`width: ${icon}px;\n  height: ${icon}px;\n  color: var(--catch-theme-ink2);`);
    const check = layoutNumber("menuRowCheckSize");
    expect(css).toContain(`width: ${check}px;\n  height: ${check}px;\n  color: var(--catch-theme-ink);`);
  });

  it("sets the copy in Flutter's roles and colours", () => {
    expect(row).toContain(": CatchTextStyles.titleS(context, color: color)");
    expect(ts).toContain('variant="titleS"');
    expect(row).toContain("const SizedBox(height: CatchSpacing.micro2)");
    expect(css).toContain("gap: var(--catch-space-micro2);");
    expect(row).toMatch(/CatchTextStyles\.bodyS\(\s*context,\s*color: t\.ink3,/);
    // The web sublabel is ink2: Flutter's ink3 is under 4.5:1 on the surface (a Flutter gap).
    expect(ts).toContain('color="ink2" maxLines={2} variant="bodyS"');
    expect(row).toContain("if (!item.enabled) return t.ink3;");
    expect(css).toContain(".row:disabled { color: var(--catch-theme-ink3); cursor: default; }");
    expect(row).toContain("if (item.danger) return t.danger;");
    expect(css).toContain(".row[data-danger] { color: var(--catch-theme-danger); }");
  });

  it("draws Flutter's floating panel inside the viewport inset", () => {
    expect(menu).toContain("radius: CatchRadius.md,\n      borderRole: CatchBorderRole.boundary,");
    expect(css).toContain("border-radius: var(--catch-radius-md);");
    expect(layout).toContain("menuViewportInset = CatchSpacing.s4");
    expect(ts).toContain("const viewportInset = 16;");
    expect(css).toContain("max-height: calc(100dvh - 32px);");
  });
});
