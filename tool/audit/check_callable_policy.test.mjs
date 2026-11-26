import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {callablePolicyProblems, rawCallables} from "./check_callable_policy.mjs";

const at = (path, source) => rawCallables(path, source)
  .map((item) => ({...item, path}));

test("a raw onCall export is found by name; callable() is not", () => {
  const found = at("functions/src/x/a.ts", [
    "export const listThings = onCall(",
    "  appCheckCallableOptions, (request) => run(request));",
    "export const getThing = callable(appCheckCallableOptions, spec);",
    "// export const commented = onCall(options, run);",
  ].join("\n"));
  assert.deepEqual(found.map((item) => item.name), ["listThings"]);
});

test("a local wrapper and every export it builds are listed", () => {
  const found = at("functions/src/x/b.ts", [
    "const read = (action: string) =>",
    "  onCall(options, (request) => run(action, request));",
    "export const adminListThings = read(\"things.list\");",
    "export const adminGetThing =",
    "  read(\"things.get\");",
  ].join("\n"));
  assert.deepEqual(found.map((item) => item.name).sort(),
    ["adminGetThing", "adminListThings", "functions/src/x/b.ts#read"]);
});

test("an unlisted raw callable fails, even in a file that lost another", () => {
  // getThing was converted and newThing added in the same file: a per-file
  // count would not notice, the per-name list does.
  const problems = callablePolicyProblems({
    raw: at("functions/src/x/a.ts", "export const newThing = onCall(o, h);"),
    baseline: ["getThing"],
  });
  assert.equal(problems.length, 2);
  assert.match(problems[0], /builds newThing with a raw onCall/u);
  assert.match(problems[1], /getThing is in .* no longer builds a raw onCall/u);
});

test("the list holds when every raw callable is listed once", () => {
  assert.deepEqual(callablePolicyProblems({
    raw: at("functions/src/x/a.ts", "export const listThings = onCall(o, h);"),
    baseline: ["listThings"],
  }), []);
  assert.match(callablePolicyProblems({
    raw: at("functions/src/x/a.ts", "export const listThings = onCall(o, h);"),
    baseline: ["listThings", "listThings"],
  })[0], /listed twice/u);
});

test("the wrapper module itself is not a raw callable", () => {
  assert.deepEqual(rawCallables("functions/src/platform/callables/callable.ts",
    "export function callable(o, s) { return onCall(o, (r) => run(s, r)); }"),
  []);
});

test("the repository passes: discovery uses callable()", () => {
  const script = fileURLToPath(new URL("./check_callable_policy.mjs",
    import.meta.url));
  const out = execFileSync(process.execPath, [script], {encoding: "utf8"});
  assert.match(out, /Callable policy: \d+ raw onCall callables left/u);
});
