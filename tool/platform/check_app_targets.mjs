#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  defaultRepoRoot,
  loadAppTargets,
} from "./resolve_app_target.mjs";

const expectedRoles = ["consumer", "host"];
const expectedEnvironments = ["dev", "staging", "prod"];
export function packageVersionFromPubLock(source, packageName) {
  const lines = source.split(/\r?\n/u);
  const packageHeader = `  ${packageName}:`;
  let inPackage = false;
  for (const line of lines) {
    if (line === packageHeader) {
      inPackage = true;
      continue;
    }
    if (inPackage && /^  \S/u.test(line)) return null;
    if (!inPackage) continue;
    const match = line.match(/^    version: "([^"]+)"$/u);
    if (match) return match[1];
  }
  return null;
}

export function validateAppleFirebaseLockstep({
  policy,
  pubLockSource,
  podProjects,
}) {
  const findings = [];
  const expectedCore = policy?.firebaseCoreFlutterVersion;
  const expectedFirestore = policy?.cloudFirestoreFlutterVersion;
  const expectedApple = policy?.firebaseAppleSdkVersion;
  if (!expectedCore || !expectedFirestore || !expectedApple) {
    return [
      "appleNativeDependencies must bind firebase_core, cloud_firestore, and the Firebase Apple SDK",
    ];
  }

  for (const [packageName, expected] of [
    ["firebase_core", expectedCore],
    ["cloud_firestore", expectedFirestore],
  ]) {
    const actual = packageVersionFromPubLock(pubLockSource, packageName);
    if (actual !== expected) {
      findings.push(
        `${packageName} is ${actual ?? "missing"} in pubspec.lock; ` +
          `tool/app_targets.json expects ${expected}`,
      );
    }
  }

  if (podProjects.length === 0) {
    findings.push("appleNativeDependencies must own at least one Pod project");
  }
  for (const project of podProjects) {
    const tag = project.podfileSource.match(
      /pod 'FirebaseFirestore',[^\n]*:tag => '([^']+)'/u,
    )?.[1];
    if (tag !== expectedApple) {
      findings.push(
        `${project.podfilePath} pins FirebaseFirestore ${tag ?? "missing"}; ` +
          `expected ${expectedApple}`,
      );
    }
    for (const marker of [
      `  - Firebase/Firestore (${expectedApple}):`,
      `  - FirebaseCore (${expectedApple}):`,
      `  - FirebaseFirestore (${expectedApple}):`,
      `    :tag: ${expectedApple}`,
    ]) {
      if (!project.lockfileSource.includes(marker)) {
        findings.push(`${project.lockfilePath} is missing '${marker.trim()}'`);
      }
    }
  }
  return findings;
}

export function validateManifestShape(manifest) {
  const findings = [];
  if (manifest?.schemaVersion !== 1) findings.push("schemaVersion must be 1");
  if (manifest?.logicalName !== "catch-installable-app-targets") {
    findings.push("logicalName must be catch-installable-app-targets");
  }
  for (const operationalKey of ["currentPhase", "phases", "transitionalDebt"]) {
    if (Object.hasOwn(manifest ?? {}, operationalKey)) {
      findings.push(
        `${operationalKey} is operational evidence and must not live in the signed app-target authority`,
      );
    }
  }
  if (!manifest?.appleNativeDependencies) {
    findings.push("appleNativeDependencies is required");
  }
  for (const role of expectedRoles) {
    const roleConfig = manifest?.roles?.[role];
    if (!roleConfig) {
      findings.push(`missing role ${role}`);
      continue;
    }
    if (!roleConfig.projectRoot) findings.push(`${role}: projectRoot is required`);
    if (!roleConfig.entrypoint) findings.push(`${role}: entrypoint is required`);
    if (!roleConfig.packageEntrypoint) {
      findings.push(`${role}: packageEntrypoint is required`);
    }
  }
  for (const environment of expectedEnvironments) {
    if (!manifest?.environments?.[environment]) {
      findings.push(`missing environment ${environment}`);
    }
  }

  const targets = manifest?.targets ?? [];
  if (targets.length !== 6) findings.push(`expected 6 targets, found ${targets.length}`);
  const ids = new Set();
  const pairs = new Set();
  const iosBundleIds = new Set();
  const androidApplicationIds = new Set();
  for (const target of targets) {
    if (!target.projectRoot) findings.push(`${target.id}: projectRoot is required`);
    if (!target.entrypoint) findings.push(`${target.id}: entrypoint is required`);
    if (!target.packageEntrypoint) {
      findings.push(`${target.id}: packageEntrypoint is required`);
    }
    if (ids.has(target.id)) findings.push(`duplicate target id ${target.id}`);
    ids.add(target.id);
    const pair = `${target.role}/${target.environment}`;
    if (pairs.has(pair)) findings.push(`duplicate target pair ${pair}`);
    pairs.add(pair);
    if (!expectedRoles.includes(target.role)) findings.push(`${target.id}: invalid role`);
    if (!expectedEnvironments.includes(target.environment)) {
      findings.push(`${target.id}: invalid environment`);
    }
    if (iosBundleIds.has(target.ios?.bundleId)) {
      findings.push(`${target.id}: duplicate iOS bundle id ${target.ios?.bundleId}`);
    }
    iosBundleIds.add(target.ios?.bundleId);
    if (androidApplicationIds.has(target.android?.applicationId)) {
      findings.push(
        `${target.id}: duplicate Android application id ${target.android?.applicationId}`,
      );
    }
    androidApplicationIds.add(target.android?.applicationId);
    for (const operationalKey of [
      "legacyXcodeCloudState",
      "legacyXcodeCloudRetirementRunId",
      "testFlightEvidence",
      "playInternalEvidence",
    ]) {
      if (Object.hasOwn(target.release ?? {}, operationalKey)) {
        findings.push(
          `${target.id}.release.${operationalKey} is operational evidence and must not authorize a signed build`,
        );
      }
    }
  }
  for (const role of expectedRoles) {
    for (const environment of expectedEnvironments) {
      if (!pairs.has(`${role}/${environment}`)) {
        findings.push(`missing target pair ${role}/${environment}`);
      }
    }
  }
  return findings;
}

export function androidClientFor(config, applicationId) {
  return config.client?.find(
    (client) =>
      client.client_info?.android_client_info?.package_name === applicationId,
  );
}

export function parseAppleBuildConfigurations(source) {
  const configurations = [];
  const pattern =
    /buildSettings = \{([\s\S]*?)\n\s*\};\n\s*name = ([^;]+);/gu;
  for (const match of source.matchAll(pattern)) {
    const settings = {};
    for (const line of match[1].split(/\r?\n/u)) {
      const setting = line.match(/^\s*"?([A-Za-z0-9_\[\]=*]+)"?\s*=\s*(.*);\s*$/u);
      if (!setting) continue;
      settings[setting[1]] = unquoteBuildSetting(setting[2]);
    }
    if (settings.CATCH_APP_TARGET_ID) {
      configurations.push({name: unquoteBuildSetting(match[2].trim()), settings});
    }
  }
  return configurations;
}

export function validateAndroidBuildSource(source) {
  const findings = [];
  for (const marker of [
    "app_targets.json",
    "installableAppTargets",
    "requestedAppTarget",
    "target = requestedAppTarget",
  ]) {
    if (!source.includes(marker)) {
      findings.push(`Android target generation is missing manifest binding '${marker}'`);
    }
  }
  for (const taskPrefix of ["assemble", "bundle", "build", "check", "test", "lint"]) {
    if (!source.includes(`\"${taskPrefix}\"`)) {
      findings.push(`Android app-target guard does not cover aggregate '${taskPrefix}' tasks`);
    }
  }
  return findings;
}

export function validateSharedAndroidManifestSource(source) {
  const findings = [];
  for (const [label, marker] of [
    ["Health Connect", "android.permission.health.READ_EXERCISE"],
    ["public app links", 'android:autoVerify="true"'],
  ]) {
    if (source.includes(marker)) {
      findings.push(`Android shared base manifest must not own Consumer-only ${label}`);
    }
  }
  return findings;
}

export function validateAutomaticAppleSigningSettings({
  targetId,
  configurationName,
  settings,
}) {
  const findings = [];
  if (settings.CODE_SIGN_STYLE !== "Automatic") {
    findings.push(
      `${targetId}: ${configurationName} CODE_SIGN_STYLE was '${settings.CODE_SIGN_STYLE ?? ""}'; expected 'Automatic'`,
    );
  }
  if (Object.hasOwn(settings, "CODE_SIGN_IDENTITY[sdk=iphoneos*]")) {
    findings.push(
      `${targetId}: ${configurationName} must defer CODE_SIGN_IDENTITY to Xcode automatic signing`,
    );
  }
  return findings;
}

// The fastlane release path: Mobile Beta builds, verifies and uploads every
// test build in one job; Mobile Production only promotes a build testers
// already have, behind a reviewer-gated environment.
export const releaseFiles = Object.freeze({
  lanes: "fastlane/Fastfile",
  betaWorkflow: ".github/workflows/mobile-beta.yml",
  productionWorkflow: ".github/workflows/mobile-production.yml",
});

const expectedReleasePolicy = [
  ["release owner", (policy) => policy.owner, "github-actions"],
  ["release tool", (policy) => policy.tool, "fastlane"],
  ["release lanes", (policy) => policy.lanes, releaseFiles.lanes],
  ["beta workflow", (policy) => policy.betaWorkflow, releaseFiles.betaWorkflow],
  ["beta trigger", (policy) => policy.betaTrigger, "nightly-when-apps-changed-and-dispatch"],
  ["beta environment", (policy) => policy.betaEnvironment, "prod-mobile"],
  ["production workflow", (policy) => policy.productionWorkflow, releaseFiles.productionWorkflow],
  ["production trigger", (policy) => policy.productionTrigger, "reviewer-approved-dispatch"],
  ["production environment", (policy) => policy.productionEnvironment, "prod-mobile-release"],
  ["release branch policy", (policy) => policy.branchPolicy, "main-only"],
  ["iOS beta channel", (policy) => policy.ios?.betaChannel, "testflight"],
  [
    "iOS tester distribution",
    (policy) => policy.ios?.testerDistribution,
    "app-store-connect-automatic-internal-groups",
  ],
  [
    "iOS production channel",
    (policy) => policy.ios?.productionChannel,
    "app-store-review-of-tested-build",
  ],
  ["iOS signing style", (policy) => policy.ios?.signingStyle, "automatic"],
  [
    "iOS development identity source",
    (policy) => policy.ios?.developmentIdentitySource,
    "reusable-ci-p12",
  ],
  [
    "iOS distribution signing stage",
    (policy) => policy.ios?.distributionSigningStage,
    "export",
  ],
  ["Android beta track", (policy) => policy.android?.betaTrack, "internal"],
  [
    "Android production channel",
    (policy) => policy.android?.productionChannel,
    "staged-rollout-of-tested-version-code",
  ],
  ["Android publisher auth", (policy) => policy.android?.publisherAuth, "github-oidc"],
  [
    "Android publisher service account",
    (policy) => policy.android?.publisherServiceAccount,
    "github-actions-play-publisher@catch-dating-app-64e51.iam.gserviceaccount.com",
  ],
];

const retiredReleaseFields = [
  "githubMode",
  "githubWorkflow",
  "automaticTestFlightOnMain",
  "legacyXcodeCloudWorkflow",
];

/** Returns the body of `lane :<name>` inside `platform :<platform>`, or "". */
export function fastlaneLaneSource(source, platform, lane) {
  const platformStart = source.indexOf(`platform :${platform} do`);
  if (platformStart < 0) return "";
  const platformEnd = source.indexOf("\nend\n", platformStart);
  const platformSource = source.slice(
    platformStart,
    platformEnd < 0 ? source.length : platformEnd,
  );
  const laneStart = platformSource.indexOf(`lane :${lane} do`);
  if (laneStart < 0) return "";
  const laneEnd = platformSource.indexOf("\n  end\n", laneStart);
  return platformSource.slice(laneStart, laneEnd < 0 ? platformSource.length : laneEnd);
}

export function validateReleaseOwnership({
  manifest,
  fastfileSource,
  betaWorkflowSource,
  productionWorkflowSource,
}) {
  const findings = [];
  const policy = manifest.releasePolicy ?? {};
  for (const [label, read, expected] of expectedReleasePolicy) {
    const actual = read(policy);
    if (actual !== expected) findings.push(`${label} was '${actual ?? ""}'; expected '${expected}'`);
  }
  if (JSON.stringify(policy.roles) !== JSON.stringify(expectedRoles)) {
    findings.push("release policy roles must be [consumer, host]");
  }
  if (!/^[A-F0-9]{64}$/u.test(policy.android?.uploadCertificateSha256 ?? "")) {
    findings.push("Android upload certificate SHA-256 must be a checked 64-digit hex value");
  }

  const prodTargets = (manifest.targets ?? []).filter((target) => target.environment === "prod");
  for (const target of prodTargets) {
    if (target.release?.owner !== "github-actions") {
      findings.push(`${target.id}: release owner must be github-actions`);
    }
    if (target.release?.googlePlayPackageName !== target.android?.applicationId) {
      findings.push(`${target.id}: Google Play package must match Android application id`);
    }
    for (const field of retiredReleaseFields) {
      if (Object.hasOwn(target.release ?? {}, field)) {
        findings.push(`${target.id}.release.${field} belonged to the retired release pipeline`);
      }
    }
  }

  const beta = betaWorkflowSource ?? "";
  for (const [label, marker] of [
    ["nightly schedule", /^on:[\s\S]*?^\s{2}schedule:\s*\n\s*- cron:/mu],
    ["manual dispatch", /^\s{2}workflow_dispatch:/mu],
    ["main-only guard", /github\.ref == 'refs\/heads\/main'/u],
    ["beta credentials environment", /environment:\s*prod-mobile\s*$/mu],
    ["serialized uploads", /concurrency:[\s\S]*?cancel-in-progress:\s*false/u],
    ["iOS beta lane", /bundle exec fastlane ios beta role:/u],
    ["Android beta lane", /bundle exec fastlane android beta role:/u],
    [
      "reusable iOS development certificate secret",
      /secrets\.IOS_CI_DEVELOPMENT_CERTIFICATE_P12_BASE64/u,
    ],
    ["keyless Play authentication", /google-github-actions\/auth@/u],
    ["pinned bundletool checksum", /BUNDLETOOL_SHA256/u],
    ["build provenance attestation", /actions\/attest-build-provenance@/u],
  ]) {
    if (!marker.test(beta)) findings.push(`${releaseFiles.betaWorkflow} is missing ${label}`);
  }
  for (const [label, marker] of [
    ["a production lane", /fastlane (?:ios|android) release/u],
    ["the production environment", /prod-mobile-release/u],
    ["a push or workflow_run trigger", /^\s{2}(?:push|workflow_run):/mu],
  ]) {
    if (marker.test(beta)) findings.push(`${releaseFiles.betaWorkflow} must not contain ${label}`);
  }

  const production = productionWorkflowSource ?? "";
  for (const [label, marker] of [
    ["manual dispatch", /^\s{2}workflow_dispatch:/mu],
    ["main-only guard", /github\.ref == 'refs\/heads\/main'/u],
    ["iOS release lane", /bundle exec fastlane ios release role:/u],
    ["Android release lane", /bundle exec fastlane android release role:/u],
  ]) {
    if (!marker.test(production)) {
      findings.push(`${releaseFiles.productionWorkflow} is missing ${label}`);
    }
  }
  const environments = [...production.matchAll(/^\s*environment:\s*(\S+)\s*$/gmu)]
    .map((match) => match[1]);
  if (environments.length === 0 || environments.some((name) => name !== "prod-mobile-release")) {
    findings.push(
      `${releaseFiles.productionWorkflow} must run every job in the reviewer-gated prod-mobile-release environment`,
    );
  }
  for (const [label, marker] of [
    ["a beta lane", /fastlane (?:ios|android) beta/u],
    ["an automatic trigger", /^\s{2}(?:schedule|push|workflow_run|pull_request):/mu],
  ]) {
    if (marker.test(production)) {
      findings.push(`${releaseFiles.productionWorkflow} must not contain ${label}`);
    }
  }

  const fastfile = fastfileSource ?? "";
  const lanes = {
    iosBeta: fastlaneLaneSource(fastfile, "ios", "beta"),
    iosRelease: fastlaneLaneSource(fastfile, "ios", "release"),
    androidBeta: fastlaneLaneSource(fastfile, "android", "beta"),
    androidRelease: fastlaneLaneSource(fastfile, "android", "release"),
  };
  for (const [name, source] of Object.entries(lanes)) {
    if (!source) findings.push(`${releaseFiles.lanes} is missing the ${name} lane`);
  }
  for (const [lane, label, marker] of [
    ["iosBeta", "prod build wrapper", /flutter_with_env\.sh", "prod"/u],
    ["iosBeta", "live callable dependency check", /verify_callable_dependencies\(role\)/u],
    ["iosBeta", "role-specific export options", /ExportOptions\.prod\.plist/u],
    ["iosBeta", "post-export iOS identity verification", /verify_ios_release_identity\.mjs"[\s\S]*?"--ipa"/u],
    ["iosBeta", "built Maps configuration check", /validate_google_maps_config\.mjs/u],
    ["iosBeta", "iOS package policy", /check_mobile_package\.mjs"[\s\S]*?"ios"/u],
    ["iosBeta", "internal-only TestFlight upload", /upload_to_testflight\([\s\S]*?distribute_external: false/u],
    ["androidBeta", "prod build wrapper", /flutter_with_env\.sh", "prod"/u],
    ["androidBeta", "live callable dependency check", /verify_callable_dependencies\(role\)/u],
    ["androidBeta", "signed Android identity verification", /verify_android_release_bundle\.mjs/u],
    ["androidBeta", "Android package policy", /check_mobile_package\.mjs"[\s\S]*?"android"/u],
    ["androidBeta", "internal track upload", /track: "internal"/u],
    ["iosRelease", "submission without a new binary", /skip_binary_upload: true/u],
    ["androidRelease", "promotion without a new bundle", /skip_upload_aab: true/u],
    ["androidRelease", "promotion from the internal track", /track: "internal",\s*track_promote_to: "production"/u],
  ]) {
    if (lanes[lane] && !marker.test(lanes[lane])) {
      findings.push(`${releaseFiles.lanes} ${lane} lane is missing ${label}`);
    }
  }
  for (const lane of ["iosBeta", "androidBeta"]) {
    if (/production|upload_to_app_store|submit_for_review/u.test(lanes[lane])) {
      findings.push(`${releaseFiles.lanes} ${lane} lane must not reach production`);
    }
  }
  for (const lane of ["iosRelease", "androidRelease"]) {
    if (/build_app|flutter_with_env\.sh/u.test(lanes[lane])) {
      findings.push(`${releaseFiles.lanes} ${lane} lane must promote a tested build, not rebuild`);
    }
  }
  if (/CODE_SIGN_IDENTITY\s*=/u.test(fastfile)) {
    findings.push(`${releaseFiles.lanes} must defer CODE_SIGN_IDENTITY to Xcode automatic signing`);
  }
  return findings;
}

export function scanAppTargets({root = defaultRepoRoot} = {}) {
  const manifest = loadAppTargets({root});
  const findings = validateManifestShape(manifest);
  const read = (relativePath) =>
    fs.readFileSync(resolveRepoPath(root, relativePath, findings), "utf8");

  const nativePolicy = manifest.appleNativeDependencies;
  if (nativePolicy) {
    const podProjects = [];
    for (const project of nativePolicy.podProjects ?? []) {
      const podfilePath = resolveRepoPath(root, project.podfile, findings);
      const lockfilePath = resolveRepoPath(root, project.lockfile, findings);
      for (const [label, filePath] of [
        [project.podfile, podfilePath],
        [project.lockfile, lockfilePath],
      ]) {
        if (!fs.existsSync(filePath)) findings.push(`missing ${label}`);
      }
      podProjects.push({
        podfilePath: project.podfile,
        podfileSource: fs.existsSync(podfilePath)
          ? fs.readFileSync(podfilePath, "utf8")
          : "",
        lockfilePath: project.lockfile,
        lockfileSource: fs.existsSync(lockfilePath)
          ? fs.readFileSync(lockfilePath, "utf8")
          : "",
      });
    }
    const pubLockPath = path.join(root, "pubspec.lock");
    if (!fs.existsSync(pubLockPath)) findings.push("missing pubspec.lock");
    findings.push(
      ...validateAppleFirebaseLockstep({
        policy: nativePolicy,
        pubLockSource: fs.existsSync(pubLockPath)
          ? fs.readFileSync(pubLockPath, "utf8")
          : "",
        podProjects,
      }),
    );
  }

  for (const role of expectedRoles) {
    const roleConfig = manifest.roles?.[role];
    if (!roleConfig) continue;
    checkRepoFile(
      root,
      `${roleConfig.projectRoot}/pubspec.yaml`,
      `${role}.projectRoot`,
      findings,
    );
    for (const field of ["entrypoint", "appRoot"]) {
      checkRepoFile(root, roleConfig[field], `${role}.${field}`, findings);
    }
    for (const field of ["iosEntitlements", "androidManifestOverlay"]) {
      checkRepoFile(root, roleProjectPath(roleConfig, field), `${role}.${field}`, findings);
    }
    const entrypointPath = resolveRepoPath(root, roleConfig.entrypoint, findings);
    if (fs.existsSync(entrypointPath)) {
      const source = fs.readFileSync(entrypointPath, "utf8");
      if (!source.includes(`AppRole.${role}`)) {
        findings.push(`${role}.entrypoint does not install AppRole.${role}`);
      }
      if (!source.includes(roleConfig.appWidget ?? "<missing-app-widget>")) {
        findings.push(`${role}.entrypoint does not install ${roleConfig.appWidget}`);
      }
    }
    const appRootPath = resolveRepoPath(root, roleConfig.appRoot, findings);
    if (fs.existsSync(appRootPath)) {
      const source = fs.readFileSync(appRootPath, "utf8");
      if (!source.includes(roleConfig.routerProvider ?? "<missing-router-provider>")) {
        findings.push(
          `${role}.appRoot does not select ${roleConfig.routerProvider}`,
        );
      }
      const oppositeRole = role === "consumer" ? "host" : "consumer";
      const oppositeProvider = manifest.roles?.[oppositeRole]?.routerProvider;
      if (oppositeProvider && source.includes(oppositeProvider)) {
        findings.push(
          `${role}.appRoot imports the ${oppositeRole} router provider`,
        );
      }
    }
  }

  const appleGeneratorPath = path.join(root, "tool/platform/configure_apple_flavors.rb");
  const appleGenerator = fs.existsSync(appleGeneratorPath)
    ? fs.readFileSync(appleGeneratorPath, "utf8")
    : "";
  if (
    !appleGenerator.includes("APP_TARGETS_PATH") ||
    !appleGenerator.includes("app_targets.json") ||
    !appleGenerator.includes("package_entrypoints") ||
    !appleGenerator.includes("projectRoot")
  ) {
    findings.push(
      "Apple flavor generator does not bind projectRoot and packageEntrypoint from tool/app_targets.json",
    );
  }

  for (const role of expectedRoles) {
    const projectRoot = manifest.roles?.[role]?.projectRoot;
    if (!projectRoot) continue;
    const androidBuildPath = path.join(
      root,
      projectRoot,
      "android/app/build.gradle.kts",
    );
    const androidBuild = fs.existsSync(androidBuildPath)
      ? fs.readFileSync(androidBuildPath, "utf8")
      : "";
    if (androidBuild.includes("catchAppRole")) {
      findings.push(`${role}: Android still selects product identity through catchAppRole`);
    }
    findings.push(
      ...validateAndroidBuildSource(androidBuild).map(
        (finding) => `${role}: ${finding}`,
      ),
    );
    if (!androidBuild.includes(`appProjectRole = "${role}"`)) {
      findings.push(`${role}: Android project does not pin appProjectRole`);
    }
    if (!androidBuild.includes('jsonString(target, "packageEntrypoint"')) {
      findings.push(`${role}: Android project does not compile packageEntrypoint`);
    }

    const sharedAndroidManifestPath = path.join(
      root,
      projectRoot,
      "android/app/src/main/AndroidManifest.xml",
    );
    if (fs.existsSync(sharedAndroidManifestPath)) {
      findings.push(
        ...validateSharedAndroidManifestSource(
          fs.readFileSync(sharedAndroidManifestPath, "utf8"),
        ).map((finding) => `${role}: ${finding}`),
      );
    } else {
      findings.push(`${role}: missing Android shared base manifest`);
    }
  }

  for (const target of manifest.targets ?? []) {
    const appleProjectPath = path.join(
      root,
      target.projectRoot,
      "ios/Runner.xcodeproj/project.pbxproj",
    );
    const appleProject = fs.existsSync(appleProjectPath)
      ? fs.readFileSync(appleProjectPath, "utf8")
      : "";
    const macosProjectPath = path.join(
      root,
      target.projectRoot,
      "macos/Runner.xcodeproj/project.pbxproj",
    );
    // Only the Consumer project ships the macOS runner that hosts the native
    // app-shell smoke suite; a Consumer target without it is drift.
    const hasMacosRunner = target.role === "consumer" || fs.existsSync(macosProjectPath);
    validateTarget({
      root,
      manifest,
      target,
      findings,
      read,
      appleGenerator,
      appleConfigurations: parseAppleBuildConfigurations(appleProject),
      macosConfigurations: hasMacosRunner && fs.existsSync(macosProjectPath)
        ? parseAppleBuildConfigurations(fs.readFileSync(macosProjectPath, "utf8"))
        : hasMacosRunner ? parseAppleBuildConfigurations("") : null,
    });
  }

  validateRoleCapabilities({root, manifest, findings});
  validateDeepLinkOwnership({root, manifest, findings});
  validateRemoteConfigOwnership({root, manifest, findings});

  const releaseSources = {};
  for (const [key, relativePath] of Object.entries(releaseFiles)) {
    const filePath = path.join(root, relativePath);
    if (fs.existsSync(filePath)) {
      releaseSources[key] = fs.readFileSync(filePath, "utf8");
    } else {
      findings.push(`missing ${relativePath}`);
    }
  }
  findings.push(...validateReleaseOwnership({
    manifest,
    fastfileSource: releaseSources.lanes,
    betaWorkflowSource: releaseSources.betaWorkflow,
    productionWorkflowSource: releaseSources.productionWorkflow,
  }));

  return {manifest, findings};
}

function validateTarget({
  root,
  manifest,
  target,
  findings,
  read,
  appleGenerator,
  appleConfigurations,
  macosConfigurations,
}) {
  const label = target.id ?? "<missing-target-id>";
  const environment = manifest.environments?.[target.environment];
  if (target.firebase?.projectId !== environment?.firebaseProjectId) {
    findings.push(`${label}: Firebase project does not match environment contract`);
  }

  checkRepoFile(root, target.entrypoint, `${label}.entrypoint`, findings);
  checkRepoFile(
    root,
    `${target.projectRoot}/${target.packageEntrypoint}`,
    `${label}.packageEntrypoint`,
    findings,
  );
  const entrypointPath = resolveRepoPath(root, target.entrypoint, findings);
  if (fs.existsSync(entrypointPath)) {
    const source = fs.readFileSync(entrypointPath, "utf8");
    for (const marker of [
      `AppRole.${target.role}`,
      `AppEnvironment.${target.environment}`,
    ]) {
      if (!source.includes(marker)) {
        findings.push(`${label}: entrypoint is missing ${marker}`);
      }
    }
  }

  for (const platform of ["android", "ios", "macos", "web"]) {
    checkRepoFile(
      root,
      target.firebase?.[platform]?.configPath,
      `${label}.firebase.${platform}.configPath`,
      findings,
    );
  }
  checkRepoFile(root, target.firebase?.dartOptionsFile, `${label}.dartOptionsFile`, findings);

  const androidPath = resolveRepoPath(root, target.firebase?.android?.configPath, findings);
  if (fs.existsSync(androidPath)) {
    const config = JSON.parse(fs.readFileSync(androidPath, "utf8"));
    const client = androidClientFor(config, target.android?.applicationId);
    if (!client) {
      findings.push(`${label}: Android Firebase config has no ${target.android?.applicationId} client`);
    } else if (client.client_info?.mobilesdk_app_id !== target.firebase.android.appId) {
      findings.push(`${label}: Android Firebase app id drift`);
    }
    if (config.project_info?.project_id !== target.firebase.projectId) {
      findings.push(`${label}: Android Firebase project id drift`);
    }
  }

  for (const platform of ["ios", "macos"]) {
    const configPath = resolveRepoPath(root, target.firebase?.[platform]?.configPath, findings);
    if (!fs.existsSync(configPath)) continue;
    const plist = fs.readFileSync(configPath, "utf8");
    if (plistString(plist, "GOOGLE_APP_ID") !== target.firebase[platform].appId) {
      findings.push(`${label}: ${platform} Firebase app id drift`);
    }
    if (plistString(plist, "BUNDLE_ID") !== target.ios.bundleId) {
      findings.push(`${label}: ${platform} Firebase bundle id drift`);
    }
    if (plistString(plist, "PROJECT_ID") !== target.firebase.projectId) {
      findings.push(`${label}: ${platform} Firebase project id drift`);
    }
  }

  const webPath = resolveRepoPath(root, target.firebase?.web?.configPath, findings);
  if (fs.existsSync(webPath)) {
    const webSource = fs.readFileSync(webPath, "utf8");
    for (const expected of [target.firebase.web.appId, target.firebase.projectId]) {
      if (!webSource.includes(expected)) findings.push(`${label}: web Firebase config missing ${expected}`);
    }
  }

  const dartOptionsPath = resolveRepoPath(root, target.firebase?.dartOptionsFile, findings);
  if (fs.existsSync(dartOptionsPath)) {
    const dartSource = fs.readFileSync(dartOptionsPath, "utf8");
    for (const platform of ["android", "ios", "macos", "web"]) {
      const member = target.firebase.dartOptionsMembers?.[platform];
      const block = firebaseOptionsBlock(dartSource, member);
      if (!block) {
        findings.push(`${label}: missing Dart Firebase options member ${member}`);
        continue;
      }
      for (const expected of [target.firebase[platform].appId, target.firebase.projectId]) {
        if (!block.includes(expected)) {
          findings.push(`${label}: Dart ${member} options missing ${expected}`);
        }
      }
    }
  }

  validateAppleScheme({
    root,
    projectRoot: target.projectRoot,
    target,
    platform: "ios",
    findings,
  });
  if (macosConfigurations) {
    validateAppleScheme({
      root,
      projectRoot: target.projectRoot,
      target,
      platform: "macos",
      findings,
    });
  }

  validateAppleTargetConfigurations({
    manifest,
    target,
    platform: "ios",
    configurations: appleConfigurations,
    findings,
  });
  if (macosConfigurations) {
    validateAppleTargetConfigurations({
      manifest,
      target,
      platform: "macos",
      configurations: macosConfigurations,
      findings,
    });
  }
  for (const platform of macosConfigurations ? ["ios", "macos"] : ["ios"]) {
    const iconPath = path.join(
      root,
      target.projectRoot,
      platform,
      "Runner/Assets.xcassets",
      `${target.ios.iconSet}.appiconset/Contents.json`,
    );
    if (!fs.existsSync(iconPath)) {
      findings.push(`${label}: missing ${platform} icon set ${target.ios.iconSet}`);
    }
  }

  const androidResRoot = target.android.iconSourceSet === "main"
    ? path.join(root, target.projectRoot, "android/app/src/main/res")
    : path.join(
        root,
        target.projectRoot,
        "android/app/src",
        target.android.iconSourceSet,
        "res",
      );
  for (const icon of ["ic_launcher.png", "ic_launcher_round.png"]) {
    if (!findFile(androidResRoot, icon)) {
      findings.push(`${label}: ${target.android.iconSourceSet} is missing ${icon}`);
    }
  }

  if (target.release && target.release.appStoreConnectAppId !== manifest.roles[target.role].storeProduct.appStoreConnectAppId) {
    findings.push(`${label}: App Store Connect id differs from role store product`);
  }
}

function validateAppleScheme({
  root,
  projectRoot = "",
  target,
  platform,
  findings,
}) {
  const schemePath = path.join(
    root,
    projectRoot,
    `${platform}/Runner.xcodeproj/xcshareddata/xcschemes`,
    `${target.ios.scheme}.xcscheme`,
  );
  if (!fs.existsSync(schemePath)) {
    findings.push(`${target.id}: missing ${platform} scheme ${target.ios.scheme}`);
    return;
  }
  const scheme = fs.readFileSync(schemePath, "utf8");
  for (const configuration of Object.values(target.ios.configurations ?? {})) {
    if (!scheme.includes(`buildConfiguration = "${configuration}"`)) {
      findings.push(`${target.id}: ${platform} scheme missing ${configuration}`);
    }
  }
  if (!scheme.includes(`BuildableName = "${target.displayName}.app"`)) {
    findings.push(`${target.id}: ${platform} scheme product name drift`);
  }
}

function validateAppleTargetConfigurations({
  manifest,
  target,
  platform,
  configurations,
  findings,
}) {
  const role = manifest.roles[target.role];
  const expectedSettings = {
    PRODUCT_BUNDLE_IDENTIFIER: target.ios.bundleId,
    PRODUCT_NAME: target.displayName,
    ASSETCATALOG_COMPILER_APPICON_NAME: target.ios.iconSet,
    CATCH_APP_TARGET_ID: target.id,
    FLUTTER_TARGET: `$(SRCROOT)/../${target.packageEntrypoint}`,
    FLAVOR: target.ios.scheme,
    FIREBASE_ENV: target.environment,
    FIREBASE_ROLE: target.role,
    FIREBASE_ROLE_PATH: target.role === "host" ? "host/" : "",
  };
  if (platform === "ios") {
    expectedSettings.APP_DISPLAY_NAME = target.displayName;
    expectedSettings.CODE_SIGN_ENTITLEMENTS = role.iosEntitlements.replace(/^ios\//u, "");
    expectedSettings.FIREBASE_IOS_URL_SCHEME = target.ios.urlScheme;
  }

  for (const configurationName of Object.values(target.ios.configurations ?? {})) {
    const matches = configurations.filter(
      (configuration) => configuration.name === configurationName,
    );
    if (matches.length !== 1) {
      findings.push(
        `${target.id}: expected one ${platform} Runner configuration ${configurationName}; found ${matches.length}`,
      );
      continue;
    }
    if (platform === "ios") {
      findings.push(
        ...validateAutomaticAppleSigningSettings({
          targetId: target.id,
          configurationName,
          settings: matches[0].settings,
        }),
      );
    }
    for (const [key, expected] of Object.entries(expectedSettings)) {
      const actual = matches[0].settings[key];
      if (actual !== expected) {
        findings.push(
          `${target.id}: ${configurationName} ${key} was '${actual ?? ""}'; expected '${expected}'`,
        );
      }
    }
  }
}

function validateRoleCapabilities({root, manifest, findings}) {
  for (const role of expectedRoles) {
    const roleConfig = manifest.roles[role];
    const entitlementsPath = resolveRepoPath(
      root,
      roleProjectPath(roleConfig, "iosEntitlements"),
      findings,
    );
    const entitlements = fs.existsSync(entitlementsPath)
      ? fs.readFileSync(entitlementsPath, "utf8")
      : "";
    const androidManifestPath = resolveRepoPath(
      root,
      roleProjectPath(roleConfig, "androidManifestOverlay"),
      findings,
    );
    const androidManifest = fs.existsSync(androidManifestPath)
      ? fs.readFileSync(androidManifestPath, "utf8")
      : "";
    const expectsConsumerCapabilities = role === "consumer";
    for (const [label, source, marker] of [
      ["HealthKit", entitlements, "com.apple.developer.healthkit"],
      ["associated domains", entitlements, "com.apple.developer.associated-domains"],
      ["Health Connect", androidManifest, "android.permission.health.READ_EXERCISE"],
      ["public app links", androidManifest, "android:autoVerify=\"true\""],
    ]) {
      if (expectsConsumerCapabilities && !source.includes(marker)) {
        findings.push(`${role}: missing ${label} capability`);
      }
      if (!expectsConsumerCapabilities && source.includes(marker)) {
        findings.push(`${role}: must not inherit ${label} capability`);
      }
    }
  }
}

function validateDeepLinkOwnership({root, manifest, findings}) {
  const aasaPath = path.join(root, "website/public/.well-known/apple-app-site-association");
  const assetLinksPath = path.join(root, "website/public/.well-known/assetlinks.json");
  if (!fs.existsSync(aasaPath) || !fs.existsSync(assetLinksPath)) {
    findings.push("missing public deep-link association files");
    return;
  }
  const aasa = JSON.parse(fs.readFileSync(aasaPath, "utf8"));
  const assetLinks = JSON.parse(fs.readFileSync(assetLinksPath, "utf8"));
  const appleIds = new Set((aasa.applinks?.details ?? []).map((item) => item.appID));
  const androidPackages = new Set(assetLinks.map((item) => item.target?.package_name));
  const teamId = "2HQBK4UMUT";
  for (const target of manifest.targets ?? []) {
    const ownsLinks = manifest.roles[target.role].deepLinks.policy === "public-event-links";
    const appleId = `${teamId}.${target.ios.bundleId}`;
    if (ownsLinks !== appleIds.has(appleId)) {
      findings.push(`${target.id}: Apple deep-link ownership drift`);
    }
    if (ownsLinks !== androidPackages.has(target.android.applicationId)) {
      findings.push(`${target.id}: Android deep-link ownership drift`);
    }
  }
}

function validateRemoteConfigOwnership({root, manifest, findings}) {
  const templatePath = path.join(root, "firebase/remote_config.template.json");
  const providerPath = path.join(root, "lib/contexts/account/data/app_version_config_provider.dart");
  if (!fs.existsSync(templatePath) || !fs.existsSync(providerPath)) {
    findings.push("missing force-update source files");
    return;
  }
  const parameters = JSON.parse(fs.readFileSync(templatePath, "utf8")).parameters ?? {};
  for (const role of expectedRoles) {
    const prefix = manifest.roles[role].remoteConfigPrefix;
    for (const suffix of [
      "min_version",
      "min_build_android",
      "min_build_ios",
      "min_build_web",
      "min_build_macos",
      "store_url_android",
      "store_url_ios",
    ]) {
      if (!parameters[`${prefix}_${suffix}`]) {
        findings.push(`Remote Config is missing ${prefix}_${suffix}`);
      }
    }
  }
  const providerSource = fs.readFileSync(providerPath, "utf8");
  if (!providerSource.includes("AppConfig.appRole")) {
    findings.push("force-update provider does not select keys by app role");
  }
  findings.push(...validateHostReleaseVisibility({
    accessSource: fs.readFileSync(path.join(root,
      "lib/contexts/programmes/domain/phone_import_access.dart"), "utf8"),
    routeSource: fs.readFileSync(path.join(root,
      "lib/hosts/audience/phone_import/presentation/phone_import_route_controller.dart"), "utf8"),
    workSource: fs.readFileSync(path.join(root,
      "lib/programs/presentation/program_work_screen.dart"), "utf8"),
  }));
}

/** Prevent the retired binary production hold from returning to the phone
 * import path. App environment checks elsewhere retain their identity/security
 * meaning. Retired Remote Config gates are owned by the `retired` section of
 * tool/firebase/environment_difference_policy.json, which
 * report_environment_parity.mjs --policy-only enforces against the template. */
export function validateHostReleaseVisibility({accessSource, routeSource,
  workSource}) {
  const findings = [];
  for (const [label, source] of [
    ["phone access", accessSource], ["phone route", routeSource],
    ["program work", workSource],
  ]) {
    const compiledDenial = /if\s*\(\s*(?:AppConfig\.environment\.isProduction|AppConfig\.environment\s*==\s*AppEnvironment\.prod|kReleaseMode)\s*\)\s*(?:\{\s*)?return\s+false\b/u;
    const compiledVisibility = /(?:!AppConfig\.environment\.isProduction|!kReleaseMode)\s*&&\s*(?:canImportWeddingPhoneContacts|phoneImport)/u;
    if (compiledDenial.test(source) || compiledVisibility.test(source)) {
      findings.push(`${label}: compiled environment release hold is forbidden`);
    }
  }
  return findings;
}

// Role-owned native files are named relative to that role's app project, the
// same way configure_apple_flavors.rb binds iosEntitlements.
function roleProjectPath(roleConfig, field) {
  return roleConfig[field] ? `${roleConfig.projectRoot}/${roleConfig[field]}` : undefined;
}

function checkRepoFile(root, relativePath, label, findings) {
  if (!relativePath) {
    findings.push(`${label}: path is required`);
    return;
  }
  const resolved = resolveRepoPath(root, relativePath, findings);
  if (!fs.existsSync(resolved)) findings.push(`${label}: missing ${relativePath}`);
}

function resolveRepoPath(root, relativePath, findings) {
  const safePath = typeof relativePath === "string" ? relativePath : "";
  if (path.isAbsolute(safePath)) findings.push(`absolute repo path is forbidden: ${safePath}`);
  const resolved = path.resolve(root, safePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    findings.push(`repo path escapes root: ${safePath}`);
  }
  return resolved;
}

function plistString(source, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return source.match(new RegExp(`<key>${escaped}</key>\\s*<string>([^<]+)</string>`, "u"))?.[1];
}

function firebaseOptionsBlock(source, member) {
  if (!member) return null;
  const start = source.indexOf(`static const FirebaseOptions ${member} = FirebaseOptions(`);
  if (start < 0) return null;
  const end = source.indexOf("\n  );", start);
  return end < 0 ? source.slice(start) : source.slice(start, end + 5);
}

function findFile(root, filename) {
  if (!fs.existsSync(root)) return false;
  const queue = [root];
  while (queue.length > 0) {
    const current = queue.pop();
    for (const entry of fs.readdirSync(current, {withFileTypes: true})) {
      const candidate = path.join(current, entry.name);
      if (entry.isDirectory()) queue.push(candidate);
      if (entry.isFile() && entry.name === filename) return true;
    }
  }
  return false;
}

function unquoteBuildSetting(value) {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}

function runCli() {
  const result = scanAppTargets();
  console.log(
    `App targets: ${result.manifest.targets.length} checked, ${result.findings.length} finding(s).`,
  );
  if (result.findings.length > 0) {
    for (const finding of result.findings) console.error(`- ${finding}`);
    process.exitCode = 1;
  }
}

const isMain = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;
if (isMain) {
  try {
    runCli();
  } catch (error) {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
  }
}
