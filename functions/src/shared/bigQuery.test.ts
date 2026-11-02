import assert from "node:assert/strict";
import test, {afterEach} from "node:test";
import type {GoogleAuth} from "google-auth-library";
import {BigQueryRestClient} from "./bigQuery";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const auth = {getClient: async () => ({
  getRequestHeaders: async () => new Headers(),
})} as unknown as GoogleAuth;
const page = (values: string[], extra: Record<string, unknown> = {}) => ({
  jobComplete: true, schema: {fields: [{name: "id"}]},
  jobReference: {jobId: "job1", location: "asia-south1"},
  rows: values.map((value) => ({f: [{v: value}]})), ...extra});

function answer(...responses: unknown[]) {
  const urls: string[] = [];
  globalThis.fetch = (async (url: string) => {
    urls.push(url);
    return new Response(JSON.stringify(responses.shift()));
  }) as typeof fetch;
  return urls;
}

test("a query returns every page of its rows", async () => {
  const urls = answer(page(["a", "b"], {pageToken: "next"}), page(["c"]));
  const rows = await new BigQueryRestClient("p", auth)
    .query<{id: string}>("SELECT id");
  assert.deepEqual(rows.map((row) => row.id), ["a", "b", "c"]);
  assert.match(urls[1],
    /\/queries\/job1\?pageToken=next&timeoutMs=\d+&location=asia-south1$/u);
});

test("an unfinished query throws instead of returning no rows", async () => {
  answer({jobComplete: false, jobReference: {jobId: "job1"}});
  await assert.rejects(new BigQueryRestClient("p", auth).query("SELECT 1"),
    /did not finish/u);
});

test("a later page that fails throws instead of returning part", async () => {
  answer(page(["a"], {pageToken: "next"}),
    {jobComplete: false, jobReference: {jobId: "job1"}});
  await assert.rejects(new BigQueryRestClient("p", auth).query("SELECT 1"),
    /did not finish/u);
});

test("an empty finished query is an empty answer", async () => {
  answer({jobComplete: true, schema: {fields: [{name: "id"}]}});
  assert.deepEqual(await new BigQueryRestClient("p", auth).query("SELECT 1"),
    []);
});
