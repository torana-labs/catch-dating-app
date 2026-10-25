import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import {execFileSync} from "node:child_process";
import {pathToFileURL} from "node:url";
import test from "node:test";
import {ESLint} from "eslint";
import preset from "./eslint.mjs";
import {checkSuppressions, compareSuppressions, violationCounts} from "./check-eslint-suppressions.mjs";

const cwd = path.resolve(import.meta.dirname, "../../../..");
const eslint = new ESLint({cwd, overrideConfigFile: true, overrideConfig: preset});
const lint = (code, filePath = "src/probe.tsx") => eslint.lintText(code, {filePath});
const rules = (results) => results.flatMap((r) => r.messages.map((m) => m.ruleId)).sort();

test("production JSX and createElement controls fail, library composition passes", async () => {
  assert.deepEqual(rules(await lint("export const View = () => <CatchPageBody><CatchText variant='bodyM'>Hello</CatchText></CatchPageBody>;")), []);
  for (const code of ["<div />", "<button />", "React.createElement('input')",
    "createElement('textarea')"]) {
    assert.deepEqual(rules(await lint(`import React, {createElement} from 'react'; export const View = () => ${code};`)), ["react/forbid-elements"]);
  }
  assert.deepEqual(rules(await lint("const text = '<button className=\"fake\" />'; // <input />\nexport {text};")), []);
});

test("DOM and component drawing props fail without inline allow markers", async () => {
  const result = await lint("/* eslint-disable */\nexport const View = () => <><div className='box' style={{padding: 8}} /><CatchText className='x' style={{color: 'red'}}>Text</CatchText></>;");
  const findings = rules(result).filter(Boolean);
  assert.equal(findings.filter((r) => r === "react/forbid-dom-props").length, 2);
  assert.equal(findings.filter((r) => r === "react/forbid-component-props").length, 2);
  assert.equal(findings.filter((r) => r === "react/forbid-elements").length, 1);
});

test("D17 table/image families remain usable until their styled components exist", async () => {
  assert.deepEqual(rules(await lint("export const View = () => <><table className='data' style={{width: '100%'}}><tbody><tr><td>Cell</td></tr></tbody></table><img className='photo' style={{width: 24}} src='/test.png' /></>;")), []);
  // The preset scopes only app src; the actual library can draw raw elements.
  assert.equal(rules(await lint("export const View = () => <button />;", "packages/web-ui/src/Probe.tsx")).filter(Boolean).length, 0);
});

test("examples preserve the previous control/class guards and owner-fixture boundary", async () => {
  assert.deepEqual(rules(await lint("export const Story = () => <div><span>Example</span></div>;", "src/probe.stories.tsx")), []);
  assert.deepEqual(rules(await lint("export const Story = () => <button className='x' />;", "src/probe.stories.tsx")), ["react/forbid-dom-props", "react/forbid-elements"]);
  assert.deepEqual(rules(await lint("export const Fixture = () => <button />;", "src/shared/ui/probe.test.tsx")), []);
});

test("actual lint results reject new debt, resolved stale counts and committed growth", async () => {
  const accepted = violationCounts(await lint("export const View = () => <p>Hello</p>;"), cwd);
  assert.deepEqual(compareSuppressions(accepted, accepted, accepted), []);
  const more = violationCounts(await lint("export const View = () => <div><p>Hello</p></div>;"), cwd);
  assert.ok(compareSuppressions(accepted, more, accepted).some((p) => p.includes("2 remain")));
  const less = violationCounts(await lint("export const View = () => <CatchText variant='bodyM'>Hello</CatchText>;"), cwd);
  assert.ok(compareSuppressions(accepted, less, accepted).some((p) => p.includes("0 remain")));
  assert.ok(compareSuppressions(more, more, accepted).some((p) => p.includes("grew above accepted")));
  const moved = violationCounts(await lint("export const View = () => <p>Hello</p>;", "src/another.tsx"), cwd);
  assert.ok(compareSuppressions(moved, moved, accepted).some((p) => p.includes("grew above accepted 0")));
});

test("parse errors cannot disappear into a suppression baseline", async () => {
  const results = await lint("export const Broken = () => <div>;");
  assert.throws(() => violationCounts(results, cwd), /Parsing error/);
});

test("both app typecheck pipelines run the replacement gate once", () => {
  for (const surface of ["website", "admin"]) {
    const {scripts} = JSON.parse(fs.readFileSync(path.join(cwd, surface, "package.json"), "utf8"));
    assert.equal(scripts["check:ui"], `node ../tool/web/check_react_ui.mjs --surface ${surface}`);
    const pipeline = [scripts.pretypecheck, scripts.typecheck].join(" && ").split(" && ");
    assert.equal(pipeline.filter((command) => command === "npm run check:ui").length, 1);
    assert.ok(!Object.values(scripts).some((command) => /check:ui-primitives|check:class-names/.test(command)));
  }
});

test("freshness reads accepted Git counts and rejects a source-matching baseline increase", async () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "catch-eslint-ratchet-"));
  try {
    const app = path.join(fixture, "website");
    fs.mkdirSync(path.join(app, "src"), {recursive: true});
    fs.writeFileSync(path.join(app, "eslint.config.mjs"),
      `export {default} from ${JSON.stringify(pathToFileURL(path.join(import.meta.dirname, "eslint.mjs")).href)};\n`);
    const source = path.join(app, "src/probe.tsx");
    const baseline = path.join(app, "eslint-suppressions.json");
    const accepted = {"src/probe.tsx": {"react/forbid-elements": {count: 1}}};
    fs.writeFileSync(source, "export const View = () => <p>Hello</p>;");
    fs.writeFileSync(baseline, JSON.stringify(accepted));
    const git = (...args) => execFileSync("git", args, {cwd: fixture, stdio: "ignore"});
    git("init", "-q");
    git("add", "website/eslint-suppressions.json");
    git("-c", "user.name=Lint fixture", "-c", "user.email=lint@example.test", "commit", "-qm", "Seed accepted fixture");
    assert.deepEqual(await checkSuppressions(app, "HEAD"), []);
    fs.writeFileSync(source, "export const View = () => <div><p>Hello</p></div>;");
    assert.ok((await checkSuppressions(app, "HEAD")).some((p) => p.includes("2 remain")));
    fs.writeFileSync(baseline, JSON.stringify({"src/probe.tsx": {"react/forbid-elements": {count: 2}}}));
    assert.ok((await checkSuppressions(app, "HEAD")).some((p) => p.includes("grew above accepted 1")));
    fs.writeFileSync(source, "export const View = () => <CatchText variant='bodyM'>Hello</CatchText>;");
    fs.writeFileSync(baseline, JSON.stringify(accepted));
    assert.ok((await checkSuppressions(app, "HEAD")).some((p) => p.includes("0 remain")));
  } finally {
    fs.rmSync(fixture, {recursive: true, force: true});
  }
});
