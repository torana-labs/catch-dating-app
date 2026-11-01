import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {classifySecretRuntimeAccess, executeReadinessCli} from "./check_environment_readiness.mjs";
import {collectFunctionBindingIntent, collectSecretConsumers, discoverFunctionExportNames, runCli} from "./function_binding_intent.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const whatsappReaderConsumers = ["dispatchOrganizerCampaign", "getOrganizerMessagingSetup",
  "sendOrganizerWhatsappReply", "sendOrganizerWhatsappTest", "syncOrganizerWhatsappTemplates"];
const whatsappWriterConsumers = ["completeOrganizerWhatsappConnection",
  "disconnectOrganizerWhatsappConnection"];
const base = {environment: "dev", projectId: "test-project", projectNumber: "123456",
  sourceSha: "a".repeat(40), consumers: ["selected"]};
const imports = `import {onRequest as request} from "firebase-functions/v2/https";
import {defineSecret as secret} from "firebase-functions/params";`;
// Every failure names a place and a pattern, never source values or machine paths.
const unresolved = (error) => {
  assert.match(error.message, /^Function binding intent is unresolved: .+\.$/u);
  assert.doesNotMatch(error.message,
    /FAKE_|CHANGED|EXACT_SECRET|writer@|process\.env|\/(?:tmp|var|private|Users)\//u);
  return true;
};
function fixture(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "function-binding-intent-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const [name, content] of Object.entries(files)) {
    const filename = path.join(root, "functions/src", name);
    fs.mkdirSync(path.dirname(filename), {recursive: true});
    fs.writeFileSync(filename, content);
  }
  fs.writeFileSync(path.join(root, "functions/package-lock.json"), JSON.stringify({
    packages: {"node_modules/firebase-functions": {version: "7.4.0"}},
  }));
  return root;
}
const collect = (sourceRoot, overrides = {}) =>
  collectFunctionBindingIntent({...base, sourceRoot, ...overrides});

test("literal options, aliases, imports and spreads yield only binding names", (t) => {
  const sourceRoot = fixture(t, {
    "index.ts": `import {setGlobalOptions} from "firebase-functions";
      setGlobalOptions({secrets: ["GLOBAL_SECRET"], serviceAccount: "global-reader@"});
      export {impl as selected} from "./consumer";`,
    "consumer.ts": `${imports}
      import {key} from "./keys";
      const local = {serviceAccount: null, secrets: [key], labels: {private: "FAKE_PAYLOAD"}};
      export const impl = request({...local, timeoutSeconds: 30}, () => {});`,
    "keys.ts": `import {defineSecret} from "firebase-functions/params";
      export const key = defineSecret("LOCAL_SECRET");`,
    ".env.local": "FAKE_PRIVATE_FILE_DO_NOT_READ",
  });
  assert.deepEqual(collect(sourceRoot), {
    schemaVersion: 1, environment: base.environment, projectId: base.projectId,
    projectNumber: base.projectNumber, sourceSha: base.sourceSha,
    functions: [{consumer: "selected", platform: "gcfv2",
      serviceAccount: "123456-compute@developer.gserviceaccount.com",
      secretNames: ["LOCAL_SECRET"]}],
  });
  const output = JSON.stringify(collect(sourceRoot));
  for (const forbidden of ["FAKE_PAYLOAD", "FAKE_PRIVATE_FILE", "labels", "sourceRoot"])
    assert.equal(output.includes(forbidden), false);
});

test("known helper bodies and form identity shorthand are inspected, not assumed", (t) => {
  const sourceRoot = fixture(t, {
    "index.ts": `export {selected} from "./consumer";`,
    "consumer.ts": `${imports}
      import {appCheckCallableOptionsForFormUpload} from "./shared/organizerFormUploadIdentity";
      export const selected = request(appCheckCallableOptionsForFormUpload({timeoutSeconds:30}), () => {});`,
    "shared/callableOptions.ts": `export function appCheckCallableOptionsWithLimits(limits) {
      return {enforceAppCheck: true, ...limits}; }`,
    "shared/organizerFormUploadIdentity.ts": `import {appCheckCallableOptionsWithLimits} from "./callableOptions";
      export function appCheckCallableOptionsForFormUpload(limits) {
      return {...appCheckCallableOptionsWithLimits(limits), serviceAccount: "catch-form-upload@"}; }`,
  });
  assert.deepEqual(collect(sourceRoot).functions[0], {
    consumer: "selected", platform: "gcfv2",
    serviceAccount: "catch-form-upload@test-project.iam.gserviceaccount.com",
    secretNames: [],
  });
  fs.appendFileSync(path.join(sourceRoot, "functions/src/shared/callableOptions.ts"),
    "\nappCheckCallableOptionsWithLimits = () => ({secrets:[]});");
  assert.throws(() => collect(sourceRoot), unresolved);
});

test("static collection never executes initialization, I/O, handlers or env reads", (t) => {
  const sourceRoot = fixture(t, {"index.ts": `${imports}
    import fs from "node:fs";
    fs.readFileSync("/private/not-a-real-credential");
    globalThis.fetch("https://network-call-must-never-run.invalid");
    throw new Error("FAKE_SECRET_SENTINEL");
    export const selected = request({labels:{value:process.env.FAKE_PRIVATE}}, () => {throw new Error("no");});`});
  const result = collect(sourceRoot);
  assert.deepEqual(result.functions[0].secretNames, []);
  const script = path.join(repo, "tool/firebase/function_binding_intent.mjs");
  const child = spawnSync(process.execPath, [script, "--source-root", sourceRoot,
    "--env", "dev", "--project", "test-project", "--project-number", "123456",
    "--source-sha", base.sourceSha, "--consumers", "selected"], {
    encoding: "utf8", env: {}, timeout: 10000,
  });
  assert.equal(child.status, 0);
  assert.deepEqual(JSON.parse(child.stdout), result);
  assert.equal(child.stderr, "");
});

test("unknown option helpers, spreads and dynamic identities fail closed", (t) => {
  for (const expression of ["unknown()", "{...process.env}",
    "{serviceAccount: process.env.FAKE_PRIVATE}", "{serviceAccount: `reader@${process.env.PROJECT}.iam.gserviceaccount.com`}",
    "{secrets: [process.env.FAKE_PRIVATE]}", "{secrets: [secret(process.env.FAKE_PRIVATE)]}",
    "{['service' + 'Account']: 'reader@'}", "{get serviceAccount(){return 'reader@';}}",
    "{preserveExternalChanges:true}", "{preserveExternalChanges:'truthy'}", "{omit:true}",
    "{secrets:['EXACT_SECRET','EXACT_SECRET']}", "{serviceAccount: {expression:'unknown'}}"]) {
    const sourceRoot = fixture(t, {"index.ts": `${imports}
      export const selected = request(${expression}, () => {});`});
    assert.throws(() => collect(sourceRoot), unresolved);
  }
});

test("source option mutation and escaping references cannot masquerade as literals", (t) => {
  for (const mutation of ["options.serviceAccount = 'different-reader@';",
    "options.secrets.push('OTHER_SECRET');", "delete options.serviceAccount;",
    "Object.assign(options, {serviceAccount:'different-reader@'});", "unknown(options);"]) {
    const sourceRoot = fixture(t, {"index.ts": `${imports}
      const options={serviceAccount:'reader@', secrets:[]};
      ${mutation}
      export const selected=request(options,()=>{});`});
    assert.throws(() => collect(sourceRoot), unresolved);
  }
});

test("unresolved, v1, malformed and circular exports never infer default identity", (t) => {
  for (const source of [`export {selected} from './missing';`,
    `export const selected = () => {};`,
    `${imports} export const selected=request({serviceAccount:'reader@'});`,
    `import {onRequest as request} from 'firebase-functions/v1/https';
      export const selected=request({},()=>{});`,
    `${imports} const a=b; const b=a; export const selected=request(a,()=>{});`,
    `${imports} export const selected=request({},()=>{}); export const selected=1;`]) {
    assert.throws(() => collect(fixture(t, {"index.ts": source})), unresolved);
  }
});

test("global option ordering and other-module global setters are unsupported", (t) => {
  for (const files of [
    {"index.ts": `${imports}
      import {setGlobalOptions} from 'firebase-functions';
      export const selected=request(()=>{});
      setGlobalOptions({serviceAccount:'reader@'});`},
    {"index.ts": `${imports}
      import {setGlobalOptions as configure} from 'firebase-functions';
      function change(){configure({serviceAccount:'reader@'});}
      change(); export const selected=request(()=>{});`},
    {"index.ts": `export {selected} from './consumer';
      import {setGlobalOptions} from 'firebase-functions';
      setGlobalOptions({serviceAccount:'reader@'});`,
    "consumer.ts": `${imports} export const selected=request(()=>{});`},
    {"index.ts": `${imports} export const selected=request(()=>{});`,
      "other.ts": `import {setGlobalOptions} from 'firebase-functions'; setGlobalOptions({});`},
  ]) assert.throws(() => collect(fixture(t, files)), unresolved);
});

test("missing provenance inputs, private path imports and raw errors stay opaque", (t) => {
  const sourceRoot = fixture(t, {"index.ts": `${imports}
    export const selected=request({},()=>{});`});
  for (const overrides of [{sourceSha: ""}, {projectNumber: "unknown"},
    {projectId: "private value"}, {consumers: []}, {consumers: ["selected","selected"]},
    {consumers: ["FAKE_PRIVATE\n"]}, {environment: "other"}]) {
    assert.throws(() => collect(sourceRoot, overrides), unresolved);
  }
  assert.throws(() => runCli(["--unknown", "FAKE_PRIVATE"]), unresolved);
  fs.writeFileSync(path.join(sourceRoot, "functions/src/index.ts"),
    `export {selected} from '../../../FAKE_PRIVATE';`);
  assert.throws(() => collect(sourceRoot), unresolved);
});

test("current secret consumers and direct readers resolve from current source", () => {
  const consumers = [...new Set([...collectSecretConsumers({sourceRoot: repo}).values()].flat())];
  assert.ok(consumers.length > 0);
  consumers.push("cancelEvent", "refreshProgramFlightStatuses", "refreshProgramTravelLeg",
    "eventAssistanceRcsWebhook", "onAssistanceWorkChanged",
    "evaluateDueEventAssistanceWork", "adminSendCatchWhatsappReply");
  const result = collect(repo, {consumers: [...new Set(consumers)]});
  assert.equal(result.functions.length, new Set(consumers).size);
  const byName = new Map(result.functions.map((f) => [f.consumer, f]));
  assert.deepEqual(byName.get("createRazorpayOrder").secretNames, ["RAZORPAY_KEY_SECRET"]);
  assert.deepEqual(byName.get("stripeWebhook").secretNames, ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]);
  assert.deepEqual(byName.get("refreshProgramFlightStatuses").secretNames, []);
  // Readiness used to require payment keys here after source moved refunds out.
  assert.deepEqual(byName.get("cancelEvent").secretNames, []);
  for (const row of result.functions) {
    assert.deepEqual(Object.keys(row), ["consumer", "platform", "serviceAccount", "secretNames"]);
    assert.equal(row.serviceAccount, whatsappReaderConsumers.includes(row.consumer) ?
      "catch-whatsapp-reader@test-project.iam.gserviceaccount.com" :
      "123456-compute@developer.gserviceaccount.com");
  }
});

test("the readiness manifest accepts every secret current source binds", () => {
  // This file runs on any Functions source change; the readiness check itself need not.
  const execution = executeReadinessCli(["--manifest-only"], {repoRoot: repo});
  assert.equal(execution.exitCode, 0);
});

test("secret consumers come from each Function's bindings across every export", (t) => {
  const sourceRoot = fixture(t, {
    "index.ts": `import {setGlobalOptions} from "firebase-functions";
      setGlobalOptions({secrets: ["GLOBAL_SECRET"]});
      export {one, two, three} from "./consumers";`,
    "consumers.ts": `${imports}
      const shared = secret("SHARED_SECRET");
      export const one = request({secrets: [shared]}, () => {});
      export const two = request({secrets: [shared, "OTHER_SECRET"]}, () => {});
      export const three = request(() => {});`,
  });
  assert.deepEqual(Object.fromEntries(collectSecretConsumers({sourceRoot})), {
    GLOBAL_SECRET: ["three"],
    SHARED_SECRET: ["one", "two"],
    OTHER_SECRET: ["two"],
  });
});

test("a failure names the file, line, Function and the pattern it could not read", (t) => {
  // The shape that needed a hand fix in #1382: a trigger wrapper the scanner has not reviewed.
  const wrapper = fixture(t, {
    "index.ts": `export {selected} from "./admin/triggers";`,
    "admin/triggers.ts": `import {onDocumentWritten} from "firebase-functions/v2/firestore";
      const newTrigger = (path) => onDocumentWritten({document: path}, () => {});
      export const selected = newTrigger("items/{id}");`,
  });
  assert.throws(() => collect(wrapper), (error) => unresolved(error) && error.message ===
    "Function binding intent is unresolved: functions/src/admin/triggers.ts:3, Function selected: " +
    "calls a trigger wrapper that is not listed in endpointWrappers; review it, then add it in " +
    "tool/firebase/function_binding_intent.mjs.");
  const script = path.join(repo, "tool/firebase/function_binding_intent.mjs");
  const child = spawnSync(process.execPath, [script, "--source-root", wrapper, "--env", "dev",
    "--project", "test-project", "--project-number", "123456", "--source-sha", base.sourceSha,
    "--consumers", "selected"], {encoding: "utf8", env: {}, timeout: 10000});
  assert.equal(child.status, 1);
  assert.match(child.stderr, /admin\/triggers\.ts:3, Function selected: calls a trigger wrapper/u);

  for (const [source, location, pattern] of [
    [`export {selected} from "./missing";`, "functions/src/index.ts:1", /relative import does not name a \.ts file/u],
    [`${imports}
      export const selected = request({secrets: [process.env.FAKE_PRIVATE]}, () => {});`,
    "functions/src/index.ts:3", /need literal values/u],
  ]) {
    assert.throws(() => collect(fixture(t, {"index.ts": source})), (error) => unresolved(error) &&
      error.message.includes(`${location}, Function selected: `) && pattern.test(error.message));
  }
  assert.throws(() => discoverFunctionExportNames(`const a = 1;\nexport * from "./x";`), (error) =>
    unresolved(error) && error.message.includes("functions/src/index.ts:2"));
});


test("unreviewed SDK semantics cannot establish a source default identity", (t) => {
  const sourceRoot = fixture(t, {"index.ts": `${imports}
    export const selected=request({},()=>{});`});
  fs.writeFileSync(path.join(sourceRoot, "functions/package-lock.json"),
    JSON.stringify({packages:{"node_modules/firebase-functions":{version:"99.0.0"}}}));
  assert.throws(() => collect(sourceRoot), unresolved);
});


test("export discovery includes direct and local exports and refuses unknown forms", () => {
  assert.deepEqual(discoverFunctionExportNames(`export {a, b as renamed} from './x';
    const local = 1; export {local}; export const inline = 2;
    export function named() {} export type {Ignored} from './types';
    export interface Shape {} export type Type = string;`),
  ["a", "inline", "local", "named", "renamed"]);
  for (const source of ["export * from './x';", "export default selected;",
    "export * as nested from './x';", "export const {selected} = unknown();",
    "export class Selected {}"])
    assert.throws(() => discoverFunctionExportNames(source), unresolved);
});

test("reviewed endpoint wrappers, storage overload and imported selectors resolve", (t) => {
  const root = fixture(t, {
    "index.ts": `export {selected} from './admin/sales/callables';
      export {partner} from './partners/callables';
      export {image, document} from './events';`,
    "admin/sales/callables.ts": `${imports}
      const read = (opts) => request(opts, () => {});
      export const selected = read({serviceAccount:'sales-reader@test-project.iam.gserviceaccount.com',secrets:['SALES_SECRET']});`,
    "partners/callables.ts": `${imports}
      function callable(action, employee, validator, service, maxRequests) {
        return request({maxInstances:5}, () => {});
      }
      export const partner = callable('review', false, null, null, 20);`,
    "events.ts": `import {onObjectFinalized} from 'firebase-functions/v2/storage';
      import {onDocumentCreated} from 'firebase-functions/v2/firestore';
      import {selector} from './selector';
      export const image = onObjectFinalized(async () => {});
      export const document = onDocumentCreated(selector, () => {});`,
    "selector.ts": `export const selector = 'items/{id}';`,
  });
  const result = collect(root, {consumers: ['selected','partner','image','document']});
  assert.deepEqual(result.functions.find((r) => r.consumer === 'selected').secretNames,
    ['SALES_SECRET']);
  assert.equal(result.functions.find((r) => r.consumer === 'selected').serviceAccount,
    'sales-reader@test-project.iam.gserviceaccount.com');
  assert.deepEqual(result.functions.find((r) => r.consumer === 'partner').secretNames, []);
  for (const body of ["{const copy = opts; return request(copy,()=>{});}",
    "process.env.CHANGED ? request(opts,()=>{}) : request({},()=>{})",
    "request({...opts,serviceAccount:process.env.IDENTITY},()=>{})"]) {
    fs.writeFileSync(path.join(root, 'functions/src/admin/sales/callables.ts'),
      `${imports} const read=(opts)=>${body}; export const selected=read({});`);
    assert.throws(() => collect(root), unresolved);
  }
});

test("alias escapes, importing module writes and late globals remain unresolved", (t) => {
  for (const files of [
    {'index.ts': `${imports} const opts={secrets:['ORIGINAL']}; const alias=opts;
      alias.secrets[0]='CHANGED'; export const selected=request(opts,()=>{});`},
    {'index.ts': `${imports} import {opts as imported} from './options';
      imported.serviceAccount='writer@'; export const selected=request(imported,()=>{});`,
      'options.ts': `export const opts={serviceAccount:'reader@'};`},
    {'index.ts': `${imports} import * as imported from './options';
      imported.opts.serviceAccount='writer@'; export const selected=request(imported.opts,()=>{});`,
      'options.ts': `export const opts={serviceAccount:'reader@'};`},
    {'index.ts': `${imports} import {setGlobalOptions} from 'firebase-functions';
      const local=request(()=>{});setGlobalOptions({serviceAccount:'writer@'});
      export {local as selected};`},
    ...["'setGlobalOptions'", "'set'+'GlobalOptions'"].map((access) => ({
      'index.ts': `${imports} import * as options from 'firebase-functions/v2/options';
        options[${access}]({serviceAccount:'writer@'}); export const selected=request(()=>{});`,
    })),
  ]) assert.throws(() => collect(fixture(t, files)), unresolved);
});


test("nonentry options namespaces and computed setters cannot change binding intent", (t) => {
  for (const module of ['firebase-functions', 'firebase-functions/v2',
    'firebase-functions/v2/options']) {
    for (const other of [`import * as sdk from '${module}';
      sdk['set'+'GlobalOptions']({serviceAccount:'writer@'});`,
      `const sdk=require('${module}'); sdk['set'+'GlobalOptions']({secrets:['CHANGED']});`,
      `const sdk=import('${module}');`]) {
      const root=fixture(t, {'index.ts': `${imports}
        import './other';export const selected=request(()=>{});`, 'other.ts':other});
      assert.throws(()=>collect(root),unresolved);
    }
    const root=fixture(t, {'index.ts': `${imports}
      import * as sdk from '${module}';export const selected=request(()=>{});`});
    assert.throws(()=>collect(root),unresolved);
  }
});


test("nested references and unmodeled containers cannot escape the binding proof", (t) => {
  for (const code of [
    "const alias=opts.secrets;alias[0]='CHANGED';",
    "const {secrets:alias}=opts;alias[0]='CHANGED';",
    "const box={opts};box.opts.secrets[0]='CHANGED';",
    "const copy={...opts};copy.secrets[0]='CHANGED';",
    "unknown(opts.secrets);", "unknown({nested:opts});",
    "let alias;alias=opts;alias.secrets[0]='CHANGED';",
    "function expose(){return opts;}const alias=expose();alias.secrets[0]='CHANGED';",
  ]) {
    const root=fixture(t, {'index.ts': `${imports}
      const opts={secrets:['ORIGINAL']};${code}
      export const selected=request(opts,()=>{});`});
    assert.throws(()=>collect(root),unresolved);
  }
});

test("unselected importing modules cannot mutate source binding objects", (t) => {
  for (const importStatement of ["import './mutator';",
    "import {unselected} from './mutator';unselected();"]) {
    for (const mutation of ["opts.secrets[0]='CHANGED';",
      "unknown(opts.secrets);", "const copy={...opts};copy.secrets[0]='CHANGED';"]) {
      for (const optionsImport of ["import {opts} from './options';",
        "import {opts} from './barrel';", "import {opts} from './directory';",
        "import opts from './defaultOptions';", "import * as wrapper from './barrel';"]) {
        const root=fixture(t, {
          'index.ts': `${importStatement}export {selected} from './consumer';`,
          'consumer.ts': `${imports}import {opts} from './options';
            export const selected=request(opts,()=>{});`,
          'options.ts': `export const opts={secrets:['ORIGINAL']};`,
          'barrel.ts': `export {opts} from './options';`,
          'directory/index.ts': `export * from '../options';`,
          'defaultOptions.ts': `import {opts} from './options';export default opts;`,
          'mutator.ts': `${optionsImport}${optionsImport.includes('wrapper') ? mutation.replaceAll('opts','wrapper.opts') : mutation}export function unselected(){}`,
        });
        assert.throws(()=>collect(root),unresolved);
      }
    }
  }
});


test("implicit returns, computed methods and iteration cannot escape binding references", (t) => {
  for (const code of [
    "const expose=()=>opts;const alias=expose();alias.secrets[0]='CHANGED';",
    "const expose=()=>({opts});const alias=expose();alias.opts.secrets[0]='CHANGED';",
    "opts.secrets['push']('CHANGED');",
    "opts['secrets']['splice'](0,1,'CHANGED');",
    "for(const secret of opts.secrets){unknown(secret);}",
    "for(const key in opts){unknown(key);}",
    "function* expose(){yield opts;}const alias=expose().next().value;",
  ]) {
    const root=fixture(t, {'index.ts': `${imports}
      const opts={secrets:['ORIGINAL']};${code}
      export const selected=request(opts,()=>{});`});
    assert.throws(()=>collect(root),unresolved);
    const imported=fixture(t, {
      'index.ts': `export {selected} from './consumer';`,
      'consumer.ts': `${imports}import {opts} from './options';
        export const selected=request(opts,()=>{});`,
      'options.ts': `export const opts={secrets:['ORIGINAL']};`,
      'unselected.ts': `import {opts} from './options';${code}`,
    });
    assert.throws(()=>collect(imported),unresolved);
  }
});


test("equivalent parenthesized and asserted mutation syntax remains unresolved", (t) => {
  for (const code of [
    "(opts.secrets)['push']('CHANGED');", "((opts.secrets)['push'])('CHANGED');",
    "(opts).serviceAccount='writer@';", "(opts as any).serviceAccount='writer@';",
    "(opts!).serviceAccount='writer@';", "(opts satisfies object).serviceAccount='writer@';",
    "delete (opts).serviceAccount;", "(opts.secrets).length++;",
    "++((opts as any).secrets).length;",
  ]) {
    const own=fixture(t, {'index.ts': `${imports}
      const opts={secrets:['ORIGINAL']};${code}
      export const selected=request(opts,()=>{});`});
    assert.throws(()=>collect(own),unresolved);
    const imported=fixture(t, {
      'index.ts': `export {selected} from './consumer';`,
      'consumer.ts': `${imports}import {opts} from './options';
        export const selected=request(opts,()=>{});`,
      'options.ts': `export const opts={secrets:['ORIGINAL']};`,
      'unselected.ts': `import {opts} from './options';${code}`,
    });
    assert.throws(()=>collect(imported),unresolved);
  }
});


test("WhatsApp source separates exactly five readers from the default connection writers in DEV and PROD", () => {
  const consumers = discoverFunctionExportNames(fs.readFileSync(
    path.join(repo, "functions/src/index.ts"), "utf8"));
  for (const [environment, projectId] of [["dev", "catchdates-dev"], ["prod", "catch-dating-app-64e51"]]) {
    const intent = collect(repo, {environment, projectId, consumers});
    const readerAccount = `catch-whatsapp-reader@${projectId}.iam.gserviceaccount.com`;
    const readers = intent.functions.filter((row) => row.serviceAccount === readerAccount);
    assert.deepEqual(readers.map((row) => row.consumer).sort(), [...whatsappReaderConsumers].sort());
    for (const consumer of [...whatsappReaderConsumers, ...whatsappWriterConsumers]) {
      const row = intent.functions.find((entry) => entry.consumer === consumer);
      assert.ok(row, consumer);
      assert.deepEqual(row.secretNames, ["META_WHATSAPP_APP_SECRET", "ORGANIZER_WHATSAPP_ACCESS_TOKENS"]);
      assert.equal(row.serviceAccount, whatsappReaderConsumers.includes(consumer) ? readerAccount :
        "123456-compute@developer.gserviceaccount.com");
    }
  }
});

test("WhatsApp reader cannot inherit connection-writer secret permissions", () => {
  for (const [environment, projectId] of [["dev", "catchdates-dev"], ["prod", "catch-dating-app-64e51"]]) {
    const intent = collect(repo, {environment, projectId,
      consumers: [...whatsappReaderConsumers, ...whatsappWriterConsumers]});
    const reader = intent.functions.find((row) => row.consumer === "getOrganizerMessagingSetup").serviceAccount;
    const writer = intent.functions.find((row) => row.consumer === "completeOrganizerWhatsappConnection").serviceAccount;
    const accessor = "roles/secretmanager.secretAccessor";
    const versionManager = "roles/secretmanager.secretVersionManager";
    const policy = (roles, account) => ({status: 0, stdout: JSON.stringify({bindings:
      roles.map((role) => ({role, members: [`serviceAccount:${account}`]}))}), stderr: ""});
    const requirement = {id: "whatsapp-reader", name: "ORGANIZER_WHATSAPP_ACCESS_TOKENS", runtimeRoles: [accessor]};
    const classify = (account, roles, contract = requirement) => classifySecretRuntimeAccess({
      serviceAccount: account, requirement: contract, result: policy(roles, account)});
    assert.equal(classify(reader, [accessor]).status, "ready");
    for (const excess of [versionManager, "roles/secretmanager.admin", "roles/editor", "roles/owner"]) {
      const denied = classify(reader, [accessor, excess]);
      assert.equal(denied.status, "not-ready");
      assert.equal(denied.reason, "runtime-secret-permission-leakage");
    }
    const writerRequirement = {...requirement, id: "whatsapp-writer", runtimeRoles: [accessor, versionManager]};
    assert.equal(classify(writer, [accessor, versionManager], writerRequirement).status, "ready");
    assert.equal(classify(writer, [accessor], writerRequirement).reason, "runtime-secret-access-unproven");
    assert.equal(classifySecretRuntimeAccess({serviceAccount: reader, requirement,
      result: policy([accessor, versionManager], writer)}).reason, "runtime-secret-access-unproven");
  }
});


test("SDK project expression resolves exactly the WhatsApp reader in DEV and PROD", (t) => {
  for (const [environment, projectId] of [["dev", "catchdates-dev"], ["prod", "catch-dating-app-64e51"]]) {
    const root = fixture(t, {"index.ts": `${imports}
      import {expr, projectID} from "firebase-functions/params";
      export const selected = request({serviceAccount: expr\`catch-whatsapp-reader@\${projectID}.iam.gserviceaccount.com\`}, () => {});`});
    assert.equal(collect(root, {environment, projectId}).functions[0].serviceAccount,
      `catch-whatsapp-reader@${projectId}.iam.gserviceaccount.com`);
    const aliases = fixture(t, {"index.ts": `${imports}
      import {expr as sdkExpr, projectID as sdkProject} from "firebase-functions/params";
      export const selected=request({serviceAccount:sdkExpr\`catch-whatsapp-reader@\${sdkProject}.iam.gserviceaccount.com\`},()=>{});`});
    assert.equal(collect(aliases, {environment, projectId}).functions[0].serviceAccount,
      `catch-whatsapp-reader@${projectId}.iam.gserviceaccount.com`);
  }
});

test("project expression rejects arbitrary interpolation, shadowing and builtin overrides", (t) => {
  const exact = 'expr`catch-whatsapp-reader@${projectID}.iam.gserviceaccount.com`';
  for (const expression of [
    'expr`catch-whatsapp-reader@${process.env.PROJECT}.iam.gserviceaccount.com`',
    'expr`catch-whatsapp-reader@${projectID.value()}.iam.gserviceaccount.com`',
    'expr`catch-whatsapp-reader@${projectID}${projectID}.iam.gserviceaccount.com`',
    'expr`other-reader@${projectID}.iam.gserviceaccount.com`',
    'expr`catch-whatsapp-reader@${projectID}.example.com`',
    '`catch-whatsapp-reader@${projectID}.iam.gserviceaccount.com`',
  ]) {
    const root = fixture(t, {"index.ts": `${imports}
      import {expr, projectID} from "firebase-functions/params";
      export const selected=request({serviceAccount:${expression}},()=>{});`});
    assert.throws(() => collect(root), unresolved);
  }
  for (const preamble of [
    'const expr = () => "fake";', 'const projectID = "foreign";',
    'projectID.name = "FOREIGN";', 'projectID.value = () => "foreign";',
    'expr = () => "fake";', 'Object.assign(projectID, {name:"FOREIGN"});',
    'unknown(projectID);', 'const alias = projectID;',
    'const alias = {projectID}; alias.projectID.name = "FOREIGN";',
    'const alias = {expr}; alias.expr = () => "fake";',
    'export {projectID};', 'export {expr};',
    'export {projectID as escapedProject};', 'export {expr as escapedTag};',
  ]) {
    const root = fixture(t, {"index.ts": `${imports}
      import {expr, projectID} from "firebase-functions/params";
      ${preamble} export const selected=request({serviceAccount:${exact}},()=>{});`});
    assert.throws(() => collect(root), unresolved);
  }
  const aliased = exact.replace('expr`', 'sdkExpr`').replace('${projectID}', '${sdkProject}');
  for (const escape of ['const alias = {sdkProject}; alias.sdkProject.name = "FOREIGN";',
    'const alias = {sdkExpr};', 'export {sdkProject};', 'export {sdkExpr};',
    'export {sdkProject as escapedProject};', 'export {sdkExpr as escapedTag};']) {
    const root = fixture(t, {"index.ts": `${imports}
      import {expr as sdkExpr, projectID as sdkProject} from "firebase-functions/params";
      ${escape} export const selected=request({serviceAccount:${aliased}},()=>{});`});
    assert.throws(() => collect(root), unresolved);
  }
  for (const parameter of ["expr", "projectID"]) {
    const root = fixture(t, {"index.ts": `${imports}
      import {appCheckCallableOptionsWithLimits} from './shared/callableOptions';
      export const selected=request(appCheckCallableOptionsWithLimits({}),()=>{});`,
      "shared/callableOptions.ts": `import {expr, projectID} from "firebase-functions/params";
        export function appCheckCallableOptionsWithLimits(${parameter}) {
          return {serviceAccount:${exact}}; }`});
    assert.throws(() => collect(root), unresolved);
  }
  for (const sdkImport of [
    'import {expr, projectID} from "./fake";',
    'import type {expr, projectID} from "firebase-functions/params";',
    'import {expr, type projectID} from "firebase-functions/params";',
  ]) {
    const root = fixture(t, {"index.ts": `${imports} ${sdkImport}
      export const selected=request({serviceAccount:${exact}},()=>{});`,
      "fake.ts": 'export const expr = () => "fake"; export const projectID = "foreign";'});
    assert.throws(() => collect(root), unresolved);
  }
});


test("v2 shorthand with secrets cannot claim deployment readiness", (t) => {
  for (const options of ["{serviceAccount:'reader@',secrets:['EXACT_SECRET']}",
    "{serviceAccount:'catch-form-upload@',secrets:['EXACT_SECRET']}"]) {
    const root = fixture(t, {"index.ts": `${imports} export const selected=request(${options},()=>{});`});
    assert.throws(() => collect(root), unresolved);
  }
  const root = fixture(t, {"index.ts": `${imports}
    import {setGlobalOptions} from 'firebase-functions';
    setGlobalOptions({serviceAccount:'reader@'});
    export const selected=request({secrets:['EXACT_SECRET']},()=>{});`});
  assert.throws(() => collect(root), unresolved);
});
