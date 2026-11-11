import assert from "node:assert/strict";
import test from "node:test";
import config from "../../next.config.mjs";

test("shared browser configuration receives only explicitly public environment values", () => {
  const key = "CATCH_PRIVATE_PREVIEW_TEST_SECRET";
  const previous = process.env[key];
  process.env[key] = "must-never-enter-browser-definitions";
  try {
    class DefinePlugin { constructor(definitions) { this.definitions = definitions; } }
    class NormalModuleReplacementPlugin {}
    const built = config.webpack({resolve: {alias: {}}, plugins: []}, {
      webpack: {DefinePlugin, NormalModuleReplacementPlugin},
    });
    const definitions = built.plugins.find(plugin => plugin instanceof DefinePlugin).definitions;
    const environment = JSON.parse(definitions["import.meta.env"]);
    assert.equal(environment.DEV, false);
    assert.equal(environment.MODE, "production");
    assert.equal(environment.VITE_FIREBASE_PROJECT_ID, process.env.VITE_FIREBASE_PROJECT_ID ?? "");
    assert.deepEqual(Object.keys(environment).sort(), [
      "DEV", "MODE", "VITE_APP_STORE_URL", "VITE_CONSUMER_APP_URL",
      "VITE_FIREBASE_API_KEY", "VITE_FIREBASE_APP_ID", "VITE_FIREBASE_AUTH_DOMAIN",
      "VITE_FIREBASE_MEASUREMENT_ID", "VITE_FIREBASE_MESSAGING_SENDER_ID",
      "VITE_HOST_APP_STORE_URL", "VITE_HOST_PLAY_STORE_URL",
      "VITE_FIREBASE_PROJECT_ID", "VITE_FIREBASE_STORAGE_BUCKET", "VITE_PLAY_STORE_URL",
      "VITE_WEBSITE_APPCHECK_SITE_KEY",
    ].sort());
    assert(!JSON.stringify(definitions).includes(process.env[key]));
  } finally {
    if (previous === undefined) delete process.env[key]; else process.env[key] = previous;
  }
});
