import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  candidateFiles,
  handWrittenFiles,
  legacyCallSites,
  legacyRenames,
  planLegacyWebRename,
  renameLegacyWebSymbols,
} from "./rename_legacy_web_library_symbols.mjs";

const caller = [
  'import {CatchGap, CatchIcon, CatchText, type CatchTextVariant} from "@catch/web-ui";',
  'import {CatchSurface, type CatchSurfaceProps} from "./CatchSurface";',
  'import type {CatchGround, CatchIconProps, CatchTextProps} from "@catch/web-ui";',
  "const roles: CatchTextVariant[] = [\"bodyM\"];",
  "type Ground = CatchGround;",
  "export function Card(props: CatchSurfaceProps & {label: CatchTextProps[\"children\"]; icon: CatchIconProps}) {",
  "  return <CatchSurface child={<CatchText variant=\"bodyM\">{props.label}<CatchIcon icon=\"back\" /></CatchText>} />;",
  "}",
  "",
].join("\n");

test("renames JSX tags, imports, module paths and type positions", () => {
  const {text, counts} = renameLegacyWebSymbols(caller);
  assert.equal(text, [
    'import {CatchGap, CatchLegacyIcon, CatchLegacyText, type CatchLegacyTextVariant} from "@catch/web-ui";',
    'import {CatchLegacySurface, type CatchLegacySurfaceProps} from "./CatchLegacySurface";',
    'import type {CatchBandGround, CatchLegacyIconProps, CatchLegacyTextProps} from "@catch/web-ui";',
    "const roles: CatchLegacyTextVariant[] = [\"bodyM\"];",
    "type Ground = CatchBandGround;",
    "export function Card(props: CatchLegacySurfaceProps & {label: CatchLegacyTextProps[\"children\"]; icon: CatchLegacyIconProps}) {",
    "  return <CatchLegacySurface child={<CatchLegacyText variant=\"bodyM\">{props.label}<CatchLegacyIcon icon=\"back\" /></CatchLegacyText>} />;",
    "}",
    "",
  ].join("\n"));
  assert.deepEqual(Object.fromEntries(counts), {
    CatchIcon: 2,
    CatchText: 3,
    CatchTextVariant: 2,
    CatchSurface: 3,
    CatchSurfaceProps: 2,
    CatchGround: 2,
    CatchIconProps: 2,
    CatchTextProps: 2,
  });
});

test("keeps longer names that only start with an old one", () => {
  const source = [
    "import {CatchTextInput, CatchIconTile, CatchGroundCard, type CatchIconName, type CatchTextColor} from \"@catch/web-ui\";",
    "import {catchIconSizes, type CatchIconSizeName, type CatchSurfaceTone} from \"@catch/web-ui\";",
    "const legacy = <CatchLegacyText variant=\"bodyM\">CatchTextStyles</CatchLegacyText>;",
  ].join("\n");
  assert.equal(renameLegacyWebSymbols(source).text, source);
});

test("leaves a @deprecated line naming the system replacement", () => {
  const source = [
    "/**",
    " * A full-width section; CatchText inside takes the ink.",
    " * @deprecated Legacy: use CatchSurface block=\"band\"; deleted in P7.",
    " */",
  ].join("\n");
  const {text} = renameLegacyWebSymbols(source);
  assert.match(text, /@deprecated Legacy: use CatchSurface block="band"/u);
  assert.match(text, /A full-width section; CatchLegacyText inside/u);
});

test("is idempotent", () => {
  const once = renameLegacyWebSymbols(caller).text;
  const twice = renameLegacyWebSymbols(once);
  assert.equal(twice.text, once);
  assert.equal(twice.counts.size, 0);
});

test("counts the legacy call sites by JSX opening tag", () => {
  const sites = legacyCallSites(renameLegacyWebSymbols(caller).text);
  assert.deepEqual(Object.fromEntries(sites), {CatchLegacySurface: 1, CatchLegacyText: 1, CatchLegacyIcon: 1});
});

test("every old name has a CatchLegacy or CatchBand replacement that the pattern no longer matches", () => {
  for (const [from, to] of legacyRenames) {
    assert.match(to, /^Catch(Legacy|Band)/u, from);
    assert.equal(renameLegacyWebSymbols(to).text, to);
  }
});

test("walks the three roots and skips the hand-written, generated and non-source files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rename-legacy-web-"));
  try {
    const write = (relative, text) => {
      fs.mkdirSync(path.dirname(path.join(root, relative)), {recursive: true});
      fs.writeFileSync(path.join(root, relative), text);
    };
    const use = '<CatchText variant="bodyM">Hi</CatchText>\n';
    write("admin/src/features/a/Screen.tsx", use);
    write("website/src/features/b/page.tsx", use);
    write("website/src/features/b/notes.mdx", use);
    write("packages/web-ui/src/components/CatchAccordion.tsx", use);
    write("packages/web-ui/src/components/CatchText.tsx", "export function CatchText() {}\n");
    write("packages/web-ui/src/components/CatchText.stories.tsx", use);
    write("packages/web-ui/src/components/CatchLegacyText.tsx", "/** @deprecated Legacy: use CatchText */\n");
    write("packages/web-ui/src/index.ts", 'export {CatchText} from "./components/CatchText";\n');
    write("admin/src/generated/validators.ts", use);
    write("website/src/features/b/styles.module.css", ".CatchText {}\n");
    write("functions/src/CatchText.ts", use);
    assert.ok(handWrittenFiles.has("packages/web-ui/src/components/CatchText.tsx"));
    assert.deepEqual(candidateFiles(root), [
      "admin/src/features/a/Screen.tsx",
      "packages/web-ui/src/components/CatchAccordion.tsx",
      "website/src/features/b/notes.mdx",
      "website/src/features/b/page.tsx",
    ]);
    const plan = planLegacyWebRename(root);
    assert.equal(plan.length, 4);
    assert.ok(plan.every((change) => change.text === '<CatchLegacyText variant="bodyM">Hi</CatchLegacyText>\n'));
    for (const change of plan) fs.writeFileSync(path.join(root, change.file), change.text);
    assert.deepEqual(planLegacyWebRename(root), []);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});
