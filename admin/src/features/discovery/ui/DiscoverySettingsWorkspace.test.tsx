import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import type {DiscoverySettingsController} from
  "../controllers/useDiscoverySettingsController";
import {DiscoverySettingsWorkspace} from "./DiscoverySettingsWorkspace";

afterEach(cleanup);

const onCatchOnly = {onCatch: true, notOnCatch: false};
const defaults = {
  surfaces: {homeOrganizers: onCatchOnly, cityOrganizers: onCatchOnly,
    plans: onCatchOnly, totals: onCatchOnly},
  homeOrganizersMinimum: 1,
  homeClaimAction: false,
};

function controller(
  overrides: Partial<DiscoverySettingsController> = {}
): DiscoverySettingsController {
  return {
    snapshot: {
      settings: {...defaults,
        surfaces: {...defaults.surfaces,
          plans: {onCatch: true, notOnCatch: true}},
        homeOrganizersMinimum: 3,
        updatedAtMillis: Date.parse("2026-11-18T06:30:00.000Z"),
        updatedByUid: "owner-1"},
      defaults,
    },
    loadState: "ready",
    isSaving: false,
    canEdit: true,
    save: vi.fn(async () => true),
    ...overrides,
  };
}

describe("DiscoverySettingsWorkspace", () => {
  it("draws two switches per rule and states the fixed rules", () => {
    render(<DiscoverySettingsWorkspace currentUserUid="owner-1"
      settings={controller()} />);
    expect(screen.getByRole("checkbox",
      {name: "Homepage organisers band: on catch"}) as HTMLInputElement)
      .toHaveProperty("checked", true);
    expect(screen.getByRole("checkbox",
      {name: "Homepage organisers band: not on catch yet"}) as HTMLInputElement)
      .toHaveProperty("checked", false);
    // Four rules, two audiences, and the claim button.
    expect(screen.getAllByRole("checkbox")).toHaveLength(9);
    expect(screen.getByText(/organiser search always include/u))
      .toBeTruthy();
    expect(screen.getByText(/Last changed .* by you\./u)).toBeTruthy();
  });

  it("resets the form to the defaults and saves only on Save", async () => {
    const settings = controller();
    render(<DiscoverySettingsWorkspace currentUserUid="owner-1"
      settings={settings} />);
    expect(screen.getByRole("button", {name: "Save"})).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", {name: "Reset to defaults"}));
    expect(settings.save).not.toHaveBeenCalled();
    expect(screen.getByText("Unsaved changes")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Save"}));
    expect(settings.save).toHaveBeenCalledWith(defaults);
  });

  it("holds Save while the band minimum is out of range", () => {
    render(<DiscoverySettingsWorkspace currentUserUid="owner-1"
      settings={controller()} />);
    fireEvent.change(screen.getByRole("spinbutton",
      {name: /at least/u}), {target: {value: "40"}});
    expect(screen.getByText("Choose a number from 1 to 24"))
      .toBeTruthy();
    expect(screen.getByRole("button", {name: "Save"})).toHaveProperty("disabled", true);
  });

  it("is read-only for everyone but the owner", () => {
    render(<DiscoverySettingsWorkspace currentUserUid="ops-1"
      settings={controller({canEdit: false})} />);
    expect(screen.queryByRole("button", {name: "Save"})).toBeNull();
    for (const box of screen.getAllByRole("checkbox")) {
      expect(box).toHaveProperty("disabled", true);
    }
    expect(screen.getByText("Only the owner can change discovery settings."))
      .toBeTruthy();
    expect(screen.getByText(/by an owner\./u)).toBeTruthy();
  });

  it("says when the defaults were never changed", () => {
    const settings = controller();
    settings.snapshot = {...settings.snapshot!, settings: {...defaults,
      updatedAtMillis: null, updatedByUid: null}};
    render(<DiscoverySettingsWorkspace currentUserUid="owner-1"
      settings={settings} />);
    expect(screen.getByText("Defaults, never changed.")).toBeTruthy();
    expect(screen.getByRole("button", {name: "Reset to defaults"}))
      .toHaveProperty("disabled", true);
  });
});
