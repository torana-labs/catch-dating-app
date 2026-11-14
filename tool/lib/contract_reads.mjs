import path from "node:path";

// Finds the contract files a Functions source reads as data, so a pull request
// that edits one contract runs only the tests that read it. A read is precise
// when the source names the whole file: a string path such as
// "../contracts/firestore/organizers.schema.json", a join of literal segments
// such as path.join(root, "contracts", "firestore", "organizers.schema.json"),
// or a call to a helper in functions/src/shared/contractFixtures.ts with one
// literal argument: contractFixture("organizer_doc") reads
// contracts/fixtures/valid/organizer_doc.json and contractFile("firestore/x.json")
// reads contracts/firestore/x.json. Anything else that reaches into contracts/
// (a directory string, a computed name, a template) is dynamic: the source may
// read any contract, so every contract change selects it.
export const contractFixtureHelper = "src/shared/contractFixtures.ts";
const helperCall = /\b(contractFixture|contractFile)(?:<[^>()]*>)?\(\s*(["'])([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*)\2\s*\)/gu;
const helperCallAny = /\b(?:contractFixture|contractFile)(?:<[^>()]*>)?\(/gu;

// A string literal whose path starts at contracts/, after any ../ or ./ steps.
// Import specifiers such as "./sales/contracts" do not start there.
const literal = /(["'`])((?:(?!\1)[^\\\n]|\\.)*)\1/gu;
const contractsPath = /^(?:\.\.?\/)*contracts(?:\/(.*))?$/u;
const dataFile = /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\.(?:json|ya?ml|md|txt|csv)$/u;
const segment = /^\s*(["'])([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*)\1\s*/u;

/** @returns {{paths: string[], dynamic: boolean}} repository-relative contract paths. */
export function contractReads(source, {file} = {}) {
  const paths = new Set();
  let dynamic = false;
  for (const match of source.matchAll(literal)) {
    const [whole, quote, body] = match;
    const found = contractsPath.exec(body);
    if (!found) continue;
    const rest = found[1];
    if (quote === "`" && body.includes("${")) { dynamic = true; continue; }
    if (rest !== undefined && dataFile.test(rest) && !rest.split("/").includes("..")) {
      paths.add(path.posix.join("contracts", rest));
      continue;
    }
    // "contracts" or "contracts/firestore" followed only by literal join segments.
    const tail = source.slice(match.index + whole.length);
    const segments = rest ? [rest] : [];
    let cursor = tail;
    let closed = false;
    for (;;) {
      const comma = /^\s*,/u.exec(cursor);
      if (!comma) { closed = /^\s*\)/u.test(cursor); break; }
      const next = segment.exec(cursor.slice(comma[0].length));
      if (!next) break;
      segments.push(next[2]);
      cursor = cursor.slice(comma[0].length + next[0].length);
    }
    const joined = segments.join("/");
    if (closed && joined && dataFile.test(joined) && !joined.split("/").includes("..")) {
      paths.add(path.posix.join("contracts", joined));
    } else {
      dynamic = true;
    }
  }
  if (file !== contractFixtureHelper) {
    const calls = [...source.matchAll(helperCall)];
    for (const [, helper, , name] of calls) {
      paths.add(helper === "contractFixture" ? `contracts/fixtures/valid/${name}.json` : `contracts/${name}`);
    }
    if ([...source.matchAll(helperCallAny)].length !== calls.length) dynamic = true;
  } else {
    // The helper itself builds the path from its argument; its callers name the file.
    dynamic = false;
    paths.clear();
  }
  return {paths: [...paths].sort(), dynamic};
}
