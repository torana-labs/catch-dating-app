import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";

test("only a build passing the existing production environment contract can be promoted", () => {
  const clean = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("VITE_") && !key.startsWith("CATCH_FIREBASE_")));
  const publicConfiguration = {
    VITE_FIREBASE_API_KEY: "public-test-key", VITE_FIREBASE_AUTH_DOMAIN: "catch-dating-app-64e51.firebaseapp.com",
    VITE_FIREBASE_PROJECT_ID: "catch-dating-app-64e51", VITE_FIREBASE_STORAGE_BUCKET: "catch-dating-app-64e51.appspot.com",
    VITE_FIREBASE_MESSAGING_SENDER_ID: "123456", VITE_FIREBASE_APP_ID: "1:123:web:fixture",
    VITE_FIREBASE_MEASUREMENT_ID: "G-FIXTURE", VITE_GTM_ID: "GTM-FIXTURE",
    VITE_WEBSITE_APPCHECK_SITE_KEY: "public-site-key",
  };
  function eligible(configuration) {
    const result = spawnSync(process.execPath, ["--input-type=module", "-e",
      `import config from ${JSON.stringify(new URL("../../next.config.mjs", import.meta.url).href)}; console.log(config.env.CATCH_NEXT_PRODUCTION_BUILD_READY);`],
    {env: {...clean, ...configuration}, encoding: "utf8"});
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  }
  assert.equal(eligible({}), "false");
  assert.equal(eligible(publicConfiguration), "true");
  for (const key of ["VITE_FIREBASE_API_KEY", "VITE_WEBSITE_APPCHECK_SITE_KEY"]) {
    assert.equal(eligible({...publicConfiguration, [key]: ""}), "false", key);
  }
  assert.equal(eligible({...publicConfiguration, VITE_FIREBASE_PROJECT_ID: "catchdates-dev"}), "false");
});
