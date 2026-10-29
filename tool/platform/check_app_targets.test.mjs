import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  androidClientFor,
  packageVersionFromPubLock,
  parseAppleBuildConfigurations,
  validateAppleFirebaseLockstep,
  validateAutomaticAppleSigningSettings,
  validateAndroidBuildSource,
  validateExternalGateContract,
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
        testFlightDistributionPolicy: "all-existing-internal-groups-with-testers",
      },
    },
    host: {
      projectRoot: "apps/host",
      entrypoint: "apps/host/lib/main.dart",
      packageEntrypoint: "lib/main.dart",
      storeProduct: {
        appStoreConnectAppId: "host-app",
        testFlightDistributionPolicy: "all-existing-internal-groups-with-testers",
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

function validExternalGates() {
  return {
    schemaVersion: 1,
    logicalName: "catch-app-target-external-gates",
    gates: [
      {
        id: "APP-TARGET-IOS-GITHUB-CUTOVER-001",
        status: "blocked_external",
        issue: 218,
        scope: "consumer-and-host-testflight-internal-distribution",
        closureCriteria: ["assign and smoke-test both exact builds"],
      },
      {
        id: "APP-TARGET-ANDROID-PLAY-001",
        status: "blocked_external",
        issue: 199,
        scope: "consumer-and-host-google-play-internal-distribution",
        closureCriteria: ["verify the account and process both qa builds"],
      },
    ],
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

test("external gate contract rejects missing gates and tracked run evidence", () => {
  const contract = validExternalGates();
  contract.gates[0].removalProof = ["run 123"];
  contract.gates.pop();

  const findings = validateExternalGateContract(contract);
  assert.ok(findings.some((finding) => finding.includes("removalProof")));
  assert.ok(findings.some((finding) =>
    finding.includes("missing external gate APP-TARGET-ANDROID-PLAY-001")));
});

test("resolved external gates are a clean terminal state", () => {
  const externalGates = validExternalGates();
  for (const gate of externalGates.gates) gate.status = "resolved";

  const result = validateReleaseOwnership({
    externalGates,
    manifest: unifiedReleaseManifest(),
    workflowSource: unifiedWorkflow,
  });
  assert.deepEqual(result.findings, []);
  assert.deepEqual(result.warnings, []);
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

function unifiedReleaseManifest() {
  const manifest = validManifest();
  manifest.releasePolicy = {
    owner: "github-actions",
    workflow: ".github/workflows/mobile-internal-release.yml",
    promotionWorkflow: ".github/workflows/mobile-internal-promote.yml",
    trigger: "successful-main-ci-exact-artifact-authority",
    environment: "prod-mobile",
    approvalMode: "automatic-ios-exact-artifact-internal-promotion",
    branchPolicy: "main-only",
    roles: ["consumer", "host"],
    ios: {
      channel: "testflight",
      uploadMode: "separate-promotion-workflow",
      automaticRoles: ["consumer", "host"],
      distributionPolicy: "all-existing-internal-groups-with-testers",
      signingStyle: "automatic",
      developmentIdentitySource: "reusable-ci-p12",
      distributionSigningStage: "export",
      uploadArtifact: "verified-ipa",
      uploadTool: "altool",
    },
    android: {
      channel: "play-internal",
      track: "qa",
      uploadMode: "separate-promotion-workflow",
      publisherAuth: "github-oidc",
      publisherServiceAccount: "github-actions-play-publisher@catch-dating-app-64e51.iam.gserviceaccount.com",
      uploadCertificateSha256: "A".repeat(64),
    },
  };
  for (const target of manifest.targets.filter((candidate) => candidate.environment === "prod")) {
    target.release = {
      owner: "github-actions",
      githubMode: "automatic-exact-artifact",
      githubWorkflow: ".github/workflows/mobile-internal-release.yml",
      automaticTestFlightOnMain: true,
      googlePlayPackageName: target.android.applicationId,
      legacyXcodeCloudWorkflow: `${target.role} legacy`,
    };
  }
  return manifest;
}

const unifiedWorkflow = fs.readFileSync(
  new URL("../../.github/workflows/mobile-internal-release.yml", import.meta.url),
  "utf8",
) + fs.readFileSync(new URL("../../.github/workflows/_mobile-platform-authority.yml", import.meta.url), "utf8");

test("release ownership accepts the exact-target producer and separate promoter", () => {
  const manifest = unifiedReleaseManifest();
  const result = validateReleaseOwnership({
    externalGates: validExternalGates(),
    manifest,
    workflowSource: unifiedWorkflow,
  });
  assert.deepEqual(result.findings, []);
  assert.equal(result.warnings.length, 2);
});

test("release ownership rejects reintroducing store mutation in the package producer", () => {
  const manifest = unifiedReleaseManifest();
  const workflowSource = `${unifiedWorkflow}\nxcrun altool --upload-package "$IPA_PATH"\n`;

  const result = validateReleaseOwnership({
    externalGates: validExternalGates(),
    manifest,
    workflowSource,
  });
  assert.ok(
    result.findings.some((finding) =>
      finding.includes("must not contain TestFlight upload"),
    ),
  );
});

test("release ownership rejects split or incomplete workflow ownership", () => {
  const manifest = unifiedReleaseManifest();
  manifest.targets.find((target) => target.id === "consumer-prod").release.owner = "xcode-cloud";
  const workflowSource = `
on:
  push:
jobs:
  prod-ios:
    environment: prod-mobile
`;

  const result = validateReleaseOwnership({
    externalGates: validExternalGates(),
    manifest,
    workflowSource,
  });
  assert.ok(result.findings.some((finding) => finding.includes("consumer-prod")));
  assert.ok(result.findings.some((finding) => finding.includes("Android target matrix")));
});

test("release ownership rejects an explicit iOS archive signing identity", () => {
  const manifest = unifiedReleaseManifest();
  const workflowSource = `${unifiedWorkflow}\nCODE_SIGN_IDENTITY=Apple Distribution\n`;

  const result = validateReleaseOwnership({
    externalGates: validExternalGates(),
    manifest,
    workflowSource,
  });
  assert.ok(
    result.findings.some((finding) =>
      finding.includes("defer CODE_SIGN_IDENTITY to Xcode automatic signing"),
    ),
  );
});

test("release ownership rejects a missing reusable iOS CI identity import", () => {
  const manifest = unifiedReleaseManifest();
  const workflowSource = unifiedWorkflow.replace(
    '          security import "$p12_path" \\\n',
    "          echo missing-identity-import \\\n",
  );

  const result = validateReleaseOwnership({
    externalGates: validExternalGates(),
    manifest,
    workflowSource,
  });
  assert.ok(
    result.findings.some((finding) =>
      finding.includes("non-extractable reusable iOS identity import"),
    ),
  );
});

test("release ownership rejects missing reusable iOS identity cleanup", () => {
  const manifest = unifiedReleaseManifest();
  const workflowSource = unifiedWorkflow.replace(
    '            security delete-keychain "$IOS_CI_KEYCHAIN_PATH" 2>/dev/null || true\n',
    "            echo cleanup-missing\n",
  );

  const result = validateReleaseOwnership({
    externalGates: validExternalGates(),
    manifest,
    workflowSource,
  });
  assert.ok(
    result.findings.some((finding) =>
      finding.includes("always-run reusable iOS identity cleanup"),
    ),
  );
});

test("release ownership rejects incomplete reusable iOS identity verification", () => {
  const manifest = unifiedReleaseManifest();
  const workflowSource = unifiedWorkflow
    .replace("-fingerprint -sha256", "-serial")
    .replace(
      '          if [[ "$actual_expiry_epoch" != "$configured_expiry_epoch" ]]; then\n',
      "          if false; then\n",
    )
    .replace("-checkend 2592000", "-noout");

  const result = validateReleaseOwnership({
    externalGates: validExternalGates(),
    manifest,
    workflowSource,
  });
  assert.ok(
    result.findings.some((finding) =>
      finding.includes("reusable iOS identity fingerprint derivation"),
    ),
  );
  assert.ok(
    result.findings.some((finding) =>
      finding.includes("reusable iOS identity validity floor"),
    ),
  );
  assert.ok(
    result.findings.some((finding) =>
      finding.includes("reusable iOS identity expiry metadata validation"),
    ),
  );
});

test("release ownership rejects re-exporting after IPA verification", () => {
  const manifest = unifiedReleaseManifest();
  const workflowSource = `${unifiedWorkflow}\nxcodebuild \\\n  -exportArchive\n`;

  const result = validateReleaseOwnership({
    externalGates: validExternalGates(),
    manifest,
    workflowSource,
  });
  assert.ok(
    result.findings.some((finding) =>
      finding.includes("must export exactly one IPA before verification and packaging"),
    ),
  );
});

test("release ownership rejects an unbound immutable package upload", () => {
  const manifest = unifiedReleaseManifest();
  const workflowSource = unifiedWorkflow.replaceAll(
    "package_mobile_release.mjs bind-upload",
    "package_mobile_release.mjs missing-upload-binding",
  );

  const result = validateReleaseOwnership({
    externalGates: validExternalGates(),
    manifest,
    workflowSource,
  });
  assert.ok(
    result.findings.some((finding) =>
      finding.includes("immutable package upload binding"),
    ),
  );
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
