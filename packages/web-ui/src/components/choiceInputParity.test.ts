// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
const read = (path: string) => fs.readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const native = read("../../../catch_ui/lib/src/components/catch_choice_input.dart");
const button = read("../../../catch_ui/lib/src/components/catch_choice_button.dart");
const tile = read("../../../catch_ui/lib/src/components/catch_choice_tile.dart");
const option = read("../../../catch_ui/lib/src/components/catch_option.dart");
const variants = read("../../../catch_ui/lib/src/components/catch_choice_input_variant.dart");
const insets = read("../../../catch_tokens/lib/src/semantic/catch_insets.dart");
const tokens = read("../../../web-config/generated/catch-tokens.css");
const css = read("./CatchChoiceInput.module.css") + read("./CatchChoiceTile.module.css");
describe("Choice family source parity", () => {
  it("uses only real generated tokens or declared private variables", () => {
    const declared = new Set([...(`${tokens}\n${css}`).matchAll(/(--catch-[\w-]+)\s*:/g)].map((match) => match[1]));
    const missing = [...new Set([...css.matchAll(/var\((--catch-[\w-]+)/g)].map((match) => match[1]))].filter((name) => !declared.has(name));
    expect(missing).toEqual(["--catch-choice-accent"]);
  });
  it("preserves the four native segmented variants and disabled-option reasons", () => {
    expect(variants.match(/\{([^}]+)\}/)?.[1].split(",").map((part) => part.trim()).filter(Boolean)).toEqual(["label", "mono", "operational", "summary"]);
    expect(option).toContain("assert(enabled || disabledReason != null)");
    expect(native).toContain("if (!widget.allowEmptySelection && next.length == 1) return");
    expect(native).toContain("if (!wasSelected || !widget.allowEmptySelection) next.add(value)");
  });
  it("pins choice spacing, wrapping, underline and compact tile geometry", () => {
    expect(native).toContain("CatchChoiceInputVariant.label => CatchSpacing.micro18");
    expect(css).toContain("gap: var(--catch-space-micro18)");
    expect(native).toContain("height: CatchSpacing.micro2");
    expect(css).toContain("border-bottom: var(--catch-space-micro2) solid transparent");
    expect(button).toContain("CatchChoiceInputVariant.summary"); expect(css).toContain("white-space: normal");
    expect(tile).toContain("padding: CatchInsets.tileContentCompact");
    expect(insets).toMatch(/tileContentCompact = EdgeInsets\.all\(\s*CatchSpacing\.micro14/);
    expect(read("./CatchChoiceTile.module.css")).toContain("padding: var(--catch-space-micro14)");
    expect(tile).toContain("size: CatchIconSize.lg"); expect(css).toContain("width: 24px; height: 24px");
  });
});
