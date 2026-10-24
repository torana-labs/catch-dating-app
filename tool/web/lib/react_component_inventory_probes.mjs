import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {buildReactComponentGraph} from "./react_component_graph.mjs";
import {buildReactComponentInventory} from "./react_component_inventory.mjs";

const graphFixture = {
  "tsconfig.json": JSON.stringify({
    compilerOptions: {jsx: "preserve", module: "esnext", moduleResolution: "bundler", target: "es2022", noEmit: true},
    include: ["src"],
  }),
  "src/shared/Button.tsx": "export function Button() { return <button />; }\nexport function formatLabel() { return 'x'; }\n",
  "src/shared/Panel.tsx": "import {Button} from './Button';\nfunction Inner() { return <Button />; }\nexport function Panel() { return <Inner />; }\n",
  "src/shared/index.ts": "export * from './Panel';\n",
  "src/features/a/Page.tsx": "import {Panel} from '../../shared';\nexport function Page() { return <Panel />; }\n",
  "src/features/b/LazyRoute.tsx": "export default function LazyRoute() { return <div />; }\n",
  "src/app.tsx": "import {Page} from './features/a/Page';\nexport const routes = [() => import('./features/b/LazyRoute')];\nexport function App() { return <Page />; }\n",
  "src/shared/Dead.tsx": "export function Dead() { return <span />; }\n",
  "src/shared/Dead.stories.tsx": "import {Dead} from './Dead';\nexport const Story = () => <Dead />;\n",
  // A consumer root (the Next App Router tree) renders src components in production.
  "src/routed/Shell.tsx": "export function Shell() { return <main />; }\n",
  "app/page.tsx": "import {Shell} from '../src/routed/Shell';\nexport default function RoutePage() { return <Shell />; }\n",
};

/**
 * The graph follows barrels, private helpers and dynamic imports, ignores
 * stories, and counts consumer-root files as consumers without listing them.
 */
export function graphProbeProblems() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "react-component-graph-probe-"));
  try {
    for (const [file, source] of Object.entries(graphFixture)) {
      fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
      fs.writeFileSync(path.join(root, file), source);
    }
    const graph = buildReactComponentGraph({
      repoRoot: root,
      surfaces: [{id: "website", root: "src", tsconfig: "tsconfig.json", consumerRoots: ["app"]}],
    });
    const failures = [];
    const names = graph.components.map((component) => component.name).sort();
    if (JSON.stringify(names) !== JSON.stringify(["App", "Button", "Dead", "LazyRoute", "Page", "Panel", "Shell"])) {
      failures.push(`components should be the JSX-rendering exports, found ${names.join(", ")}`);
    }
    const has = (from, to) => graph.references.some((reference) => reference.from === from && reference.to === to);
    if (!has("src/shared/Panel.tsx::Inner", "src/shared/Button.tsx::Button")) failures.push("a private helper's use was dropped");
    if (!has("src/shared/Panel.tsx::Panel", "src/shared/Panel.tsx::Inner")) failures.push("a use of a private helper was dropped");
    if (!has("src/features/a/Page.tsx::Page", "src/shared/Panel.tsx::Panel")) failures.push("a barrel re-export was not resolved");
    if (!has("src/app.tsx::routes", "src/features/b/LazyRoute.tsx::LazyRoute")) failures.push("a dynamic import of a default export was missed");
    if (!has("app/page.tsx::RoutePage", "src/routed/Shell.tsx::Shell")) failures.push("a consumer-root route's use was missed");
    const deadUses = graph.references.filter((reference) => reference.to === "src/shared/Dead.tsx::Dead");
    if (deadUses.length !== 1 || deadUses[0].file !== "src/shared/Dead.stories.tsx") {
      failures.push("story uses must stay visible as the only, non-production use of an export");
    }
    return [...failures, ...aliasProbeProblems(), ...workspaceResolutionProbeProblems()];
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
}

const workspaceFixture = {
  "tsconfig.json": JSON.stringify({
    compilerOptions: {jsx: "preserve", module: "esnext", moduleResolution: "bundler", target: "es2022", noEmit: true},
    include: ["website", "packages"],
  }),
  "packages/web-ui/package.json": JSON.stringify({
    name: "@catch/web-ui",
    exports: {".": {types: "./src/index.ts", import: "./src/index.ts"}},
  }),
  "packages/web-ui/src/index.ts": "export * from './Button';\n",
  "packages/web-ui/src/Button.tsx": "export function Button() { return <button />; }\n",
  "website/src/Page.tsx": "import {Button} from '@catch/web-ui';\nexport function Page() { return <Button />; }\n",
};

/**
 * A task worktree nested in another checkout, with no node_modules of its
 * own, resolves @catch/web-ui into that checkout's packages. The graph must
 * refuse it instead of dropping the worktree's own web-ui consumers, and
 * accept the worktree once it has its own workspace link.
 */
function workspaceResolutionProbeProblems() {
  const outer = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "react-component-graph-workspace-")));
  const root = path.join(outer, ".claude/worktrees/task");
  const linkWebUi = (checkout) => {
    fs.mkdirSync(path.join(checkout, "node_modules/@catch"), {recursive: true});
    fs.symlinkSync("../../packages/web-ui", path.join(checkout, "node_modules/@catch/web-ui"), "dir");
  };
  const surfaces = [
    {id: "website", root: "website/src", tsconfig: "tsconfig.json"},
    {id: "web-ui", root: "packages/web-ui/src", tsconfig: "tsconfig.json"},
  ];
  try {
    for (const checkout of [outer, root]) {
      for (const [file, source] of Object.entries(workspaceFixture)) {
        fs.mkdirSync(path.dirname(path.join(checkout, file)), {recursive: true});
        fs.writeFileSync(path.join(checkout, file), source);
      }
    }
    linkWebUi(outer);
    const failures = [];
    const borrowed = `@catch/web-ui resolved to ${path.join(outer, "packages/web-ui/src/index.ts")}, outside ${root}.`;
    try {
      buildReactComponentGraph({repoRoot: root, surfaces});
      failures.push("an @catch/* import resolved through another checkout's node_modules was accepted");
    } catch (error) {
      if (!error.message.includes(borrowed) || !error.message.includes("bootstrap_worktree.sh --target root")) {
        failures.push(`a borrowed @catch/* install should name its resolution and the install command, got: ${error.message}`);
      }
    }
    linkWebUi(root);
    const graph = buildReactComponentGraph({repoRoot: root, surfaces});
    if (!graph.references.some((reference) =>
      reference.from === "website/src/Page.tsx::Page" && reference.to === "packages/web-ui/src/Button.tsx::Button")) {
      failures.push("a worktree's own @catch/web-ui link did not resolve to its own packages");
    }
    return failures;
  } catch (error) {
    return [`workspace resolution: ${error.message}`];
  } finally {
    fs.rmSync(outer, {recursive: true, force: true});
  }
}

// Seeded known-bad inventory: each rule of the Phase 7d gate must fire once,
// and the decided and derived cases must stay quiet.
const W = "website/src/shared/ui/primitives";
const A = "admin/src/shared/ui/AdminPrimitives";
const component = (surface, file, name) => ({id: `${file}::${name}`, surface, file, name, line: 1});
const use = (from, to) => ({from, to, file: from.split("::")[0]});

export const probeRegistry = {
  roleNounRedirects: {},
  components: [
    {id: "catch.banner", tier: "T1", level: "L3", roleNoun: "Banner", dart: {symbol: "CatchBanner"}, aliases: ["StatusBanner"]},
    {id: "catch.button", tier: "T1", level: "L3", roleNoun: "Button", dart: {symbol: "CatchButton"},
      react: {symbol: "ButtonControl", file: "packages/web-ui/src/primitives.tsx", api: "headless-control"}},
    {id: "catch.sheet", tier: "T3", level: "L3", roleNoun: "Sheet", dart: {symbol: "CatchSheet"}},
  ],
};

export function probeGraph() {
  const components = [
    component("web-ui", "packages/web-ui/src/primitives.tsx", "ButtonControl"),
    component("web-ui", "packages/web-ui/src/motion.tsx", "OrphanControl"),
    component("website", `${W}/feedback.tsx`, "NoticeBanner"),
    component("website", `${W}/feedback.tsx`, "DecidedBanner"),
    component("website", `${W}/feedback.tsx`, "StaleCompare"),
    component("website", `${W}/forms.tsx`, "DupField"),
    component("website", `${W}/media.tsx`, "DeadThing"),
    component("website", `${W}/media.tsx`, "SingleThing"),
    component("admin", `${A}/actions.tsx`, "AdminActionButton"),
    component("admin", `${A}/cards.tsx`, "SoloCard"),
    component("admin", `${A}/cards.tsx`, "OwnedCard"),
    component("admin", `${A}/forms.tsx`, "DupField"),
    component("web-ui", "packages/web-ui/src/components/CatchSoloPanel.tsx", "CatchSoloPanel"),
    component("web-ui", "packages/web-ui/src/components/CatchLeakyPanel.tsx", "CatchLeakyPanel"),
  ];
  const websiteA = "website/src/features/a/Page.tsx::PageA";
  const websiteB = "website/src/features/b/Page.tsx::PageB";
  const adminX = "admin/src/features/x/Screen.tsx::XScreen";
  const adminY = "admin/src/features/y/Screen.tsx::YScreen";
  const references = [
    use(websiteA, "packages/web-ui/src/motion.tsx::OrphanControl"),
    use(adminX, "packages/web-ui/src/motion.tsx::OrphanControl"),
    ...[websiteA, websiteB].flatMap((page) => [
      use(page, `${W}/feedback.tsx::NoticeBanner`),
      use(page, `${W}/feedback.tsx::DecidedBanner`),
      use(page, `${W}/feedback.tsx::StaleCompare`),
      use(page, `${W}/forms.tsx::DupField`),
    ]),
    use(websiteA, `${W}/media.tsx::SingleThing`),
    use(`${A}/actions.tsx::AdminActionButton`, "packages/web-ui/src/primitives.tsx::ButtonControl"),
    use(adminX, `${A}/actions.tsx::AdminActionButton`),
    use(adminX, `${A}/cards.tsx::SoloCard`),
    use(adminX, `${A}/cards.tsx::OwnedCard`),
    use(adminX, `${A}/forms.tsx::DupField`),
    use(adminY, `${A}/forms.tsx::DupField`),
    use("website/src/stories/Media.stories.tsx", `${W}/media.tsx::DeadThing`),
    use(adminX, "packages/web-ui/src/components/CatchSoloPanel.tsx::CatchSoloPanel"),
    use(adminX, "packages/web-ui/src/components/CatchLeakyPanel.tsx::CatchLeakyPanel"),
    use(websiteA, "packages/web-ui/src/components/CatchLeakyPanel.tsx::CatchLeakyPanel"),
  ];
  return {components, references};
}

export const probeSurfaceRegistries = {
  website: {components: [
    {id: "decided_banner", source: `${W}/feedback.tsx`, exportName: "DecidedBanner",
      comparedWith: ["catch.banner"], comparisonReason: "Page band with a call to action, not inline feedback."},
    {id: "stale_compare", source: `${W}/feedback.tsx`, exportName: "StaleCompare",
      comparedWith: ["catch.sheet"], comparisonReason: "Compared with a contract the inventory never matched."},
  ]},
  admin: {components: [
    {id: "admin_action_button", kind: "shared-primitive", owner: "shared/ui", source: `${A}/actions.tsx`,
      exportName: "AdminActionButton", comparedWith: ["catch.button"], comparisonReason: "Too short."},
    {id: "solo_card", kind: "shared-primitive", owner: "shared/ui", source: `${A}/cards.tsx`, exportName: "SoloCard"},
    {id: "owned_card", kind: "feature-component", owner: "features/y", source: `${A}/cards.tsx`, exportName: "OwnedCard"},
    // D18: one-feature components drawn in the library are that surface's T4 entries.
    {id: "solo_panel", kind: "feature-component", owner: "features/x",
      source: "packages/web-ui/src/components/CatchSoloPanel.tsx", exportName: "CatchSoloPanel"},
    {id: "leaky_panel", kind: "feature-component", owner: "features/x",
      source: "packages/web-ui/src/components/CatchLeakyPanel.tsx", exportName: "CatchLeakyPanel"},
  ]},
};

export const expectedProbeProblems = [
  ["motion.tsx::OrphanControl", "implements no registered contract"],
  ["feedback.tsx::NoticeBanner", "matches catch.banner"],
  ["admin_action_button", "needs a comparisonReason"],
  ["solo_card", "record it as a feature-component"],
  ["owned_card", "feature-component owned by features/y is rendered by admin:features/x"],
  ["both export DupField", "point both at one contract"],
  ["stale_compare", "is not a measured candidate"],
  ["leaky_panel", "T4 component registered for admin is also rendered by website:features/a"],
];

/** Problems with the gate itself: an expected finding missing or a quiet case reported. */
export function inventoryProbeProblems() {
  const inventory = buildReactComponentInventory({
    graph: probeGraph(),
    registry: probeRegistry,
    surfaceRegistries: probeSurfaceRegistries,
  });
  const failures = [];
  for (const [subject, message] of expectedProbeProblems) {
    if (!inventory.problems.some((problem) => problem.includes(subject) && problem.includes(message))) {
      failures.push(`expected a finding for ${subject}: ${message}`);
    }
  }
  if (inventory.problems.some((problem) => problem.includes("DecidedBanner"))) {
    failures.push("a recorded comparison was reported as undecided");
  }
  const mapping = (name) => inventory.rows.find((row) => row.id.endsWith(`::${name}`))?.mapping;
  if (mapping("DeadThing")?.kind !== "delete") failures.push("a story-only export was not mapped to deletion");
  const single = mapping("SingleThing");
  if (single?.kind !== "t4" || !single.move || single.owner !== "website:features/a") {
    failures.push("a single-feature shared export was not counted as debt awaiting its library move");
  }
  const solo = mapping("CatchSoloPanel");
  if (solo?.kind !== "t4" || solo.move || solo.owner !== "admin:features/x") {
    failures.push("a registered T4 component in @catch/web-ui was not mapped to its owner without a move");
  }
  if (inventory.problems.some((problem) => problem.includes("solo_panel") || problem.includes("CatchSoloPanel"))) {
    failures.push("a registered T4 component in @catch/web-ui was reported");
  }
  if (mapping("ButtonControl")?.componentId !== "catch.button") failures.push("a react record was not mapped to its concept");
  return failures;
}

// Resolve public export identities to declarations for ownership and composition.
function aliasProbeProblems() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catch-react-alias-regression-'));
  const sources = {
    'tsconfig.json': JSON.stringify({compilerOptions:{jsx:'preserve',module:'esnext',moduleResolution:'bundler',target:'es2022',noEmit:true},include:['website','packages']}),
    'packages/web-ui/src/control.tsx': 'function InternalControl(){ return <button/>; } export {InternalControl as ButtonControl};',
    'website/src/shared/ui/alias.tsx': 'function Original(){ return <span/>; } export {Original as AliasThing, Original as SecondThing};',
    'website/src/shared/ui/adapter.tsx': 'import {ButtonControl as Control} from "../../../../packages/web-ui/src/control"; function InternalAdapter(){ return <Control/>; } export {InternalAdapter as AdapterThing};',
    'website/src/shared/ui/compound.tsx': 'import {AdapterThing as Adapted} from "./adapter"; function InternalComposite(){ return <Adapted/>; } export {InternalComposite as ChoiceButton};',
    'website/src/shared/ui/dead.tsx': 'function StoryOnly(){ return <span/>; } export {StoryOnly as DeadAlias};',
    'website/src/shared/ui/dead.stories.tsx': 'import {DeadAlias} from "./dead"; export const Story=()=> <DeadAlias/>;',
    'website/src/shared/index.ts': 'export {AliasThing as ThroughBarrel, SecondThing} from "./ui/alias"; export {ChoiceButton} from "./ui/compound";',
    'website/src/features/a/Page.tsx': 'import {ThroughBarrel as Rendered, ChoiceButton} from "../../shared"; export function PageA(){ return <><Rendered/><ChoiceButton/></>; }',
    'website/src/features/b/Page.tsx': 'import {SecondThing as Rendered, ChoiceButton} from "../../shared"; export function PageB(){ return <><Rendered/><ChoiceButton/></>; }',
  };
  try {
   for (const [file,source] of Object.entries(sources)) { fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),source); }
   const graph=buildReactComponentGraph({repoRoot:root,surfaces:[{id:'website',root:'website/src',tsconfig:'tsconfig.json'},{id:'web-ui',root:'packages/web-ui/src',tsconfig:'tsconfig.json'}]});
   const registry={roleNounRedirects:{},components:[{id:'catch.button',tier:'T1',level:'L3',roleNoun:'Button',dart:{symbol:'CatchButton'},react:{file:'packages/web-ui/src/control.tsx',symbol:'ButtonControl'}}]};
   const inventory=buildReactComponentInventory({graph,registry,surfaceRegistries:{website:{components:[{id:'adapter',source:'website/src/shared/ui/adapter.tsx',exportName:'AdapterThing',componentId:'catch.button'}]}}});
   const row=name=>{const item=inventory.rows.find(x=>x.name===name);assert.ok(item,`missing ${name}`);return item;};
   const owners=['website:features/a','website:features/b'];
   assert.deepEqual(row('AliasThing').owners,owners,'local export alias must retain production consumers through barrel and import aliases');
   assert.deepEqual(row('SecondThing').owners,owners,'multiple public aliases must share declaration ownership');
   assert.equal(row('AliasThing').mapping.kind,'t4');
   assert.deepEqual(row('ButtonControl').owners,owners,'React implementation alias must retain transitive consumers');
   assert.deepEqual(row('ButtonControl').mapping,{kind:'concept',componentId:'catch.button'});
   assert.deepEqual(row('AdapterThing').mapping,{kind:'adapter',componentId:'catch.button'});
   assert.deepEqual(row('ChoiceButton').owners,owners,'aliased shared composite must retain its consumers');
   assert.deepEqual(row('ChoiceButton').candidates,[],'rendering a registered aliased adapter must suppress a redundant name candidate');
   assert.equal(row('DeadAlias').mapping.kind,'delete','a story-only alias stays unused by production');
   assert.deepEqual(inventory.problems,[]);
   return [];
  } catch (error) {
   return [`export alias ownership: ${error.message}`];
  } finally {fs.rmSync(root,{recursive:true,force:true});}
}
