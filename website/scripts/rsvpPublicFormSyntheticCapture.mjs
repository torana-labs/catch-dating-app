import {existsSync, readFileSync, lstatSync, readdirSync, realpathSync} from "node:fs";
import {mkdtemp, writeFile, mkdir, rename, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {createRequire} from "node:module";

// RSVP_SOURCE_REPO=/path/to/repo RSVP_SOURCE_SHA=<full-commit-sha>
// RSVP_CAPTURE_OUTPUT=/absolute/new/output npm --workspace catch-marketing run capture:rsvp
// Optional RSVP_CAPTURE_SCENARIOS is a comma-separated subset of scenario names.
// Only committed source is captured. A temporary Git archive has its own locked
// dependencies, installed OFFLINE from npm's cache (bootstrap the checkout first).
// The browser cannot access external services. These are synthetic visual
// fixtures. Explicit domain batches exercise real UI/controller with synthetic
// services; neither mode proves live submission, TLS, payment or release.
const runnerPath = fileURLToPath(import.meta.url);
const repo = path.resolve(path.dirname(runnerPath), "../..");
const snapshotPaths = ["package.json", "package-lock.json", "admin/package.json", "website", "packages", "functions/src/shared"];
export const scenarioNames = Object.freeze([
  "audience-form-desktop", "purpose-review-desktop", "purpose-review-mobile",
  "payment-test-mobile", "embedded-purpose-mobile",
]);

export const domainScenarioNames = Object.freeze([
  "domain-submit-desktop", "domain-held-mobile", "domain-unknown-mobile",
  "domain-revoked-mobile", "domain-mismatch-mobile", "domain-transport-mobile",
]);
const domainOrigin = "http://forms.client.example";

/** Synthetic transport only; the browser runs the real gate and controller. */
export function domainServiceFixture() {
  const calls = [];
  const form = {
    publicFormId: "bound-public", formId: "bound-form", versionId: "bound-version",
    version: 1, availabilityStatus: "active", availabilityMessage: null,
    organizer: {organizerId: "synthetic-organizer", name: "Synthetic organizer", logoUrl: null},
    definition: {
      title: "Synthetic client application", description: "Isolated browser fixture",
      purpose: "application", defaultTargetKind: "organizer", defaultTargetId: null,
      identityPolicy: "anonymous", payment: null, logicRules: [],
      appearance: {preset: "minimal", logoAssetId: null, coverAssetId: null, activityKind: null},
      availability: {opensAt: null, closesAt: null, responseLimit: null, closedMessage: null},
      consent: {consentCopy: "Share my synthetic answer", consentVersion: "synthetic-v1", retentionCopy: "Synthetic fixture only"},
      completion: {title: "Synthetic response received", message: "Synthetic submission complete", actionKind: "none", actionLabel: null, actionUrl: null},
      sections: [{sectionId: "details", title: "Details", description: null, pageBreak: false,
        questions: [{questionId: "name", key: "name", label: "Your name", helpText: null,
          kind: "shortText", required: true, options: [], canonicalFieldId: null,
          privacyClass: "organizerCustom", answerDestination: "organizerOnly", prefillPolicy: "never", hostPresentation: "detailOnly",
          validation: {minLength: null, maxLength: 80, minNumber: null, maxNumber: null,
            earliestDate: null, latestDate: null, minSelections: null, maxSelections: null,
            maxFileCount: null, maxFileSizeBytes: null, allowedMimeTypes: [], patternPreset: null, customError: null}}]}],
    },
  };
  let draft = null;
  let receipt = null;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const record = (name, payload) => {
    // Even malformed inputs must remain observable in denied-host controls.
    const attempt = {name, payload: null};
    calls.push(attempt);
    try {attempt.payload = clone(payload);} catch {
      throw new Error("Malformed synthetic transport payload");
    }
  };
  const requirePublic = (payload) => {
    if (payload.publicFormId !== form.publicFormId || payload.sourceToken !== null) throw new Error("Wrong synthetic form owner");
  };
  const requireDraft = (payload) => {
    if (!draft || payload.draftId !== draft.draftId || payload.draftToken !== draft.draftToken ||
        payload.expectedRevision !== draft.revision) throw new Error("Wrong synthetic draft or revision");
  };
  const unexpected = () => {record("unexpected", null); throw new Error("Unexpected provider operation in anonymous synthetic scenario");};
  return {
    calls,
    async getPublicOrganizerForm(payload) {record("get", payload); requirePublic(payload); return clone(form);},
    watchPublicFormAuthState(listener) {record("auth", null); listener(null); return () => {};},
    async beginOrganizerFormResponse(payload) {
      record("begin", payload); requirePublic(payload);
      if (typeof payload.requestId !== "string" || !payload.requestId) throw new Error("Missing synthetic start identity");
      draft ??= {draftId: "bound-draft", draftToken: "synthetic-draft-token", revision: 1,
        form, identityKind: "anonymous", answers: {}, consentAccepted: false, expiresAtMillis: 2_000_000_000_000};
      return clone(draft);
    },
    async saveOrganizerFormResponseDraft(payload) {
      record("save", payload); requireDraft(payload);
      draft = {...draft, answers: clone(payload.answers), consentAccepted: payload.consentAccepted, revision: draft.revision + 1};
      return {draftId: draft.draftId, revision: draft.revision, expiresAtMillis: draft.expiresAtMillis};
    },
    async submitOrganizerFormResponse(payload) {
      record("submit", payload); requireDraft(payload);
      if (draft.consentAccepted !== true || draft.answers.name !== "Synthetic respondent" ||
          typeof payload.requestId !== "string" || !payload.requestId) throw new Error("Synthetic submission lacks reviewed answer/consent");
      receipt ??= {responseId: "bound-response", formId: form.formId, versionId: form.versionId,
        status: "submitted", submittedAtMillis: 1_800_000_000_000,
        withdrawalToken: "synthetic-withdrawal-token", completion: form.definition.completion};
      return clone(receipt);
    },
    beginPublicEventPhoneVerification: unexpected, completePublicFormEmailSignIn: unexpected,
    createOrganizerFormAssetIntent: unexpected, finalizeOrganizerFormAsset: unexpected,
    promoteFormCommunicationIntent: unexpected, sendPublicFormEmailSignInLink: unexpected,
    uploadOrganizerFormAsset: unexpected, withdrawOrganizerFormResponse: unexpected,
    findOrganizerFormPayment: unexpected, getOrganizerFormPayment: unexpected,
    prepareOrganizerFormPayment: unexpected, listParticipantFormActivity: unexpected,
  };
}

export function domainFixtureModule() {
  const names = Object.keys(domainServiceFixture()).filter((name) => name !== "calls");
  return `const api = (${domainServiceFixture.toString()})();\nwindow.__domainCalls = api.calls;\nexport const {${names.join(",")}} = api;\n`;
}

/** Only an intercepted virtual origin can reach the loopback fixture server. */
export function domainProxyUrl(requestUrl, localOrigin) {
  const url = new URL(requestUrl);
  const local = new URL(localOrigin);
  if (local.protocol !== "http:" || local.hostname !== "127.0.0.1" || !local.port ||
      local.pathname !== "/" || local.search || local.hash || local.username || local.password) {
    throw new Error("An exact loopback fixture origin is required");
  }
  if (url.origin !== domainOrigin || url.username || url.password) return null;
  return `${local.origin}${url.pathname}${url.search}`;
}

async function exerciseDomain(page, name, release, lookupStarted) {
  let timer;
  try {
    await Promise.race([lookupStarted, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Custom hostname lookup did not start")), 15000);
    })]);
  } finally {clearTimeout(timer);}
  if (name === "domain-held-mobile") {
    await page.getByText("Opening form", {exact: true}).waitFor();
    if (await page.evaluate(() => (window.__domainCalls ?? []).length !== 0)) throw new Error("Held host lookup started form work");
    release();
  }
  if (!["domain-submit-desktop", "domain-held-mobile"].includes(name)) {
    await page.getByRole("heading", {name: "This form is unavailable"}).waitFor();
    if (await page.evaluate(() => (window.__domainCalls ?? []).length !== 0)) throw new Error("Denied hostname started form work");
    if (new URL(page.url()).pathname !== "/f/other-public") throw new Error("Denied hostname navigated");
    return {outcome: "denied", calls: []};
  }
  await page.getByRole("textbox", {name: "Your name"}).waitFor();
  await page.waitForFunction(() => window.__domainCalls?.some((call) => call.name === "begin"));
  if (page.url() !== `${domainOrigin}/f/bound-public`) throw new Error("Host did not route to its bound form");
  await page.getByRole("textbox", {name: "Your name"}).fill("Synthetic respondent");
  await page.getByRole("button", {name: "Review answers"}).click();
  const consent = page.getByRole("checkbox", {name: "Share my synthetic answer"});
  await consent.waitFor();
  if (await consent.isChecked()) throw new Error("Synthetic consent was preselected");
  if (await page.evaluate(() => window.__domainCalls.some((call) => call.name === "submit"))) throw new Error("Submitted without explicit consent");
  await consent.check();
  await page.getByRole("button", {name: "Submit response"}).click();
  await page.getByRole("heading", {name: "Synthetic response received"}).waitFor();
  const calls = await page.evaluate(() => window.__domainCalls);
  if (calls.filter((call) => call.name === "get").length !== 1 ||
      calls.filter((call) => call.name === "begin").length !== 1 ||
      calls.some((call) => call.name === "unexpected")) throw new Error("Unexpected synthetic service attempts");
  const submits = calls.filter((call) => call.name === "submit");
  const saves = calls.filter((call) => call.name === "save");
  if (submits.length !== 1 || !saves.length ||
      submits[0].payload.expectedRevision !== saves.at(-1).payload.expectedRevision + 1) {
    throw new Error("Synthetic submission did not use the last saved revision");
  }
  return {outcome: "submitted", calls};
}

export function selectScenarios(value) {
  if (value === undefined) return [...scenarioNames];
  const names = value.split(",").map((name) => name.trim());
  if (!names.length || names.some((name) => ![...scenarioNames, ...domainScenarioNames].includes(name)) ||
      new Set(names).size !== names.length) {
    throw new Error(`Select unique known scenarios: ${[...scenarioNames, ...domainScenarioNames].join(", ")}`);
  }
  if (names.some((name) => domainScenarioNames.includes(name)) &&
      names.some((name) => scenarioNames.includes(name))) {
    throw new Error("Run visual and domain integration scenarios in separate batches");
  }
  return names;
}

export function validateOutput(output, sourceRepo) {
  if (!output || !path.isAbsolute(output)) throw new Error("RSVP_CAPTURE_OUTPUT must be an absolute new directory");
  if (existsSync(output)) throw new Error("Capture output already exists; choose a new directory to preserve its evidence");
  for (const checkout of new Set([repo, path.resolve(sourceRepo)])) {
    const relative = path.relative(checkout, output);
    if (relative && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative)) {
      try {
        execFileSync("git", ["check-ignore", "--no-index", "-q", "--", `${relative}/`], {cwd: checkout});
      } catch {
        throw new Error("Capture output inside a checkout must be Git-ignored");
      }
    }
  }
}

export function assertNoSymlinks(directory) {
  for (const entry of readdirSync(directory)) {
    const item = path.join(directory, entry);
    const stat = lstatSync(item);
    if (stat.isSymbolicLink()) throw new Error(`Pinned source contains a symlink: ${path.relative(directory, item)}`);
    if (stat.isDirectory()) assertNoSymlinks(item);
  }
}

export function extractSnapshot(sourceRepo, sourceSha, destination, archivePath) {
  if (!/^[a-f0-9]{40}$/.test(sourceSha ?? "")) throw new Error("RSVP_SOURCE_SHA must be a full commit SHA");
  const resolved = execFileSync("git", ["rev-parse", "--verify", `${sourceSha}^{commit}`], {cwd: sourceRepo, encoding: "utf8"}).trim();
  if (resolved !== sourceSha) throw new Error("RSVP_SOURCE_SHA is not the requested commit");
  execFileSync("git", ["archive", "--format=tar", `--output=${archivePath}`, sourceSha, ...snapshotPaths], {cwd: sourceRepo});
  execFileSync("tar", ["-xf", archivePath, "-C", destination]);
  assertNoSymlinks(destination);
  return {sourceSha, sourceTree: execFileSync("git", ["rev-parse", `${sourceSha}^{tree}`], {cwd: sourceRepo, encoding: "utf8"}).trim(),
    packageLockSha256: digest(readFileSync(path.join(destination, "package-lock.json")))};
}

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function assertPinnedDomainRunner(snapshot, currentRunner = runnerPath) {
  const pinned = path.join(snapshot, "website/scripts/rsvpPublicFormSyntheticCapture.mjs");
  if (!readFileSync(pinned).equals(readFileSync(currentRunner))) {
    throw new Error("Domain integration runner must match the exact committed source snapshot");
  }
}

export async function publishCaptures(staging, output, manifest) {
  // No existing directory may be replaced; successful runs publish together.
  if (existsSync(output)) throw new Error("Capture output appeared during capture; refusing to replace it");
  await writeFile(path.join(staging, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await rename(staging, output);
}

async function run(env = process.env) {
  const sourceRepo = env.RSVP_SOURCE_REPO;
  if (!sourceRepo) throw new Error("Set RSVP_SOURCE_REPO");
  const selected = selectScenarios(env.RSVP_CAPTURE_SCENARIOS);
  const domainMode = selected.every((name) => domainScenarioNames.includes(name));
  const output = env.RSVP_CAPTURE_OUTPUT;
  validateOutput(output, sourceRepo);
  const scratch = realpathSync(await mkdtemp(path.join(tmpdir(), "catch-rsvp-capture-")));
  let staging;
  let server;
  let browser;
  try {
    const snapshot = path.join(scratch, "source");
    await mkdir(snapshot);
    const provenance = extractSnapshot(sourceRepo, env.RSVP_SOURCE_SHA, snapshot, path.join(scratch, "source.tar"));
    if (domainMode) assertPinnedDomainRunner(snapshot);
    // This snapshot owns its dependencies. Never resolve modules from another
    // checkout or link its node_modules into the captured renderer.
    execFileSync("npm", ["ci", "--offline", "--ignore-scripts", "--no-audit", "--no-fund"], {cwd: snapshot, stdio: "inherit"});
    const require = createRequire(path.join(snapshot, "website/package.json"));
    const {createServer} = await import(pathToFileURL(require.resolve("vite")).href);
    const {chromium} = require("playwright");
    const website = path.join(snapshot, "website");
    const pageSource = path.join(website, "src/features/forms/PublicFormPage.tsx");
    const controllerSource = path.join(website, "src/features/forms/usePublicFormController.ts");
    const fixtureRoot = path.join(snapshot, ".rsvp-capture");
    await mkdir(fixtureRoot);
    const mock = path.join(fixtureRoot, "controller.ts");
    const entry = path.join(fixtureRoot, "entry.tsx");
    const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/@fs${entry}"></script></body></html>`;
    const wrapper = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:24px;background:#f5f1eb;font:16px sans-serif}main{max-width:760px;margin:auto}iframe{display:block;width:100%;height:500px;border:0;border-radius:12px;background:white}</style></head><body><main><p>LOCAL SYNTHETIC EMBED PREVIEW</p><h1>Saket Run Club application</h1><p>Fixture host page; no applicant or payment service is connected.</p><iframe title="Saket Run Club RSVP" src="/__rsvp_evidence?embed=1&embedId=fixture_1"></iframe><script src="/form-embed-resize.js"></script></main></body></html>`;
    await writeFile(mock, domainMode ? domainFixtureModule() : `const noop = () => {}; export function usePublicFormController() { return {...window.__rsvpController, updateAnswer: noop, blurQuestion: noop, uploadAnswer: noop, nextSection: noop, previousSection: noop, updateConsent: noop, updateMessagingChoice: noop, setSectionIndex: noop, setStage: noop, submit: noop}; }\n`);
    const domainEntry = `import React from "react";
import {createRoot} from "react-dom/client";
import {BrowserRouter, Route, Routes} from "react-router";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import ${JSON.stringify(path.join(website, "src/styles.css"))};
import {CustomFormDomainGate} from ${JSON.stringify(path.join(website, "src/app/CustomFormDomainGate.tsx"))};
import {PublicFormPage} from ${JSON.stringify(pageSource)};
const client = new QueryClient({defaultOptions: {queries: {retry: false}, mutations: {retry: false}}});
createRoot(document.getElementById("root")).render(<QueryClientProvider client={client}><BrowserRouter><CustomFormDomainGate><Routes><Route path="/f/:publicFormId" element={<PublicFormPage />} /></Routes></CustomFormDomainGate></BrowserRouter></QueryClientProvider>);
`;
    await writeFile(entry, domainMode ? domainEntry : `import React from "react";\nimport {createRoot} from "react-dom/client";\nimport {MemoryRouter} from "react-router";\nimport ${JSON.stringify(path.join(website, "src/styles.css"))};\nimport {PublicFormPage} from ${JSON.stringify(pageSource)};\ncreateRoot(document.getElementById("root")).render(<MemoryRouter><PublicFormPage /></MemoryRouter>);\n`);
    server = await createServer({
      configFile: false, root: website,
      plugins: [{name: "rsvp-evidence-controller", enforce: "pre", resolveId(source, importer) {
        if (!domainMode && source === "./usePublicFormController" && importer === pageSource) return mock;
        if (domainMode && importer && source.startsWith(".") &&
            [path.join(website, "src/firebase"), path.join(website, "src/firebase.ts")]
              .includes(path.resolve(path.dirname(importer.split("?")[0]), source))) return mock;
      }}, {name: "rsvp-evidence-html", configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          if (req.url?.startsWith("/__rsvp_wrapper")) {
            res.setHeader("content-type", "text/html"); res.end(wrapper); return;
          }
          if (!(domainMode ? req.url?.startsWith("/f/") : req.url?.startsWith("/__rsvp_evidence"))) return next();
          try {
            res.setHeader("content-type", "text/html"); res.end(await vite.transformIndexHtml(req.url, html));
          } catch (error) { next(error); }
        });
      }}],
      resolve: {alias: [...(domainMode ? [] : [{find: controllerSource, replacement: mock}]), {find: "@content", replacement: path.join(website, "src/content")}]},
      // Pre-bundle every dependency the form reaches through @catch/web-ui, so Vite
      // never re-optimizes and reloads the page mid-capture.
      optimizeDeps: {entries: [entry], include: [
        "react", "react-dom/client", "react-router", "lucide-react", "lottie-web/build/player/lottie_light",
        "qrcode-generator", ...(domainMode ? ["@tanstack/react-query"] : []),
      ]},
      server: {host: "127.0.0.1", port: 0, fs: {allow: [snapshot]}},
    });
    await server.listen();
    const port = server.httpServer.address().port;
    const origin = `http://127.0.0.1:${port}`;
    browser = await chromium.launch({headless: true});
    await mkdir(path.dirname(output), {recursive: true});
    staging = await mkdtemp(path.join(path.dirname(output), ".rsvp-capture-"));
    const fixture = {
      organizer: {name: "Saket Run Club"},
      messagingOffer: {termsVersion: "form-whatsapp-v2", organizerOperationsWhatsapp: "Application updates", organizerMarketingWhatsapp: "Organizer future events", catchMarketingWhatsapp: "Catch future experiences"},
      definition: {title: "Saket Run Club RSVP", description: "A synthetic customer preview of the RSVP flow.", appearance: {preset: "editorial"}, sections: [], consent: {retentionCopy: "Kept until you withdraw.", consentCopy: "Share my answers with Saket Run Club"}, payment: {amountPaise: 20000, description: "Event fee", refundPolicy: "Refunded if cancelled"}},
    };
    const noop = null; // Functions are supplied inside the browser, not serialized.
    const base = {form: fixture, answers: {}, errors: {}, uploads: {}, visibleSections: [], sectionIndex: 0, consentAccepted: false, messagingChoices: {organizerOperationsWhatsapp: false, organizerMarketingWhatsapp: false, catchMarketingWhatsapp: false}, messagingEndpointAvailable: true, status: {message: "", tone: ""}, pending: false, updateConsent: noop, updateMessagingChoice: noop, setSectionIndex: noop, setStage: noop, submit: noop};
    const audienceSection = {sectionId: "audience", title: "Your running profile", description: "Choose what belongs in each destination.", questions: [
      {questionId: "pace", kind: "singleChoice", label: "Comfortable pace", required: false, answerDestination: "catchProfile", options: [{optionId: "relaxed", label: "Relaxed", value: "Relaxed"}, {optionId: "brisk", label: "Brisk", value: "Brisk"}], validation: {}},
      {questionId: "note", kind: "longText", label: "Note for this organizer", required: false, answerDestination: "organizerCard", options: [], validation: {maxLength: 250}},
    ]};
    const review = {...base, form: {...fixture, definition: {...fixture.definition,
      sections: [audienceSection]}}, visibleSections: [audienceSection],
    answers: {pace: "Relaxed", note: "I enjoy easy social runs."}};
    const scenarios = [
      {name: "audience-form-desktop", state: {...base, stage: "form", embed: false, form: {...fixture, definition: {...fixture.definition, sections: [audienceSection]}}, activeSection: audienceSection, visibleSections: [audienceSection], answers: {pace: "Relaxed", note: "I enjoy easy social runs."}, updateAnswer: noop, uploadAnswer: noop, nextSection: noop}, width: 1280, height: 900},
      {name: "purpose-review-desktop", state: {...review, stage: "review", embed: false}, width: 1280, height: 900},
      {name: "purpose-review-mobile", state: {...review, stage: "review", embed: false}, width: 390, height: 844},
      {name: "payment-test-mobile", state: {...base, stage: "payment", embed: false, payments: {payment: {status: "pending", amountPaise: 20000, refundPolicy: "Refunded if cancelled", mode: "test", checkout: null}, pending: false, status: {message: "", tone: ""}, refresh: noop, pay: noop}}, width: 390, height: 844},
      {name: "embedded-purpose-mobile", state: {...review, stage: "review", embed: true}, width: 390, height: 844, wrapper: true},
    ];

    const completed = [];
    for (const name of selected) {
      const scenario = domainMode ? {name, width: name.endsWith("desktop") ? 1280 : 390, height: 900} :
        scenarios.find((candidate) => candidate.name === name);
      const context = await browser.newContext({viewport: {width: scenario.width, height: scenario.height}, deviceScaleFactor: 1, serviceWorkers: "block"});
      context.setDefaultTimeout(15000);
      const errors = [];
      const blockedRequests = [];
      let releaseLookup;
      try {
        let startedLookup;
        const heldLookup = new Promise((resolve) => {releaseLookup = resolve;});
        const lookupStarted = new Promise((resolve) => {startedLookup = resolve;});
        await context.route("**/*", async (route) => {
          const requestUrl = new URL(route.request().url());
          if (domainMode) {
            const proxy = domainProxyUrl(requestUrl.href, origin);
            if (!proxy) {blockedRequests.push(requestUrl.href); return route.abort();}
            if (requestUrl.pathname === "/api/form-domain") {
              if (requestUrl.search !== "?hostname=forms.client.example" || route.request().method() !== "GET") {
                blockedRequests.push(requestUrl.href); return route.abort();
              }
              startedLookup();
              if (name === "domain-held-mobile") await heldLookup;
              if (name === "domain-transport-mobile") return route.abort();
              if (["domain-unknown-mobile", "domain-revoked-mobile"].includes(name)) {
                return route.fulfill({status: 404, body: ""});
              }
              return route.fulfill({status: 200, contentType: "application/json", body: JSON.stringify({
                hostname: name === "domain-mismatch-mobile" ? "other.client.example" : "forms.client.example",
                publicFormId: "bound-public",
              })});
            }
            // APIRequestContext fetch targets loopback, never the virtual domain.
            // No redirect is followed; all page requests still pass this gate.
            const response = await route.fetch({url: proxy, maxRedirects: 0});
            return route.fulfill({response});
          }
          if (requestUrl.origin === origin) return route.continue();
          blockedRequests.push(requestUrl.href); return route.abort();
        });
        await context.routeWebSocket("**/*", (socket) => socket.close());
        if (!domainMode) await context.addInitScript((state) => {window.__rsvpController = state;}, scenario.state);
        const page = await context.newPage();
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(domainMode ? `${domainOrigin}/f/other-public` :
          `${origin}/${scenario.wrapper ? "__rsvp_wrapper" : "__rsvp_evidence"}?state=${scenario.name}`);
        const integration = domainMode ? await exerciseDomain(page, name, releaseLookup, lookupStarted) : null;
        const rendered = scenario.wrapper ? page.frameLocator("iframe") : page;
        if (!domainMode) await rendered.locator(".public-form").waitFor();
        if (scenario.wrapper) await page.waitForFunction(() => Number.parseInt(document.querySelector("iframe").style.height, 10) > 500);
        if (scenario.name.startsWith("purpose") || scenario.wrapper) {
          for (const label of ["Application updates", "Organizer future events", "Catch future experiences"]) {
            if (await rendered.getByRole("checkbox", {name: label}).isChecked()) throw new Error(`${scenario.name}: ${label} was preselected`);
          }
          await rendered.getByText("₹200").waitFor();
          await rendered.getByText("I enjoy easy social runs.", {exact: true}).waitFor();
        }
        if (scenario.name.startsWith("audience")) {
          await rendered.getByText(/Catch profile field/).waitFor();
          await rendered.getByText(/Organizer card field/).waitFor();
        }
        if (scenario.name.startsWith("payment")) await rendered.getByText(/Test checkout/).waitFor();
        await page.evaluate(async () => {await document.fonts.ready;});
        if (scenario.wrapper) await page.frames()[1].evaluate(async () => {await document.fonts.ready;});
        const filename = `${scenario.name}.png`;
        const bytes = await page.screenshot({path: path.join(staging, filename), fullPage: true, animations: "disabled"});
        if (errors.length || blockedRequests.length) throw new Error(`${scenario.name}: ${[...errors, ...blockedRequests.map((url) => `Blocked external request: ${url}`)].join("; ")}`);
        completed.push({name: scenario.name, width: scenario.width, height: scenario.height, file: filename, sha256: digest(bytes), ...(integration ? {integration} : {})});
      } finally { releaseLookup?.(); await context.close(); }
    }
    await publishCaptures(staging, output, {
      kind: domainMode ? "synthetic-browser-integration" : "synthetic-browser-fixture", ...provenance,
      sourcePath: "website/src/features/forms/PublicFormPage.tsx", sourcePaths: snapshotPaths,
      runnerSha256: digest(readFileSync(runnerPath)), browser: browser.version(),
      fixture: domainMode ? "Immutable committed custom-host gate, router, page and controller; synthetic API transport only; no live DNS, TLS, provider, submission or release proof." : "Immutable committed React page and embed installer with mocked controller; no API, applicant, or payment provider. Visual evidence only, not end-to-end submission or release proof.",
      scenarios: completed,
    });
    console.log(output);
  } finally {
    try {
      await Promise.all([browser?.close(), server?.close()]);
    } finally {
      if (staging) await rm(staging, {recursive: true, force: true});
      await rm(scratch, {recursive: true, force: true});
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === runnerPath) {
  run().catch((error) => {console.error(error); process.exitCode = 1;});
}
