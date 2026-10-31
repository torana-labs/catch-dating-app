import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import type {SupplyNominatorController} from "../controllers/useSupplyNominatorController";
import {renderSupplyNominators} from "./supplyNominatorPanels";

afterEach(cleanup);

const nominator = (overrides: Record<string, unknown> = {}) => ({nominatorId: `whatsapp-${"a".repeat(64)}`,
  channel: "whatsapp", phoneLast4: "2345", instagramHandle: null, role: "associate", uid: "owner-1", displayName: "Suvrat",
  defaultMarket: "mumbai", active: true, updatedAt: "2026-10-30T08:00:00.000Z", ...overrides});

function controller(overrides: Partial<SupplyNominatorController> = {}) {
  return {page: {isPending: false, error: null}, nominators: [nominator()], myUid: "owner-1",
    save: vi.fn(async () => true), isSaving: false, ...overrides} as unknown as SupplyNominatorController;
}

describe("Nominators", () => {
  it("lists who can nominate, by the last four digits of their number", () => {
    render(<>{renderSupplyNominators(controller({nominators: [nominator(),
      nominator({nominatorId: `whatsapp-${"b".repeat(64)}`, displayName: "Asha", phoneLast4: "9999",
        role: "partner", defaultMarket: null, active: false})] as never}))}</>);
    expect(screen.getByText("Suvrat · number ending 2345")).toBeTruthy();
    expect(screen.getByText("Sales associate · Mumbai by default")).toBeTruthy();
    expect(screen.getByText("Switched off")).toBeTruthy();
    expect(screen.getByText("Partner")).toBeTruthy();
  });

  it("says when nobody can nominate yet", () => {
    render(<>{renderSupplyNominators(controller({nominators: []}))}</>);
    expect(screen.getByText("Nobody can nominate by message yet.")).toBeTruthy();
  });

  it("registers the signed-in staff member's number once it is complete", async () => {
    const current = controller();
    render(<>{renderSupplyNominators(current)}</>);
    fireEvent.click(screen.getByRole("button", {name: "Add or change a nominator"}));
    const save = screen.getByRole("button", {name: "Save"});
    fireEvent.change(screen.getByLabelText("WhatsApp number"), {target: {value: "+91 98000 12345"}});
    fireEvent.change(screen.getByLabelText("Name"), {target: {value: "Suvrat"}});
    expect(save).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", {name: "Use my account"}));
    expect(save).toHaveProperty("disabled", false);
    fireEvent.click(save);
    await vi.waitFor(() => expect(current.save).toHaveBeenCalledWith({phoneE164: "+919800012345", uid: "owner-1",
      role: "associate", displayName: "Suvrat", defaultMarket: "mumbai", active: true}));
  });

  it("registers an Instagram username pasted as a profile link", async () => {
    const current = controller({nominators: [nominator({nominatorId: `instagram-${"c".repeat(64)}`,
      channel: "instagram", phoneLast4: null, instagramHandle: "suvrat.g"})] as never});
    render(<>{renderSupplyNominators(current)}</>);
    expect(screen.getByText("Suvrat · @suvrat.g")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Add or change a nominator"}));
    fireEvent.change(screen.getByLabelText("They message Catch on"), {target: {value: "instagram"}});
    expect(screen.queryByLabelText("WhatsApp number")).toBeNull();
    fireEvent.change(screen.getByLabelText("Instagram username"),
      {target: {value: "https://www.instagram.com/Suvrat.G/?igsh=abc"}});
    fireEvent.change(screen.getByLabelText("Name"), {target: {value: "Suvrat"}});
    fireEvent.click(screen.getByRole("button", {name: "Use my account"}));
    fireEvent.click(screen.getByRole("button", {name: "Save"}));
    await vi.waitFor(() => expect(current.save).toHaveBeenCalledWith({instagramHandle: "suvrat.g", uid: "owner-1",
      role: "associate", displayName: "Suvrat", defaultMarket: "mumbai", active: true}));
  });
});
