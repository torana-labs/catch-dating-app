import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import zlib from "node:zlib";
import {
  PageFetcher,
  assertFetchableUrl,
  defaultTransport,
  isPublicAddress,
  publicOnlyLookup,
} from "../src/platform/network/page-fetcher.mjs";
import {parseRobotsTxt, robotsAllows} from "../src/platform/network/robots.mjs";

const AGENT = {userAgent: "CatchSupplyIntake/1.0 (+https://catchdates.com/bots)", productToken: "CatchSupplyIntake"};
const NOW = () => new Date("2026-10-24T08:00:00.000Z");

test("only globally routable unicast addresses count as public", () => {
  for (const address of ["8.8.8.8", "104.18.32.7", "2606:4700::6810:84e5", "::ffff:8.8.8.8"]) {
    assert.equal(isPublicAddress(address), true, address);
  }
  for (const address of [
    "127.0.0.1", "10.2.3.4", "172.16.0.9", "192.168.1.1", "169.254.169.254", "100.64.0.1",
    "0.0.0.0", "224.0.0.1", "255.255.255.255", "198.18.0.1", "::1", "::", "fe80::1", "fd00::1",
    "fc00::1", "ff02::1", "2001:db8::1", "64:ff9b::a00:1", "2002:a00:1::", "::ffff:10.0.0.1",
    "::ffff:169.254.169.254", "not-an-ip",
  ]) {
    assert.equal(isPublicAddress(address), false, address);
  }
});

test("URLs with credentials, odd ports, private hosts or non-web schemes are refused", () => {
  assert.equal(assertFetchableUrl("https://lu.ma/x#frag").href, "https://lu.ma/x");
  for (const [url, outcome] of [
    ["ftp://example.org/", "invalid_url"],
    ["javascript:alert(1)", "invalid_url"],
    ["https://user:pass@example.org/", "invalid_url"],
    ["https://example.org:8443/", "blocked_address"],
    ["http://localhost/", "blocked_address"],
    ["http://printer.local/", "blocked_address"],
    ["http://metadata.google.internal/", "blocked_address"],
    ["http://intranet/", "blocked_address"],
    ["http://169.254.169.254/latest/meta-data", "blocked_address"],
    ["http://[::1]/", "blocked_address"],
    ["http://10.0.0.5/", "blocked_address"],
  ]) {
    assert.throws(() => assertFetchableUrl(url), (error) => error.outcome === outcome, url);
  }
  assert.throws(() => assertFetchableUrl("https://evil.example/", {allowHost: (host) => host === "lu.ma"}),
    (error) => error.outcome === "blocked_address");
});

test("the connection lookup refuses any name with a private answer, including mixed answers", async () => {
  const answers = {
    "public.example": [{address: "93.184.216.34", family: 4}],
    "mixed.example": [{address: "93.184.216.34", family: 4}, {address: "10.0.0.1", family: 4}],
    "rebind.example": [{address: "127.0.0.1", family: 4}],
  };
  const lookup = publicOnlyLookup((host, _options, callback) => callback(null, answers[host] ?? []));
  const resolve = (host, options) => new Promise((done) =>
    lookup(host, options, (error, address, family) => done({error, address, family})));
  assert.deepEqual(await resolve("public.example", {}), {error: null, address: "93.184.216.34", family: 4});
  const all = await resolve("public.example", {all: true});
  assert.deepEqual(all.address, answers["public.example"]);
  for (const host of ["mixed.example", "rebind.example", "empty.example"]) {
    assert.equal((await resolve(host, {})).error?.code, "CATCH_BLOCKED_ADDRESS", host);
  }
});

test("robots.txt groups, longest match, Allow ties and wildcards follow RFC 9309", () => {
  const robots = parseRobotsTxt(`
    User-agent: *
    Disallow: /private
    Allow: /private/public$

    User-agent: CatchSupplyIntake
    User-agent: OtherBot
    Disallow: /e/*/attendees
    Disallow: /search
    Allow: /search/events
    Disallow: /*.pdf$
  `, "CatchSupplyIntake");
  assert.equal(robotsAllows(robots, "/private"), true, "named group replaces the * group");
  assert.equal(robotsAllows(robots, "/e/abc/attendees"), false);
  assert.equal(robotsAllows(robots, "/e/abc"), true);
  assert.equal(robotsAllows(robots, "/search?q=run"), false);
  assert.equal(robotsAllows(robots, "/search/events?city=blr"), true);
  assert.equal(robotsAllows(robots, "/guide.pdf"), false);
  assert.equal(robotsAllows(robots, "/guide.pdf?x=1"), true);
  const generic = parseRobotsTxt("User-agent: *\nDisallow: /private\nAllow: /private/public$", "CatchSupplyIntake");
  assert.equal(robotsAllows(generic, "/private/x"), false);
  assert.equal(robotsAllows(generic, "/private/public"), true);
  assert.equal(robotsAllows(generic, "/private/public/more"), false);
  const tie = parseRobotsTxt("User-agent: *\nDisallow: /a\nAllow: /a", "CatchSupplyIntake");
  assert.equal(robotsAllows(tie, "/a/b"), true);
  assert.equal(robotsAllows(parseRobotsTxt("User-agent: *\nDisallow:", "X"), "/anything"), true);
  assert.equal(robotsAllows("disallow_all", "/"), false);
  assert.equal(robotsAllows("disallow_all", "/robots.txt"), true);

  const hostile = parseRobotsTxt(`User-agent: *\nDisallow: /${"a*".repeat(40)}b`, "X");
  const started = process.hrtime.bigint();
  assert.equal(robotsAllows(hostile, `/${"a".repeat(2_000)}`), true);
  assert.ok(process.hrtime.bigint() - started < 2_000_000_000n, "matching must stay polynomial");
});

function fakeTransport(routes) {
  const calls = [];
  const transport = async ({url, headers}) => {
    calls.push({url: url.href, userAgent: headers["user-agent"]});
    const route = routes[url.href];
    if (!route) return {status: 404, location: null, contentType: "text/plain", body: Buffer.alloc(0)};
    if (route.throw) throw Object.assign(new Error(route.throw), {code: route.throw});
    return {status: route.status ?? 200, location: route.location ?? null,
      contentType: route.contentType ?? "text/html; charset=utf-8", body: Buffer.from(route.body ?? "")};
  };
  return {transport, calls};
}

test("the fetcher honours robots.txt, revalidates redirects and returns outcomes instead of throwing", async () => {
  const {transport, calls} = fakeTransport({
    "https://lu.ma/robots.txt": {body: "User-agent: *\nDisallow: /admin"},
    "https://lu.ma/afterfly": {body: "<title>Afterfly</title>"},
    "https://lu.ma/admin": {body: "secret"},
    "https://lu.ma/old": {status: 301, location: "/afterfly"},
    "https://lu.ma/to-private": {status: 302, location: "http://169.254.169.254/latest"},
    "https://lu.ma/loop": {status: 302, location: "https://lu.ma/loop"},
    "https://lu.ma/feed": {body: "{}", contentType: "application/json"},
    "https://lu.ma/gone": {status: 410},
    "https://down.example/robots.txt": {status: 503},
    "https://flaky.example/robots.txt": {throw: "ECONNRESET"},
    "https://slow.example/robots.txt": {status: 404},
    "https://slow.example/": {throw: "CATCH_TIMEOUT"},
  });
  const fetcher = new PageFetcher({...AGENT, transport, clock: NOW, maxRedirects: 2});
  const page = await fetcher.fetchPage("https://lu.ma/afterfly");
  assert.equal(page.outcome, "fetched");
  assert.equal(page.html, "<title>Afterfly</title>");
  assert.equal(page.fetchedAt, "2026-10-24T08:00:00.000Z");
  assert.equal(calls[0].userAgent, AGENT.userAgent);

  const redirected = await fetcher.fetchPage("https://lu.ma/old");
  assert.deepEqual([redirected.outcome, redirected.finalUrl, redirected.redirects],
    ["fetched", "https://lu.ma/afterfly", ["https://lu.ma/afterfly"]]);
  for (const [url, outcome] of [
    ["https://lu.ma/admin", "robots_disallowed"],
    ["https://lu.ma/to-private", "blocked_address"],
    ["https://lu.ma/loop", "too_many_redirects"],
    ["https://lu.ma/feed", "unsupported_content_type"],
    ["https://lu.ma/gone", "http_error"],
    ["https://down.example/", "robots_disallowed"],
    ["https://flaky.example/", "robots_disallowed"],
    ["https://slow.example/", "timeout"],
    ["http://10.1.1.1/", "blocked_address"],
  ]) {
    const result = await fetcher.fetchPage(url);
    assert.equal(result.outcome, outcome, url);
    assert.equal(result.html, null, url);
  }
  assert.equal((await fetcher.fetchPage("https://lu.ma/gone")).status, 410);
  assert.equal(calls.filter((call) => call.url === "https://lu.ma/robots.txt").length, 1, "robots is cached per origin");
  assert.equal(calls.some((call) => call.url.includes("169.254")), false, "a private redirect is never requested");
  assert.equal(fetcher.requests, calls.length);
});

test("a budget hook runs before every request and its refusal stops the fetch", async () => {
  const {transport, calls} = fakeTransport({
    "https://district.in/robots.txt": {body: ""},
    "https://district.in/e/1": {body: "<p>1</p>"},
  });
  let remaining = 2;
  const fetcher = new PageFetcher({...AGENT, transport, clock: NOW, beforeRequest: () => {
    if (remaining === 0) throw Object.assign(new Error("budget"), {code: "BUDGET_EXCEEDED"});
    remaining -= 1;
  }});
  assert.equal((await fetcher.fetchPage("https://district.in/e/1")).outcome, "fetched");
  await assert.rejects(fetcher.fetchPage("https://district.in/e/1"), /budget/u);
  assert.equal(calls.length, 2);
});

test("the node transport decodes, bounds size and time, and reports redirects", async (t) => {
  const page = "<html><title>Run club</title></html>";
  const server = http.createServer((request, response) => {
    if (request.url === "/gzip") {
      response.writeHead(200, {"content-type": "text/html; charset=utf-8", "content-encoding": "gzip"});
      response.end(zlib.gzipSync(page));
    } else if (request.url === "/declared-large") {
      response.writeHead(200, {"content-type": "text/html", "content-length": "5000"});
      response.end("x".repeat(5000));
    } else if (request.url === "/streamed-large") {
      response.writeHead(200, {"content-type": "text/html"});
      response.write("x".repeat(3000));
      response.end("x".repeat(3000));
    } else if (request.url === "/bomb") {
      response.writeHead(200, {"content-type": "text/html", "content-encoding": "gzip"});
      response.end(zlib.gzipSync(Buffer.alloc(1_000_000, 0x61)));
    } else if (request.url === "/slow") {
      response.writeHead(200, {"content-type": "text/html"});
      response.write("<p>");
      setTimeout(() => response.end("late</p>"), 1_000);
    } else if (request.url === "/moved") {
      response.writeHead(301, {location: "/gzip"});
      response.end();
    } else {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (path, overrides = {}) => defaultTransport({url: new URL(`${base}${path}`),
    lookup: undefined, timeoutMs: 300, maxBytes: 4_096, headers: {"user-agent": AGENT.userAgent}, ...overrides});

  const gzip = await call("/gzip");
  assert.equal(gzip.status, 200);
  assert.equal(gzip.body.toString("utf8"), page);
  assert.deepEqual(await call("/moved").then(({status, location}) => ({status, location})), {status: 301, location: "/gzip"});
  for (const path of ["/declared-large", "/streamed-large", "/bomb"]) {
    await assert.rejects(call(path), (error) => error.code === "CATCH_TOO_LARGE", path);
  }
  await assert.rejects(call("/slow"), (error) => error.code === "CATCH_TIMEOUT");
  await assert.rejects(call("/gzip", {url: new URL("http://rebind.example/gzip"),
    lookup: publicOnlyLookup((_host, _options, callback) => callback(null, [{address: "127.0.0.1", family: 4}]))}),
  (error) => error.code === "CATCH_BLOCKED_ADDRESS");
});
