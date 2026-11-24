"use strict";
const assert = require("node:assert/strict");
const {test} = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
// Protected homes refuse symlinked ancestors, and macOS serves os.tmpdir() through
// the /var -> /private/var link; fixtures must live under the resolved path.
const tmpRoot = fs.realpathSync(os.tmpdir());
const {spawnSync} = require("node:child_process");
const {createHash} = require("node:crypto");
const {createOperatorRuntime, protectedHome, credentialMetadata,
  createSingleAttemptClaimsSetter} = require("../scripts/operations/catch-whatsapp-operator-runtime.cjs");
const {setupHash} = require("../lib/catchMessaging/whatsappOperatorSetup.js");
const {authorizeCatchAppCapability} = require("../lib/catchMessaging/whatsappAppAuthority.js");
const {operatorEmailHash} = require("../lib/catchMessaging/whatsappOperatorSetupSources.js");
const {catchEndpointHash} = require("../lib/catchMessaging/whatsappReply.js");
const root = path.resolve(__dirname, "..");
const command = path.join(root, "scripts/operations/setup-catch-whatsapp-reply.cjs");
function fixture() {
  return {schemaVersion: 1, planId: "synthetic-review", scope: {
    projectId: "demo-catch-setup", actorUid: "operator",
    actorEmailSha256: "a".repeat(64), recipientUid: "recipient",
    endpointHash: "b".repeat(64), appId: "10001", wabaId: "10002",
    phoneNumberId: "10003", credentialVersionSha256: "c".repeat(64)},
  sourceSha: "d".repeat(40), createdAtMillis: 1800000000000,
  expiresAtMillis: 1800000600000, actorCreationTimeMillis: 1001,
  recipientCreationTimeMillis: 1002, actorTokensValidAfterMillis: 0,
  recipientTokensValidAfterMillis: 0, googleSubjectSha256: "e".repeat(64),
  beforeClaimsSha256: "f".repeat(64), desiredClaimsSha256: "1".repeat(64),
  recipientClaimsSha256: "2".repeat(64), grantNonce: "3".repeat(64),
  createReviewRef: "review-create", revokeReviewRef: "review-revoke",
  expectedActorRevision: 0, expectedRecipientRevision: 0};
}
test("offline CLI inspects without ADC, networking or exposing operator scope", () => {
  const directory = fs.mkdtempSync(path.join(tmpRoot, "catch-offline-plan-"));
  try {
    const file = path.join(directory, "plan.json");
    const adc = path.join(directory, "forbidden-adc.json");
    const sentinel = path.join(directory, "sentinel.cjs");
    fs.writeFileSync(file, JSON.stringify(fixture()));
    fs.writeFileSync(adc, "synthetic-credential-marker");
    fs.writeFileSync(sentinel, `
      const fs = require('node:fs');
      const read = fs.readFileSync;
      fs.readFileSync = function(file, ...args) {
        if (String(file) === process.env.GOOGLE_APPLICATION_CREDENTIALS)
          throw new Error('ADC read forbidden');
        return read.call(this, file, ...args);
      };
      global.fetch = () => {throw new Error('network forbidden');};
      for (const name of ['node:http', 'node:https', 'node:net']) {
        const module = require(name);
        for (const key of ['request', 'get', 'connect', 'createConnection']) {
          if (typeof module[key] === 'function')
            module[key] = () => {throw new Error('network forbidden');};
        }
      }
    `);
    const result = spawnSync(process.execPath, ["--require", sentinel, command,
      "inspect-plan", "--plan-file", file], {encoding: "utf8", cwd: root,
    env: {...process.env, GOOGLE_APPLICATION_CREDENTIALS: adc}});
    assert.equal(result.status, 0, result.stderr);
    const receipt = JSON.parse(result.stdout);
    assert.equal(receipt.liveApplyAvailable, false);
    assert.match(receipt.planSha256, /^[a-f0-9]{64}$/u);
    for (const privateValue of ["synthetic-credential-marker", "operator",
      "recipient", "10001", "10002", "10003"]) {
      assert.ok(!result.stdout.includes('"' + privateValue + '"'));
    }
  } finally {fs.rmSync(directory, {recursive: true, force: true});}
});
test("live commands and caller facts fail without echoing private input", () => {
  for (const argv of [[], ["apply", "synthetic-private-token"],
    ["inspect-plan", "--plan-file", "/missing", "synthetic-private-token"]]) {
    const result = spawnSync(process.execPath, [command, ...argv],
      {encoding: "utf8", cwd: root});
    assert.equal(result.status, 1);
    assert.ok(!result.stderr.includes("synthetic-private-token"));
  }
  const directory = fs.mkdtempSync(path.join(tmpRoot, "catch-plan-invalid-"));
  try {
    const file = path.join(directory, "plan.json");
    fs.writeFileSync(file, JSON.stringify({...fixture(), roles: ["adminOwner"]}));
    const result = spawnSync(process.execPath, [command, "inspect-plan",
      "--plan-file", file], {encoding: "utf8"});
    assert.equal(result.status, 1);
    assert.ok(!result.stderr.includes("adminOwner"));
  } finally {fs.rmSync(directory, {recursive: true, force: true});}
});

function runtimeFixture(consolidated = false) {
  const home = fs.mkdtempSync(path.join(tmpRoot, "catch-protected-operator-"));
  const records = new Map();
  let now = 1800000000000;
  let authTime = now / 1000 - 1;
  let claims = consolidated ? {admin: true} : {tenantLabel: "synthetic", nested: {flag: true}};
  let recipientClaims = {};
  let recipientCreation = "1001";
  let recipientPhone = "+15555550123";
  let otherOwner = false;
  let setters = 0;
  let sdkCalls = 0;
  let writes = 0;
  let metadataReads = 0;
  let setterMode = "normal";
  let recipientDeleted = false;
  let restClaims;
  let execution = "e".repeat(64);
  let afterCommit;
  let onVerify;
  const transactionErrors = [];
  const binding = () => ({sourceSha: "d".repeat(40), executionSha256: execution});
  const scope = {projectId: "demo-catch-setup", actorUid: "operator",
    actorEmailSha256: operatorEmailHash("operator@example.invalid"),
    recipientUid: consolidated ? "operator" : "recipient", endpointHash: catchEndpointHash("+15555550123"),
    appId: "10001", wabaId: "10002", phoneNumberId: "10003",
    credentialVersionSha256: ""};
  if (consolidated) records.set("adminRoleAssignments/operator", {
    targetUid: "operator", roles: ["admin"], status: "active", disabled: false,
    email: "operator@example.invalid", displayName: "Preserved operator",
  });
  const credentialVersionName = "projects/demo-catch-setup/secrets/CATCH_WHATSAPP_ACCESS_TOKEN/versions/7";
  scope.credentialVersionSha256 = createHash("sha256").update(credentialVersionName).digest("hex");
  const profile = {schemaVersion: 1, scope, ...binding(), credentialVersionName,
    runtimePrincipal: "serviceAccount:runtime@demo-catch-setup.iam.gserviceaccount.com"};
  const file = (name, value, json = true) => {
    fs.mkdirSync(path.dirname(path.join(home, name)), {recursive: true, mode: 0o700});
    fs.writeFileSync(path.join(home, name), json ? JSON.stringify(value) + "\n" : value, {mode: 0o600});
  };
  file("profile.json", profile);
  file("actor-id-token.txt", "synthetic.google.token", false);
  const snapshot = (p) => ({id: p.split("/").at(-1), exists: records.has(p),
    data: () => records.has(p) ? structuredClone(records.get(p)) : undefined});
  const query = (name, filters = [], count = 100) => ({
    where: (key, op, value) => query(name, [...filters, [key, op, value]], count),
    limit: (value) => query(name, filters, value),
    get: async () => {
      const docs = [...records].filter(([p, v]) => p.startsWith(name + "/") &&
        filters.every(([key, op, value]) => op === "array-contains" ? v[key]?.includes(value) : v[key] === value))
        .slice(0, count).map(([p]) => snapshot(p));
      return {docs, empty: docs.length === 0};
    },
  });
  const collection = (name) => ({...query(name), doc: (id) => ({id, path: name + "/" + id,
    get: async () => snapshot(name + "/" + id),
    collection: (child) => collection(name + "/" + id + "/" + child)})});
  const db = {projectId: scope.projectId, databaseId: "(default)",
    collection,
    runTransaction: async (callback, options) => {
      assert.ok(options.readOnly === true || options.maxAttempts === 1);
      const pending = new Map();
      let result;
      try {result = await callback({get: async (ref) => {
        assert.equal(pending.size, 0, "all reads precede writes");
        return ref.get();
      }, create: (ref, value) => {
        assert.notEqual(options.readOnly, true, "read-only reconciliation cannot create");
        assert.ok(!records.has(ref.path) && !pending.has(ref.path));
        pending.set(ref.path, value);
      }, update: (ref, value) => {
        assert.notEqual(options.readOnly, true, "read-only reconciliation cannot update");
        assert.ok(records.has(ref.path));
        pending.set(ref.path, {...records.get(ref.path), ...value});
      }});} catch (error) {transactionErrors.push(error.stack); throw error;}
      for (const [p, v] of pending) {records.set(p, v); writes++;}
      afterCommit?.(pending);
      return result;
    }};
  const auth = {app: {options: {projectId: scope.projectId}},
    getUser: async (uid) => {
      if (uid === scope.recipientUid && recipientDeleted) throw new Error("private recipient deleted");
      return {uid, disabled: false, customClaims: structuredClone(uid === "operator" ? claims : recipientClaims),
        ...(uid === "operator" ? {email: "operator@example.invalid", emailVerified: true,
          providerData: [{providerId: "google.com", uid: "synthetic-google-subject"}]} : {})};
    },
    verifyIdToken: async (token, checkRevoked) => {
      assert.equal(token, "synthetic.google.token"); assert.equal(checkRevoked, true);
      onVerify?.();
      return {uid: "operator", sub: "operator", aud: scope.projectId,
        iss: "https://securetoken.google.com/" + scope.projectId,
        email: "operator@example.invalid", email_verified: true,
        auth_time: authTime, iat: authTime, exp: now / 1000 + 1800,
        firebase: {sign_in_provider: "google.com", identities: {"google.com": ["synthetic-google-subject"]}}};
    },
    listUsers: async () => ({users: [{uid: "operator", customClaims: structuredClone(claims)},
      {uid: "recipient", customClaims: structuredClone(recipientClaims)},
      ...(otherOwner ? [{uid: "other-owner", customClaims: {adminOwner: true}}] : [])]}),
    setCustomUserClaims: async (uid, next) => {
      assert.equal(uid, "operator"); setters++;
      if (setterMode === "before") throw new Error("private Auth uncertainty");
      claims = structuredClone(next);
      if (setterMode === "after") throw new Error("private lost Auth response");
    }};
  const transport = {getProjectId: async () => scope.projectId,
    lookup: async ({body}) => {
      const uid = body.localId[0];
      if (uid === scope.recipientUid && recipientDeleted) return {users: []};
      return {users: [{localId: uid, createdAt: uid === scope.recipientUid ? recipientCreation : "1001", validSince: "0", disabled: false,
        customAttributes: JSON.stringify(uid === "operator" ? restClaims ?? claims : recipientClaims),
        ...(uid === scope.recipientUid ? {phoneNumber: recipientPhone} : {})}]};
    }};
  const secrets = {getSecretVersion: async ({name}) => {
    metadataReads++; assert.equal(name, credentialVersionName);
    return [{name, state: "ENABLED"}];
  }, getIamPolicy: async ({resource, options}) => {
    metadataReads++; assert.equal(options.requestedPolicyVersion, 3);
    assert.equal(resource, credentialVersionName.split("/versions/")[0]);
    return [{bindings: [{role: "roles/secretmanager.secretAccessor", members: [profile.runtimePrincipal]}]}];
  }, accessSecretVersion: () => assert.fail("no credential payload access")};
  const runtime = () => createOperatorRuntime({home, now: () => now, identity: binding,
    sdkFactory: () => {sdkCalls++; return {db, auth, transport, secrets};}});
  const review = (receipt) => {
    const {plan} = JSON.parse(fs.readFileSync(path.join(home, `pending-plans/${receipt.planId}.json`)));
    const request = JSON.parse(fs.readFileSync(path.join(home, `requests/${receipt.planId}.json`)));
    file(`reviewed-plans/${plan.planId}.json`, plan);
    const approval = {schemaVersion: 1, action: "bootstrap-apply", planSha256: setupHash(plan),
      scopeSha256: setupHash(plan.scope), ...binding(), replaySha256: setupHash(request.replayKey),
      expiresAtMillis: plan.expiresAtMillis};
    file(`approvals/${plan.planId}.json`, approval);
    return {plan, request, approval};
  };
  return {home, runtime, review, file, profile, records, sdk: {db, auth, transport, secrets},
    clock: () => now,
    transactionErrors: () => transactionErrors,
    counts: () => ({setters, sdkCalls, writes, metadataReads}),
    claims: () => structuredClone(claims),
    recipientClaims: () => structuredClone(recipientClaims),
    setRecipientClaims: (value) => {recipientClaims = structuredClone(value);},
    recreateRecipient: () => {recipientCreation = "1002";},
    changeRecipientPhone: () => {recipientPhone = "+15555550124";},
    addOtherOwner: () => {otherOwner = true;},
    failSetter: (mode) => {setterMode = mode;},
    changeClaims: () => {claims = {...claims, unrelatedDrift: true};},
    changeExecution: () => {execution = "f".repeat(64);},
    signIn: () => {now += 2000; authTime = now / 1000;},
    expire: () => {now += 16 * 60 * 1000;},
    deleteRecipient: () => {recipientDeleted = true;},
    revokeObservedRole: () => {restClaims = {...claims, adminOwner: false};},
    restoreOldSession: () => {authTime = 1799999999;},
    onCommit: (callback) => {afterCommit = callback;},
    onVerify: (callback) => {onVerify = callback;},
    close: () => fs.rmSync(home, {recursive: true, force: true})};
}

test("real source planner reads metadata and current identity without writes or automatic approval", async () => {
  const h = runtimeFixture();
  try {
    const receipt = await h.runtime().plan();
    assert.equal(receipt.reviewed, false);
    assert.deepEqual(h.counts(), {setters: 0, sdkCalls: 1, writes: 0, metadataReads: 2});
    assert.equal(h.records.size, 0);
    assert.equal(fs.existsSync(path.join(h.home, "reviewed-plans")), false);
    await assert.rejects(() => h.runtime().apply(receipt.planId));
    assert.equal(h.counts().sdkCalls, 1, "unreviewed apply fails before SDK setup");
    const printed = JSON.stringify(receipt);
    for (const value of ["operator@example.invalid", "synthetic.google.token", "+15555550123", h.profile.runtimePrincipal]) {
      assert.ok(!printed.includes(value));
    }
  } finally {h.close();}
});

test("exact reviewed legacy recipient admin remains unchanged and gets only Catch receive", async () => {
  const h = runtimeFixture();
  try {
    h.setRecipientClaims({admin: true});
    const original = JSON.stringify(h.recipientClaims());
    const receipt = await h.runtime().plan();
    assert.equal(h.counts().setters, 0);
    assert.equal(h.counts().writes, 0);
    const saved = h.review(receipt);
    assert.equal(saved.plan.recipientClaimsSha256, setupHash({admin: true}));
    assert.equal((await h.runtime().apply(receipt.planId)).state, "fresh-sign-in-required");
    h.signIn();
    assert.equal((await h.runtime().apply(receipt.planId)).state, "complete");
    assert.equal(JSON.stringify(h.recipientClaims()), original);
    assert.equal(h.counts().setters, 1); // Fake setter asserts actor UID only.
    const target = h.records.get("catchWhatsappAppAuthorities/recipient");
    assert.deepEqual(target.capabilities, ["receive"]);
    assert.equal(target.endpointHash, h.profile.scope.endpointHash);
    const principal = {record: target, auth: {projectId: target.projectId,
      uid: target.uid, creationTimeMillis: saved.plan.recipientCreationTimeMillis,
      observedAtMillis: h.clock(), disabled: false, relevantRoles: [],
      endpointHash: target.endpointHash, tokensValidAfterMillis: 0},
    session: {projectId: target.projectId, uid: target.uid,
      authTimeSeconds: h.clock() / 1000, expiresAtSeconds: h.clock() / 1000 + 1800}};
    assert.equal(authorizeCatchAppCapability(principal, "receive", h.clock(),
      {projectId: target.projectId, uid: target.uid, endpointHash: target.endpointHash}).capability, "receive");
    for (const capability of ["review", "reply"]) assert.throws(() =>
      authorizeCatchAppCapability(principal, capability, h.clock(),
        {projectId: target.projectId, uid: target.uid}));
    assert.equal((await h.runtime().reconcile(receipt.planId)).state, "bootstrap-complete");
    assert.equal(JSON.stringify(h.recipientClaims()), original);
    assert.equal(h.counts().setters, 1);
  } finally {h.close();}
});

test("legacy recipient admin never admits owner/support or extra privileged claims", async () => {
  for (const value of [{adminOwner: true}, {support: true},
    {admin: true, adminOwner: true}, {admin: true, support: true},
    {admin: true, finance: true}, {admin: true, extra: true}]) {
    const h = runtimeFixture();
    try {
      h.setRecipientClaims(value);
      await assert.rejects(() => h.runtime().plan());
      assert.equal(h.counts().writes, 0);
      assert.equal(h.counts().setters, 0);
      assert.deepEqual(h.recipientClaims(), value);
    } finally {h.close();}
  }
});

test("legacy recipient preservation rejects current claim/owner/incarnation/endpoint drift", async () => {
  for (const change of [h => h.setRecipientClaims({}), h => h.setRecipientClaims({admin: false}),
    h => h.setRecipientClaims({admin: true, added: true}), h => h.setRecipientClaims({admin: true, support: true}),
    h => h.setRecipientClaims({admin: true, adminOwner: true}),
    h => h.addOtherOwner(), h => h.recreateRecipient(), h => h.changeRecipientPhone(), h => h.changeClaims(),
    h => h.records.set("adminRoleAssignments/operator", {roles: ["support"]}),
    h => h.records.set("catchWhatsappAppAuthorities/recipient", {syntheticExisting: true}),
    h => h.records.set("catchWhatsappOperatorSetupOperations/demo-catch-setup", {syntheticExisting: true})]) {
    const h = runtimeFixture();
    try {
      h.setRecipientClaims({admin: true});
      const receipt = await h.runtime().plan(); h.review(receipt);
      change(h);
      await assert.rejects(() => h.runtime().apply(receipt.planId));
      assert.equal(h.counts().setters, 0);
      assert.equal(h.records.has("catchWhatsappAppAuthorities/operator"), false);
    } finally {h.close();}
  }
});

test("recipient drift after durable Auth admissions never dispatches an actor setter", async () => {
  for (const phase of ["auth-intent", "auth-dispatch"]) {
    const h = runtimeFixture();
    try {
      h.setRecipientClaims({admin: true});
      const receipt = await h.runtime().plan(); h.review(receipt);
      let changed = false;
      h.onCommit(pending => {
        if (!changed && (phase === "auth-intent" ? [...pending.values()].some(row => row.phase === "auth-intent") :
          pending.has("catchWhatsappOperatorSetupAudits/demo-catch-setup_auth_dispatch"))) {
          changed = true; h.setRecipientClaims({});
        }
      });
      const result = await Promise.allSettled([h.runtime().apply(receipt.planId)]);
      assert.equal(changed, true);
      if (result[0].status === "fulfilled") assert.equal(result[0].value.state, "reconciliation-required");
      assert.equal(h.counts().setters, 0);
      assert.equal(h.records.has("catchWhatsappAppAuthorities/operator"), false);
    } finally {h.close();}
  }
});

test("legacy recipient claim hash cannot be changed underneath its source-bound approval", async () => {
  const h = runtimeFixture();
  try {
    h.setRecipientClaims({admin: true});
    const receipt = await h.runtime().plan(); const {plan} = h.review(receipt);
    h.file(`reviewed-plans/${receipt.planId}.json`, {...plan, recipientClaimsSha256: setupHash({})});
    const before = h.counts();
    await assert.rejects(() => h.runtime().apply(receipt.planId));
    assert.deepEqual(h.counts(), before);
  } finally {h.close();}
});

test("legacy admin cannot adopt mismatched Catch recipient authority", async () => {
  for (const change of [row => ({...row, uid: "other-recipient"}),
    row => ({...row, revision: row.revision + 1}),
    row => ({...row, endpointHash: "9".repeat(64)}),
    row => ({...row, capabilities: ["review", "reply"]})]) {
    const h = runtimeFixture();
    try {
      h.setRecipientClaims({admin: true});
      const receipt = await h.runtime().plan(); h.review(receipt);
      assert.equal((await h.runtime().apply(receipt.planId)).state, "fresh-sign-in-required");
      h.signIn();
      const key = "catchWhatsappAppAuthorities/recipient";
      const changed = change(h.records.get(key));
      h.records.set(key, changed);
      await assert.rejects(() => h.runtime().apply(receipt.planId));
      assert.deepEqual(h.records.get(key), changed);
      assert.deepEqual(h.recipientClaims(), {admin: true});
      assert.equal(h.counts().setters, 1);
    } finally {h.close();}
  }
});

test("legacy recipient drift at receive admission prevents activation", async () => {
  for (const phase of ["prepare-intent", "finalize-intent"]) {
    const h = runtimeFixture();
    try {
      h.setRecipientClaims({admin: true});
      const receipt = await h.runtime().plan(); h.review(receipt);
      assert.equal((await h.runtime().apply(receipt.planId)).state, "fresh-sign-in-required");
      h.signIn();
      let changed = false;
      h.onCommit(pending => {
        if (!changed && [...pending.values()].some(row => row.phase === phase)) {
          changed = true; h.setRecipientClaims({admin: true, concurrentClaim: true});
        }
      });
      const result = await Promise.allSettled([h.runtime().apply(receipt.planId)]);
      assert.equal(changed, true);
      if (result[0].status === "fulfilled") assert.equal(result[0].value.state, "reconciliation-required");
      assert.notEqual(h.records.get("catchWhatsappAppAuthorities/recipient").state, "active");
      assert.equal(h.counts().setters, 1);
    } finally {h.close();}
  }
});

test("completed legacy recipient claim drift denies apply and read-only reconciliation", async () => {
  for (const value of [{}, {admin: false}, {admin: true, added: true},
    {admin: true, support: true}, {admin: true, adminOwner: true}]) {
    const h = runtimeFixture();
    try {
      h.setRecipientClaims({admin: true});
      const receipt = await h.runtime().plan(); h.review(receipt);
      assert.equal((await h.runtime().apply(receipt.planId)).state, "fresh-sign-in-required");
      h.signIn();
      assert.equal((await h.runtime().apply(receipt.planId)).state, "complete");
      h.setRecipientClaims(value);
      const before = h.counts();
      const records = JSON.stringify([...h.records]);
      await assert.rejects(() => h.runtime().apply(receipt.planId));
      const result = await h.runtime().reconcile(receipt.planId);
      assert.equal(result.state, "reconciliation-required");
      assert.equal(result.recipientAuthState, "drift-observed");
      assert.equal(h.counts().setters, before.setters);
      assert.equal(h.counts().writes, before.writes);
      assert.equal(JSON.stringify([...h.records]), records);
      assert.deepEqual(h.recipientClaims(), value);
    } finally {h.close();}
  }
});

function admittedReadiness(h, saved) {
  const {plan, request} = saved;
  const scope = plan.scope;
  const reference = plan.createReviewRef;
  const cutover = h.clock() - 1000;
  const identity = {projectId: scope.projectId, wabaId: scope.wabaId,
    phoneNumberId: scope.phoneNumberId, recipientUid: scope.recipientUid, endpointHash: scope.endpointHash};
  const bytes = Buffer.from(JSON.stringify({schema: "catch.whatsapp-history-archive/v1",
    identity, atomicIngressStartedAtMillis: cutover, segments: [{fromMillis: 0,
      throughMillis: cutover, records: [{messageId: "synthetic-history", receivedAtMillis: 1000,
        endpointHash: scope.endpointHash, messageType: "text", text: "Please help.", textTruncated: false}]}]}));
  const byteHash = value => createHash("sha256").update(value).digest("hex");
  const delegation = {schemaVersion: 1, authorityRef: "synthetic-audit-custodian",
    delegationRef: "synthetic-separate-delegation", ingressOwnerRef: "synthetic-ingress-auditor",
    historyOwnerRef: "synthetic-history-auditor"};
  const ingressAudit = {schema: "catch.atomic-ingress-source-audit/v1", authorityRef: delegation.ingressOwnerRef,
    authenticationRef: "synthetic-authenticated-deployment-audit", scopeSha256: setupHash(scope),
    deployedRevisionSha256: "9".repeat(64), atomicIngressStartedAtMillis: cutover,
    verifiedAtMillis: h.clock(), audit: {syntheticImmutableRevision: "test-only-atomic-persistence-review"}};
  const ingress = {schemaVersion: 1, scope, document: {schemaVersion: 1,
    ingressId: require("../lib/catchMessaging/whatsappReadinessFirestore.js").catchReadinessIngressId(scope),
    projectId: scope.projectId, wabaId: scope.wabaId, phoneNumberId: scope.phoneNumberId,
    state: "active", atomicIngressStartedAtMillis: cutover,
    evidenceSha256: byteHash(JSON.stringify(ingressAudit)), verifiedAtMillis: h.clock()}, sourceAudit: ingressAudit};
  const historyAudit = {schema: "catch.history-source-audit/v1", authorityRef: delegation.historyOwnerRef,
    authenticationRef: "synthetic-authenticated-history-audit", scopeSha256: setupHash(scope),
    archiveSha256: byteHash(bytes), objectPath: "catch-whatsapp-history/synthetic/test.json", generation: "7",
    historyFromMillis: 0, coveredThroughMillis: cutover, atomicIngressStartedAtMillis: cutover,
    sourceAuthenticityAudit: {syntheticSource: "test-only-source-review"},
    retentionAudit: {syntheticSource: "test-only-retention-review"},
    normalizationAudit: {syntheticSource: "test-only-normalization-review"},
    lateArrivalAudit: {syntheticSource: "test-only-late-data-review"}};
  const history = {schemaVersion: 1, scope, sourceAudit: historyAudit, trustedPin: {
    schema: "catch.whatsapp-history-audit-pin/v1", approvalId: reference,
    scope: {...identity, evidenceSha256: byteHash(bytes)}, sourceAuditSha256: byteHash(JSON.stringify(historyAudit)),
    atomicIngressStartedAtMillis: cutover, coveredThroughMillis: cutover}};
  const admission = {schemaVersion: 1, authorityRef: delegation.authorityRef, delegationRef: delegation.delegationRef,
    scope, ingressAuditSha256: setupHash(ingress), historyAuditSha256: setupHash(history), archiveSha256: byteHash(bytes),
    admittedAtMillis: h.clock(), expiresAtMillis: h.clock() + 3600000};
  h.file("readiness-audit-delegation.json", delegation);
  h.file(`audit-admissions/${reference}.json`, admission);
  h.file(`ingress-audits/${reference}.json`, ingress);
  h.file(`history-audits/${reference}.json`, history);
  h.file(`archives/${reference}.json`, bytes.toString("utf8"), false);
  const approve = action => {
    const candidate = JSON.parse(fs.readFileSync(path.join(h.home, `pending-readiness/${reference}.json`)));
    h.file(`reviewed-readiness/${reference}.json`, candidate);
    const approval = {schemaVersion: 1, action, planSha256: request.planSha256,
      scopeSha256: setupHash(scope), sourceSha: h.profile.sourceSha, executionSha256: h.profile.executionSha256,
      replaySha256: setupHash(request.replayKey), expiresAtMillis: candidate.approval.approval.expiresAtMillis,
      readinessSha256: setupHash(candidate), auditBindingSha256: candidate.auditBindingSha256};
    if (action === "readiness-apply") {
      const audit = JSON.parse(fs.readFileSync(path.join(h.home, `publication-audits/${reference}.json`)));
      approval.publicationAuditSha256 = setupHash(audit);
    }
    h.file(`approvals/${plan.planId}.${action}.json`, approval);
    return {candidate, approval};
  };
  const admitPublication = receipt => {
    const candidate = JSON.parse(fs.readFileSync(path.join(h.home, `pending-readiness/${reference}.json`)));
    const audit = {schemaVersion: 1, authorityRef: delegation.authorityRef, delegationRef: delegation.delegationRef,
      approvalId: reference, planSha256: request.planSha256, scopeSha256: setupHash(scope),
      sourceSha: h.profile.sourceSha, executionSha256: h.profile.executionSha256,
      publicationSha256: receipt.publicationSha256, witnessSha256: receipt.witnessSha256,
      reviewedAtMillis: h.clock(), expiresAtMillis: candidate.approval.approval.expiresAtMillis};
    h.file(`publication-audits/${reference}.json`, audit);
    return audit;
  };
  const replaceEvidence = action => {
    // Simulate the delegated private writer replacing all evidence and approval
    // coherently while the old invocation is waiting on current Auth reads.
    ingress.sourceAudit.audit = {syntheticImmutableRevision: "separately-reviewed-new-source"};
    ingress.document.evidenceSha256 = byteHash(JSON.stringify(ingress.sourceAudit));
    admission.ingressAuditSha256 = setupHash(ingress);
    h.file(`ingress-audits/${reference}.json`, ingress);
    h.file(`audit-admissions/${reference}.json`, admission);
    const candidate = JSON.parse(fs.readFileSync(path.join(h.home, `pending-readiness/${reference}.json`)));
    const receipt = JSON.parse(fs.readFileSync(path.join(h.home, `authentication-audits/${reference}.json`)));
    candidate.approval.ingressEvidenceSha256 = ingress.document.evidenceSha256;
    candidate.auditBindingSha256 = setupHash({delegation, admission, ingress, history});
    receipt.decisionSha256 = require("../lib/catchMessaging/whatsappReadinessEvidence.js")
      .catchReadinessEvidenceDecisionDigest(candidate.approval);
    candidate.reviewSession.decisionSha256 = receipt.decisionSha256;
    candidate.reviewSession.authenticationAuditSha256 = setupHash(receipt);
    h.file(`authentication-audits/${reference}.json`, receipt);
    h.file(`pending-readiness/${reference}.json`, candidate);
    approve(action);
  };
  return {reference, bytes, ingress, history, admission, approve, admitPublication, replaceEvidence};
}

async function completedBootstrap(h) {
  const receipt = await h.runtime().plan(); const saved = h.review(receipt);
  await h.runtime().apply(receipt.planId); h.signIn(); await h.runtime().apply(receipt.planId);
  return {receipt, ...saved};
}

for (const consolidated of [false, true]) {
test(`concrete ${consolidated ? "consolidated" : "separate"} readiness plans, admits ingress, publishes and reviews before ready`, async () => {
  const h = runtimeFixture(consolidated);
  try {
    const saved = await completedBootstrap(h);
    h.expire(); // Readiness never renews the original expired bootstrap plan.
    const input = admittedReadiness(h, saved);
    const before = h.counts();
    const planned = await h.runtime().readinessPlan(saved.plan.planId);
    assert.equal(planned.reviewed, false);
    assert.equal(h.counts().writes, before.writes);
    assert.equal(fs.existsSync(path.join(h.home, "reviewed-readiness")), false);
    await assert.rejects(() => h.runtime().readinessIngress(saved.plan.planId));
    assert.equal(h.counts().sdkCalls, before.sdkCalls + 1, "missing action approval denies before SDK");
    input.approve("readiness-ingress");
    assert.equal((await h.runtime().readinessIngress(saved.plan.planId)).state, "ingress-created");
    const created = h.counts().writes;
    assert.equal((await h.runtime().readinessIngress(saved.plan.planId)).state, "exact-ingress-observed");
    assert.equal(h.counts().writes, created);
    input.approve("readiness-publish");
    const publication = await h.runtime().readinessPublish(saved.plan.planId);
    assert.equal(publication.state, "publication-review-required");
    assert.equal(h.records.get("catchWhatsappOperatorSetupOperations/demo-catch-setup").phase, "published");
    assert.equal(fs.existsSync(path.join(h.home, "publication-audits")), false);
    const readBefore = h.counts();
    const review = await h.runtime().readinessReview(saved.plan.planId);
    assert.equal(review.approved, false);
    assert.equal(h.counts().writes, readBefore.writes);
    await assert.rejects(() => h.runtime().readinessApply(saved.plan.planId));
    input.admitPublication(review); input.approve("readiness-apply");
    assert.equal((await h.runtime().readinessApply(saved.plan.planId)).state, "ready", JSON.stringify(h.transactionErrors()));
    assert.equal(h.records.get("catchWhatsappOperatorSetupOperations/demo-catch-setup").phase, "ready");
    const readyBefore = h.counts();
    assert.equal((await h.runtime().readinessApply(saved.plan.planId)).state, "ready");
    assert.equal(h.counts().writes, readyBefore.writes, "same exact replay never renews readiness");
    const observed = await h.runtime().reconcile(saved.plan.planId);
    assert.equal(observed.state, "readiness-ready-observed");
    assert.equal(observed.readinessVerified, true);
    assert.equal(observed.planExpired, true);
    assert.equal(h.counts().writes, readyBefore.writes, "read-only readiness verification never commits");
    const publicationPath = "catchWhatsappReadinessPublications/" + input.reference;
    const exactPublication = h.records.get(publicationPath);
    h.records.set(publicationPath, {...exactPublication, unexpectedTopLevelField: true});
    await assert.rejects(() => h.runtime().readinessReview(saved.plan.planId));
    assert.equal((await h.runtime().reconcile(saved.plan.planId)).readinessVerified, false);
    assert.equal(h.counts().writes, readyBefore.writes);
    h.records.set(publicationPath, exactPublication);
    const stopPath = "catchWhatsappEndpointStops/cwstop_" + createHash("sha256").update(JSON.stringify([
      saved.plan.scope.wabaId, saved.plan.scope.phoneNumberId, saved.plan.scope.endpointHash])).digest("hex");
    h.records.set(stopPath, {syntheticStop: true});
    assert.equal((await h.runtime().reconcile(saved.plan.planId)).readinessVerified, false);
    h.records.delete(stopPath);
    h.records.set("deletedUsers/" + saved.plan.scope.recipientUid, {syntheticDeletion: true});
    assert.equal((await h.runtime().reconcile(saved.plan.planId)).readinessVerified, false);
    h.records.delete("deletedUsers/" + saved.plan.scope.recipientUid);
    const ingressPath = "catchWhatsappReadinessIngress/" + input.ingress.document.ingressId;
    h.records.set(ingressPath, {...input.ingress.document, state: "revoked"});
    assert.equal((await h.runtime().reconcile(saved.plan.planId)).readinessVerified, false);
    h.records.delete(ingressPath);
    assert.equal((await h.runtime().readinessIngress(saved.plan.planId)).state, "reconciliation-required");
    assert.equal(h.records.has(ingressPath), false, "later setup phases cannot recreate withdrawn ingress");
    h.records.set(ingressPath, input.ingress.document);
    h.expire();
    const expired = await h.runtime().reconcile(saved.plan.planId);
    assert.equal(expired.state, "readiness-unavailable");
    assert.equal(expired.readinessVerified, false);
    assert.equal((await h.runtime().readinessReview(saved.plan.planId)).approved, false);
    await assert.rejects(() => h.runtime().readinessApply(saved.plan.planId));
    assert.equal(h.counts().writes, readyBefore.writes, "expired inspection and denied apply never renew records");
    assert.equal(h.counts().setters, 1);
    assert.equal(h.counts().metadataReads, before.metadataReads);
  } finally {h.close();}
});

}

test("admitted ingress conflicts and readiness expiry cannot replace or reactivate source records", async () => {
  const h = runtimeFixture();
  try {
    const saved = await completedBootstrap(h); const input = admittedReadiness(h, saved);
    await h.runtime().readinessPlan(saved.plan.planId); input.approve("readiness-ingress");
    const ingressPath = "catchWhatsappReadinessIngress/" + input.ingress.document.ingressId;
    const revoked = {...input.ingress.document, state: "revoked"};
    h.records.set(ingressPath, revoked);
    const before = h.counts();
    assert.equal((await h.runtime().readinessIngress(saved.plan.planId)).state, "reconciliation-required");
    assert.deepEqual(h.records.get(ingressPath), revoked);
    assert.equal(h.counts().writes, before.writes);
    h.expire();
    const expiredBefore = h.counts();
    await assert.rejects(() => h.runtime().readinessIngress(saved.plan.planId));
    await assert.rejects(() => h.runtime().readinessPublish(saved.plan.planId));
    assert.equal(h.counts().sdkCalls, expiredBefore.sdkCalls, "expired or missing action approval fails before SDK");
    assert.equal(h.counts().writes, before.writes);
  } finally {h.close();}
});

test("lost ingress commit response uses exact create-only replay without a second effect", async () => {
  const h = runtimeFixture();
  try {
    const saved = await completedBootstrap(h); const input = admittedReadiness(h, saved);
    await h.runtime().readinessPlan(saved.plan.planId); input.approve("readiness-ingress");
    const ingressPath = "catchWhatsappReadinessIngress/" + input.ingress.document.ingressId;
    h.onCommit(pending => {if (pending.has(ingressPath)) throw new Error("synthetic lost committed response");});
    assert.equal((await h.runtime().readinessIngress(saved.plan.planId)).state, "reconciliation-required");
    assert.deepEqual(h.records.get(ingressPath), input.ingress.document);
    const before = h.counts();
    assert.equal((await h.runtime().readinessIngress(saved.plan.planId)).state, "exact-ingress-observed");
    assert.equal(h.counts().writes, before.writes);
    assert.equal(h.counts().setters, 1);
  } finally {h.close();}
});

test("a coherently replaced readiness approval cannot authorize captured older evidence after Auth waits", async () => {
  for (const stage of ["ingress", "publish"]) {
    const h = runtimeFixture();
    try {
      const saved = await completedBootstrap(h); const input = admittedReadiness(h, saved);
      await h.runtime().readinessPlan(saved.plan.planId); input.approve("readiness-ingress");
      if (stage === "publish") {
        await h.runtime().readinessIngress(saved.plan.planId); input.approve("readiness-publish");
      }
      const before = h.counts();
      let replaced = false;
      h.onVerify(() => {
        if (!replaced && (stage === "ingress" || h.records.get(
          "catchWhatsappOperatorSetupOperations/demo-catch-setup")?.phase === "publish-intent")) {
          replaced = true; input.replaceEvidence("readiness-" + stage);
        }
      });
      const result = await h.runtime()[stage === "ingress" ? "readinessIngress" : "readinessPublish"](saved.plan.planId);
      assert.equal(replaced, true);
      assert.equal(result.state, "reconciliation-required");
      assert.equal(h.records.has("catchWhatsappReadinessPublications/" + input.reference), false);
      if (stage === "ingress") {
        assert.equal(h.records.has("catchWhatsappReadinessIngress/" + input.ingress.document.ingressId), false);
        assert.equal(h.counts().writes, before.writes);
      }
      assert.equal(h.counts().setters, 1);
    } finally {h.close();}
  }
});

test("readiness requires admitted actual audits and exact bytes; no profile or shape can replace them", async () => {
  for (const change of ["missing-delegation", "unadmitted-audit", "newline-archive", "retired-role"]) {
    const h = runtimeFixture();
    try {
      const saved = await completedBootstrap(h); const input = admittedReadiness(h, saved);
      if (change === "missing-delegation") fs.unlinkSync(path.join(h.home, "readiness-audit-delegation.json"));
      if (change === "unadmitted-audit") h.file(`audit-admissions/${input.reference}.json`, {...input.admission, historyAuditSha256: "f".repeat(64)});
      if (change === "newline-archive") h.file(`archives/${input.reference}.json`, input.bytes.toString("utf8") + "\n", false);
      if (change === "retired-role") h.revokeObservedRole();
      const before = h.counts();
      await assert.rejects(() => h.runtime().readinessPlan(saved.plan.planId));
      assert.equal(h.counts().writes, before.writes);
      if (change !== "retired-role") assert.equal(h.counts().sdkCalls, before.sdkCalls);
    } finally {h.close();}
  }
});

test("lost publication commit reconciles exact witness without republishing or auto-approving", async () => {
  const h = runtimeFixture();
  try {
    const saved = await completedBootstrap(h); const input = admittedReadiness(h, saved);
    await h.runtime().readinessPlan(saved.plan.planId); input.approve("readiness-ingress");
    await h.runtime().readinessIngress(saved.plan.planId); input.approve("readiness-publish");
    h.onCommit(writes => {
      if (writes.has(`catchWhatsappReadinessPublications/${input.reference}`)) throw new Error("synthetic lost commit response");
    });
    assert.equal((await h.runtime().readinessPublish(saved.plan.planId)).state, "publication-review-required");
    const before = h.counts();
    assert.equal((await h.runtime().readinessPublish(saved.plan.planId)).state, "publication-review-required");
    assert.equal(h.counts().writes, before.writes);
    assert.equal(fs.existsSync(path.join(h.home, "publication-audits")), false);
    assert.equal(h.counts().setters, 1);
  } finally {h.close();}
});

test("exact publication approval and current STOP are checked before readiness grant", async () => {
  const h = runtimeFixture();
  try {
    const saved = await completedBootstrap(h); const input = admittedReadiness(h, saved);
    await h.runtime().readinessPlan(saved.plan.planId); input.approve("readiness-ingress");
    await h.runtime().readinessIngress(saved.plan.planId); input.approve("readiness-publish");
    await h.runtime().readinessPublish(saved.plan.planId);
    const review = await h.runtime().readinessReview(saved.plan.planId);
    const audit = input.admitPublication(review); input.approve("readiness-apply");
    h.file(`publication-audits/${input.reference}.json`, {...audit, publicationSha256: "f".repeat(64)});
    const before = h.counts();
    await assert.rejects(() => h.runtime().readinessApply(saved.plan.planId));
    assert.equal(h.counts().sdkCalls, before.sdkCalls);
    h.file(`publication-audits/${input.reference}.json`, audit);
    const endpointKey = createHash("sha256").update(JSON.stringify([saved.plan.scope.wabaId,
      saved.plan.scope.phoneNumberId, saved.plan.scope.endpointHash])).digest("hex");
    h.records.set(`catchWhatsappEndpointStops/cwstop_${endpointKey}`, {syntheticStop: true});
    assert.equal((await h.runtime().readinessApply(saved.plan.planId)).state, "reconciliation-required");
    assert.equal(h.records.has(`catchWhatsappReplyReadiness/cwready_${endpointKey}`), false);
    assert.equal(h.counts().setters, 1);
  } finally {h.close();}
});

test("protected apply reaches fresh-sign-in and resumes the merged authority store without a second setter", async () => {
  const h = runtimeFixture();
  try {
    const receipt = await h.runtime().plan(); h.review(receipt);
    assert.equal((await h.runtime().apply(receipt.planId)).state, "fresh-sign-in-required");
    assert.deepEqual(h.claims(), {adminOwner: true, nested: {flag: true}, tenantLabel: "synthetic"});
    assert.equal(h.counts().setters, 1);
    assert.equal((await h.runtime().reconcile(receipt.planId)).state, "fresh-sign-in-required");
    h.signIn();
    assert.equal((await h.runtime().apply(receipt.planId)).state, "complete");
    const before = h.counts();
    assert.equal((await h.runtime().reconcile(receipt.planId)).state, "bootstrap-complete");
    assert.deepEqual(h.counts(), {...before, sdkCalls: before.sdkCalls + 1});
    assert.equal(h.counts().setters, 1);
    assert.deepEqual(h.records.get("catchWhatsappAppAuthorities/operator").capabilities, ["review", "reply"]);
    assert.deepEqual(h.records.get("catchWhatsappAppAuthorities/recipient").capabilities, ["receive"]);
    h.expire();
    assert.equal((await h.runtime().reconcile(receipt.planId)).planExpired, true);
    await assert.rejects(() => h.runtime().apply(receipt.planId));
    h.deleteRecipient();
    const deleted = await h.runtime().reconcile(receipt.planId);
    assert.equal(deleted.state, "reconciliation-required");
    assert.equal(deleted.recipientAuthState, "unavailable");
    assert.equal(h.counts().setters, 1);
  } finally {h.close();}
});

test("unknown Auth responses remain read-only observations and never redispatch", async () => {
  for (const mode of ["before", "after"]) {
    const h = runtimeFixture();
    try {
      const receipt = await h.runtime().plan(); h.review(receipt); h.failSetter(mode);
      assert.equal((await h.runtime().apply(receipt.planId)).state, "reconciliation-required");
      const before = h.counts();
      const result = await h.runtime().reconcile(receipt.planId);
      assert.equal(result.state, "reconciliation-required");
      assert.equal(result.authDispatchConsumed, true);
      assert.equal(result.claimsState, mode === "before" ? "before-observed" : "desired-observed");
      assert.deepEqual(h.counts(), {...before, sdkCalls: before.sdkCalls + 1});
      if (mode === "before") await h.runtime().apply(receipt.planId);
      assert.equal(h.counts().setters, 1);
    } finally {h.close();}
  }
});

test("exact protected action/source/scope/replay/expiry and artifact binding reject before SDK access", async () => {
  const edits = [a => ({...a, action: "readiness-apply"}), a => ({...a, sourceSha: "f".repeat(40)}),
    a => ({...a, scopeSha256: "f".repeat(64)}), a => ({...a, replaySha256: "f".repeat(64)}),
    a => ({...a, planSha256: "f".repeat(64)}), a => ({...a, expiresAtMillis: 1}),
    a => ({...a, executionSha256: "f".repeat(64)})];
  for (const edit of edits) {
    const h = runtimeFixture();
    try {
      const receipt = await h.runtime().plan(); const {approval} = h.review(receipt);
      h.file(`approvals/${receipt.planId}.json`, edit(approval));
      await assert.rejects(() => h.runtime().apply(receipt.planId));
      assert.equal(h.counts().sdkCalls, 1); assert.equal(h.counts().setters, 0);
    } finally {h.close();}
  }
  const h = runtimeFixture();
  try {
    const receipt = await h.runtime().plan(); h.review(receipt);
    const running = h.runtime(); h.changeExecution();
    await assert.rejects(() => running.apply(receipt.planId));
    assert.equal(h.counts().setters, 0);
  } finally {h.close();}
});

test("reconcile rejects audit/receipt tampering and reports observed claims drift without writes", async () => {
  const h = runtimeFixture();
  try {
    const receipt = await h.runtime().plan(); h.review(receipt);
    await h.runtime().apply(receipt.planId);
    const audit = h.records.get("catchWhatsappOperatorSetupAudits/demo-catch-setup_4");
    h.records.set("catchWhatsappOperatorSetupAudits/demo-catch-setup_4", {...audit, afterSha256: "f".repeat(64)});
    const before = h.counts();
    await assert.rejects(() => h.runtime().reconcile(receipt.planId));
    assert.equal(h.counts().writes, before.writes);
    h.records.set("catchWhatsappOperatorSetupAudits/demo-catch-setup_4", audit);
    h.changeClaims();
    assert.equal((await h.runtime().reconcile(receipt.planId)).claimsState, "drift-observed");
    assert.equal(h.counts().setters, 1);
  } finally {h.close();}
});

test("private files reject symlinks, broad modes, duplicate JSON, hardlinks and traversal", () => {
  const h = runtimeFixture();
  try {
    const files = protectedHome(h.home);
    fs.chmodSync(path.join(h.home, "profile.json"), 0o644);
    assert.throws(() => files.read("profile.json"));
    fs.chmodSync(path.join(h.home, "profile.json"), 0o600);
    fs.linkSync(path.join(h.home, "profile.json"), path.join(h.home, "linked.json"));
    assert.throws(() => files.read("profile.json"));
    fs.unlinkSync(path.join(h.home, "linked.json"));
    fs.symlinkSync(path.join(h.home, "profile.json"), path.join(h.home, "symlink.json"));
    assert.throws(() => files.read("symlink.json"));
    assert.throws(() => files.read("../outside.json"));
    h.file("duplicate.json", '{"action":"plan","action":"apply"}', false);
    assert.throws(() => files.read("duplicate.json"));
  } finally {h.close();}
});

test("metadata uses exact enabled version and pinned direct principal; no secret payload or IAM expansion", async () => {
  const h = runtimeFixture();
  try {
    let binding = {role: "roles/secretmanager.secretAccessor", members: [h.profile.runtimePrincipal]};
    let state = "ENABLED";
    const secrets = {getSecretVersion: async () => [{name: h.profile.credentialVersionName, state}],
      getIamPolicy: async () => [{bindings: [binding]}],
      accessSecretVersion: () => assert.fail("no token payload"),
      setIamPolicy: () => assert.fail("no IAM mutation")};
    assert.equal((await credentialMetadata(h.profile, secrets)).runtimeAccessor, true);
    binding = {...binding, condition: {expression: "true"}};
    assert.equal((await credentialMetadata(h.profile, secrets)).runtimeAccessor, false);
    binding = {role: "roles/secretmanager.secretAccessor", members: ["group:operators@example.invalid"]};
    assert.equal((await credentialMetadata(h.profile, secrets)).runtimeAccessor, false);
    binding = {role: "roles/viewer", members: [h.profile.runtimePrincipal]};
    assert.equal((await credentialMetadata(h.profile, secrets)).runtimeAccessor, false);
    binding = {role: "roles/secretmanager.secretAccessor", members: []};
    assert.equal((await credentialMetadata(h.profile, secrets)).runtimeAccessor, false);
    state = "DISABLED";
    assert.equal((await credentialMetadata(h.profile, secrets)).enabled, false);
  } finally {h.close();}
});

test("numeric secret alias requires authenticated ACTIVE exact-project binding and exact suffix", async () => {
  const h = runtimeFixture();
  try {
    const requested = h.profile.credentialVersionName;
    const alias = requested.replace("demo-catch-setup", "123456789012");
    let name = alias;
    let state = "ENABLED";
    let authProject = h.profile.scope.projectId;
    let headers = {Authorization: "Bearer synthetic-project-oauth"};
    let project = {projectId: authProject, name: "projects/123456789012", state: "ACTIVE"};
    let binding = {role: "roles/secretmanager.secretAccessor", members: [h.profile.runtimePrincipal]};
    let status = 200;
    let reads = 0;
    const secrets = {auth: {
      getProjectId: async () => authProject,
      getRequestHeaders: async url => {
        assert.equal(url, "https://cloudresourcemanager.googleapis.com/v3/projects/demo-catch-setup");
        return headers;
      }},
    getSecretVersion: async (input, options) => {
      assert.deepEqual(input, {name: requested});
      assert.deepEqual(options, {timeout: 10000, retry: null});
      return [{name, state}];
    }, getIamPolicy: async (input, options) => {
      assert.deepEqual(input, {resource: requested.split("/versions/")[0], options: {requestedPolicyVersion: 3}});
      assert.deepEqual(options, {timeout: 10000, retry: null});
      return [{bindings: [binding]}];
    }, accessSecretVersion: () => assert.fail("no token payload"),
    setIamPolicy: () => assert.fail("no IAM mutation")};
    const options = {dispatch: async (url, init) => {
      reads++;
      assert.equal(url, "https://cloudresourcemanager.googleapis.com/v3/projects/demo-catch-setup");
      assert.equal(init.method, "GET");
      assert.equal(init.redirect, "error");
      assert.ok(init.signal instanceof AbortSignal);
      assert.equal(init.headers.get("Authorization"), "Bearer synthetic-project-oauth");
      assert.equal(init.headers.get("X-Goog-User-Project"), "demo-catch-setup");
      return new Response(JSON.stringify(project), {status});
    }};
    const metadata = () => credentialMetadata(h.profile, secrets, options);
    const expected = {resourceSha256: h.profile.scope.credentialVersionSha256,
      enabled: true, runtimeAccessor: true};
    assert.deepEqual(await metadata(), expected);
    assert.equal(reads, 1);
    name = requested;
    assert.deepEqual(await metadata(), expected);
    assert.equal(reads, 1, "literal project ID needs no alias lookup");
    for (const invalid of [alias.replace("ACCESS_TOKEN", "OTHER_TOKEN"),
      alias.replace("/versions/7", "/versions/8"), alias.replace("123456789012", "foreign-project"),
      alias.replace("123456789012", "999999"), alias + "/extra", alias + "\n",
      alias.replace("123456789012", "0123456789012"), alias.replace("/versions/7", "/versions/latest"),
      alias.replace("/versions/7", "/versions/07")]) {
      name = invalid;
      assert.equal((await metadata()).enabled, false, invalid);
    }
    name = alias;
    for (const mismatch of [{...project, projectId: "foreign-project"},
      {...project, name: "projects/999999"}, {...project, state: "DELETE_REQUESTED"},
      {...project, name: "projects/0123456789012"}, {...project, state: undefined}]) {
      const saved = project; project = mismatch;
      assert.equal((await metadata()).enabled, false);
      project = saved;
    }
    state = "DISABLED";
    const beforeDisabled = reads;
    assert.equal((await metadata()).enabled, false);
    assert.equal(reads, beforeDisabled);
    state = 1;
    assert.equal((await metadata()).enabled, true);
    for (const invalid of [{...binding, condition: {expression: "true"}},
      {...binding, members: ["group:operators@example.invalid"]}, {...binding, members: []},
      {...binding, role: "roles/viewer"}]) {
      const saved = binding; binding = invalid;
      assert.equal((await metadata()).runtimeAccessor, false);
      binding = saved;
    }
    authProject = "foreign-project";
    const beforeAuth = reads;
    await assert.rejects(metadata);
    assert.equal(reads, beforeAuth);
    authProject = "demo-catch-setup";
    headers = {};
    await assert.rejects(metadata);
    assert.equal(reads, beforeAuth);
    headers = {Authorization: "Bearer synthetic-project-oauth", "X-Goog-User-Project": "foreign-project"};
    assert.deepEqual(await metadata(), expected);
    for (const denied of [403, 302, 503]) {
      status = denied;
      const before = reads;
      await assert.rejects(metadata);
      assert.equal(reads, before + 1, "no project lookup retry");
    }
    status = 200;
    await assert.rejects(() => credentialMetadata(h.profile, secrets, {
      dispatch: async () => {throw new Error("synthetic lost response");}}));
    const controller = new AbortController();
    const keepAlive = setTimeout(() => controller.abort(), 20);
    secrets.auth.getRequestHeaders = async () => new Promise(() => {});
    try {
      await assert.rejects(() => credentialMetadata(h.profile, secrets, {...options,
        deadline: () => controller.signal}), /deadline/);
    } finally {clearTimeout(keepAlive);}
  } finally {h.close();}
});

test("default SDK rejects emulator redirection before any ADC or network initialization", async () => {
  const h = runtimeFixture();
  const key = "FIRESTORE_EMULATOR_HOST";
  const previous = process.env[key];
  const Module = require("node:module");
  const load = Module._load;
  try {
    Module._load = function(name, ...args) {
      if (name === "firebase-admin/app") assert.fail("SDK initialized before routing rejection");
      return load.call(this, name, ...args);
    };
    process.env[key] = "127.0.0.1:1";
    const runtime = createOperatorRuntime({home: h.home,
      identity: () => ({sourceSha: h.profile.sourceSha, executionSha256: h.profile.executionSha256})});
    await assert.rejects(() => runtime.plan(), /Protected Catch operator setup unavailable/);
    assert.equal(h.counts().writes, 0);
  } finally {
    Module._load = load;
    if (previous === undefined) delete process.env[key]; else process.env[key] = previous;
    h.close();
  }
});

test("default SDK binds lookup and effective Secret Manager auth quota without changing credentials", async context => {
  const h = runtimeFixture();
  const Module = require("node:module");
  const load = Module._load;
  let secretOptions;
  let lookupProject;
  try {
    const {GoogleAuth, UserRefreshClient} = require("google-auth-library");
    let resolved;
    context.mock.method(GoogleAuth.prototype, "getClient", async () => resolved);
    Module._load = function(name, ...args) {
      if (name === "firebase-admin/app") return {initializeApp: options => {
        assert.equal(options.projectId, h.profile.scope.projectId);
        return h.sdk.auth.app;
      }};
      if (name === "firebase-admin/auth") return {getAuth: () => h.sdk.auth};
      if (name === "firebase-admin/firestore") return {getFirestore: () => h.sdk.db};
      if (name === "@google-cloud/secret-manager") return {SecretManagerServiceClient: class {
        constructor(options) {secretOptions = options; return h.sdk.secrets;}
      }};
      const exported = load.call(this, name, ...args);
      if (name === "../../lib/catchMessaging/whatsappFirebaseAuthority.js") return {...exported,
        createCatchGoogleFirebaseLookupTransport: projectId => {
          lookupProject = projectId; return h.sdk.transport;
        }};
      return exported;
    };
    const runtime = createOperatorRuntime({home: h.home,
      now: h.clock, identity: () => ({sourceSha: h.profile.sourceSha,
        executionSha256: h.profile.executionSha256})});
    assert.equal(secretOptions, undefined, "SDK remains lazy");
    await runtime.plan();
    assert.equal(lookupProject, h.profile.scope.projectId);
    assert.equal(secretOptions.projectId, h.profile.scope.projectId);
    assert.equal(await secretOptions.auth.getProjectId(), h.profile.scope.projectId);
    assert.equal(secretOptions.auth.clientOptions.quotaProjectId, h.profile.scope.projectId);
    for (const quota of [undefined, "foreign-quota-project"]) {
      const json = {type: "authorized_user", client_id: "synthetic-client-id",
        client_secret: "synthetic-client-secret", refresh_token: "synthetic-refresh-token",
        ...(quota ? {quota_project_id: quota} : {})};
      const original = structuredClone(json);
      resolved = UserRefreshClient.fromJSON(json);
      resolved.setCredentials({access_token: "synthetic-existing-access-token",
        token_type: "Bearer", expiry_date: Date.now() + 60 * 60 * 1000});
      const credentials = structuredClone(resolved.credentials);
      assert.equal(resolved.quotaProjectId, quota, "synthetic ADC can override constructor options");
      const client = await secretOptions.auth.getClient();
      assert.equal(client, resolved);
      assert.equal(client.quotaProjectId, h.profile.scope.projectId);
      const headers = await client.getRequestHeaders("https://secretmanager.googleapis.com");
      assert.equal(headers.get("X-Goog-User-Project"), h.profile.scope.projectId);
      assert.deepEqual(client.credentials, credentials);
      assert.deepEqual(json, original);
    }
    assert.equal(h.counts().writes, 0);
    assert.equal(h.counts().setters, 0);
  } finally {Module._load = load; h.close();}
});

test("default claims GoogleAuth uses validated project and quota without ambient discovery", async context => {
  const {GoogleAuth} = require("google-auth-library");
  const projectId = "demo-catch-setup";
  context.mock.method(GoogleAuth.prototype, "getApplicationDefault", async () => assert.fail("no ambient project discovery"));
  context.mock.method(GoogleAuth.prototype, "getRequestHeaders", async function() {
    assert.equal(await this.getProjectId(), projectId);
    assert.equal(this.clientOptions.quotaProjectId, projectId);
    return new Headers({Authorization: "Bearer synthetic-test-oauth", "X-Goog-User-Project": "foreign-project"});
  });
  let dispatches = 0;
  const setter = createSingleAttemptClaimsSetter({projectId, actorUid: "operator"}, {
    beforeDispatch: async () => {}, dispatch: async (_url, init) => {
      dispatches++;
      assert.equal(init.headers.get("X-Goog-User-Project"), projectId);
      return new Response('{"localId":"operator"}', {status: 200});
    }});
  await setter("operator", {});
  assert.equal(dispatches, 1);
  await assert.rejects(() => createSingleAttemptClaimsSetter({projectId: "foreign/project", actorUid: "operator"}, {
    beforeDispatch: async () => {}, dispatch: async () => assert.fail("invalid project dispatch")})("operator", {}));
});

test("reconcile authenticates no-slot status and rejects REST role disagreement or old active-root session", async () => {
  const h = runtimeFixture();
  try {
    const receipt = await h.runtime().plan(); h.review(receipt);
    fs.unlinkSync(path.join(h.home, "actor-id-token.txt"));
    await assert.rejects(() => h.runtime().reconcile(receipt.planId));
    h.file("actor-id-token.txt", "synthetic.google.token", false);
    assert.equal((await h.runtime().reconcile(receipt.planId)).state, "not-started");
    await h.runtime().apply(receipt.planId); h.signIn(); await h.runtime().apply(receipt.planId);
    const before = h.counts();
    h.restoreOldSession();
    assert.equal((await h.runtime().reconcile(receipt.planId)).state, "fresh-sign-in-required");
    h.signIn(); h.revokeObservedRole();
    const result = await h.runtime().reconcile(receipt.planId);
    assert.equal(result.state, "reconciliation-required");
    assert.equal(result.actorMatches, false);
    assert.equal(h.counts().writes, before.writes);
    assert.equal(h.counts().setters, before.setters);
  } finally {h.close();}
});

test("real HTTP claims transport never retries reset, committed lost response, or 503", async () => {
  const http = require("node:http");
  for (const mode of ["reset", "committed-lost-response", "503", "normal"]) {
    let requests = 0;
    let committed = 0;
    const server = http.createServer((req, res) => {
      requests++;
      let body = "";
      req.on("data", (bytes) => {body += bytes;});
      req.on("end", () => {
        assert.equal(req.method, "POST");
        assert.equal(req.headers.authorization, "Bearer synthetic-test-oauth");
        assert.equal(req.headers["x-goog-user-project"], "demo-catch-setup");
        assert.deepEqual(JSON.parse(body), {localId: "operator",
          customAttributes: '{"adminOwner":true,"preserved":"value"}'});
        if (mode === "committed-lost-response" || mode === "normal") committed++;
        if (mode === "reset" || mode === "committed-lost-response") req.socket.destroy();
        else if (mode === "503") {res.writeHead(503); res.end("unavailable");}
        else {res.writeHead(200, {"Content-Type": "application/json"}); res.end('{"localId":"operator"}');}
      });
    });
    await new Promise((resolve) => server.listen(Number(process.env.CATCH_VALIDATION_LOOPBACK_PORT) || 0, "127.0.0.1", resolve));
    try {
      const setter = createSingleAttemptClaimsSetter({projectId: "demo-catch-setup", actorUid: "operator"}, {
        beforeDispatch: async () => {},
        credentialFactory: () => ({getProjectId: async () => "demo-catch-setup",
          getRequestHeaders: async () => ({Authorization: "Bearer synthetic-test-oauth"})}),
        dispatch: (url, options) => {
          assert.equal(url, "https://identitytoolkit.googleapis.com/v1/projects/demo-catch-setup/accounts:update?fields=localId");
          assert.equal(options.redirect, "error"); assert.ok(options.signal instanceof AbortSignal);
          return fetch(`http://127.0.0.1:${server.address().port}/claims`, options);
        }});
      const operation = setter("operator", {adminOwner: true, preserved: "value"});
      if (mode === "normal") await operation; else await assert.rejects(operation);
      assert.equal(requests, 1);
      assert.equal(committed, ["committed-lost-response", "normal"].includes(mode) ? 1 : 0);
      await assert.rejects(() => setter("other", {}));
      assert.equal(requests, 1);
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  }
});

test("approval revoked at consumed Auth permit blocks dispatch and preserves reconciliation", async () => {
  const h = runtimeFixture();
  try {
    const receipt = await h.runtime().plan(); h.review(receipt);
    h.onCommit((writes) => {
      if (writes.has("catchWhatsappOperatorSetupAudits/demo-catch-setup_auth_dispatch")) {
        fs.unlinkSync(path.join(h.home, `approvals/${receipt.planId}.json`));
      }
    });
    assert.equal((await h.runtime().apply(receipt.planId)).state, "reconciliation-required");
    assert.equal(h.counts().setters, 0);
    const result = await h.runtime().reconcile(receipt.planId);
    assert.equal(result.authDispatchConsumed, true);
    assert.equal(result.claimsState, "before-observed");
    assert.equal(result.state, "reconciliation-required");
  } finally {h.close();}
});

test("single-attempt transport rereads approval after headers and bounds hung credential reads", async () => {
  let dispatches = 0;
  let approved = true;
  const options = {dispatch: async () => {dispatches++; assert.fail("unapproved dispatch");},
    beforeDispatch: async () => {assert.equal(approved, true);},
    credentialFactory: () => ({getProjectId: async () => "demo-catch-setup",
      getRequestHeaders: async () => {approved = false; return {};}})};
  const scope = {projectId: "demo-catch-setup", actorUid: "operator"};
  await assert.rejects(() => createSingleAttemptClaimsSetter(scope, options)("operator", {adminOwner: true}));
  assert.equal(dispatches, 0);
  const timeout = { ...options, deadline: () => AbortSignal.timeout(20),
    credentialFactory: () => ({getProjectId: async () => "demo-catch-setup",
      getRequestHeaders: () => new Promise(() => {})})};
  // Keep the synthetic process alive while AbortSignal's unref timer expires.
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    await assert.rejects(() => createSingleAttemptClaimsSetter(scope, timeout)("operator", {adminOwner: true}), /deadline/);
    assert.equal(dispatches, 0);
  } finally {clearTimeout(keepAlive);}
});

test("reentrant different-plan apply cannot replace the in-flight final approval binding", async () => {
  const h = runtimeFixture();
  try {
    const running = h.runtime();
    const first = await running.plan(); h.review(first);
    const other = await running.plan(); h.review(other);
    let competing;
    h.onCommit((writes) => {
      if (writes.has("catchWhatsappOperatorSetupAudits/demo-catch-setup_auth_dispatch")) {
        competing = running.apply(other.planId).then(() => null, error => error);
        fs.unlinkSync(path.join(h.home, `approvals/${first.planId}.json`));
      }
    });
    assert.equal((await running.apply(first.planId)).state, "reconciliation-required");
    assert.match((await competing).message, /Protected Catch operator setup unavailable/);
    assert.equal(h.counts().setters, 0);
    const observed = await running.reconcile(first.planId);
    assert.equal(observed.authDispatchConsumed, true);
    assert.equal(observed.claimsState, "before-observed");
    h.review(first); h.onCommit(undefined);
    assert.equal((await running.apply(first.planId)).state, "reconciliation-required");
    assert.equal(h.counts().setters, 0, "same exact replay keeps the consumed dispatch receipt");
  } finally {h.close();}
});


test("consolidated runtime preserves projection and reconciles one authority", async () => {
  const h = runtimeFixture(true);
  try {
    const receipt = await h.runtime().plan();
    const saved = h.review(receipt);
    assert.ok(saved.plan.actorAssignmentSha256);
    assert.equal((await h.runtime().apply(receipt.planId)).state, "fresh-sign-in-required");
    assert.equal((await h.runtime().reconcile(receipt.planId)).state, "fresh-sign-in-required");
    h.signIn();
    assert.equal((await h.runtime().apply(receipt.planId)).state, "complete");
    assert.equal((await h.runtime().reconcile(receipt.planId)).state, "bootstrap-complete");
    assert.deepEqual(h.claims(), {admin: true, adminOwner: true});
    const assignment = h.records.get("adminRoleAssignments/operator");
    assert.equal(assignment.displayName, "Preserved operator");
    assert.deepEqual(assignment.roles, ["admin", "adminOwner"]);
    assert.equal([...h.records.keys()].filter(key => key.startsWith("catchWhatsappAppAuthorities/")).length, 1);
    assert.equal(h.counts().setters, 1);
    h.changeRecipientPhone();
    assert.equal((await h.runtime().reconcile(receipt.planId)).state, "reconciliation-required");
  } finally { h.close(); }
});
for (const lostPhase of ["prepared", "complete"]) {
  test(`consolidated lost ${lostPhase} receipt resumes without duplicate effects`, async () => {
    const h = runtimeFixture(true);
    try {
      const receipt = await h.runtime().plan(); h.review(receipt);
      await h.runtime().apply(receipt.planId); h.signIn();
      h.onCommit(writes => {
        if (writes.get("catchWhatsappOperatorSetupOperations/demo-catch-setup")?.phase === lostPhase) {
          throw new Error("synthetic lost committed response");
        }
      });
      assert.equal((await h.runtime().apply(receipt.planId)).state, "reconciliation-required");
      h.onCommit(undefined);
      assert.equal((await h.runtime().apply(receipt.planId)).state, "complete");
      assert.equal((await h.runtime().reconcile(receipt.planId)).state, "bootstrap-complete");
      assert.equal(h.counts().setters, 1);
    } finally { h.close(); }
  });
}
