import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError} from "firebase-functions/v2/https";
import {adminRolesFromToken, requireAdmin, requireAdminRole} from "./adminAuth";

test("Sales staff needs explicit endpoint admission", () => {
  const request = {auth: {uid: "staff-1", token: {salesStaff: true}}} as
    unknown as Parameters<typeof requireAdmin>[0];
  assert.deepEqual(adminRolesFromToken({salesStaff: true}), ["salesStaff"]);
  assert.throws(() => requireAdmin(request), (error) =>
    error instanceof HttpsError && error.code === "permission-denied");
  assert.throws(() => requireAdminRole(request, ["adminOwner", "support"]),
    (error) =>
      error instanceof HttpsError && error.code === "permission-denied");
  assert.deepEqual(requireAdminRole(request, ["salesStaff"]),
    {uid: "staff-1", roles: ["salesStaff"]});
});

test("adminRolesFromToken returns only enabled admin claims", () => {
  assert.deepEqual(adminRolesFromToken({
    admin: true,
    support: false,
    other: true,
  }), ["admin"]);
});

test("retired finance and analytics claims grant no admin role", () => {
  assert.deepEqual(adminRolesFromToken({
    finance: true,
    analyticsViewer: true,
  }), []);
});

test("requireAdmin rejects unauthenticated callers", () => {
  assert.throws(
    () => requireAdmin({} as Parameters<typeof requireAdmin>[0]),
    (error) =>
      error instanceof HttpsError && error.code === "unauthenticated"
  );
});

test("requireAdmin rejects authenticated non-admin callers", () => {
  assert.throws(
    () => requireAdmin({
      auth: {uid: "user-1", token: {admin: false}},
    } as unknown as Parameters<typeof requireAdmin>[0]),
    (error) =>
      error instanceof HttpsError && error.code === "permission-denied"
  );
});

test("requireAdmin returns the admin actor context", () => {
  assert.deepEqual(
    requireAdmin({
      auth: {uid: "admin-1", token: {adminOwner: true}},
    } as unknown as Parameters<typeof requireAdmin>[0]),
    {uid: "admin-1", roles: ["adminOwner"]}
  );
});

test("requireAdminRole rejects admin roles outside the allowlist", () => {
  assert.throws(
    () => requireAdminRole({
      auth: {uid: "admin-1", token: {salesStaff: true}},
    } as unknown as Parameters<typeof requireAdminRole>[0], [
      "adminOwner",
      "support",
    ]),
    (error) =>
      error instanceof HttpsError && error.code === "permission-denied"
  );
});

test("requireAdminRole returns admins with an allowed role", () => {
  assert.deepEqual(
    requireAdminRole({
      auth: {uid: "admin-1", token: {support: true}},
    } as unknown as Parameters<typeof requireAdminRole>[0], [
      "adminOwner",
      "support",
    ]),
    {uid: "admin-1", roles: ["support"]}
  );
});
