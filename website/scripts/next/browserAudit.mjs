import {createRequire} from "node:module";
import {writeFile} from "node:fs/promises";
import {chromium} from "playwright";
const require = createRequire(import.meta.url);
const origin = process.env.NEXT_AUDIT_ORIGIN ?? "http://127.0.0.1:3107";
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) throw new Error("Local audit origin required");
const browser = await chromium.launch({headless: true});
const results = [];
try {
  for (const viewport of [{width: 390, height: 844}, {width: 1440, height: 1000}]) {
    for (const route of (process.env.NEXT_AUDIT_ROUTES?.split(",") ?? ["/", "/explore/", "/host/", "/organizers/", "/organizers/next-proof/"])) {
      const context = await browser.newContext({viewport, reducedMotion: "reduce"});
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      const session = await context.newCDPSession(page);
      await session.send("Network.enable");
      await session.send("Network.setCacheDisabled", {cacheDisabled: true});
      await session.send("Network.emulateNetworkConditions", {offline: false, latency: 150,
        downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8});
      await session.send("Emulation.setCPUThrottlingRate", {rate: 4});
      await page.addInitScript(() => {
        window.__audit = {lcpMs: null, cls: 0, longTasksMs: 0};
        let first = 0, previous = 0, score = 0;
        new PerformanceObserver(list => {for (const entry of list.getEntries()) {window.__audit.lcpMs = entry.startTime; window.__audit.lcpElement = entry.element?.outerHTML?.slice(0, 400); window.__audit.lcpUrl = entry.url;}})
          .observe({type: "largest-contentful-paint", buffered: true});
        new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.hadRecentInput) continue;
            if (entry.startTime - previous > 1000 || entry.startTime - first > 5000) {first = entry.startTime; score = 0;}
            previous = entry.startTime; score += entry.value; window.__audit.cls = Math.max(window.__audit.cls, score);
          }
        }).observe({type: "layout-shift", buffered: true});
        new PerformanceObserver(list => {for (const entry of list.getEntries()) window.__audit.longTasksMs += entry.duration;})
          .observe({type: "longtask", buffered: true});
      });
      const response = await page.goto(origin + route, {waitUntil: "networkidle", timeout: 60_000});
      await page.evaluate(() => document.fonts.ready);
      const metrics = await page.evaluate(() => ({...window.__audit,
        javascriptTransferBytes: performance.getEntriesByType("resource").filter(entry => /\.js(?:\?|$)/.test(entry.name))
          .reduce((total, entry) => total + entry.transferSize, 0),
        javascriptBytes: performance.getEntriesByType("resource").filter(entry => /\.js(?:\?|$)/.test(entry.name))
          .reduce((total, entry) => total + entry.decodedBodySize, 0),
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        title: document.title, h1: [...document.querySelectorAll("h1")].map(node => node.textContent)}));
      await session.send("Emulation.setCPUThrottlingRate", {rate: 1});
      await page.addScriptTag({path: require.resolve("axe-core/axe.min.js")});
      const violations = await page.evaluate(async () => (await window.axe.run()).violations.map(item => ({
        id: item.id, impact: item.impact, description: item.description,
        nodes: item.nodes.map(node => ({target: node.target, summary: node.failureSummary})),
      })));
      results.push({route, viewport, status: response.status(), ...metrics, violations, errors});
      console.log(JSON.stringify(results.at(-1)));
      await context.close();
    }
  }
  const report = {origin, conditions: "Cold Chromium; 4x CPU throttle, 1.6 Mbps down, 750 Kbps up, 150 ms latency; local emulator; reduced motion",
    limitations: "Single laboratory sample per route/viewport. Not field INP or production network/server evidence. JavaScript bytes are decoded resource bytes.", results};
  await writeFile(process.env.NEXT_AUDIT_OUTPUT ?? "/tmp/catch704-browser-audit.json", JSON.stringify(report, null, 2));
  if (results.some(result => result.status !== 200 || result.violations.length || result.errors.length || result.horizontalOverflow)) {
    process.exitCode = 1;
  }
} finally {await browser.close();}
