import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_OPTIONS,
  DEFAULT_VIEWPORTS,
  aspectLabel,
  fillKind,
  largestEmptyBand,
  parseArgs,
  publicRoutePaths,
  readPlaybookPageIds,
  selectCandidates,
  slugForFile,
} from "./audit_website_imagery.mjs";

const desktop = DEFAULT_VIEWPORTS.find((v) => v.name === "desktop");

function record(overrides) {
  const rect = overrides.rect ?? {x: 0, y: 0, width: 300, height: 300};
  return {
    selector: "div",
    text: "",
    textChars: 0,
    rect,
    fixed: false,
    paintsSurface: true,
    backgroundImage: "none",
    childSurfaces: 0,
    mediaArea: 0,
    decorativeSvgArea: 0,
    emptyBand: {...rect, area: rect.width * rect.height},
    ancestors: [],
    ...overrides,
  };
}

test("largestEmptyBand finds the empty strip below a card's label", () => {
  const block = {x: 0, y: 0, width: 200, height: 300};
  const band = largestEmptyBand(block, [
    {x: 20, y: 20, width: 60, height: 24},
    {x: 20, y: 260, width: 150, height: 20},
  ]);
  assert.deepEqual(band, {x: 0, y: 44, width: 200, height: 216, area: 43200});
});

test("largestEmptyBand returns the whole block when nothing is inside", () => {
  const block = {x: 10, y: 10, width: 100, height: 50};
  assert.equal(largestEmptyBand(block, [{x: 500, y: 500, width: 10, height: 10}]).area, 5000);
});

test("largestEmptyBand prefers an empty column beside text", () => {
  const block = {x: 0, y: 0, width: 1000, height: 400};
  const band = largestEmptyBand(block, [{x: 40, y: 40, width: 400, height: 320}]);
  assert.deepEqual(band, {x: 440, y: 0, width: 560, height: 400, area: 224000});
});

test("selectCandidates keeps an empty colour tile and drops its section", () => {
  const section = record({rect: {x: 0, y: 0, width: 1200, height: 600}, textChars: 400, emptyBand: {x: 0, y: 0, width: 1200, height: 40, area: 48000}});
  const tile = record({rect: {x: 40, y: 100, width: 200, height: 300}, ancestors: [0], textChars: 30,
    emptyBand: {x: 40, y: 150, width: 200, height: 200, area: 40000}});
  const found = selectCandidates([section, tile], desktop);
  assert.equal(found.length, 1);
  assert.equal(found[0].rect.x, 40);
  assert.equal(found[0].fill, "flat-colour");
  assert.equal(found[0].emptyShare, 0.67);
});

test("selectCandidates drops the outer block when an inner block also qualifies", () => {
  const outer = record({rect: {x: 0, y: 0, width: 600, height: 600}});
  const inner = record({rect: {x: 0, y: 0, width: 300, height: 300}, ancestors: [0]});
  const found = selectCandidates([outer, inner], desktop);
  assert.deepEqual(found.map((f) => f.rect.width), [300]);
});

test("selectCandidates ignores blocks with real media, thin strips and fixed bars", () => {
  const withPhoto = record({mediaArea: 60000});
  const thin = record({rect: {x: 0, y: 0, width: 1200, height: 60}, emptyBand: {x: 0, y: 0, width: 1200, height: 60, area: 72000}});
  const fixed = record({fixed: true});
  assert.deepEqual(selectCandidates([withPhoto, thin, fixed], desktop), []);
});

test("selectCandidates ignores blocks below the viewport share", () => {
  const small = record({rect: {x: 0, y: 0, width: 120, height: 120}});
  assert.deepEqual(selectCandidates([small], desktop), []);
  assert.equal(selectCandidates([small], desktop, {...DEFAULT_OPTIONS, minViewportShare: 0.01}).length, 1);
});

test("a layout box without its own surface counts only when it is empty", () => {
  const emptySlot = record({paintsSurface: false});
  const wrapper = record({paintsSurface: false, textChars: 12});
  assert.equal(selectCandidates([emptySlot], desktop)[0].fill, "empty-space");
  assert.deepEqual(selectCandidates([wrapper], desktop), []);
});

test("fillKind names the fallback", () => {
  assert.equal(fillKind(record({backgroundImage: "linear-gradient(red, blue)"})), "gradient-or-pattern");
  assert.equal(fillKind(record({decorativeSvgArea: 10})), "decorative-svg-pattern");
  assert.equal(fillKind(record({})), "flat-colour");
  assert.equal(fillKind(record({paintsSurface: false})), "empty-space");
});

test("aspectLabel snaps to common ratios", () => {
  assert.equal(aspectLabel(200, 200), "1:1");
  assert.equal(aspectLabel(1600, 900), "16:9");
  assert.equal(aspectLabel(196, 304), "2:3");
  assert.equal(aspectLabel(1000, 130), "7.69:1");
});

test("publicRoutePaths lists public static and content pages and expands content families", () => {
  const routes = [
    {id: "home", kind: "static", path: "/"},
    {id: "account", kind: "static", path: "/account/"},
    {id: "event_runtime", kind: "clientDynamic", pathPattern: "/join/:id/"},
    {id: "pricing", kind: "contentFamily", path: "/pricing/"},
    {id: "playbook_guide", kind: "contentFamily", pathPattern: "/playbooks/:slug/"},
  ];
  assert.deepEqual(publicRoutePaths(routes, ["playbook_guide/run-club", "pricing"]).map((r) => r.path), [
    "/",
    "/pricing/",
    "/playbooks/run-club/",
  ]);
});

test("every playbook page id is read from the content folder", () => {
  const ids = readPlaybookPageIds();
  assert.ok(ids.includes("playbook_guide/run-club"));
  assert.ok(ids.every((id) => typeof id === "string" && id.length > 0));
});

test("parseArgs and slugForFile", () => {
  const args = parseArgs(["--base-url", "http://127.0.0.1:5311/", "--only", "/host/,/pricing/", "--viewports", "mobile"]);
  assert.equal(args.baseUrl, "http://127.0.0.1:5311");
  assert.deepEqual(args.only, ["/host/", "/pricing/"]);
  assert.deepEqual(args.viewports, ["mobile"]);
  assert.throws(() => parseArgs(["--base-url"]), /needs a value/u);
  assert.throws(() => parseArgs(["--nope"]), /Unknown option/u);
  assert.equal(slugForFile("/"), "home");
  assert.equal(slugForFile("/host/run-clubs/"), "host-run-clubs");
});
