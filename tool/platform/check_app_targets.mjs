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
const expectedExternalGates = new Map([
  [
    "APP-TARGET-IOS-GITHUB-CUTOVER-001",
    {
      issue: 218,
      scope: "consumer-and-host-testflight-internal-distribution",
    },
  ],
  [
    "APP-TARGET-ANDROID-PLAY-001",
    {
      issue: 199,
      scope: "consumer-and-host-google-play-internal-distribution",
    },
  ],
]);

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
    if (roleConfig.storeProduct?.testFlightDistributionPolicy !==
        "all-existing-internal-groups-with-testers") {
      findings.push(
        `${role}: TestFlight distribution policy must target all existing internal groups with testers`,
      );
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

export function validateExternalGateContract(contract) {
  const findings = [];
  if (contract?.$schema !== "catch.app-target-external-gates/v1") {
    findings.push(
      "external gates $schema must be catch.app-target-external-gates/v1",
    );
  }
  if (contract?.schemaVersion !== 1) {
    findings.push("external gates schemaVersion must be 1");
  }
  if (contract?.logicalName !== "catch-app-target-external-gates") {
    findings.push(
      "external gates logicalName must be catch-app-target-external-gates",
    );
  }
  const gates = Array.isArray(contract?.gates) ? contract.gates : [];
  if (gates.length !== expectedExternalGates.size) {
    findings.push(
      `expected ${expectedExternalGates.size} external gates, found ${gates.length}`,
    );
  }
  const seen = new Set();
  for (const gate of gates) {
    const expected = expectedExternalGates.get(gate?.id);
    if (!expected) {
      findings.push(`unknown external gate ${gate?.id ?? "<missing-id>"}`);
      continue;
    }
    if (seen.has(gate.id)) findings.push(`duplicate external gate ${gate.id}`);
    seen.add(gate.id);
    if (!["blocked_external", "resolved"].includes(gate.status)) {
      findings.push(`${gate.id}: status must be blocked_external or resolved`);
    }
    if (gate.issue !== expected.issue) {
      findings.push(`${gate.id}: issue must be ${expected.issue}`);
    }
    if (gate.scope !== expected.scope) {
      findings.push(`${gate.id}: scope must be ${expected.scope}`);
    }
    if (!Array.isArray(gate.closureCriteria) || gate.closureCriteria.length === 0 ||
        gate.closureCriteria.some((criterion) =>
          typeof criterion !== "string" || criterion.trim().length === 0)) {
      findings.push(`${gate.id}: closureCriteria must contain non-empty strings`);
    }
    for (const retiredKey of ["evidence", "removalProof", "runIds"]) {
      if (Object.hasOwn(gate, retiredKey)) {
        findings.push(`${gate.id}: ${retiredKey} belongs in Git, Issues, or the release runbook`);
      }
    }
  }
  for (const gateId of expectedExternalGates.keys()) {
    if (!seen.has(gateId)) findings.push(`missing external gate ${gateId}`);
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

export function hasActiveExternalGate(contract, gateId) {
  return (contract?.gates ?? []).some(
    (gate) => gate.id === gateId && gate.status !== "resolved",
  );
}

export function validateReleaseOwnership({
  externalGates,
  manifest,
  workflowSource,
}) {
  const findings = [];
  const warnings = [];
  const policy = manifest.releasePolicy ?? {};
  const workflow = ".github/workflows/mobile-internal-release.yml";
  const promotionWorkflow = ".github/workflows/mobile-internal-promote.yml";
  for (const [label, actual, expected] of [
    ["release owner", policy.owner, "github-actions"],
    ["release workflow", policy.workflow, workflow],
    ["release promotion workflow", policy.promotionWorkflow, promotionWorkflow],
    [
      "release trigger",
      policy.trigger,
      "successful-main-ci-exact-artifact-authority",
    ],
    ["release environment", policy.environment, "prod-mobile"],
    [
      "release approval mode",
      policy.approvalMode,
      "automatic-ios-exact-artifact-internal-promotion",
    ],
    ["release branch policy", policy.branchPolicy, "main-only"],
    ["iOS channel", policy.ios?.channel, "testflight"],
    ["iOS upload mode", policy.ios?.uploadMode, "separate-promotion-workflow"],
    [
      "iOS distribution policy",
      policy.ios?.distributionPolicy,
      "all-existing-internal-groups-with-testers",
    ],
    ["iOS signing style", policy.ios?.signingStyle, "automatic"],
    [
      "iOS development identity source",
      policy.ios?.developmentIdentitySource,
      "reusable-ci-p12",
    ],
    ["iOS distribution signing stage", policy.ios?.distributionSigningStage, "export"],
    ["iOS upload artifact", policy.ios?.uploadArtifact, "verified-ipa"],
    ["iOS upload tool", policy.ios?.uploadTool, "altool"],
    ["Android channel", policy.android?.channel, "play-internal"],
    ["Android track", policy.android?.track, "qa"],
    ["Android upload mode", policy.android?.uploadMode, "separate-promotion-workflow"],
    ["Android publisher auth", policy.android?.publisherAuth, "github-oidc"],
    [
      "Android publisher service account",
      policy.android?.publisherServiceAccount,
      "github-actions-play-publisher@catch-dating-app-64e51.iam.gserviceaccount.com",
    ],
  ]) {
    if (actual !== expected) findings.push(`${label} was '${actual ?? ""}'; expected '${expected}'`);
  }
  if (JSON.stringify(policy.roles) !== JSON.stringify(expectedRoles)) {
    findings.push("release policy roles must be [consumer, host]");
  }
  if (JSON.stringify(policy.ios?.automaticRoles) !== JSON.stringify(expectedRoles)) {
    findings.push("mobile package producer iOS automatic roles must be [consumer, host]");
  }
  if (!/^[A-F0-9]{64}$/u.test(policy.android?.uploadCertificateSha256 ?? "")) {
    findings.push("Android upload certificate SHA-256 must be a checked 64-digit hex value");
  }

  const prodTargets = (manifest.targets ?? []).filter((target) => target.environment === "prod");
  for (const target of prodTargets) {
    if (target.release?.owner !== "github-actions") {
      findings.push(`${target.id}: release owner must be github-actions`);
    }
    if (target.release?.githubMode !== "automatic-exact-artifact") {
      findings.push(`${target.id}: githubMode must be automatic-exact-artifact`);
    }
    if (target.release?.automaticTestFlightOnMain !== true) {
      findings.push(`${target.id}: automaticTestFlightOnMain must be true`);
    }
    if (target.release?.githubWorkflow !== workflow) {
      findings.push(`${target.id}: release workflow must be ${workflow}`);
    }
    if (target.release?.googlePlayPackageName !== target.android?.applicationId) {
      findings.push(`${target.id}: Google Play package must match Android application id`);
    }
    if (!target.release?.legacyXcodeCloudWorkflow) {
      findings.push(`${target.id}: legacy Xcode Cloud workflow name is required for cutover`);
    }
  }

  for (const [label, marker] of [
    ["successful CI workflow-run trigger", /workflow_run:[\s\S]*?workflows:\s*\["CI"\][\s\S]*?types:\s*\[completed\][\s\S]*?branches:\s*\[main\]/u],
    ["CI authority v3 verification", /catch\.ci-delivery-authority\/v3/u],
    ["immutable CI authority artifact download", /actions\/artifacts\/\$authority_id\/zip/u],
    ["immutable CI plan artifact download", /actions\/artifacts\/\$plan_id\/zip/u],
    ["exact mobile release target projection", /\.operations\.releaseTargets/u],
    ["iOS target matrix", /prod-ios:[\s\S]*?matrix:[\s\S]*?release_target/u],
    ["Android target matrix", /prod-android:[\s\S]*?matrix:[\s\S]*?release_target/u],
    ["mobile credentials environment", /environment:\s*prod-mobile/u],
    [
      "reusable iOS development certificate secret",
      /secrets\.IOS_CI_DEVELOPMENT_CERTIFICATE_P12_BASE64/u,
    ],
    [
      "reusable iOS development certificate password secret",
      /secrets\.IOS_CI_DEVELOPMENT_CERTIFICATE_PASSWORD/u,
    ],
    [
      "reusable iOS development certificate fingerprint",
      /vars\.IOS_CI_DEVELOPMENT_CERTIFICATE_SHA256/u,
    ],
    [
      "reusable iOS development certificate expiry metadata",
      /vars\.IOS_CI_DEVELOPMENT_CERTIFICATE_EXPIRES_AT/u,
    ],
    [
      "non-extractable reusable iOS identity import",
      /security import "\$p12_path"[\s\S]*?-f pkcs12[\s\S]*?-x[\s\S]*?-T \/usr\/bin\/codesign/u,
    ],
    [
      "reusable iOS identity team validation",
      /PlistBuddy -c 'Print :teamID' "\$APP_PROJECT_ROOT\/ios\/ExportOptions\.prod\.plist"/u,
    ],
    [
      "reusable iOS identity certificate subject validation",
      /certificate_subject[\s\S]*?CN=Apple Development:[\s\S]*?OU=\$expected_team_id/u,
    ],
    [
      "reusable iOS identity fingerprint derivation",
      /actual_sha256=.*openssl x509[\s\S]*?-fingerprint -sha256/u,
    ],
    [
      "reusable iOS identity fingerprint validation",
      /"\$actual_sha256" != "\$expected_sha256"/u,
    ],
    [
      "reusable iOS identity expiry metadata validation",
      /"\$actual_expiry_epoch" != "\$configured_expiry_epoch"/u,
    ],
    [
      "reusable iOS identity validity floor",
      /openssl x509[\s\S]*?-checkend 2592000/u,
    ],
    [
      "single valid reusable iOS development identity",
      /security find-identity -v -p codesigning/u,
    ],
    [
      "always-run reusable iOS identity cleanup",
      /Remove ephemeral iOS signing material[\s\S]*?if:\s*\$\{\{ always\(\) \}\}[\s\S]*?security delete-keychain/u,
    ],
    ["automatic iOS distribution export", /xcodebuild\s*\\\s*\n\s*-exportArchive/u],
    [
      "role-specific iOS workspace",
      /-workspace "\$APP_PROJECT_ROOT\/ios\/Runner\.xcworkspace"/u,
    ],
    [
      "role-specific iOS export options",
      /-exportOptionsPlist "\$APP_PROJECT_ROOT\/ios\/ExportOptions\.prod\.plist"/u,
    ],
    ["post-export iOS identity verification", /verify_ios_release_identity\.mjs\s*\\[\s\S]*?--ipa/u],
    ["verified IPA checksum", /shasum\s+-a\s+256\s+"\$ipa_path"/u],
    ["signed Android identity verification", /verify_android_release_bundle\.mjs/u],
    [
      "role-specific Android signing root",
      /"\$APP_PROJECT_ROOT\/android\/key\.properties"/u,
    ],
    [
      "role-specific Android bundle output",
      /find "\$APP_PROJECT_ROOT\/build\/app\/outputs\/bundle"/u,
    ],
    ["serialized release concurrency", /concurrency:[\s\S]*?cancel-in-progress:\s*false/u],
    ["read-only App Store build-floor proof", /verify_app_store_build\.mjs[\s\S]*?--check-candidate/u],
    ["pinned bundletool checksum", /BUNDLETOOL_SHA256/u],
    ["delivery-core mobile package adapter", /package_mobile_release\.mjs prepare/u],
    ["immutable package upload binding", /package_mobile_release\.mjs bind-upload/u],
    ["90-day package retention", /retention-days:\s*90/u],
    ["cross-role package comparison", /compare-role-packages:[\s\S]*?check_mobile_package\.mjs --compare/u],
    ["post-comparison build authority", /publish-authority:[\s\S]*?needs:\s*compare-role-packages[\s\S]*?catch\.mobile-build-authority\/v2/u],
  ]) {
    if (!marker.test(workflowSource)) findings.push(`mobile release workflow is missing ${label}`);
  }
  if (/CODE_SIGN_IDENTITY\s*=/u.test(workflowSource)) {
    findings.push(
      "mobile release workflow must defer CODE_SIGN_IDENTITY to Xcode automatic signing",
    );
  }
  const exportArchiveCount = workflowSource.match(/-exportArchive/gu)?.length ?? 0;
  if (exportArchiveCount !== 1) {
    findings.push(
      `mobile release workflow must export exactly one IPA before verification and packaging; found ${exportArchiveCount} -exportArchive commands`,
    );
  }
  for (const [label, marker] of [
    ["TestFlight upload", /xcrun\s+altool|--upload-package/u],
    ["Play upload", /upload_google_play_bundle\.mjs/u],
    ["Play mutation probe", /probe_google_play_access\.mjs/u],
    ["legacy Xcode Cloud mutation", /set_xcode_cloud_workflow_state\.mjs/u],
    ["manual release dispatch", /^\s{2}workflow_dispatch:/mu],
    ["store apply flag", /--apply|--allow-prod/u],
  ]) {
    if (marker.test(workflowSource)) {
      findings.push(`mobile package producer must not contain ${label}`);
    }
  }

  for (const gateId of [
    "APP-TARGET-IOS-GITHUB-CUTOVER-001",
    "APP-TARGET-ANDROID-PLAY-001",
  ]) {
    const gate = (externalGates?.gates ?? []).find(
      (candidate) => candidate.id === gateId,
    );
    if (!gate) {
      findings.push(`${gateId}: missing external gate`);
    } else if (hasActiveExternalGate(externalGates, gateId)) {
      warnings.push(`${gateId}: external store distribution proof remains pending`);
    }
  }
  return {findings, warnings};
}

export function scanAppTargets({root = defaultRepoRoot} = {}) {
  const manifest = loadAppTargets({root});
  const findings = validateManifestShape(manifest);
  const warnings = [];
  const externalGatesPath = path.join(
    root,
    "tool/app_target_external_gates.json",
  );
  let externalGates = null;
  try {
    externalGates = JSON.parse(fs.readFileSync(externalGatesPath, "utf8"));
    findings.push(...validateExternalGateContract(externalGates));
  } catch (error) {
    findings.push(
      `tool/app_target_external_gates.json: ${error.message}`,
    );
  }
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

  const prodWorkflow = path.join(root, ".github/workflows/mobile-internal-release.yml");
  if (fs.existsSync(prodWorkflow)) {
    const releaseResult = validateReleaseOwnership({
      externalGates,
      manifest,
      workflowSource: fs.readFileSync(prodWorkflow, "utf8") + "\n" +
        fs.readFileSync(path.join(root, ".github/workflows/_mobile-platform-authority.yml"), "utf8"),
    });
    findings.push(...releaseResult.findings);
    warnings.push(...releaseResult.warnings);
  } else {
    findings.push("missing .github/workflows/mobile-internal-release.yml");
  }

  const promotionWorkflow = path.join(
    root,
    ".github/workflows/mobile-internal-promote.yml",
  );
  if (!fs.existsSync(promotionWorkflow)) {
    findings.push("missing .github/workflows/mobile-internal-promote.yml");
  }

  return {manifest, findings, warnings};
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
  const providerPath = path.join(root, "lib/force_update/data/app_version_config_provider.dart");
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
      "lib/hosts/audience/phone_import/domain/phone_import_access.dart"), "utf8"),
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
    `App targets: ${result.manifest.targets.length} checked, ${result.findings.length} finding(s), ${result.warnings.length} external warning(s).`,
  );
  for (const warning of result.warnings) console.warn(`- warning: ${warning}`);
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
