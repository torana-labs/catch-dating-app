import assert from "node:assert/strict";
import test from "node:test";
import {contractFixtureHelper, contractReads} from "./contract_reads.mjs";

test("whole-file string paths are precise reads", () => {
  assert.deepEqual(contractReads(`readFileSync("../contracts/firestore/organizers.schema.json")
    resolve(__dirname, '../../../contracts/catalogs/markets.json')`),
  {paths: ["contracts/catalogs/markets.json", "contracts/firestore/organizers.schema.json"], dynamic: false});
});

test("joins of literal segments are precise; open or computed joins are dynamic", () => {
  assert.deepEqual(contractReads(`path.join(root, "contracts", "firestore", "users.schema.json")`),
    {paths: ["contracts/firestore/users.schema.json"], dynamic: false});
  assert.deepEqual(contractReads(`path.resolve(root, "contracts/firestore", "users.schema.json")`),
    {paths: ["contracts/firestore/users.schema.json"], dynamic: false});
  assert.equal(contractReads(`path.join(root, "contracts", "firestore", name)`).dynamic, true);
  assert.equal(contractReads(`const dir = path.resolve(process.cwd(), "contracts");`).dynamic, true);
});

test("directory strings, concatenation and templates are dynamic", () => {
  assert.equal(contractReads(`readFileSync("../contracts/fixtures/valid/" + name + ".json")`).dynamic, true);
  assert.equal(contractReads("readFileSync(`../contracts/firestore/${schema}.schema.json`)").dynamic, true);
  assert.equal(contractReads(`const root = "../../contracts/firestore";`).dynamic, true);
});

test("helper calls with one literal name the file; any other call is dynamic", () => {
  assert.deepEqual(contractReads(`contractFixture("event_doc"); contractFile<Schema>(
      "firestore/organizers.schema.json");`),
  {paths: ["contracts/firestore/organizers.schema.json", "contracts/fixtures/valid/event_doc.json"], dynamic: false});
  assert.equal(contractReads("contractFixture(name)").dynamic, true);
  assert.equal(contractReads(`contractFile("firestore/" + name)`).dynamic, true);
});

test("the helper module itself is not a reader", () => {
  const source = `const root = path.resolve(__dirname, "..", "..", "..", "contracts");
    export function contractFixture(name) { return contractFile(path.join("fixtures", name)); }`;
  assert.equal(contractReads(source).dynamic, true);
  assert.deepEqual(contractReads(source, {file: contractFixtureHelper}), {paths: [], dynamic: false});
});

test("import specifiers, URLs and prose are not contract reads", () => {
  assert.deepEqual(contractReads(`import {x} from "./sales/contracts";
    const id = "https://catch.app/contracts/operations/a.schema.json";
    // contracts/firestore/chat_messages.schema.json`), {paths: [], dynamic: false});
});
