import assert from "node:assert/strict";
import crypto from "node:crypto";
import {spawnSync} from "node:child_process";
import test from "node:test";
import {CAPTURE_PRODUCER_JOB, downloadCaptureArtifact, readCaptureArchive, selectCaptureProducerJob, validateBinding, verifyArtifactMetadata} from "./import_hosted_captures.mjs";

const hash = bytes => `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
function identities() {
  const bytes = Buffer.from("exact immutable archive bytes");
  const binding = {repository: "owner/repo", sourceSha: "a".repeat(40), workflowSha: "b".repeat(40),
    workflowRef: "owner/repo/.github/workflows/marketing-captures.yml@refs/heads/main",
    workflowDefinitionSha: "c".repeat(40), eventSha: "d".repeat(40), runHeadSha: "e".repeat(40),
    artifactId: "41", artifactDigest: hash(bytes), runId: "51", runAttempt: "2"};
  const artifact = {id: 41, expired: false, created_at: "2026-10-23T10:05:00Z", name: `canonical-marketing-${binding.sourceSha}-51-2`,
    digest: binding.artifactDigest, workflow_run: {id: 51, repository_id: 61, head_repository_id: 61, head_sha: binding.runHeadSha}};
  const workflow = {id: 71, path: ".github/workflows/marketing-captures.yml"};
  const run = {id: 51, run_attempt: 2, head_sha: binding.runHeadSha, repository: {id: 61}, head_repository: {id: 61}, conclusion: null, workflow_id: 71, path: workflow.path};
  return {binding, artifact, run, repositoryId: 61, bytes, workflow};
}

test("artifact identity distinguishes capture source from the controller event and binds the current attempt", () => {
  const values = identities();
  assert.notEqual(values.binding.sourceSha, values.binding.eventSha);
  assert.doesNotThrow(() => verifyArtifactMetadata(values));
  for (const mutate of [
    x => {x.artifact.id++;}, x => {x.artifact.expired = true;}, x => {delete x.artifact.expired;},
    x => {x.artifact.name = x.artifact.name.replace(/-2$/u, "-1");},
    x => {x.artifact.digest = `sha256:${"0".repeat(64)}`;},
    x => {x.artifact.workflow_run.id++;}, x => {x.artifact.workflow_run.repository_id++;},
    x => {x.artifact.workflow_run.head_repository_id++;}, x => {x.artifact.workflow_run.head_sha = x.binding.sourceSha;},
    x => {x.run.id++;}, x => {x.run.run_attempt++;}, x => {x.run.head_sha = x.binding.sourceSha;},
    x => {x.run.repository.id++;}, x => {x.run.head_repository.id++;},
    x => {x.run.workflow_id++;}, x => {x.run.path = ".github/workflows/unknown.yml";},
    x => {x.workflow.id++;}, x => {x.workflow.path = ".github/workflows/unknown.yml";},
    ...["failure", "cancelled", "timed_out", "action_required"].map(conclusion => x => {x.run.conclusion = conclusion;}),
  ]) {
    const changed = identities(); mutate(changed);
    assert.throws(() => verifyArtifactMetadata(changed));
  }
});

const producer = (values, overrides = {}) => ({name: `capture-freshness / ${CAPTURE_PRODUCER_JOB}`, run_id: 51, run_attempt: 2,
  head_sha: values.binding.runHeadSha, status: "completed", conclusion: "success",
  started_at: "2026-10-23T10:00:00Z", completed_at: "2026-10-23T10:10:00Z", ...overrides});

test("a run cancelled by a newer merge keeps captures whose exact producing job succeeded", () => {
  const values = identities(); values.run.conclusion = "cancelled";
  assert.throws(() => verifyArtifactMetadata(values), /successful capture job is required/);
  assert.doesNotThrow(() => verifyArtifactMetadata({...values, producerJob: producer(values)}));
  for (const overrides of [{conclusion: "failure"}, {conclusion: "cancelled"}, {status: "in_progress"},
    {run_id: 52}, {run_attempt: 1}, {head_sha: values.binding.sourceSha}, {name: "marketing / Validate marketing website"},
    {started_at: "2026-10-23T10:06:00Z"}, {completed_at: "2026-10-23T10:04:00Z"}]) {
    assert.throws(() => verifyArtifactMetadata({...values, producerJob: producer(values, overrides)}),
      /cancelled before its capture job succeeded/, JSON.stringify(overrides));
  }
  assert.throws(() => selectCaptureProducerJob({jobs: [producer(values), producer(values)], binding: values.binding,
    artifact: values.artifact}), /cancelled before its capture job succeeded/);
});

test("artifact download reads the capture job only when the producing run was cancelled", async () => {
  const values = identities();
  for (const jobs of [[producer(values)], [producer(values, {conclusion: "cancelled"})]]) {
    const endpoints = [];
    const request = async (endpoint) => {
      endpoints.push(endpoint);
      if (endpoint === "repos/owner/repo") return {id: 61};
      if (endpoint.endsWith("/workflows/marketing-captures.yml")) return values.workflow;
      if (endpoint.endsWith("/artifacts/41")) return values.artifact;
      if (endpoint.endsWith("/runs/51")) return {...values.run, status: "completed", conclusion: "cancelled"};
      if (endpoint.endsWith("/runs/51/attempts/2/jobs?per_page=100")) return {total_count: jobs.length, jobs};
      return values.bytes;
    };
    const action = () => downloadCaptureArtifact({binding: values.binding, request});
    if (jobs[0].conclusion === "success") assert.deepEqual(await action(), values.bytes);
    else await assert.rejects(action, /cancelled before its capture job succeeded/);
    assert.equal(endpoints.filter(endpoint => endpoint.includes("/jobs?")).length, 1);
  }
});

test("capture bindings reject mutable refs, missing digests and unsafe numeric identities", () => {
  for (const key of ["sourceSha", "workflowSha", "workflowDefinitionSha", "eventSha", "runHeadSha"]) {
    for (const value of ["main", "a".repeat(40) + "\n", null]) {
      const {binding} = identities(); binding[key] = value;
      assert.throws(() => validateBinding(binding));
    }
  }
  for (const key of ["artifactId", "runId", "runAttempt"]) {
    for (const value of ["0", "01", "9007199254740992", 1, "1\n"]) {
      const {binding} = identities(); binding[key] = value;
      assert.throws(() => validateBinding(binding));
    }
  }
  for (const value of [undefined, "latest", "a".repeat(64)]) {
    const {binding} = identities(); binding.artifactDigest = value;
    assert.throws(() => validateBinding(binding));
  }
});

test("artifact download uses only its exact id and rejects attempt races and digest tampering", async () => {
  const values = identities();
  for (const fault of [null, "attempt-race", "bytes", "absent"]) {
    const endpoints = []; let reads = 0;
    const request = async (endpoint, options) => {
      endpoints.push(endpoint);
      if (endpoint === "repos/owner/repo") return {id: 61};
      if (endpoint.endsWith("/workflows/marketing-captures.yml")) return values.workflow;
      if (endpoint.endsWith("/artifacts/41")) {
        if (fault === "absent") throw new Error("Artifact not found");
        return values.artifact;
      }
      if (endpoint.endsWith("/runs/51")) {
        reads++;
        return {...values.run, run_attempt: fault === "attempt-race" && reads === 2 ? 3 : 2};
      }
      assert.equal(endpoint, "repos/owner/repo/actions/artifacts/41/zip");
      assert.equal(options.binary, true);
      return fault === "bytes" ? Buffer.from("tampered") : values.bytes;
    };
    const action = () => downloadCaptureArtifact({binding: values.binding, request});
    if (fault) await assert.rejects(action);
    else assert.deepEqual(await action(), values.bytes);
    assert.ok(!endpoints.some(endpoint => endpoint.includes("?")), "No floating artifact lookup is permitted");
  }
});

const names = Array.from({length: 28}, (_, index) => `artifacts/capture-${index}.bin`);
function archive(entries) {
  const script = `import base64, io, json, sys, zipfile
output = io.BytesIO()
with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_STORED) as archive:
    for entry in json.load(sys.stdin):
        info = zipfile.ZipInfo(entry['name'])
        info.external_attr = entry.get('attributes', 0o100644 << 16)
        archive.writestr(info, base64.b64decode(entry['bytes']))
sys.stdout.buffer.write(output.getvalue())
`;
  const result = spawnSync("python3", ["-c", script], {input: JSON.stringify(entries), maxBuffer: 4 * 1024 * 1024});
  assert.equal(result.status, 0, result.stderr?.toString());
  return result.stdout;
}
const entries = () => names.map((name, index) => ({name, bytes: Buffer.from(`pixel bytes ${index}\0`).toString("base64")}));

test("bounded ZIP reader returns all exact binary entries without extracting files", () => {
  const files = readCaptureArchive(archive(entries()), names);
  assert.equal(files.size, 28);
  for (const [index, name] of names.entries()) assert.deepEqual(files.get(name), Buffer.from(`pixel bytes ${index}\0`));
});

test("ZIP rejects missing, duplicate, extra, traversal, absolute, directory and symlink entries", () => {
  for (const change of [
    values => values.slice(1), values => [...values, values[0]],
    values => [values[0], values[0], ...values.slice(2)],
    ...["../escape", "/absolute", "artifacts/../escape", "artifacts\\escape", "artifacts/", "unexpected"].map(name =>
      values => [{...values[0], name}, ...values.slice(1)]),
    values => [{...values[0], attributes: 0o120777 << 16}, ...values.slice(1)],
  ]) {
    assert.throws(() => readCaptureArchive(archive(change(entries())), names));
  }
});

test("ZIP validates local names and CRCs and rejects prefixed or truncated archives", () => {
  const valid = archive(entries());
  const crc = Buffer.from(valid);
  crc[crc.indexOf(Buffer.from("pixel bytes 0"))] ^= 1;
  assert.throws(() => readCaptureArchive(crc, names));
  const wrongLocalName = Buffer.from(valid);
  wrongLocalName[30] = "X".charCodeAt(0);
  assert.throws(() => readCaptureArchive(wrongLocalName, names));
  assert.throws(() => readCaptureArchive(Buffer.concat([Buffer.from("prefix"), valid]), names));
  assert.throws(() => readCaptureArchive(valid.subarray(0, -12), names));
});
