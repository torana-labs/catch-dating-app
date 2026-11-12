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
  VITE_STORE_LINKS_MODE: "live",
  VITE_APP_STORE_URL: "https://apps.apple.com/in/app/catch/id1234567890",
  VITE_PLAY_STORE_URL:
    "https://play.google.com/store/apps/details?id=com.catchdating.catch",
};

test("live marketing deploy validation requires both store product URLs", () => {
  const missing = runMarketing({
    VITE_APP_STORE_URL: "",
    VITE_PLAY_STORE_URL: "",
  });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /VITE_APP_STORE_URL is required when .* live/u);
  assert.match(missing.stderr, /VITE_PLAY_STORE_URL is required when .* live/u);

  const invalid = runMarketing({
    VITE_APP_STORE_URL: "https://example.com/app",
    VITE_PLAY_STORE_URL: "https://play.google.com/store/apps/details",
  });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /VITE_APP_STORE_URL must be an HTTPS apps\.apple\.com/u);
  assert.match(invalid.stderr, /VITE_PLAY_STORE_URL must be an HTTPS play\.google\.com/u);

  const valid = runMarketing();
  assert.equal(valid.status, 0, valid.stderr);
  assert.match(valid.stdout, /marketing hosting environment validation passed/u);
});

test("prelaunch marketing deploy requires both store URLs to remain empty", () => {
  const valid = runMarketing({
    VITE_STORE_LINKS_MODE: "prelaunch",
    VITE_APP_STORE_URL: "",
    VITE_PLAY_STORE_URL: "",
  });
  assert.equal(valid.status, 0, valid.stderr);

  const misleading = runMarketing({
    VITE_STORE_LINKS_MODE: "prelaunch",
    VITE_APP_STORE_URL: "https://apps.apple.com/in/app/catch/id0000000000",
    VITE_PLAY_STORE_URL:
      "https://play.google.com/store/apps/details?id=com.catchdating.catch",
  });
  assert.equal(misleading.status, 1);
  assert.match(misleading.stderr, /VITE_APP_STORE_URL must be empty/u);
  assert.match(misleading.stderr, /VITE_PLAY_STORE_URL must be empty/u);
});

test("Catch Host's store URLs stay empty while prelaunch and are optional but checked when live", () => {
  const prelaunch = runMarketing({
    VITE_STORE_LINKS_MODE: "prelaunch",
    VITE_APP_STORE_URL: "",
    VITE_PLAY_STORE_URL: "",
    VITE_HOST_APP_STORE_URL: "https://apps.apple.com/in/app/catch-host/id0000000001",
  });
  assert.equal(prelaunch.status, 1);
  assert.match(prelaunch.stderr, /VITE_HOST_APP_STORE_URL must be empty/u);

  const liveWithout = runMarketing({VITE_HOST_APP_STORE_URL: "", VITE_HOST_PLAY_STORE_URL: ""});
  assert.equal(liveWithout.status, 0, liveWithout.stderr);

  const liveInvalid = runMarketing({
    VITE_HOST_APP_STORE_URL: "https://example.com/host",
    VITE_HOST_PLAY_STORE_URL: "https://play.google.com/store/apps/details",
  });
  assert.equal(liveInvalid.status, 1);
  assert.match(liveInvalid.stderr, /VITE_HOST_APP_STORE_URL must be an HTTPS apps\.apple\.com/u);
  assert.match(liveInvalid.stderr, /VITE_HOST_PLAY_STORE_URL must be an HTTPS play\.google\.com/u);

  const liveValid = runMarketing({
    VITE_HOST_APP_STORE_URL: "https://apps.apple.com/in/app/catch-host/id0000000001",
    VITE_HOST_PLAY_STORE_URL: "https://play.google.com/store/apps/details?id=com.catchdating.host",
  });
  assert.equal(liveValid.status, 0, liveValid.stderr);
});

test("marketing deploy requires an explicit supported store-link mode", () => {
  const missing = runMarketing({VITE_STORE_LINKS_MODE: ""});
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /VITE_STORE_LINKS_MODE is required/u);

  const invalid = runMarketing({VITE_STORE_LINKS_MODE: "placeholder"});
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /must be prelaunch or live/u);
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
