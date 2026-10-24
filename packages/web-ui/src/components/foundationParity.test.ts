// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";

// The Flutter implementation is the reference (blueprint D11). These tests
// read its sources so a web role cannot drift from the Flutter role it names.
const read = (relative: string) =>
  fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const gapsDart = read("../../../catch_tokens/lib/src/semantic/catch_gaps.dart");
const generatedTokensDart = read("../../../catch_tokens/lib/generated/catch_design_tokens.g.dart");
const generatedTokensCss = read("../../../web-config/generated/catch-tokens.css");
const insetsDart = read("../../../catch_tokens/lib/src/semantic/catch_insets.dart");
const textStylesDart = read("../../../catch_ui/lib/src/foundations/catch_text_styles.dart");
const textVariantDart = read("../../../catch_ui/lib/src/primitives/catch_text_variant.dart");
const textVariantTs = read("./CatchText.tsx");
const textStoriesTs = read("./foundations.stories.tsx");
const textPreviewDart = read("../../../../widgetbook/lib/primitives/contracts/text.dart");
const textContract = JSON.parse(read("../../../../design/components/catch.components.json"))
  .components.find((component: {id: string}) => component.id === "catch.text");
const gapCss = read("./CatchGap.module.css");
const sectionListCss = read("./CatchSectionList.module.css");
const insetCss = read("./CatchInset.module.css");
const textCss = read("./CatchText.module.css");

const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

function cssRule(css: string, selector: string) {
  const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((rule) => rule[1].split(",").map((value) => value.trim()).includes(selector));
  expect(rules.length, `missing or duplicate flat CSS rule ${selector}`).toBe(1);
  return `{${rules[0][2]}}`;
}

function declaration(rule: string, property: string) {
  const match = rule.match(new RegExp(`(?:^|[\\s{;])${property}:\\s*([^;]+);`));
  return match?.[1].replace(/\s+/g, " ").trim();
}

function selectorValues(css: string, attribute: string) {
  return [...css.matchAll(new RegExp(`\\[data-${attribute}="([A-Za-z]+)"\\]`, "g"))]
    .map((match) => match[1]);
}

it("finds exact members of grouped parity selectors", () => {
  const css = ".target-extra { color: red; } /* roles */ .first, .target, .last { color: blue; }";
  for (const selector of [".first", ".target", ".last"]) {
    expect(declaration(cssRule(css, selector), "color")).toBe("blue");
  }
  expect(declaration(cssRule(css, ".target-extra"), "color")).toBe("red");
  expect(() => cssRule(css, ".missing")).toThrow();
  expect(() => cssRule(`${css} .target { color: green; }`, ".target")).toThrow();
});

describe("CatchGaps parity", () => {
  // CatchGaps names each role after the generated gap token it reads; the web
  // reads the same generated values as --catch-gap-*.
  const roles = [...gapsDart.matchAll(/static const double (\w+) =\s*GeneratedCatchGapTokens\.(\w+);/g)]
    .map((match) => {
      expect(match[2], `CatchGaps.${match[1]} reads another token`).toBe(match[1]);
      return match[1];
    })
    .sort();
  const generatedClass = generatedTokensDart.match(
    /abstract final class GeneratedCatchGapTokens \{([^}]*)\}/,
  )?.[1] ?? "";
  const generatedValues = Object.fromEntries(
    [...generatedClass.matchAll(/static const double (\w+) = ([\d.]+);/g)]
      .map((match) => [match[1], Number(match[2])]),
  );

  it("generates every Flutter gap role for the web with the Flutter value", () => {
    expect(roles.length).toBeGreaterThan(0);
    expect(Object.keys(generatedValues).sort()).toEqual(roles);
    for (const role of roles) {
      expect(generatedTokensCss, role)
        .toContain(`--catch-gap-${kebab(role)}: ${generatedValues[role]}px;`);
    }
  });

  it("binds every Flutter gap role to its generated token", () => {
    for (const role of roles) {
      const token = `var(--catch-gap-${kebab(role)})`;
      expect(declaration(cssRule(gapCss, `.gap[data-size="${role}"]`), "gap"), role).toBe(token);
      expect(declaration(cssRule(sectionListCss, `.list[data-gap="${role}"]`), "gap"), role)
        .toBe(token);
    }
  });

  it("offers exactly the Flutter gap roles on CatchGap and CatchSectionList", () => {
    expect(selectorValues(gapCss, "size").sort()).toEqual(roles);
    expect(selectorValues(sectionListCss, "gap").sort()).toEqual(roles);
  });
});

describe("CatchInsets parity", () => {
  type Edges = [string, string, string, string];
  const step = (token: string) => {
    const trimmed = token.trim();
    if (trimmed === "CatchSpacing.screenPx") return "pageGutter";
    const match = trimmed.match(/^CatchSpacing\.(\w+)$/);
    expect(match, `unsupported inset value ${trimmed}`).not.toBeNull();
    return match![1];
  };

  function dartEdges(role: string): Edges {
    const match = insetsDart.match(
      new RegExp(`static const EdgeInsets ${role} = EdgeInsets\\.(\\w+)\\(([^;]*)\\);`),
    );
    expect(match, `missing CatchInsets.${role}`).not.toBeNull();
    const [, kind, rawArgs] = match!;
    const args = rawArgs.split(",").map((arg) => arg.trim()).filter(Boolean);
    if (kind === "all") {
      const value = step(args[0]);
      return [value, value, value, value];
    }
    if (kind === "fromLTRB") {
      const [left, top, right, bottom] = args.map(step);
      return [top, right, bottom, left];
    }
    if (kind === "symmetric") {
      const named = Object.fromEntries(args.map((arg) => arg.split(":").map((part) => part.trim())));
      const vertical = named.vertical ? step(named.vertical) : "s0";
      const horizontal = named.horizontal ? step(named.horizontal) : "s0";
      return [vertical, horizontal, vertical, horizontal];
    }
    throw new Error(`unsupported EdgeInsets.${kind} for ${role}`);
  }

  function cssEdges(role: string): Edges {
    const value = declaration(cssRule(insetCss, `.inset[data-padding="${role}"]`), "padding");
    expect(value, `missing padding for ${role}`).toBeDefined();
    const parts = value!
      .split(" ")
      .map((part) => part === "0"
        ? "s0"
        : part.replace("var(--catch-layout-page-gutter)", "pageGutter")
          .replace(/^var\(--catch-space-(\w+)\)$/, "$1"));
    const [top, right = top, bottom = top, left = right] = parts;
    return [top, right, bottom, left];
  }

  it("resolves every CatchInset role to its Flutter CatchInsets value", () => {
    const roles = selectorValues(insetCss, "padding");
    expect(roles.length).toBeGreaterThan(0);
    for (const role of roles) {
      expect(cssEdges(role), role).toEqual(dartEdges(role));
    }
  });
});

describe("CatchTextStyles parity", () => {
  const values = textVariantDart.match(/enum CatchTextVariant \{([^;]*);/)?.[1]
    .split(",").map((value) => value.trim()).filter(Boolean) ?? [];

  function roleBody(role: string) {
    const start = textStylesDart.indexOf(`static TextStyle ${role}(`);
    expect(start, `missing CatchTextStyles.${role}`).toBeGreaterThanOrEqual(0);
    const next = textStylesDart.indexOf("static ", start + 1);
    return textStylesDart.slice(start, next === -1 ? undefined : next);
  }

  function flutterRole(role: string): {profile: string; color: string; weight?: string} {
    const body = roleBody(role);
    const color = body.match(/CatchTokens\.of\(context\)\.(\w+)/)?.[1];
    const weight = body.match(/fontWeight: FontWeight\.w(\d+)/)?.[1];
    if (body.includes("_functionStrong14(")) {
      return {profile: "secondary", color: color ?? "ink", weight: "700"};
    }
    const profile = body.match(/CatchPlatformTokens\.typography\.(\w+)/)?.[1];
    if (profile) {
      expect(color, `${role} default color`).toBeDefined();
      return {profile, color: color!, weight};
    }
    const delegate = body.match(/=>\s*(\w+)\(\s*context/)?.[1];
    expect(delegate, `${role} resolves to no profile`).toBeDefined();
    const base = flutterRole(delegate!);
    return {profile: base.profile, color: color ?? base.color, weight: weight ?? base.weight};
  }

  it("offers exactly the Flutter CatchTextVariant values", () => {
    expect(values.length).toBeGreaterThan(0);
    expect(selectorValues(textCss, "variant").sort()).toEqual([...values].sort());
  });

  it("publishes the same roles in TypeScript and the registry contract", () => {
    const union = textVariantTs.match(/export type CatchTextVariant =([^;]*);/)?.[1] ?? "";
    const tsValues = [...union.matchAll(/"(\w+)"/g)].map((match) => match[1]);
    const registered = textContract.contract.props
      .find((prop: {name: string}) => prop.name === "variant").values;
    expect(tsValues).toEqual(values);
    expect(registered).toEqual(values);
  });

  it("covers every canonical role in both previews", () => {
    const flutterList = textPreviewDart.match(/const variants = \[([\s\S]*?)\];/)?.[1] ?? "";
    const flutterPreview = [...flutterList.matchAll(/CatchTextVariant\.(\w+)/g)]
      .map((match) => match[1]);
    const reactList = textStoriesTs.match(/const textVariants: readonly CatchTextVariant\[\] = \[([\s\S]*?)\];/)?.[1] ?? "";
    const reactPreview = [...reactList.matchAll(/"(\w+)"/g)].map((match) => match[1]);
    expect(flutterPreview.sort()).toEqual([...values].sort());
    expect(reactPreview.sort()).toEqual([...values].sort());
  });

  it("binds each CatchText variant to its Flutter role's profile, weight and color", () => {
    const variants = selectorValues(textCss, "variant");
    expect(variants.length).toBeGreaterThan(0);
    for (const variant of variants) {
      const flutter = flutterRole(variant);
      const rule = cssRule(textCss, `.text[data-variant="${variant}"]`);
      const profile = `--catch-typography-web-${kebab(flutter.profile)}`;
      expect(declaration(rule, "--catch-text-size"), variant).toBe(`var(${profile}-size)`);
      expect(declaration(rule, "--catch-text-line-height"), variant)
        .toBe(`var(${profile}-line-height)`);
      expect(declaration(rule, "--catch-text-tracking"), variant)
        .toBe(`var(${profile}-tracking)`);
      expect(declaration(rule, "--catch-text-weight"), variant)
        .toBe(flutter.weight ?? `var(${profile}-weight)`);
      expect(declaration(rule, "--catch-text-role-color"), variant)
        .toBe(`var(--catch-theme-${kebab(flutter.color)})`);
    }
  });
});
