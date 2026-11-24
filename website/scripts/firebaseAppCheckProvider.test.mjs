import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const firebaseSource = fs.readFileSync(
  new URL("../src/services/firebase/runtime.ts", import.meta.url),
  "utf8"
);

test("marketing Firebase uses the production Enterprise provider", () => {
  assert.match(firebaseSource, /ReCaptchaEnterpriseProvider/u);
  assert.match(
    firebaseSource,
    /provider: new ReCaptchaEnterpriseProvider\(appCheckSiteKey\)/u
  );
  assert.doesNotMatch(firebaseSource, /ReCaptchaV3Provider/u);
});
