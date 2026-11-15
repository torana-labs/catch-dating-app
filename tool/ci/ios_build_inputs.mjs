// The repository inputs an iOS simulator build depends on. In the merge queue
// the iOS lane (flutter_build_ios) runs only when a change reaches one of
// them; nightly still builds iOS every night (owner decision, 15 Nov 2026).
//
// One list serves both selectors: the planner's merge_group filter
// (tool/harness/lib/component_graph.mjs) and Nx (tool/nx/shadow_plan.mjs and
// the lane-build-ios inputs in nx.json, which ios_build_inputs.test.mjs pins
// to this list). Retiring the planner deletes only its call.
//
// Derived from what .github/workflows/app-build-matrix.yml's iOS job reads:
// the apps' native projects, every pubspec (a package can add a native
// plugin), bundled assets, the build scripts and flavour, environment and
// Maps-key tooling, the toolchain pins (Flutter, CocoaPods, Xcode, runner) and
// the workflow and composite actions the job runs. Pure Dart packages such as
// catch_ui and catch_tokens are not inputs: a compile break there also fails
// the Android and web builds and the package suites.
import {matchesGlobPath} from "../lib/path_glob.mjs";

export const iosBuildInputGlobs = Object.freeze([
  // Native iOS projects, including Info.plist and entitlements.
  "apps/*/ios/**/*",
  "ios/**/*",
  "firebase/*/ios/**/*",
  "firebase/*/host/ios/**/*",
  "copy/native_en.json",
  "tool/copy/sync_native_copy.mjs",
  // Podfile and xcconfig templates, pod policy, flavours, package policy.
  "tool/platform/**/*",
  // Dependencies and native plugins.
  "pubspec.yaml",
  "pubspec.lock",
  "apps/*/pubspec.yaml",
  "apps/*/pubspec.lock",
  "packages/*/pubspec.yaml",
  "packages/*/pubspec.lock",
  // Bundled assets and app-level build configuration.
  "assets/**/*",
  // apps/*/assets and apps/*/firebase are symlinks to the root assets/ and
  // firebase/ trees, so the link itself is the input.
  "apps/*/assets",
  "apps/*/firebase",
  "apps/*/analysis_options.yaml",
  "apps/*/.metadata",
  "analysis_options.yaml",
  "build.yaml",
  "dart_test.yaml",
  ".metadata",
  "packages/l10n/l10n.yaml",
  // Build, environment and Maps-key scripts the iOS job runs.
  "tool/app_targets.json",
  "tool/flutter_with_env.sh",
  "tool/env/dart_defines/**/*",
  "tool/use_firebase_environment.sh",
  "tool/validate_firebase_environment.sh",
  "tool/firebase/validate_google_maps_config.mjs",
  "tool/write_ios_maps_key_xcconfig.sh",
  // Toolchain pins: Flutter, CocoaPods, minimum Xcode and the macOS runner.
  "tool/ci/toolchain.env",
  // The workflow and the composite actions its iOS job uses.
  ".github/workflows/app-build-matrix.yml",
  ".github/actions/cache-cocoapods/**/*",
  ".github/actions/setup-flutter/**/*",
  ".github/actions/load-toolchain/**/*",
  ".github/actions/generate-contracts-cached/**/*",
]);

/** Whether a changed repository path can affect an iOS simulator build. */
export function iosBuildInput(path) {
  if (path.endsWith(".md")) return false;
  return iosBuildInputGlobs.some((glob) => matchesGlobPath(path, glob));
}

/** The lane-build-ios inputs nx.json declares for this list. */
export const nxLaneBuildIosInputs = Object.freeze([
  ...iosBuildInputGlobs.map((glob) => `{workspaceRoot}/${glob}`),
  "!{workspaceRoot}/**/*.md",
]);
