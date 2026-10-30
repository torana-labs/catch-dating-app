#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {
  assertStableArtifactBinding,
  buildArtifactBinding,
  collectReleaseIdentityFindings,
  extractIpaForIdentity,
  parseFlutterBuildXcconfig,
  readArchiveInfoPlist,
  resolveReleaseTarget,
  verifyCodeSignature,
} from "./verify_ios_release_identity.mjs";

test("rejects a changed IPA container after the app was extracted", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-ios-container-"));
  let extracted;
  try {
    const ipaPath = path.join(tempRoot, "Catch.ipa");
    const staleApp = path.join(tempRoot, "stale", "Payload", "Stale.app");
    const signedApp = path.join(tempRoot, "signed", "Payload", "Current.app");
    fs.mkdirSync(staleApp, {recursive: true});
    fs.mkdirSync(signedApp, {recursive: true});
    fs.writeFileSync(path.join(staleApp, "identity.txt"), "stale-a");
    fs.writeFileSync(path.join(signedApp, "identity.txt"), "current-b");
    const zip = spawnSync("/usr/bin/zip", ["-qry", ipaPath, "Payload"], {
      cwd: path.join(tempRoot, "signed"),
      encoding: "utf8",
    });
    assert.equal(zip.status, 0, zip.stderr);
    extracted = extractIpaForIdentity(ipaPath);
    assert.equal(path.basename(extracted.appPath), "Current.app");
    assert.notEqual(path.resolve(extracted.appPath), path.resolve(staleApp));
    fs.writeFileSync(ipaPath, "same-name-substituted-container");
    const afterIdentityInspection = buildArtifactBinding(ipaPath);
    assert.throws(
      () => assertStableArtifactBinding(
        extracted.artifactBindingBefore,
        afterIdentityInspection,
      ),
      /changed after export identity extraction/,
    );
  } finally {
    extracted?.cleanup();
    fs.rmSync(tempRoot, {recursive: true, force: true});
  }
});

const manifest = {
  targets: [
    {
      id: "consumer-prod",
      role: "consumer",
      environment: "prod",
      displayName: "Catch",
      entrypoint: "lib/main_consumer_prod.dart",
      packageEntrypoint: "lib/main_prod.dart",
      firebase: {
        projectId: "catch-prod",
        ios: {appId: "consumer-firebase-app"},
      },
      ios: {
        scheme: "prod",
        bundleId: "com.catchdates.app",
        urlScheme: "consumer-url-scheme",
      },
    },
    {
      id: "host-prod",
      role: "host",
      environment: "prod",
      displayName: "Catch Host",
      entrypoint: "lib/main_host_prod.dart",
      packageEntrypoint: "lib/main_prod.dart",
      firebase: {
        projectId: "catch-prod",
        ios: {appId: "host-firebase-app"},
      },
      ios: {
        scheme: "host-prod",
        bundleId: "com.catchdates.host",
        urlScheme: "host-url-scheme",
      },
    },
  ],
};

const consumerTarget = manifest.targets[0];
const hostTarget = manifest.targets[1];

const baseConsumerEntitlements = {
  "aps-environment": "$(APS_ENVIRONMENT)",
  "com.apple.developer.devicecheck.appattest-environment":
    "$(APP_ATTEST_ENVIRONMENT)",
  "com.apple.developer.associated-domains": ["applinks:catchdates.com"],
  "com.apple.developer.healthkit": true,
};

const baseSignedConsumerEntitlements = {
  "application-identifier": "TEAM123.com.catchdates.app",
  "com.apple.developer.team-identifier": "TEAM123",
  "aps-environment": "production",
  "com.apple.developer.devicecheck.appattest-environment": "production",
  "com.apple.developer.associated-domains": ["applinks:catchdates.com"],
  "com.apple.developer.healthkit": true,
  "get-task-allow": false,
};

const baseDevelopmentSignedConsumerEntitlements = {
  ...baseSignedConsumerEntitlements,
  "aps-environment": "development",
  "com.apple.developer.devicecheck.appattest-environment": "development",
  "get-task-allow": true,
};

function appInfoFor(target) {
  return {
    CFBundleIdentifier: target.ios.bundleId,
    CFBundleDisplayName: target.displayName,
    CatchAppTargetID: target.id,
    CatchFlutterTarget: `/repo/${target.packageEntrypoint}`,
    CFBundleURLTypes: [{CFBundleURLSchemes: [target.ios.urlScheme]}],
    CFBundleShortVersionString: "1.2.3",
    CFBundleVersion: "202607101",
  };
}

test("export identity rejects Maps evidence from a stale extracted app", () => {
  const expectedKey = `AIza${"A".repeat(28)}`;
  const staleAppInfo = {...appInfoFor(consumerTarget), GoogleMapsApiKey: expectedKey};
  const substitutedAppInfo = {...staleAppInfo};
  delete substitutedAppInfo.GoogleMapsApiKey;
  const findings = collectReleaseIdentityFindings({
    target: consumerTarget,
    roleEntitlements: baseConsumerEntitlements,
    appInfo: substitutedAppInfo,
    firebaseInfo: firebaseInfoFor(consumerTarget),
    archiveInfo: null,
    signedEntitlements: baseSignedConsumerEntitlements,
    expectedVersion: "1.2.3",
    expectedBuild: "202607101",
    expectedGoogleMapsApiKey: expectedKey,
    artifactStage: "export",
  });
  assert.ok(findings.some((finding) => finding.includes("compiled Google Maps API key")));
});

test("strict deep signature verification rejects a tampered signed app", (t) => {
  if (process.platform !== "darwin") {
    t.skip("codesign regression requires macOS");
    return;
  }
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-ios-signature-"));
  try {
    const appPath = path.join(tempRoot, "Synthetic.app");
    const contents = path.join(appPath, "Contents");
    fs.mkdirSync(path.join(contents, "MacOS"), {recursive: true});
    fs.mkdirSync(path.join(contents, "Resources"), {recursive: true});
    fs.copyFileSync("/usr/bin/true", path.join(contents, "MacOS", "Synthetic"));
    fs.writeFileSync(path.join(contents, "Resources", "sealed.txt"), "sealed");
    fs.writeFileSync(path.join(contents, "Info.plist"), `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>Synthetic</string>
<key>CFBundleIdentifier</key><string>com.catchdates.signature-test</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleVersion</key><string>1</string>
</dict></plist>\n`);
    const signed = spawnSync(
      "/usr/bin/codesign",
      ["--force", "--deep", "--sign", "-", appPath],
      {encoding: "utf8"},
    );
    assert.equal(signed.status, 0, signed.stderr);
    assert.equal(verifyCodeSignature(appPath), true);
    fs.writeFileSync(path.join(contents, "Resources", "sealed.txt"), "tampered");
    assert.throws(() => verifyCodeSignature(appPath), /signature verification failed/);
  } finally {
    fs.rmSync(tempRoot, {recursive: true, force: true});
  }
});

test("normal IPA CLI emits no receipt for a tampered app signature", (t) => {
  if (process.platform !== "darwin") {
    t.skip("codesign regression requires macOS");
    return;
  }
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-ios-cli-signature-"));
  try {
    const appPath = path.join(tempRoot, "source", "Payload", "Tampered.app");
    const receiptPath = path.join(tempRoot, "receipt.json");
    const ipaPath = path.join(tempRoot, "Tampered.ipa");
    fs.mkdirSync(appPath, {recursive: true});
    fs.copyFileSync("/usr/bin/true", path.join(appPath, "Tampered"));
    fs.writeFileSync(path.join(appPath, "sealed.txt"), "sealed");
    const bundlePlist = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>Tampered</string>
<key>CFBundleIdentifier</key><string>com.catchdates.signature-test</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleVersion</key><string>1</string>
</dict></plist>\n`;
    fs.writeFileSync(path.join(appPath, "Info.plist"), bundlePlist);
    fs.writeFileSync(path.join(appPath, "GoogleService-Info.plist"), "{}\n");
    let result = spawnSync(
      "/usr/bin/codesign",
      ["--force", "--deep", "--sign", "-", appPath],
      {encoding: "utf8"},
    );
    assert.equal(result.status, 0, result.stderr);
    fs.writeFileSync(path.join(appPath, "sealed.txt"), "tampered");
    result = spawnSync("/usr/bin/zip", ["-qry", ipaPath, "Payload"], {
      cwd: path.join(tempRoot, "source"),
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);

    const scriptPath = fileURLToPath(
      new URL("./verify_ios_release_identity.mjs", import.meta.url),
    );
    result = spawnSync(process.execPath, [
      scriptPath,
      "--ipa", ipaPath,
      "--role", "host",
      "--environment", "prod",
      "--expected-version", "1.2.3",
      "--expected-build", "202607101",
      "--receipt", receiptPath,
    ], {encoding: "utf8"});
    assert.equal(result.status, 1);
    assert.match(result.stderr, /signature verification failed/u);
    assert.equal(fs.existsSync(receiptPath), false);
  } finally {
    fs.rmSync(tempRoot, {recursive: true, force: true});
  }
});

function firebaseInfoFor(target) {
  return {
    BUNDLE_ID: target.ios.bundleId,
    GOOGLE_APP_ID: target.firebase.ios.appId,
    PROJECT_ID: target.firebase.projectId,
  };
}

function archiveInfoFor(target) {
  return {ApplicationProperties: appInfoFor(target)};
}

test("resolves one target from manifest selectors", () => {
  assert.equal(
    resolveReleaseTarget({manifest, role: "host", environment: "prod"}).id,
    "host-prod",
  );
  assert.equal(resolveReleaseTarget({manifest, scheme: "prod"}).id, "consumer-prod");
  assert.throws(() => resolveReleaseTarget({manifest, environment: "prod"}));
});

test("reads the expected Flutter marketing version and build", () => {
  assert.deepEqual(
    parseFlutterBuildXcconfig(
      "OTHER=value\nFLUTTER_BUILD_NAME=1.2.3\nFLUTTER_BUILD_NUMBER=202607101\n",
    ),
    {version: "1.2.3", build: "202607101"},
  );
});

test(
  "reads archive identity when the root plist contains an Xcode creation date",
  {skip: process.platform !== "darwin"},
  () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-ios-archive-plist-"));
    try {
      const plistPath = path.join(tempRoot, "Info.plist");
      fs.writeFileSync(
        plistPath,
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>ApplicationProperties</key>
  <dict>
    <key>CFBundleIdentifier</key>
    <string>com.catchdates.app</string>
    <key>CFBundleShortVersionString</key>
    <string>1.2.3</string>
    <key>CFBundleVersion</key>
    <string>202607101</string>
  </dict>
  <key>CreationDate</key>
  <date>2026-07-11T17:28:59Z</date>
</dict>
</plist>
`,
      );
      assert.deepEqual(readArchiveInfoPlist(plistPath), {
        ApplicationProperties: {
          CFBundleIdentifier: "com.catchdates.app",
          CFBundleShortVersionString: "1.2.3",
          CFBundleVersion: "202607101",
        },
      });
    } finally {
      fs.rmSync(tempRoot, {recursive: true, force: true});
    }
  },
);

test("accepts a development-signed Consumer archive before export", () => {
  assert.deepEqual(
    collectReleaseIdentityFindings({
      target: consumerTarget,
      roleEntitlements: baseConsumerEntitlements,
      appInfo: appInfoFor(consumerTarget),
      firebaseInfo: firebaseInfoFor(consumerTarget),
      archiveInfo: archiveInfoFor(consumerTarget),
      signedEntitlements: baseDevelopmentSignedConsumerEntitlements,
      expectedVersion: "1.2.3",
      expectedBuild: "202607101",
      artifactStage: "archive",
    }),
    [],
  );
});

test("rejects development signing on an exported Consumer app", () => {
  const findings = collectReleaseIdentityFindings({
    target: consumerTarget,
    roleEntitlements: baseConsumerEntitlements,
    appInfo: appInfoFor(consumerTarget),
    firebaseInfo: firebaseInfoFor(consumerTarget),
    archiveInfo: null,
    signedEntitlements: baseDevelopmentSignedConsumerEntitlements,
    expectedVersion: "1.2.3",
    expectedBuild: "202607101",
    artifactStage: "export",
  });

  assert.ok(findings.some((finding) => finding.includes("must be 'production'")));
  assert.ok(findings.some((finding) => finding.includes("get-task-allow=false")));
});

test("requires an explicit boolean false get-task-allow on exported apps", () => {
  for (const value of [undefined, "false", 0]) {
    const signedEntitlements = {...baseSignedConsumerEntitlements};
    if (value === undefined) {
      delete signedEntitlements["get-task-allow"];
    } else {
      signedEntitlements["get-task-allow"] = value;
    }
    const findings = collectReleaseIdentityFindings({
      target: consumerTarget,
      roleEntitlements: baseConsumerEntitlements,
      appInfo: appInfoFor(consumerTarget),
      firebaseInfo: firebaseInfoFor(consumerTarget),
      archiveInfo: null,
      signedEntitlements,
      expectedVersion: "1.2.3",
      expectedBuild: "202607101",
      artifactStage: "export",
    });
    assert.ok(
      findings.some((finding) => finding.includes("get-task-allow=false")),
      `expected invalid get-task-allow finding for ${JSON.stringify(value)}`,
    );
  }
});

test("rejects unsupported resolved signing environments on archives", () => {
  const findings = collectReleaseIdentityFindings({
    target: consumerTarget,
    roleEntitlements: baseConsumerEntitlements,
    appInfo: appInfoFor(consumerTarget),
    firebaseInfo: firebaseInfoFor(consumerTarget),
    archiveInfo: archiveInfoFor(consumerTarget),
    signedEntitlements: {
      ...baseDevelopmentSignedConsumerEntitlements,
      "aps-environment": "invalid",
    },
    expectedVersion: "1.2.3",
    expectedBuild: "202607101",
    artifactStage: "archive",
  });
  assert.ok(
    findings.some((finding) => finding.includes("unsupported signing environment")),
  );
});

test("rejects an unknown artifact stage instead of weakening export checks", () => {
  assert.throws(
    () =>
      collectReleaseIdentityFindings({
        target: consumerTarget,
        roleEntitlements: baseConsumerEntitlements,
        appInfo: appInfoFor(consumerTarget),
        firebaseInfo: firebaseInfoFor(consumerTarget),
        archiveInfo: null,
        signedEntitlements: baseSignedConsumerEntitlements,
        expectedVersion: "1.2.3",
        expectedBuild: "202607101",
        artifactStage: "unknown",
      }),
    /Unsupported iOS release artifact stage/u,
  );
});

test("accepts Host without Consumer-only capabilities", () => {
  const roleEntitlements = {
    "aps-environment": "$(APS_ENVIRONMENT)",
    "com.apple.developer.devicecheck.appattest-environment":
      "$(APP_ATTEST_ENVIRONMENT)",
  };
  const signedEntitlements = {
    "application-identifier": "TEAM123.com.catchdates.host",
    "com.apple.developer.team-identifier": "TEAM123",
    "aps-environment": "production",
    "com.apple.developer.devicecheck.appattest-environment": "production",
    "get-task-allow": false,
  };
  assert.deepEqual(
    collectReleaseIdentityFindings({
      target: hostTarget,
      roleEntitlements,
      appInfo: appInfoFor(hostTarget),
      firebaseInfo: firebaseInfoFor(hostTarget),
      archiveInfo: archiveInfoFor(hostTarget),
      signedEntitlements,
      expectedVersion: "1.2.3",
      expectedBuild: "202607101",
    }),
    [],
  );
});

test("rejects Host inheriting Consumer-only capabilities", () => {
  const findings = collectReleaseIdentityFindings({
    target: hostTarget,
    roleEntitlements: {
      "aps-environment": "$(APS_ENVIRONMENT)",
      "com.apple.developer.devicecheck.appattest-environment":
        "$(APP_ATTEST_ENVIRONMENT)",
    },
    appInfo: appInfoFor(hostTarget),
    firebaseInfo: firebaseInfoFor(hostTarget),
    archiveInfo: archiveInfoFor(hostTarget),
    signedEntitlements: {
      ...baseSignedConsumerEntitlements,
      "application-identifier": "TEAM123.com.catchdates.host",
    },
    expectedVersion: "1.2.3",
    expectedBuild: "202607101",
  });
  assert.ok(findings.some((finding) => finding.includes("forbidden entitlement")));
});

test("rejects a Host archive compiled from the Consumer entrypoint", () => {
  const findings = collectReleaseIdentityFindings({
    target: hostTarget,
    roleEntitlements: {
      "aps-environment": "$(APS_ENVIRONMENT)",
      "com.apple.developer.devicecheck.appattest-environment":
        "$(APP_ATTEST_ENVIRONMENT)",
    },
    appInfo: {
      ...appInfoFor(hostTarget),
      CatchAppTargetID: "consumer-prod",
      CatchFlutterTarget: "/repo/lib/main_consumer_prod.dart",
    },
    firebaseInfo: firebaseInfoFor(hostTarget),
    archiveInfo: archiveInfoFor(hostTarget),
    signedEntitlements: {
      "application-identifier": "TEAM123.com.catchdates.host",
      "com.apple.developer.team-identifier": "TEAM123",
      "aps-environment": "production",
      "com.apple.developer.devicecheck.appattest-environment": "production",
    },
    expectedVersion: "1.2.3",
    expectedBuild: "202607101",
  });
  assert.ok(findings.some((finding) => finding.includes("app target marker")));
  assert.ok(findings.some((finding) => finding.includes("Flutter target")));
});

test("rejects Host Firebase and OAuth URL identity drift", () => {
  const findings = collectReleaseIdentityFindings({
    target: hostTarget,
    roleEntitlements: {
      "aps-environment": "$(APS_ENVIRONMENT)",
      "com.apple.developer.devicecheck.appattest-environment":
        "$(APP_ATTEST_ENVIRONMENT)",
    },
    appInfo: {
      ...appInfoFor(hostTarget),
      CFBundleURLTypes: [{CFBundleURLSchemes: [consumerTarget.ios.urlScheme]}],
    },
    firebaseInfo: firebaseInfoFor(consumerTarget),
    archiveInfo: archiveInfoFor(hostTarget),
    signedEntitlements: {
      "application-identifier": "TEAM123.com.catchdates.host",
      "com.apple.developer.team-identifier": "TEAM123",
      "aps-environment": "production",
      "com.apple.developer.devicecheck.appattest-environment": "production",
    },
    expectedVersion: "1.2.3",
    expectedBuild: "202607101",
  });
  for (const marker of [
    "URL schemes",
    "Firebase bundle identifier",
    "Firebase app id",
  ]) {
    assert.ok(
      findings.some((finding) => finding.includes(marker)),
      `missing finding for ${marker}: ${findings.join("; ")}`,
    );
  }
});

test("rejects bundle, version, build, archive metadata, and signing drift", () => {
  const findings = collectReleaseIdentityFindings({
    target: consumerTarget,
    roleEntitlements: baseConsumerEntitlements,
    appInfo: {
      ...appInfoFor(consumerTarget),
      CFBundleIdentifier: "com.catchdates.host",
      CFBundleShortVersionString: "1.2.4",
      CFBundleVersion: "2",
    },
    firebaseInfo: firebaseInfoFor(consumerTarget),
    archiveInfo: archiveInfoFor(consumerTarget),
    signedEntitlements: {
      ...baseSignedConsumerEntitlements,
      "application-identifier": "TEAM123.com.catchdates.host",
      "aps-environment": "development",
      "get-task-allow": true,
    },
    expectedVersion: "1.2.3",
    expectedBuild: "202607101",
  });
  for (const marker of [
    "bundle identifier",
    "marketing version",
    "build number",
    "application-identifier",
    "must be 'production'",
    "get-task-allow=false",
  ]) {
    assert.ok(
      findings.some((finding) => finding.includes(marker)),
      `missing finding for ${marker}: ${findings.join("; ")}`,
    );
  }
});

test("CLI verifies a synthetic Host archive and writes a receipt", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-ios-release-"));
  try {
    const archivePath = path.join(tempRoot, "Host.xcarchive");
    const appPath = path.join(
      archivePath,
      "Products",
      "Applications",
      "Catch Host.app",
    );
    fs.mkdirSync(appPath, {recursive: true});
    const infoPath = path.join(appPath, "Info.plist");
    const firebaseInfoPath = path.join(appPath, "GoogleService-Info.plist");
    const archiveInfoPath = path.join(archivePath, "Info.plist");
    const entitlementsPath = path.join(tempRoot, "entitlements.plist");
    const receiptPath = path.join(tempRoot, "receipt.json");
    writeXmlPlist(infoPath, {
      ...appInfoFor(hostTarget),
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: [
            "app-1-574779808785-ios-dafe636b607e071f8ea5b0",
          ],
        },
      ],
    });
    writeXmlPlist(firebaseInfoPath, {
      BUNDLE_ID: "com.catchdates.host",
      GOOGLE_APP_ID: "1:574779808785:ios:dafe636b607e071f8ea5b0",
      PROJECT_ID: "catch-dating-app-64e51",
    });
    writeXmlPlist(archiveInfoPath, archiveInfoFor(hostTarget));
    writeXmlPlist(entitlementsPath, {
      "application-identifier": "TEAM123.com.catchdates.host",
      "com.apple.developer.team-identifier": "TEAM123",
      "aps-environment": "development",
      "com.apple.developer.devicecheck.appattest-environment": "development",
      "get-task-allow": true,
    });

    const scriptPath = fileURLToPath(
      new URL("./verify_ios_release_identity.mjs", import.meta.url),
    );
    const result = spawnSync(
      process.execPath,
      [
        scriptPath,
        "--archive",
        archivePath,
        "--role",
        "host",
        "--environment",
        "prod",
        "--expected-version",
        "1.2.3",
        "--expected-build",
        "202607101",
        "--entitlements-plist",
        entitlementsPath,
        "--receipt",
        receiptPath,
      ],
      {encoding: "utf8"},
    );
    assert.equal(result.status, 0, result.stderr);
    const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
    assert.equal(receipt.targetId, "host-prod");
    assert.equal(receipt.bundleIdentifier, "com.catchdates.host");
    assert.equal(receipt.artifactStage, "archive");

    const exportedResult = spawnSync(
      process.execPath,
      [
        scriptPath,
        "--app",
        appPath,
        "--role",
        "host",
        "--environment",
        "prod",
        "--expected-version",
        "1.2.3",
        "--expected-build",
        "202607101",
        "--entitlements-plist",
        entitlementsPath,
      ],
      {encoding: "utf8"},
    );
    assert.equal(exportedResult.status, 1);
    assert.match(exportedResult.stderr, /must be 'production'/u);
    assert.match(exportedResult.stderr, /get-task-allow=false/u);
  } finally {
    fs.rmSync(tempRoot, {recursive: true, force: true});
  }
});

function writeXmlPlist(targetPath, value) {
  fs.writeFileSync(targetPath, `${JSON.stringify(value)}\n`);
}
