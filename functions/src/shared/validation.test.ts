import assert from "node:assert/strict";
import test from "node:test";
import Ajv from "ajv";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {validateCallableWithAjv} from "./validation";

test("validateCallableWithAjv names root additional properties", () => {
  const validator = new Ajv({allErrors: true}).compile({
    type: "object",
    additionalProperties: false,
    required: ["organizerId"],
    properties: {
      organizerId: {type: "string"},
    },
  });

  assert.throws(
    () => validateCallableWithAjv(
      {data: {organizerId: "club-1", eventSuccessDefaults: {enabled: true}}} as
        CallableRequest<unknown>,
      validator
    ),
    (error) => {
      assert(error instanceof HttpsError);
      assert.equal(error.code, "invalid-argument");
      assert.match(error.message, /eventSuccessDefaults/);
      assert.doesNotMatch(error.message, /^:/);
      return true;
    }
  );
});
