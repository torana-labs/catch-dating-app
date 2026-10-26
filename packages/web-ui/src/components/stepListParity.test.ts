// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";

// The Flutter CatchStepList is the reference (blueprint D11). These tests read
// its sources so the web list keeps its columns, node, trace and copy.
const read = (relative: string) => fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const list = read("../../../catch_ui/lib/src/components/catch_step_list.dart");
const data = read("../../../catch_ui/lib/src/components/catch_step_row_data.dart");
const layout = read("../../../catch_tokens/lib/src/semantic/catch_layout.dart");
const css = read("./CatchStepList.module.css");
const ts = read("./CatchStepList.tsx");

const layoutNumber = (name: string) => Number(layout.match(new RegExp(`${name} = ([\\d.]+);`))?.[1]);

describe("CatchStepList parity", () => {
  it("keeps Flutter's index, rail and node geometry", () => {
    expect(css).toContain(`grid-template-columns: minmax(${layoutNumber("journeyStepsIndexColumnWidth")}px, max-content) ${layoutNumber("journeyStepsRailColumnWidth")}px minmax(0, 1fr);`);
    const node = layoutNumber("journeyStepsNodeExtent");
    expect(css).toContain(`width: ${node}px;\n  height: ${node}px;`);
    expect(list).toContain("width: CatchStroke.avatarRing");
    expect(css).toContain("border: var(--catch-stroke-avatar-ring) solid var(--catch-step-accent);");
    expect(list).toContain("width: CatchStroke.underline,\n                            color: t.line2,");
    expect(css).toContain("width: var(--catch-stroke-underline);\n  background: var(--catch-theme-line2);");
    expect(list).toContain("const SizedBox(height: CatchSpacing.micro3),\n                      Container(");
    expect(css).toContain("margin-top: var(--catch-space-micro3);");
    expect(list).toContain("gapW10,");
    expect(css).toContain("margin-inline-start: var(--catch-space-micro10);");
    expect(list).toContain("bottom: i < steps.length - 1 ? CatchSpacing.s5 : 0");
    expect(css).toContain(".step:not(:last-child) .copy { padding-bottom: var(--catch-space-s5); }");
  });

  it("numbers with two digits unless a marker replaces them, and tags in the accent", () => {
    expect(list).toContain("steps[i].marker ?? (i + 1).toString().padLeft(2, '0')");
    expect(ts).toContain('step.marker ?? String(index + 1).padStart(2, "0")');
    expect(data).toMatch(/this\.marker,\s*this\.tag,/);
    expect(list).toMatch(/gapH6,\s*Text\(\s*tag,\s*style: CatchTextStyles\.statusLabel\(\s*context,\s*color: accentColor,/);
    expect(css).toContain("margin-top: calc(var(--catch-space-micro6) - var(--catch-space-micro3));");
    expect(ts).toContain('variant="statusLabel"');
    expect(list).toContain("CatchTextStyles.bodyLead(");
    expect(ts).toContain('variant="bodyLead"');
  });
});
