import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  androidClientFor,
  fastlaneLaneSource,
  packageVersionFromPubLock,
  parseAppleBuildConfigurations,
  validateAppleFirebaseLockstep,
  validateAutomaticAppleSigningSettings,
  validateAndroidBuildSource,
  validateManifestShape,
  validateReleaseOwnership,
  validateSharedAndroidManifestSource,
  validateHostReleaseVisibility,
} from "./check_app_targets.mjs";
import {resolveAppTarget, valueAtPath} from "./resolve_app_target.mjs";

test("phone import rejects compiled release holds", () => {
  const sources = {accessSource: "canImportWeddingPhoneContacts",
    routeSource: "canImportWeddingPhoneContacts",
    workSource: "canImportWeddingPhoneContacts"};
  assert.deepEqual(validateHostReleaseVisibility(sources), []);
  assert.deepEqual(validateHostReleaseVisibility({...sources,
    workSource: "final banner = AppConfig.environment.bannerLabel;"}), []);
  assert.match(validateHostReleaseVisibility({...sources,
    accessSource: "if (AppConfig.environment.isProduction) return false;"})[0],
  /compiled environment release hold/u);
});

function validManifest() {
  const roles = {
    consumer: {
      projectRoot: "apps/consumer",
      entrypoint: "apps/consumer/lib/main.dart",
      packageEntrypoint: "lib/main.dart",
      storeProduct: {
        appStoreConnectAppId: "consumer-app",
      },
    },
    host: {
      projectRoot: "apps/host",
      entrypoint: "apps/host/lib/main.dart",
      packageEntrypoint: "lib/main.dart",
      storeProduct: {
        appStoreConnectAppId: "host-app",
      },
    },
  };
  const environments = {
    dev: {},
    staging: {},
    prod: {},
  };
  const targets = [];
  for (const role of Object.keys(roles)) {
    for (const environment of Object.keys(environments)) {
      targets.push({
        id: `${role}-${environment}`,
        role,
        environment,
        projectRoot: `apps/${role}`,
        entrypoint: `apps/${role}/lib/main_${environment}.dart`,
        packageEntrypoint: `lib/main_${environment}.dart`,
        ios: {bundleId: `com.catch.${role}.${environment}`},
        android: {applicationId: `com.catch.${role}.${environment}`},
      });
    }
  }
  return {
    $schema: "catch.app-target-external-gates/v1",
    schemaVersion: 1,
    logicalName: "catch-installable-app-targets",
    appleNativeDependencies: {},
    roles,
    environments,
    targets,
  };
}

test("Apple Firebase graph stays bound to Flutter packages and every Pod lock", () => {
  const policy = {
    firebaseCoreFlutterVersion: "4.13.0",
    cloudFirestoreFlutterVersion: "6.8.0",
    firebaseAppleSdkVersion: "12.17.0",
  };
  const pubLockSource = `
packages:
  cloud_firestore:
    dependency: direct main
    version: "6.8.0"
  firebase_core:
    dependency: direct main
    version: "4.13.0"
`;
  const podfileSource =
    "pod 'FirebaseFirestore', :git => 'https://example.invalid/firestore.git', :tag => '12.17.0'";
  const lockfileSource = `
  - Firebase/Firestore (12.17.0):
  - FirebaseCore (12.17.0):
  - FirebaseFirestore (12.17.0):
    :tag: 12.17.0
`;
  const project = {
    podfilePath: "ios/Podfile",
    podfileSource,
    lockfilePath: "ios/Podfile.lock",
    lockfileSource,
  };

  assert.equal(packageVersionFromPubLock(pubLockSource, "firebase_core"), "4.13.0");
  assert.deepEqual(
    validateAppleFirebaseLockstep({
      policy,
      pubLockSource,
      podProjects: [project],
    }),
    [],
  );
  assert.ok(
    validateAppleFirebaseLockstep({
      policy,
      pubLockSource: pubLockSource.replace('version: "4.13.0"', 'version: "4.14.0"'),
      podProjects: [project],
    }).some((finding) => finding.includes("firebase_core is 4.14.0")),
  );
  assert.ok(
    validateAppleFirebaseLockstep({
      policy,
      pubLockSource,
      podProjects: [
        {
          ...project,
          podfileSource: podfileSource.replace("12.17.0", "12.14.0"),
        },
      ],
    }).some((finding) => finding.includes("pins FirebaseFirestore 12.14.0")),
  );
});

test("validateManifestShape rejects a duplicate role/environment target", () => {
  const manifest = validManifest();
  manifest.targets[5] = {
    ...manifest.targets[5],
    id: "host-prod-copy",
    role: "consumer",
    environment: "prod",
  };

  assert.ok(
    validateManifestShape(manifest).includes("duplicate target pair consumer/prod"),
  );
});

test("signed app-target authority rejects operational release evidence", () => {
  const manifest = validManifest();
  manifest.transitionalDebt = [];
  manifest.targets.find((target) => target.id === "consumer-prod").release = {
    testFlightEvidence: "run 123",
  };

  const findings = validateManifestShape(manifest);
  assert.ok(findings.some((finding) => finding.includes("transitionalDebt")));
  assert.ok(findings.some((finding) => finding.includes("testFlightEvidence")));
});

test("androidClientFor selects the Host client instead of client zero", () => {
  const config = {
    client: [
      {
        client_info: {
          mobilesdk_app_id: "consumer-id",
          android_client_info: {package_name: "com.catch.consumer"},
        },
      },
      {
        client_info: {
          mobilesdk_app_id: "host-id",
          android_client_info: {package_name: "com.catch.host"},
        },
      },
    ],
  };

  assert.equal(
    androidClientFor(config, "com.catch.host").client_info.mobilesdk_app_id,
    "host-id",
  );
});

test("Android build guard rejects aggregate tasks without one app target", () => {
  const guardedSource = `
    app_targets.json
    installableAppTargets
    requestedAppTarget
    target = requestedAppTarget
    for (prefix in listOf("assemble", "bundle", "build", "check", "test", "lint")) {}
  `;
  assert.deepEqual(validateAndroidBuildSource(guardedSource), []);

  assert.ok(
    validateAndroidBuildSource(guardedSource.replace('"build", ', "")).includes(
      "Android app-target guard does not cover aggregate 'build' tasks",
    ),
  );
});

test("Android shared manifest rejects Consumer-only capabilities", () => {
  assert.deepEqual(validateSharedAndroidManifestSource("<manifest />"), []);
  const findings = validateSharedAndroidManifestSource(`
    <uses-permission android:name="android.permission.health.READ_EXERCISE" />
    <intent-filter android:autoVerify="true" />
  `);
  assert.equal(findings.length, 2);
});

test("Apple build configuration parser keeps target identity bound to its configuration", () => {
  const configurations = parseAppleBuildConfigurations(`
    buildSettings = {
      CATCH_APP_TARGET_ID = host-prod;
      FLUTTER_TARGET = "$(SRCROOT)/../lib/main_host_prod.dart";
      PRODUCT_BUNDLE_IDENTIFIER = com.catchdates.host;
      "CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "Apple Distribution";
    };
    name = Release-host-prod;
  `);

  assert.deepEqual(configurations, [
    {
      name: "Release-host-prod",
      settings: {
        CATCH_APP_TARGET_ID: "host-prod",
        FLUTTER_TARGET: "$(SRCROOT)/../lib/main_host_prod.dart",
        PRODUCT_BUNDLE_IDENTIFIER: "com.catchdates.host",
        "CODE_SIGN_IDENTITY[sdk=iphoneos*]": "Apple Distribution",
      },
    },
  ]);
});

test("Apple signing settings require automatic signing without an identity override", () => {
  assert.deepEqual(
    validateAutomaticAppleSigningSettings({
      targetId: "host-prod",
      configurationName: "Release-host-prod",
      settings: {CODE_SIGN_STYLE: "Automatic"},
    }),
    [],
  );

  const findings = validateAutomaticAppleSigningSettings({
    targetId: "host-prod",
    configurationName: "Release-host-prod",
    settings: {
      CODE_SIGN_STYLE: "Manual",
      "CODE_SIGN_IDENTITY[sdk=iphoneos*]": "Apple Distribution",
    },
  });
  assert.ok(findings.some((finding) => finding.includes("CODE_SIGN_STYLE")));
  assert.ok(findings.some((finding) => finding.includes("defer CODE_SIGN_IDENTITY")));
});

function releaseManifest() {
  const manifest = validManifest();
  manifest.releasePolicy = JSON.parse(JSON.stringify(repoManifest.releasePolicy));
  for (const target of manifest.targets.filter((candidate) => candidate.environment === "prod")) {
    target.release = {
      owner: "github-actions",
      appStoreConnectAppId: manifest.roles[target.role].storeProduct.appStoreConnectAppId,
      googlePlayPackageName: target.android.applicationId,
    };
  }
  return manifest;
}

const repoManifest = JSON.parse(
  fs.readFileSync(new URL("../app_targets.json", import.meta.url), "utf8"),
);
const releaseSources = {
  fastfileSource: fs.readFileSync(new URL("../../fastlane/Fastfile", import.meta.url), "utf8"),
  betaWorkflowSource: fs.readFileSync(
    new URL("../../.github/workflows/mobile-beta.yml", import.meta.url),
    "utf8",
  ),
  productionWorkflowSource: fs.readFileSync(
    new URL("../../.github/workflows/mobile-production.yml", import.meta.url),
    "utf8",
  ),
};

function releaseFindings({manifest = releaseManifest(), ...overrides} = {}) {
  return validateReleaseOwnership({manifest, ...releaseSources, ...overrides});
}

function assertFinding(findings, text) {
  assert.ok(
    findings.some((finding) => finding.includes(text)),
    `expected a finding containing "${text}"; got ${JSON.stringify(findings)}`,
  );
}

test("release ownership accepts the fastlane beta and production workflows", () => {
  assert.deepEqual(releaseFindings(), []);
});

test("fastlane lane extraction stays inside one platform and one lane", () => {
  const iosBeta = fastlaneLaneSource(releaseSources.fastfileSource, "ios", "beta");
  const androidBeta = fastlaneLaneSource(releaseSources.fastfileSource, "android", "beta");
  assert.match(iosBeta, /upload_to_testflight/u);
  assert.doesNotMatch(iosBeta, /upload_to_app_store|upload_to_play_store/u);
  assert.match(androidBeta, /upload_to_play_store/u);
  assert.doesNotMatch(androidBeta, /track_promote_to|upload_to_testflight/u);
  assert.equal(fastlaneLaneSource(releaseSources.fastfileSource, "ios", "missing"), "");
});

test("release ownership rejects retired pipeline fields and a drifted policy", () => {
  const manifest = releaseManifest();
  manifest.releasePolicy.betaWorkflow = ".github/workflows/mobile-internal-release.yml";
  manifest.releasePolicy.android.betaTrack = "qa";
  const consumer = manifest.targets.find((target) => target.id === "consumer-prod");
  consumer.release.owner = "xcode-cloud";
  consumer.release.githubWorkflow = ".github/workflows/mobile-internal-release.yml";

  const findings = releaseFindings({manifest});
  assertFinding(findings, "beta workflow was '.github/workflows/mobile-internal-release.yml'");
  assertFinding(findings, "Android beta track was 'qa'");
  assertFinding(findings, "consumer-prod: release owner must be github-actions");
  assertFinding(findings, "consumer-prod.release.githubWorkflow belonged to the retired release pipeline");
});

test("release ownership keeps production out of the automatic beta workflow", () => {
  const findings = releaseFindings({
    betaWorkflowSource: `${releaseSources.betaWorkflowSource}
      - run: bundle exec fastlane ios release role:host build:1
        environment: prod-mobile-release
`.replace("  workflow_dispatch:", "  push:\n  workflow_dispatch:"),
  });
  assertFinding(findings, "mobile-beta.yml must not contain a production lane");
  assertFinding(findings, "mobile-beta.yml must not contain the production environment");
  assertFinding(findings, "mobile-beta.yml must not contain a push or workflow_run trigger");
});

test("release ownership requires the beta schedule, provenance and verifiers", () => {
  const findings = releaseFindings({
    betaWorkflowSource: releaseSources.betaWorkflowSource
      .replace(/ {2}schedule:\n {4}- cron: .*\n/u, "")
      .replaceAll("actions/attest-build-provenance@", "actions/upload-artifact@"),
    fastfileSource: releaseSources.fastfileSource
      .replace('"tool/platform/verify_ios_release_identity.mjs"', '"tool/platform/other.mjs"')
      .replace('track: "internal", aab: aab', 'track: "beta", aab: aab'),
  });
  assertFinding(findings, "mobile-beta.yml is missing nightly schedule");
  assertFinding(findings, "mobile-beta.yml is missing build provenance attestation");
  assertFinding(findings, "iosBeta lane is missing post-export iOS identity verification");
  assertFinding(findings, "androidBeta lane is missing internal track upload");
});

test("release ownership keeps production manual, reviewer-gated and rebuild-free", () => {
  const findings = releaseFindings({
    productionWorkflowSource: releaseSources.productionWorkflowSource
      .replace("environment: prod-mobile-release", "environment: prod-mobile")
      .replace("  workflow_dispatch:", "  schedule:\n    - cron: \"0 0 * * *\"\n  workflow_dispatch:"),
    fastfileSource: releaseSources.fastfileSource.replace(
      "    with_api_key do |key, _key_path|\n",
      "    build_app(scheme: \"Runner\")\n    with_api_key do |key, _key_path|\n",
    ),
  });
  assertFinding(findings, "must run every job in the reviewer-gated prod-mobile-release environment");
  assertFinding(findings, "mobile-production.yml must not contain an automatic trigger");
  assertFinding(findings, "iosRelease lane must promote a tested build, not rebuild");
});

test("release ownership keeps beta lanes away from production and signing overrides", () => {
  const findings = releaseFindings({
    fastfileSource: releaseSources.fastfileSource
      .replace('track: "internal", aab: aab', 'track: "production", aab: aab')
      .replace("opt_out_usage\n", "opt_out_usage\n# CODE_SIGN_IDENTITY = Apple Distribution\n"),
  });
  assertFinding(findings, "androidBeta lane must not reach production");
  assertFinding(findings, "must defer CODE_SIGN_IDENTITY to Xcode automatic signing");
});

test("resolveAppTarget returns explicit target fields", () => {
  const manifest = validManifest();
  const target = resolveAppTarget({
    manifest,
    role: "host",
    environment: "staging",
  });

  assert.equal(target.id, "host-staging");
  assert.equal(valueAtPath(target, "ios.bundleId"), "com.catch.host.staging");
});
