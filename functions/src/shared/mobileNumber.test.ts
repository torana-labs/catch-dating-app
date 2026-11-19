import assert from "node:assert/strict";
import test from "node:test";
import {validMobileNumber} from "./mobileNumber";

test("an E.164 mobile number is accepted, written compactly", () => {
  assert.equal(validMobileNumber("+919876543210"), "+919876543210");
  assert.equal(validMobileNumber(" +91 98765-43210 "), "+919876543210");
  assert.equal(validMobileNumber("+61 412 345 678"), "+61412345678");
});

test("numbers the old shape check let through are refused", () => {
  // The website once turned 12345678 into +9112345678.
  assert.equal(validMobileNumber("+9112345678"), null);
  // Ten digits, but an Indian mobile number starts with 6 to 9.
  assert.equal(validMobileNumber("+911234567890"), null);
  // A Sydney landline: a number, not a mobile one.
  assert.equal(validMobileNumber("+61293744000"), null);
});

test("anything that is not an E.164 string is refused", () => {
  const refused = [undefined, null, 9876543210, "", "9876543210",
    "0091 9876543210"];
  for (const value of refused) {
    assert.equal(validMobileNumber(value), null, String(value));
  }
});
