// Which tracked files no lane reads, and the top-level entries Nx-only lane
// selection knows (design A, gate 3). This replaces the planner's refusal of
// an unowned path: lane_coverage.test.mjs requires every tracked file to be an
// input of some lane task or to match a noLaneReads glob with its reason, and
// select_lanes.mjs runs every lane for a change under a top-level entry not
// listed here, because nothing yet says which lanes read it.
//
// Keep this module free of imports: select_lanes.mjs loads it only for pull
// requests and queue groups, and the main-push plan job's sparse checkout
// never reads it.

/** Tracked files no lane task reads, with why nothing needs to. */
export const noLaneReads = {
};

/** Top-level files and directories of the tree; lane_coverage.test.mjs keeps it equal to the tracked ones. */
export const knownTopLevel = [
  ".editorconfig",
  ".env.example",
  ".firebaserc",
  ".github",
  ".gitignore",
  ".metadata",
  "AGENTS.md",
  "CLAUDE.md",
  "Gemfile",
  "Gemfile.lock",
  "PROJECT_CONTEXT.md",
  "README.md",
  "TESTS.md",
  "admin",
  "analysis_options.yaml",
  "analytics",
  "apps",
  "artifacts",
  "assets",
  "build.yaml",
  "contracts",
  "copy",
  "dart_test.yaml",
  "design",
  "docs",
  "extensions",
  "fastlane",
  "firebase",
  "firebase.json",
  "firestore.indexes.json",
  "firestore.rules",
  "functions",
  "infra",
  "integration_test",
  "lib",
  "nx.json",
  "operations",
  "package-lock.json",
  "package.json",
  "packages",
  "pubspec.lock",
  "pubspec.yaml",
  "storage.rules",
  "test",
  "tool",
  "website",
  "widgetbook",
];

/** Changed paths whose top-level entry is not in knownTopLevel. */
export function unknownTopLevel(changedFiles, known = knownTopLevel) {
  const set = new Set(known);
  return changedFiles.filter((file) => file && !set.has(file.split("/")[0])).sort();
}
