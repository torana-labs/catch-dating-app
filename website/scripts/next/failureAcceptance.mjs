import assert from "node:assert/strict";
import http2 from "node:http2";
import {spawn} from "node:child_process";
import {once} from "node:events";
import path from "node:path";
import {fileURLToPath} from "node:url";

// Read-only fault injection against the isolated emulator. Never a live backend.
if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8765") throw new Error("Isolated emulator required");
const root = fileURLToPath(new URL("../../", import.meta.url));
const upstream = http2.connect("http://127.0.0.1:8765");
const gateway = http2.createServer();
const sessions = new Set();
gateway.on("session", session => {sessions.add(session); session.on("close", () => sessions.delete(session));});
let queries = 0;
let faultAfter = Infinity;
gateway.on("stream", (stream, headers) => {
  stream.on("error", () => {});
  if (headers[":path"]?.endsWith("/RunQuery") && ++queries > faultAfter) {
    stream.respond({":status": 200, "content-type": "application/grpc"}, {waitForTrailers: true});
    stream.on("wantTrailers", () => stream.sendTrailers({"grpc-status": "14", "grpc-message": "fixture-unavailable"}));
    stream.resume(); stream.end(); return;
  }
  const call = upstream.request({...headers, ":authority": "127.0.0.1:8765"});
  let trailers = {};
  call.on("response", response => {if (!stream.destroyed) stream.respond(response, {waitForTrailers: true});});
  call.on("trailers", value => {trailers = value;});
  stream.on("wantTrailers", () => {if (!stream.destroyed) stream.sendTrailers(trailers);});
  call.on("error", () => stream.destroy());
  stream.on("close", () => call.close());
  stream.pipe(call); call.pipe(stream);
});
await new Promise(resolve => gateway.listen(0, "127.0.0.1", resolve));
const output = [];
const server = spawn(process.execPath, ["server.js"], {
  cwd: path.join(root, ".next/standalone/website"), stdio: ["ignore", "pipe", "pipe"],
  env: {...process.env, HOSTNAME: "127.0.0.1", PORT: "3122", CATCH_WEBSITE_STAGE: "preview",
    CATCH_PUBLIC_FIRESTORE_PROJECT: "demo-catch-nextjs", FIRESTORE_EMULATOR_HOST: `127.0.0.1:${gateway.address().port}`},
});
server.stdout.on("data", value => output.push(value.toString()));
server.stderr.on("data", value => output.push(value.toString()));
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(output.join(""));
    try {if ((await fetch("http://127.0.0.1:3122/privacy/")).ok) {ready = true; break;}} catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready);
  // The proxy and the page each resolve the route once, with the same reads.
  // Measure them unfaulted, then fail every query after the proxy's share.
  const route = "http://127.0.0.1:3122/organizers/next-proof/";
  queries = 0;
  const rendered = await fetch(route);
  assert.equal(rendered.status, 200);
  assert.equal(rendered.headers.get("cache-control"), "public, s-maxage=60", "An authorized page renders into the shared cache");
  assert(queries > 0 && queries % 2 === 0, `Proxy and page must make the same reads, saw ${queries} queries`);
  faultAfter = queries / 2; queries = 0;
  const response = await fetch(route);
  const body = await response.text();
  assert(queries > faultAfter, "Fault must occur after the proxy's preflight reads");
  assert.equal(response.status, 500, "Next render failure must not become stale success or false 404");
  // The page was authorized before rendering; its failed render must still not
  // become a cacheable error.
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(response.headers.get("x-catch-public-page"), null);
  assert(!body.includes("Next proof organizer"));
  assert(!output.join("").includes("private-owner-runtime-sentinel"));
  console.log(JSON.stringify({passed: true, status: response.status, preflightQueriesAllowed: faultAfter,
    faultedQueries: queries - faultAfter, staleContent: false}, null, 2));
} finally {
  if (server.exitCode === null && server.signalCode === null) {
    const closed = once(server, "exit"); server.kill("SIGTERM"); await closed;
  }
  for (const session of sessions) session.destroy();
  upstream.destroy();
  await new Promise(resolve => gateway.close(resolve));
}
