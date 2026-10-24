import assert from "node:assert/strict";
import test from "node:test";
import {assertPreviewInvocation, assertReleaseLineage, assertSuccessfulSource, assertSuccessfulSourceRun, currentReleaseLineage,
  LIVE_RELEASE_TAG, liveReleaseSha, safeArchiveMembers, assertRuntimePolicy, preview} from "./previewRelease.mjs";
const sourceSha = "a".repeat(40), repository = "suvratgarg/catch-dating-app";
const invocation = {GITHUB_EVENT_NAME: "workflow_dispatch", GITHUB_REF: "refs/heads/main", GITHUB_REPOSITORY: repository,
  GITHUB_REPOSITORY_ID: "1170579691",
  GITHUB_SHA: sourceSha, GITHUB_WORKFLOW_REF: `${repository}/.github/workflows/website-next-preview.yml@refs/heads/main`};
test("preview refuses branch, automatic, foreign and different workflow invocations", () => {
  assert.doesNotThrow(() => assertPreviewInvocation(invocation));
  // The immutable repository ID survives an organization transfer or rename.
  const moved = "torana-labs/catch-dating-app";
  assert.doesNotThrow(() => assertPreviewInvocation({...invocation, GITHUB_REPOSITORY: moved,
    GITHUB_WORKFLOW_REF: `${moved}/.github/workflows/website-next-preview.yml@refs/heads/main`}));
  for (const [key, value] of Object.entries({GITHUB_EVENT_NAME: "push", GITHUB_REF: "refs/heads/feature", GITHUB_REPOSITORY: "other/repo",
    GITHUB_REPOSITORY_ID: "1",
    GITHUB_SHA: "short", GITHUB_WORKFLOW_REF: `${repository}/.github/workflows/ci.yml@refs/heads/main`})) {
    assert.throws(() => assertPreviewInvocation({...invocation, [key]: value}));
  }
  const {GITHUB_REPOSITORY_ID: _id, ...withoutId} = invocation;
  assert.throws(() => assertPreviewInvocation(withoutId), /canonical repository/u);
});
test("preview requires current-main successful push CI from this repository", () => {
  const run = {head_sha: sourceSha, head_branch: "main", event: "push", path: ".github/workflows/ci.yml", repository: {full_name: repository},
    head_repository: {full_name: repository}, status: "completed", conclusion: "success"};
  const input = {run, sourceSha, repository, mainSha: sourceSha};
  assert.doesNotThrow(() => assertSuccessfulSource(input));
  for (const [key, value] of Object.entries({head_sha: "b".repeat(40), head_branch: "feature", event: "pull_request", path: "other.yml",
    head_repository: {full_name: "fork/repo"}, status: "in_progress", conclusion: "failure"})) {
    assert.throws(() => assertSuccessfulSource({...input, run: {...run, [key]: value}}));
  }
  assert.throws(() => assertSuccessfulSource({...input, mainSha: "b".repeat(40)}));
  // The merge queue run of the same commit is equally its CI; only main's queue counts.
  const queued = {...run, event: "merge_group", head_branch: `gh-readonly-queue/main/pr-841-${"b".repeat(40)}`};
  assert.doesNotThrow(() => assertSuccessfulSource({...input, run: queued}));
  for (const head_branch of ["main", `gh-readonly-queue/develop/pr-841-${"b".repeat(40)}`]) {
    assert.throws(() => assertSuccessfulSource({...input, run: {...queued, head_branch}}), /merge queue run/u);
  }
  assert.throws(() => assertSuccessfulSource({...input, run: {...queued, conclusion: "cancelled"}}));
});
test("a release may trail main but never be off main or older than live", () => {
  const run = {head_sha: sourceSha, head_branch: "main", event: "push", path: ".github/workflows/ci.yml", repository: {full_name: repository},
    head_repository: {full_name: repository}, status: "completed", conclusion: "success"};
  assert.doesNotThrow(() => assertSuccessfulSourceRun({run, sourceSha, repository}));
  assert.throws(() => assertSuccessfulSourceRun({run: {...run, conclusion: "failure"}, sourceSha, repository}));
  const live = "c".repeat(40);
  const lineage = (sourceToMain, liveToSource) => ({sourceSha, liveSha: live, sourceToMain: {status: sourceToMain},
    liveToSource: {status: liveToSource}});
  for (const [main, forward] of [["ahead", "ahead"], ["identical", "ahead"], ["ahead", "identical"]]) {
    assert.doesNotThrow(() => assertReleaseLineage(lineage(main, forward)), `${main}/${forward}`);
  }
  assert.throws(() => assertReleaseLineage(lineage("diverged", "ahead")), /not on main/u);
  assert.throws(() => assertReleaseLineage(lineage("behind", "ahead")), /not on main/u);
  assert.throws(() => assertReleaseLineage(lineage("ahead", "behind")), /never moves backwards/u);
  assert.throws(() => assertReleaseLineage(lineage("ahead", "diverged")), /never moves backwards/u);
  assert.throws(() => assertReleaseLineage({...lineage("ahead", "ahead"), liveSha: "short"}), /Invalid source SHA/u);
});
test("live comes from the release tag, or the runtime's header before the first tagged release", async () => {
  const tagged = "d".repeat(40), header = "e".repeat(40);
  const ref = {ref: `refs/tags/${LIVE_RELEASE_TAG}`, object: {type: "commit", sha: tagged}};
  const neverFetched = async () => assert.fail("the tag answers first");
  assert.equal(await liveReleaseSha(repository, {request: () => [ref, {ref: `refs/tags/${LIVE_RELEASE_TAG}-old`}],
    fetchLive: neverFetched}), tagged);
  assert.equal(await liveReleaseSha(repository, {request: () => [],
    fetchLive: async () => ({headers: new Headers({"x-catch-release": header})})}), header);
  await assert.rejects(liveReleaseSha(repository, {request: () => [{...ref, object: {type: "tag", sha: tagged}}]}),
    /point at a commit/u);
  await assert.rejects(liveReleaseSha(repository, {request: () => [],
    fetchLive: async () => ({headers: new Headers()})}), /Invalid source SHA/u);
  const requests = [];
  const request = (endpoint) => {
    requests.push(endpoint);
    if (endpoint.includes("matching-refs")) return [ref];
    return {status: endpoint.endsWith("...main") ? "ahead" : "identical"};
  };
  assert.deepEqual(await currentReleaseLineage(repository, tagged, {request}),
    {sourceSha: tagged, liveSha: tagged, alreadyLive: true});
  assert.deepEqual(requests.slice(1), [`repos/${repository}/compare/${tagged}...main`,
    `repos/${repository}/compare/${tagged}...${tagged}`]);
});
test("preview extraction rejects traversal, links, duplicates, missing and oversized files", () => {
  const entries = ["image.tar", "release.json", "firebase.json", ".firebaserc", "hosting/.well-known/assetlinks.json"]
    .map(name => ({name, regular: true, size: 10}));
  assert.doesNotThrow(() => safeArchiveMembers(entries));
  for (const extra of [{name: "../escape", regular: true, size: 1}, {name: "/absolute", regular: true, size: 1},
    {name: "hosting/link", regular: false, size: 0}, {name: "hosting/../../escape", regular: true, size: 1},
    {name: "hosting/oversized", regular: true, size: 4 * 1024 ** 3}, entries[0]]) {
    assert.throws(() => safeArchiveMembers([...entries, extra]));
  }
  assert.throws(() => safeArchiveMembers(entries.slice(1)));
});

test("runtime policy refuses missing or write-capable project authority", () => {
  const viewer = {role: "roles/datastore.viewer", members: [`serviceAccount:${preview.runtimeIdentity}`]};
  assert.doesNotThrow(() => assertRuntimePolicy({bindings: [viewer]}));
  assert.throws(() => assertRuntimePolicy({bindings: []}));
  assert.throws(() => assertRuntimePolicy({bindings: [{...viewer, role: "roles/editor"}]}));
  assert.throws(() => assertRuntimePolicy({bindings: [viewer, {...viewer, role: "roles/datastore.user"}]}));
});

test("preview workflow keeps the tested build uncredentialed and never promotes live Hosting", async () => {
  const {readFileSync} = await import("node:fs");
  const {spawnSync} = await import("node:child_process");
  const workflow = readFileSync(new URL("../../../.github/workflows/website-next-preview.yml", import.meta.url), "utf8");
  const build = workflow.slice(workflow.indexOf("  build:"), workflow.indexOf("  preview:"));
  const deploy = workflow.slice(workflow.indexOf("  preview:"));
  assert.match(build, /github.ref == 'refs\/heads\/main'/u);
  assert.doesNotMatch(build, /id-token: write|google-github-actions\/auth|gcloud run deploy/u);
  assert.ok(build.indexOf("previewRelease.mjs authorize") < build.indexOf("docker build"));
  assert.ok(build.indexOf("containerSmoke.mjs") < build.indexOf("docker save"));
  assert.match(deploy, /artifact-ids: \$\{\{ needs.build.outputs.artifact_id \}\}/u);
  assert.match(deploy, /RELEASE_SHA256: \$\{\{ needs.build.outputs.release_sha256 \}\}/u);
  assert.ok(deploy.indexOf("previewRelease.mjs unpack") < deploy.indexOf("google-github-actions/auth"));
  assert.ok(deploy.indexOf("previewRelease.mjs authorize") < deploy.indexOf("google-github-actions/auth"));
  assert.deepEqual([...deploy.matchAll(/gcloud run deploy ([^\s]+)/gu)].map(match => match[1]), [preview.service]);
  assert.ok(deploy.includes(`--service-account ${preview.runtimeIdentity}`));
  assert.ok(deploy.includes(`project=${preview.project}`));
  assert.ok(deploy.includes(`region=${preview.region}`));
  assert.match(deploy, /--image "\$pinned"/u);
  assert.match(deploy, /--min-instances 0 --max-instances 1/u);
  assert.match(deploy, /CATCH_WEBSITE_STAGE=preview/u);
  assert.match(deploy, /hosting:channel:deploy next-candidate --expires 3d/u);
  assert.doesNotMatch(deploy, /firebase deploy|hosting:clone|--force|CATCH_WEBSITE_STAGE=production/u);
  const lines = workflow.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!/^        run: \|$/u.test(lines[i])) continue;
    const script = [];
    while (++i < lines.length && (lines[i].startsWith("          ") || lines[i] === "")) script.push(lines[i].slice(10));
    i--;
    const checked = spawnSync("bash", ["-n"], {input: script.join("\n"), encoding: "utf8"});
    assert.equal(checked.status, 0, checked.stderr);
  }
});

test("packaging and unpacking bind source, attempt and archive bytes before image load", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  const {fileURLToPath} = await import("node:url");
  const {spawnSync} = await import("node:child_process");
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "next-preview-package-"));
  const script = fileURLToPath(new URL("./previewRelease.mjs", import.meta.url));
  try {
    for (const dir of ["bin", "website/public/.well-known", "build/next-preview"]) fs.mkdirSync(path.join(root, dir), {recursive: true});
    fs.writeFileSync(path.join(root, "bin/docker"), `#!/bin/sh\ncase "$1" in\nimage) echo sha256:${"b".repeat(64)};;\nload) echo loaded >> "$DOCKER_TRACE";;\n*) exit 91;;\nesac\n`, {mode: 0o755});
    fs.writeFileSync(path.join(root, "website/public/.well-known/assetlinks.json"), "[]");
    fs.writeFileSync(path.join(root, "build/next-preview/image.tar"), "fake image bytes for packaging test");
    fs.copyFileSync(new URL("../../next-hosting.preview.json", import.meta.url), path.join(root, "website/next-hosting.preview.json"));
    fs.writeFileSync(path.join(root, ".firebaserc"), JSON.stringify({targets: {[preview.project]: {hosting: {marketing: [preview.project]}}}}));
    const output = path.join(root, "outputs"), trace = path.join(root, "docker.trace");
    const env = {...process.env, PATH: `${root}/bin:${process.env.PATH}`, GITHUB_SHA: sourceSha,
      GITHUB_RUN_ID: "123", GITHUB_RUN_ATTEMPT: "1", GITHUB_OUTPUT: output, DOCKER_TRACE: trace};
    const execute = (mode, overrides = {}) => spawnSync(process.execPath, [script, mode], {cwd: root, env: {...env, ...overrides}, encoding: "utf8"});
    const prepared = execute("prepare"); assert.equal(prepared.status, 0, prepared.stderr);
    const hash = fs.readFileSync(output, "utf8").trim().split("=")[1];
    const differentBytes = execute("unpack", {RELEASE_SHA256: "c".repeat(64)});
    assert.notEqual(differentBytes.status, 0); assert.ok(!fs.existsSync(trace));
    const differentSource = execute("unpack", {RELEASE_SHA256: hash, GITHUB_SHA: "d".repeat(40)});
    assert.notEqual(differentSource.status, 0); assert.ok(!fs.existsSync(trace));
    fs.rmSync(path.join(root, "build/next-preview/verified"), {recursive: true, force: true});
    const accepted = execute("unpack", {RELEASE_SHA256: hash});
    assert.equal(accepted.status, 0, accepted.stderr);
    assert.equal(fs.readFileSync(trace, "utf8"), "loaded\n");
    assert.equal(fs.readFileSync(path.join(root, "build/next-preview/verified/hosting/.well-known/assetlinks.json"), "utf8"), "[]");
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});
