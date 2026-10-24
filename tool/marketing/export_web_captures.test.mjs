import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {deflateSync} from "node:zlib";
import test from "node:test";
import {fromRepo} from "../lib/repo_paths.mjs";

// A tiny repository with one web capture: a story importing copy through the
// @content alias, a workspace package, world JSON and a public asset, under a
// Storybook preview whose global CSS imports a token sheet with a font.
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-web-capture-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const write = (name, content) => {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, content);
    return file;
  };
  for (const name of ["tool/lib/repo_paths.mjs", "tool/marketing/export_app_screenshots.mjs",
    "tool/marketing/export_web_captures.mjs", "tool/marketing/web_capture_screen.mjs",
    "tool/marketing/lib/capture_provenance.mjs", "tool/marketing/lib/web_capture_inputs.mjs"]) {
    write(name, fs.readFileSync(fromRepo(name)));
  }
  write("tool/marketing/frame_device_capture.dart", "// frame\n");
  write("tool/ci/toolchain.env", "NODE_VERSION=24\nFLUTTER_VERSION=fixture\n");
  write("pubspec.lock", 'packages:\n  image:\n    dependency: "direct dev"\n    version: "4.5.4"\n');
  write("package.json", JSON.stringify({workspaces: ["website", "packages/web-ui"]}));
  write("package-lock.json", JSON.stringify({packages: {
    "node_modules/react": {version: "19.3.0"}, "node_modules/playwright": {version: "1.64.0"},
    "node_modules/playwright-core": {version: "1.64.0"}, "node_modules/@storybook/react-vite": {version: "10.6.1"}}}));
  write("design/website/routes.json", JSON.stringify({routes: [{id: "event_runtime"}]}));
  write("test/ui_captures/catalog/screen_capture_catalog.dart", "");
  write("packages/web-ui/package.json", JSON.stringify({name: "@catch/web-ui", exports: {".": {import: "./src/index.ts"}}}));
  write("packages/web-ui/src/index.ts", 'export {CatchText} from "./components/CatchText";\n');
  write("packages/web-ui/src/components/CatchText.tsx", 'import styles from "./CatchText.module.css";\nexport const CatchText = () => styles;\n');
  write("packages/web-ui/src/components/CatchText.module.css", ".text { color: red; }\n");
  write("website/package.json", JSON.stringify({name: "catch-marketing"}));
  write("website/.storybook/main.ts", 'import type {StorybookConfig} from "@storybook/react-vite";\nexport default {};\n');
  write("website/.storybook/preview.ts", 'import "../src/styles.css";\nexport default {};\n');
  write("website/src/styles.css", '@import "../../packages/tokens.css";\n@import "./styles/runtime.css";\n');
  write("packages/tokens.css", '@font-face { font-family: "Archivo"; src: url("./fonts/Archivo.woff2") format("woff2"); }\n');
  write("packages/fonts/Archivo.woff2", "font bytes");
  write("website/src/styles/runtime.css", "h1 { letter-spacing: -.065em; }\n");
  write("website/src/content/runtime.ts", 'export const copy = {title: "Check in"};\n');
  write("website/src/stories/fixtures/world.ts", 'import world from "../../../../tool/demo/world.json" with {type: "json"};\nexport const name = world.name;\n');
  write("tool/demo/world.json", '{"name": "Saturday Trivia Social"}');
  write("website/public/assets/branding/mark.png", "mark");
  write("website/src/stories/WebCaptures.stories.tsx", [
    'import type {Meta} from "@storybook/react-vite";',
    'import {CatchText} from "@catch/web-ui";',
    'import {copy} from "@content/runtime";',
    'import {name} from "./fixtures/world";',
    "const mark = \"/assets/branding/mark.png\";",
    "export default {} satisfies Meta;",
    "export const JoinPhoneCheckIn = {render: () => [CatchText, copy, name, mark]};",
  ].join("\n"));
  write("website/src/unrelated.ts", "export const other = 1;\n");
  const capture = {id: "guest-join-phone", kind: "web-capture", audience: "guest", surface: "Event check-in",
    status: "active", device: "iphone-17-pro", routeId: "event_runtime",
    story: {file: "website/src/stories/WebCaptures.stories.tsx", id: "marketing-website-web-captures--join-phone-check-in"},
    address: "catchdates.com",
    sourcePath: "artifacts/marketing/app-screenshots/guest-join-phone.png",
    websitePath: "website/public/assets/app-screenshots/guest-join-phone.png",
    placeholderPath: "website/public/assets/app-screenshots/placeholders/guest-join-phone.svg",
    alt: "Check-in page in iPhone Safari", caption: "Guests check in in the browser.", walkthroughStep: "Check in", pages: ["/host/"]};
  const writeManifest = (entry = capture) => write("tool/marketing/capture_manifest.json",
    JSON.stringify({version: 1, updated: "2026-10-25", previewDisclosure: "Fictional app preview.", captures: [entry]}));
  writeManifest();
  write("fonts/native.ttf", "native font fixture");
  const git = write("bin/git", `#!${process.execPath}\nprocess.stdout.write("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\n");\n`);
  fs.chmodSync(git, 0o755);
  write("closure.mjs", 'import {webCaptureClosure} from "./tool/marketing/lib/web_capture_inputs.mjs"; const {files, externals} = webCaptureClosure(process.argv[2]); process.stdout.write(JSON.stringify({files: [...files].sort(), externals: Object.fromEntries(externals)}));');
  write("hash.mjs", 'import {captureInputHash} from "./tool/marketing/lib/capture_provenance.mjs"; process.stdout.write(captureInputHash(JSON.parse(process.argv[2])));');
  write("stamp.mjs", 'import fs from "node:fs"; import {stampCapture} from "./tool/marketing/lib/capture_provenance.mjs"; const c = JSON.parse(fs.readFileSync("tool/marketing/capture_manifest.json")).captures[0]; stampCapture(c, c.story.id, "fonts/native.ttf");');
  const run = (script, ...args) => spawnSync(process.execPath, [path.join(root, script), ...args],
    {encoding: "utf8", cwd: root, env: {...process.env, PATH: `${path.join(root, "bin")}${path.delimiter}${process.env.PATH}`}});
  const ok = result => { assert.equal(result.status, 0, result.stderr); return result.stdout; };
  const hash = entry => ok(run("hash.mjs", JSON.stringify(entry)));
  const plan = () => JSON.parse(ok(run("tool/marketing/export_app_screenshots.mjs", "--plan", "--inputs-only")));
  const stamp = () => { write(capture.sourcePath, png()); ok(run("stamp.mjs")); };
  return {root, write, capture, writeManifest, run, ok, hash, plan, stamp};
}

test("the closure follows imports, aliases, workspaces, JSON, CSS and public assets", t => {
  const f = fixture(t);
  const {files, externals} = JSON.parse(f.ok(f.run("closure.mjs", f.capture.story.file)));
  for (const file of ["website/src/stories/WebCaptures.stories.tsx", "website/.storybook/main.ts", "website/.storybook/preview.ts",
    "website/src/styles.css", "packages/tokens.css", "packages/fonts/Archivo.woff2", "website/src/styles/runtime.css",
    "website/src/content/runtime.ts", "website/src/stories/fixtures/world.ts", "tool/demo/world.json",
    "packages/web-ui/src/index.ts", "packages/web-ui/src/components/CatchText.tsx",
    "packages/web-ui/src/components/CatchText.module.css", "website/public/assets/branding/mark.png"]) {
    assert.ok(files.includes(file), file);
  }
  assert.ok(!files.includes("website/src/unrelated.ts"));
  assert.deepEqual(externals, {"@storybook/react-vite": "10.6.1", playwright: "1.64.0", "playwright-core": "1.64.0"});
  f.write("website/src/content/runtime.ts", 'import {missing} from "./nowhere";\n');
  assert.match(f.run("closure.mjs", f.capture.story.file).stderr, /Cannot resolve \.\/nowhere/u);
});

test("only what changes pixels changes a web capture's input hash", t => {
  const f = fixture(t);
  const base = f.hash(f.capture);
  // Presentation fields and files outside the closure never re-render.
  assert.equal(f.hash({...f.capture, caption: "Other words", alt: "Other alt", pages: ["/"], walkthroughStep: "2"}), base);
  f.write("website/src/unrelated.ts", "export const other = 2;\n");
  assert.equal(f.hash(f.capture), base);
  // The address drawn in Safari and the story do.
  assert.notEqual(f.hash({...f.capture, address: "example.test"}), base);
  assert.notEqual(f.hash({...f.capture, story: {...f.capture.story, id: "marketing-website-web-captures--other"}}), base);
  const edits = [
    ["website/src/styles/runtime.css", "h1 { letter-spacing: 0; }\n"],
    ["packages/fonts/Archivo.woff2", "new font bytes"],
    ["tool/demo/world.json", '{"name": "Sunday Run"}'],
    ["website/.storybook/preview.ts", 'import "../src/styles.css";\nexport default {parameters: {}};\n'],
    ["website/public/assets/branding/mark.png", "new mark"],
    ["package-lock.json", JSON.stringify({packages: {"node_modules/react": {version: "19.3.0"},
      "node_modules/playwright": {version: "1.65.0"}, "node_modules/playwright-core": {version: "1.65.0"},
      "node_modules/@storybook/react-vite": {version: "10.6.1"}}})],
  ];
  for (const [file, content] of edits) {
    const before = f.hash(f.capture);
    f.write(file, content);
    assert.notEqual(f.hash(f.capture), before, file);
  }
  // A bump of a package the story never imports doesn't re-render.
  const before = f.hash(f.capture);
  const lock = JSON.parse(fs.readFileSync(path.join(f.root, "package-lock.json"), "utf8"));
  lock.packages["node_modules/react"].version = "19.4.0";
  f.write("package-lock.json", JSON.stringify(lock));
  assert.equal(f.hash(f.capture), before);
});

test("the exporter plans, checks and describes web captures beside app captures", t => {
  const f = fixture(t);
  assert.deepEqual(f.plan().map(({id, kind, render}) => ({id, kind, render})),
    [{id: "guest-join-phone", kind: "web-capture", render: true}]);
  f.stamp();
  assert.deepEqual(f.plan().map(item => item.render), [false]);
  assert.match(f.ok(f.run("tool/marketing/export_app_screenshots.mjs", "--check")), /ready/u);
  const design = JSON.parse(f.ok(f.run("tool/marketing/export_app_screenshots.mjs", "--design-json")));
  assert.equal(design.captures[0].type, "marketing-web-capture");
  assert.equal(design.captures[0].captureId, f.capture.story.id);
  assert.deepEqual(design.captures[0].routeIds, ["event_runtime"]);
  // A page change after the render makes it stale again.
  f.write("website/src/styles/runtime.css", "h1 { letter-spacing: 0; }\n");
  const [stale] = f.plan();
  assert.equal(stale.render, true);
  assert.match(stale.reasons.join("\n"), /Capture inputs changed/u);
  assert.notEqual(f.run("tool/marketing/export_app_screenshots.mjs", "--check").status, 0);
});

test("a web capture names a real story file and id, Catch's own host and a website route", t => {
  const f = fixture(t);
  for (const [change, message] of [
    [{story: {...f.capture.story, file: "website/src/Other.tsx"}}, /story\.file must be/u],
    [{story: {...f.capture.story, id: "Not An Id"}}, /story\.id must be/u],
    [{address: "evil.example"}, /address must be/u],
    [{routeId: "nowhere"}, /routeId must name a route/u],
  ]) {
    f.writeManifest({...f.capture, ...change});
    const result = f.run("tool/marketing/export_app_screenshots.mjs", "--plan", "--inputs-only");
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, message);
  }
});

function png(width = 1020, height = 1964) {
  function chunk(type, data) {
    const payload = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of payload) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, payload, checksum]);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const pixels = Buffer.alloc((width * 4 + 1) * height);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)), chunk("IEND", Buffer.alloc(0))]);
}
