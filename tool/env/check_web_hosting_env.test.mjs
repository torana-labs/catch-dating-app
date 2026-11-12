import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";
import {fileURLToPath} from "node:url";

const scriptPath = fileURLToPath(
  new URL("./check_web_hosting_env.mjs", import.meta.url)
);

const validMarketingEnv = {
  VITE_GTM_ID: "GTM-K7KLNQXP",
  VITE_FIREBASE_API_KEY: "api-key",
  VITE_FIREBASE_AUTH_DOMAIN: "catch.example",
  VITE_FIREBASE_PROJECT_ID: "catch-dating-app-64e51",
  VITE_FIREBASE_STORAGE_BUCKET: "catch.example",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "123",
  VITE_FIREBASE_APP_ID: "app-id",
  VITE_FIREBASE_MEASUREMENT_ID: "measurement-id",
  VITE_WEBSITE_APPCHECK_SITE_KEY: "site-key",
};

test("store links are not build configuration: brand.json owns them", () => {
  assert.equal(runMarketing({}).status, 0, "no store-link variable is required");
  const retired = runMarketing({VITE_STORE_LINKS_MODE: "placeholder", VITE_APP_STORE_URL: "https://example.com/app"});
  assert.equal(retired.status, 0, "retired store-link variables are ignored");
});

test("marketing deploy requires a valid GTM container id", () => {
  const missing = runMarketing({VITE_GTM_ID: ""});
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /VITE_GTM_ID is required/u);

  const invalid = runMarketing({VITE_GTM_ID: "G-CH7WMQY5FV"});
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /must be a Google Tag Manager container id/u);
});

function runMarketing(overrides = {}) {
  return spawnSync(process.execPath, [scriptPath, "marketing"], {
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    encoding: "utf8",
    env: {...process.env, ...validMarketingEnv, ...overrides},
  });
}
