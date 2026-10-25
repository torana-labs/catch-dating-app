// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe,expect,it} from "vitest";
const read=(path:string)=>fs.readFileSync(fileURLToPath(new URL(path,import.meta.url)),"utf8");
const dart=read("../../../catch_ui/lib/src/components/catch_checkbox_input.dart");
const ts=read("./CatchCheckboxInput.tsx"),css=read("./CatchCheckboxInput.module.css");
describe("CatchCheckboxInput twin contract",()=>{
  it("shares the exact approved names and controlled/disabled contract",()=>{
    for(const prop of ["value","onChanged","label","description","semanticLabel"]) {expect(dart).toContain(`this.${prop}`);expect(ts).toContain(prop);}
    expect(dart).toContain("ValueChanged<bool>? onChanged");expect(ts).toContain("((value: boolean) => void) | null");
    expect(dart).toContain("CheckboxListTile(");expect(ts).toContain('type="checkbox"');expect(ts).not.toContain('role="switch"');
  });
  it("uses the same text roles without dropping longer descriptions",()=>{
    for(const role of ["bodyM","bodyS"]) {expect(dart).toContain(`CatchTextVariant.${role}`);expect(ts).toContain(`variant="${role}"`);}
    expect(dart).not.toContain("maxLines:");expect(ts).not.toContain("maxLines=");
    expect(ts).toContain("aria-describedby=");expect(dart).toContain("checkboxSemanticLabel: semanticLabel");
  });
  it("keeps the platform checkbox and canonical disabled/focus treatment",()=>{
    expect(dart).toContain("CatchOpacity.disabledControl");expect(css).toContain("opacity: 0.40");
    expect(css).toContain("var(--catch-interaction-ios-minimum-extent)");
    expect(css).toContain("var(--catch-theme-primary)");expect(dart).toContain("activeColor: t.primary");expect(dart).toContain("checkColor: t.primaryInk");expect(css).not.toContain("appearance: none");
  });
});
