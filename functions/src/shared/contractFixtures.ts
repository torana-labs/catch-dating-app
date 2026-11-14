import {readFileSync} from "node:fs";
import path from "node:path";

// Test reads of repository contracts. Each call names one whole file with a
// string literal, so CI's test selection (tool/lib/contract_reads.mjs) can run
// only the tests that read a changed contract. Build paths with these helpers,
// never by concatenating a name onto a contracts/ directory.
const contractsRoot = path.resolve(__dirname, "..", "..", "..", "contracts");

// Parsed JSON is untyped, as JSON.parse returns it; callers narrow it.
/* eslint-disable @typescript-eslint/no-explicit-any */

/** contracts/<relativePath>, parsed as JSON. */
export function contractFile<T = any>(relativePath: string): T {
  const file = path.join(contractsRoot, relativePath);
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

/** The canonical valid fixture contracts/fixtures/valid/<name>.json. */
export function contractFixture<T = any>(name: string): T {
  return contractFile<T>(path.join("fixtures", "valid", `${name}.json`));
}
