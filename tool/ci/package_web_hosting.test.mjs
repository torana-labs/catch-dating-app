import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {createProvenanceManifest} from "./delivery_core.mjs";
import {
  createBoundedWebHostingConfig,
  prepareWebHostingDelivery,
  verifyWebHostingDelivery,
  WEB_HOSTING_DELIVERY_INVENTORY_SCHEMA,
  WEB_HOSTING_DELIVERY_PLAN_SCHEMA,
} from "./package_web_hosting.mjs";

const binding = Object.freeze({
  sourceSha: "a".repeat(40),
  sourceCiWorkflowId: "77",
  sourceCiRunNumber: "123",
  sourceCiRunId: "456",
  sourceCiRunAttempt: "2",
});

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function refreshInventoryEntry(stageDir, relativePath) {
  const inventoryPath = path.join(stageDir, "web-delivery-inventory.json");
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
  const bytes = fs.readFileSync(path.join(stageDir, relativePath));
  const entry = inventory.entries.find((candidate) => candidate.path === relativePath);
  assert.ok(entry, `missing inventory entry ${relativePath}`);
  entry.sizeBytes = bytes.length;
  entry.sha256 = createHash("sha256").update(bytes).digest("hex");
  writeJson(inventoryPath, inventory);
}

function sourceFirebaseConfig() {
  return {
    flutter: {platforms: {}},
    hosting: [
      {
        target: "marketing",
        public: "website/dist",
        ignore: ["firebase.json", "**/.git/**"],
        predeploy: [
          "node tool/env/check_web_hosting_env.mjs marketing",
          "npm run web:marketing:build",
        ],
        postdeploy: ["node tool/marketing/postdeploy-with-production-access.mjs"],
        headers: [{source: "/asset.json", headers: [{key: "Content-Type", value: "application/json"}]}],
        rewrites: [{source: "/host/**", destination: "/host/index.html"}],
      },
      {target: "app", public: "build/web"},
      {
        target: "host",
        public: "apps/host/build/web",
        predeploy: [
          "./tool/flutter_with_env.sh prod --role host build web --release",
        ],
        headers: [{source: "**", headers: [{key: "X-Robots-Tag", value: "noindex"}]}],
        rewrites: [{source: "**", destination: "/index.html"}],
      },
      {
        target: "admin",
        public: "admin/dist",
        predeploy: [
          "node tool/env/check_web_hosting_env.mjs admin",
          "npm run web:admin:build",
        ],
        postdeploy: ["node tool/admin/postdeploy-with-production-access.mjs"],
        headers: [{source: "**", headers: [{key: "X-Robots-Tag", value: "noindex"}]}],
        rewrites: [{source: "**", destination: "/index.html"}],
      },
    ],
    functions: {source: "functions"},
  };
}

function makeSource(surface = "marketing") {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "catch-web-delivery-")),
  );
  writeJson(path.join(root, "firebase.json"), sourceFirebaseConfig());
  writeJson(path.join(root, ".firebaserc"), {
    projects: {
      default: "catchdates-dev",
      dev: "catchdates-dev",
      prod: "catch-dating-app-64e51",
    },
    targets: {
      "catch-dating-app-64e51": {
        hosting: {
          marketing: ["catch-dating-app-64e51"],
          app: ["catchdates-app"],
          host: ["catchdates-host"],
          admin: ["catchdates-admin"],
        },
      },
    },
    etags: {ignored: true},
  });
  const publicDir = surface === "marketing" ? "website/dist" :
    surface === "host" ? "apps/host/build/web" : "admin/dist";
  fs.mkdirSync(path.join(root, publicDir, "assets"), {recursive: true});
  fs.writeFileSync(path.join(root, publicDir, "index.html"), `<h1>${surface}</h1>`);
  fs.writeFileSync(path.join(root, publicDir, "assets", "app.js"), "console.log('catch');\n");
  return root;
}

function prepare(root, surface = "marketing") {
  const stageDir = path.join(root, "build", `stage-${surface}`);
  const plan = prepareWebHostingDelivery({
    sourceRoot: root,
    surface,
    ...binding,
    stageDir,
  });
  return {stageDir, plan};
}

async function writeProvenance(root, surface) {
  const stage = `hosting-${surface}`;
  const artifactPath = path.join(root, "build", `web-hosting-${surface}.tar.gz`);
  fs.writeFileSync(artifactPath, `fixed ${surface} archive bytes`);
  const manifest = await createProvenanceManifest({
    artifactPath,
    sourceSha: binding.sourceSha,
    sourceCiRunId: binding.sourceCiRunId,
    sourceCiRunAttempt: binding.sourceCiRunAttempt,
    stages: [stage],
  });
  const manifestPath = path.join(root, "build", `${surface}-provenance.json`);
  writeJson(manifestPath, manifest);
  return manifestPath;
}

test("marketing package contains one lifecycle-hook-free target and exact byte inventory", async () => {
  const root = makeSource();
  const {stageDir, plan} = prepare(root);
  const provenanceManifestPath = await writeProvenance(root, "marketing");
  const packagedConfig = JSON.parse(fs.readFileSync(path.join(stageDir, "firebase.json")));
  const packagedRc = JSON.parse(fs.readFileSync(path.join(stageDir, ".firebaserc")));
  const inventory = JSON.parse(fs.readFileSync(
    path.join(stageDir, "web-delivery-inventory.json"),
  ));

  assert.equal(plan.schema, WEB_HOSTING_DELIVERY_PLAN_SCHEMA);
  assert.equal(plan.surface, "marketing");
  assert.equal(plan.stage, "hosting-marketing");
  assert.equal(plan.siteEntryCount, 2);
  assert.ok(plan.siteBytes > 0);
  assert.equal(inventory.schema, WEB_HOSTING_DELIVERY_INVENTORY_SCHEMA);
  assert.deepEqual(packagedConfig.hosting.map((entry) => entry.target), ["marketing"]);
  assert.equal(packagedConfig.hosting[0].public, "site");
  assert.equal("predeploy" in packagedConfig.hosting[0], false);
  assert.equal("postdeploy" in packagedConfig.hosting[0], false);
  assert.deepEqual(packagedRc.projects, {prod: "catch-dating-app-64e51"});
  assert.deepEqual(
    packagedRc.targets["catch-dating-app-64e51"].hosting,
    {marketing: ["catch-dating-app-64e51"]},
  );
  assert.equal(fs.readFileSync(path.join(stageDir, "site/index.html"), "utf8"),
    "<h1>marketing</h1>");

  const verified = verifyWebHostingDelivery({
    sourceRoot: root,
    packageDir: stageDir,
    surface: "marketing",
    ...binding,
    provenanceManifestPath,
  });
  assert.deepEqual(verified, plan);
});

test("inventory uses one deterministic code-point order for mixed-case Vite output", async () => {
  const root = makeSource();
  fs.writeFileSync(
    path.join(root, "website", "dist", "assets", "Zebra.js"),
    "console.log('uppercase asset');\n",
  );
  const {stageDir, plan} = prepare(root);
  const inventory = JSON.parse(fs.readFileSync(
    path.join(stageDir, "web-delivery-inventory.json"),
    "utf8",
  ));
  const assetPaths = inventory.entries
    .map((entry) => entry.path)
    .filter((entryPath) => entryPath.startsWith("site/assets/"));

  assert.deepEqual(assetPaths, ["site/assets/Zebra.js", "site/assets/app.js"]);
  const provenanceManifestPath = await writeProvenance(root, "marketing");
  assert.deepEqual(verifyWebHostingDelivery({
    sourceRoot: root,
    packageDir: stageDir,
    surface: "marketing",
    ...binding,
    provenanceManifestPath,
  }), plan);
});

test("admin package preserves its headers and rewrite but excludes every other product", async () => {
  const root = makeSource("admin");
  const {stageDir, plan} = prepare(root, "admin");
  const provenanceManifestPath = await writeProvenance(root, "admin");
  const config = JSON.parse(fs.readFileSync(path.join(stageDir, "firebase.json")));

  assert.equal(plan.surface, "admin");
  assert.equal(config.hosting.length, 1);
  assert.equal(config.hosting[0].target, "admin");
  assert.equal(config.hosting[0].public, "site");
  assert.deepEqual(config.hosting[0].rewrites, [{source: "**", destination: "/index.html"}]);
  assert.equal("functions" in config, false);
  assert.equal("flutter" in config, false);
  assert.equal("predeploy" in config.hosting[0], false);
  assert.equal("postdeploy" in config.hosting[0], false);
  assert.equal(verifyWebHostingDelivery({
    sourceRoot: root,
    packageDir: stageDir,
    surface: "admin",
    ...binding,
    provenanceManifestPath,
  }).surface, "admin");
});

test("host package preserves the noindex SPA shell and excludes build hooks", async () => {
  const root = makeSource("host");
  const {stageDir, plan} = prepare(root, "host");
  const provenanceManifestPath = await writeProvenance(root, "host");
  const config = JSON.parse(fs.readFileSync(path.join(stageDir, "firebase.json")));

  assert.equal(plan.surface, "host");
  assert.equal(config.hosting.length, 1);
  assert.equal(config.hosting[0].target, "host");
  assert.equal(config.hosting[0].public, "site");
  assert.deepEqual(config.hosting[0].rewrites, [
    {source: "**", destination: "/index.html"},
  ]);
  assert.equal(config.hosting[0].headers[0].headers[0].key, "X-Robots-Tag");
  assert.equal("predeploy" in config.hosting[0], false);
  assert.equal(verifyWebHostingDelivery({
    sourceRoot: root,
    packageDir: stageDir,
    surface: "host",
    ...binding,
    provenanceManifestPath,
  }).surface, "host");
});

test("bounded config rejects a duplicate or unexpected public directory", () => {
  const duplicate = sourceFirebaseConfig();
  duplicate.hosting.push(structuredClone(duplicate.hosting[0]));
  assert.throws(
    () => createBoundedWebHostingConfig(duplicate, "marketing"),
    /exactly one 'marketing' Hosting target/,
  );

  const wrongPublic = sourceFirebaseConfig();
  wrongPublic.hosting[0].public = "somewhere/else";
  assert.throws(
    () => createBoundedWebHostingConfig(wrongPublic, "marketing"),
    /public must be 'website\/dist'/,
  );
});

test("prepare rejects the wrong production project or Hosting site", () => {
  const wrongProjectRoot = makeSource();
  const wrongProjectRcPath = path.join(wrongProjectRoot, ".firebaserc");
  const wrongProjectRc = JSON.parse(fs.readFileSync(wrongProjectRcPath, "utf8"));
  wrongProjectRc.projects.prod = "another-valid-project";
  writeJson(wrongProjectRcPath, wrongProjectRc);
  assert.throws(() => prepare(wrongProjectRoot),
    /projects\.prod must be exactly 'catch-dating-app-64e51'/u);

  const wrongSiteRoot = makeSource();
  const wrongSiteRcPath = path.join(wrongSiteRoot, ".firebaserc");
  const wrongSiteRc = JSON.parse(fs.readFileSync(wrongSiteRcPath, "utf8"));
  wrongSiteRc.targets["catch-dating-app-64e51"].hosting.marketing =
    ["another-marketing-site"];
  writeJson(wrongSiteRcPath, wrongSiteRc);
  assert.throws(() => prepare(wrongSiteRoot),
    /bind 'marketing' exactly to Hosting site 'catch-dating-app-64e51'/u);
});

test("verification rejects a packaged wrong production project or Hosting site", async (t) => {
  for (const mutation of ["project", "site"]) {
    await t.test(mutation, async () => {
      const root = makeSource();
      const {stageDir} = prepare(root);
      const provenanceManifestPath = await writeProvenance(root, "marketing");
      const rcPath = path.join(stageDir, ".firebaserc");
      const rc = JSON.parse(fs.readFileSync(rcPath, "utf8"));
      if (mutation === "project") {
        rc.projects.prod = "another-valid-project";
      } else {
        rc.targets["catch-dating-app-64e51"].hosting.marketing =
          ["another-marketing-site"];
      }
      writeJson(rcPath, rc);
      refreshInventoryEntry(stageDir, ".firebaserc");

      assert.throws(() => verifyWebHostingDelivery({
        sourceRoot: root,
        packageDir: stageDir,
        surface: "marketing",
        ...binding,
        provenanceManifestPath,
      }), /exact production target projection/u);
    });
  }
});

test("verification rejects reintroduced predeploy or postdeploy hooks", async (t) => {
  for (const hook of ["predeploy", "postdeploy"]) {
    await t.test(hook, async () => {
      const root = makeSource();
      const {stageDir} = prepare(root);
      const provenanceManifestPath = await writeProvenance(root, "marketing");
      const configPath = path.join(stageDir, "firebase.json");
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      config.hosting[0][hook] = ["node attacker-controlled-hook.mjs"];
      writeJson(configPath, config);
      refreshInventoryEntry(stageDir, "firebase.json");

      assert.throws(() => verifyWebHostingDelivery({
        sourceRoot: root,
        packageDir: stageDir,
        surface: "marketing",
        ...binding,
        provenanceManifestPath,
      }), /lifecycle-hook-free|must not contain (?:predeploy|postdeploy) hooks/u);
    });
  }
});

test("prepare rejects symlinks and empty deployable builds", () => {
  const symlinkRoot = makeSource();
  fs.symlinkSync(
    path.join(symlinkRoot, "website/dist/index.html"),
    path.join(symlinkRoot, "website/dist/linked.html"),
  );
  assert.throws(() => prepare(symlinkRoot), /must not be a symlink/);

  const emptyRoot = makeSource();
  fs.rmSync(path.join(emptyRoot, "website/dist"), {recursive: true});
  fs.mkdirSync(path.join(emptyRoot, "website/dist"), {recursive: true});
  assert.throws(() => prepare(emptyRoot), /must contain at least one file/);
});

test("prepare requires a fresh package below the source build directory", () => {
  const root = makeSource();
  assert.throws(() => prepareWebHostingDelivery({
    sourceRoot: root,
    surface: "marketing",
    ...binding,
    stageDir: path.join(root, "website", "package"),
  }), /descendant of sourceRoot\/build/);

  const stageDir = path.join(root, "build", "existing");
  fs.mkdirSync(stageDir, {recursive: true});
  assert.throws(() => prepareWebHostingDelivery({
    sourceRoot: root,
    surface: "marketing",
    ...binding,
    stageDir,
  }), /must not already exist/);
});

test("verification rejects added, removed, or modified site bytes", async (t) => {
  for (const mutation of ["added", "removed", "modified"]) {
    await t.test(mutation, async () => {
      const root = makeSource();
      const {stageDir} = prepare(root);
      const provenanceManifestPath = await writeProvenance(root, "marketing");
      if (mutation === "added") {
        fs.writeFileSync(path.join(stageDir, "site", "unexpected.txt"), "unexpected");
      } else if (mutation === "removed") {
        fs.rmSync(path.join(stageDir, "site", "index.html"));
      } else {
        fs.appendFileSync(path.join(stageDir, "site", "index.html"), "tampered");
      }
      assert.throws(() => verifyWebHostingDelivery({
        sourceRoot: root,
        packageDir: stageDir,
        surface: "marketing",
        ...binding,
        provenanceManifestPath,
      }), /contents do not match the delivery inventory/);
    });
  }
});

test("verification rejects run, workflow-generation, and source binding mismatches", async () => {
  const root = makeSource();
  const {stageDir} = prepare(root);
  const provenanceManifestPath = await writeProvenance(root, "marketing");
  for (const changed of [
    {sourceSha: "b".repeat(40)},
    {sourceCiWorkflowId: "78"},
    {sourceCiRunNumber: "124"},
    {sourceCiRunId: "457"},
    {sourceCiRunAttempt: "3"},
  ]) {
    assert.throws(() => verifyWebHostingDelivery({
      sourceRoot: root,
      packageDir: stageDir,
      surface: "marketing",
      ...binding,
      ...changed,
      provenanceManifestPath,
    }), /does not match/);
  }
});

test("verification rejects provenance for another surface or artifact basename", async () => {
  const root = makeSource();
  const {stageDir} = prepare(root);
  const artifactPath = path.join(root, "build", "web-hosting-admin.tar.gz");
  fs.writeFileSync(artifactPath, "wrong surface bytes");
  const wrongManifest = await createProvenanceManifest({
    artifactPath,
    sourceSha: binding.sourceSha,
    sourceCiRunId: binding.sourceCiRunId,
    sourceCiRunAttempt: binding.sourceCiRunAttempt,
    stages: ["hosting-admin"],
  });
  const provenanceManifestPath = path.join(root, "build", "wrong-provenance.json");
  writeJson(provenanceManifestPath, wrongManifest);
  assert.throws(() => verifyWebHostingDelivery({
    sourceRoot: root,
    packageDir: stageDir,
    surface: "marketing",
    ...binding,
    provenanceManifestPath,
  }), /Provenance stages do not exactly match/);
});

test("verification rejects inventory and plan shape extensions", async () => {
  const root = makeSource();
  const {stageDir} = prepare(root);
  const provenanceManifestPath = await writeProvenance(root, "marketing");
  const planPath = path.join(stageDir, "web-delivery-plan.json");
  const plan = JSON.parse(fs.readFileSync(planPath));
  plan.unreviewedAuthority = true;
  writeJson(planPath, plan);
  const inventoryPath = path.join(stageDir, "web-delivery-inventory.json");
  const inventory = JSON.parse(fs.readFileSync(inventoryPath));
  const planBytes = fs.readFileSync(planPath);
  const planEntry = inventory.entries.find((entry) => entry.path === "web-delivery-plan.json");
  planEntry.sizeBytes = planBytes.length;
  planEntry.sha256 = createHash("sha256").update(planBytes).digest("hex");
  writeJson(inventoryPath, inventory);

  assert.throws(() => verifyWebHostingDelivery({
    sourceRoot: root,
    packageDir: stageDir,
    surface: "marketing",
    ...binding,
    provenanceManifestPath,
  }), /must contain exactly/);
});
