import {cleanup, render, screen} from "@testing-library/react";
import {createMemoryRouter, RouterProvider} from "react-router";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {AdminRouteError} from "./AdminRouteError";
import {resetStaleChunkRecoveryForTests} from "./staleChunkRecovery";

function renderThrowing(error: Error) {
  const Throwing = () => {
    throw error;
  };
  const router = createMemoryRouter([{path: "/", element: <Throwing />, errorElement: <AdminRouteError />}]);
  return render(<RouterProvider router={router} />);
}

describe("AdminRouteError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    window.sessionStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    resetStaleChunkRecoveryForTests();
  });

  it("shows our page, with a Reload button, when a route throws", () => {
    renderThrowing(new Error("Cannot read properties of undefined"));
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByRole("button", {name: "Reload"})).toBeTruthy();
    expect(screen.queryByText(/Unexpected Application Error/u)).toBeNull();
  });

  it("reloads on a stale chunk and shows nothing while it does", () => {
    renderThrowing(new TypeError("Failed to fetch dynamically imported module: /assets/AdminShellFrame-CKNW4ne_.js"));
    expect(window.sessionStorage.getItem("catch-admin:stale-chunk-reloaded-at")).not.toBeNull();
    expect(screen.queryByText("Admin has been updated")).toBeNull();
    expect(screen.queryByText("Something went wrong")).toBeNull();
    expect(screen.queryByText(/Unexpected Application Error/u)).toBeNull();
  });

  it("explains a stale chunk when reloading has already been tried", () => {
    window.sessionStorage.setItem("catch-admin:stale-chunk-reloaded-at", String(Date.now()));
    renderThrowing(new TypeError("Failed to fetch dynamically imported module: /assets/AdminShellFrame-CKNW4ne_.js"));
    expect(screen.getByText("Admin has been updated")).toBeTruthy();
    expect(screen.getByRole("button", {name: "Reload"})).toBeTruthy();
  });
});
