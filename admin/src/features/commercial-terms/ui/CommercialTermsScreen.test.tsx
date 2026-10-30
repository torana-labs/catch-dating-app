import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import type {CommercialTerms} from "../../../generated/contracts/commercialTerms";
import {ownerDecisionCommercialTerms} from "../../../shared/domain/commercialTermsDecision";
import type {CommercialTermsListing} from "../api/commercialTermsRepository";
import {draftFromTerms, platformTermsDiff} from "../controllers/commercialTermsForm";
import type {CommercialTermsController} from "../controllers/useCommercialTermsController";
import {CommercialTermsWorkspace} from "./CommercialTermsScreen";

afterEach(cleanup);

const owner = ownerDecisionCommercialTerms as CommercialTerms;
const empty: CommercialTermsListing = {termsId: "platform", organizerId: null,
  organizerName: null, platform: null, organizer: null, effectiveTerms: null,
  history: [], historyComplete: true, overrides: [], overridesComplete: true,
  organizerMatches: []};

function controller(overrides: Partial<CommercialTermsController> = {}) {
  return {scope: "platform", organizerId: null, canManage: true, listing: empty,
    loadState: "ready", loadError: null, editor: null, isSaving: false,
    searchText: "", searchState: "idle", searchMatches: [], refresh: vi.fn(),
    startEdit: vi.fn(), startFromOwnerDecision: vi.fn(), cancelEdit: vi.fn(),
    setField: vi.fn(), setInherited: vi.fn(), setReason: vi.fn(),
    review: vi.fn(() => true), backToEdit: vi.fn(), save: vi.fn(async () => true),
    setSearchText: vi.fn(), search: vi.fn(), ...overrides} as CommercialTermsController;
}

function show(value: CommercialTermsController) {
  render(<CommercialTermsWorkspace controller={value} onOpenOrganizer={vi.fn()}
    onOpenPlatform={vi.fn()} />);
}

describe("Commercial terms workspace", () => {
  it("offers the owner's decision while platform terms are unsaved", () => {
    const value = controller();
    show(value);
    expect(screen.getByText("Platform terms are not saved yet")).toBeTruthy();
    fireEvent.click(screen.getByText("Start from the owner's 30 Oct decision"));
    expect(value.startFromOwnerDecision).toHaveBeenCalled();
    expect(screen.getByText("Platform terms have never been saved.")).toBeTruthy();
  });

  it("previews each changed term before saving the first revision", () => {
    const value = controller({editor: {baseRevision: 0, draft: draftFromTerms(owner),
      reason: "Owner decision", errors: [], unconfirmed: null,
      preview: platformTermsDiff(null, owner)}});
    show(value);
    expect(screen.getByText("Commission rate")).toBeTruthy();
    expect(screen.getByText("5%")).toBeTruthy();
    expect(screen.getByText("₹10,000")).toBeTruthy();
    fireEvent.click(screen.getByText("Save as revision 1"));
    expect(value.save).toHaveBeenCalled();
  });

  it("shows inherited terms for an organizer override", () => {
    show(controller({scope: "organizer", organizerId: "club", listing: {...empty,
      organizerId: "club", organizerName: "Bandra Runners",
      platform: {revision: 1, terms: owner, reason: "Owner decision",
        updatedByUid: "owner", updatedAtMillis: 1},
      organizer: {revision: 1, terms: {trial: {days: 60}}, reason: "Founding host",
        updatedByUid: "finance", updatedAtMillis: 1}}}));
    expect(screen.getByText("Terms for Bandra Runners")).toBeTruthy();
    expect(screen.getByText("60 days")).toBeTruthy();
    expect(screen.getAllByText("Inherited (5%)").length).toBeGreaterThan(0);
    expect(screen.getByText("Back to platform terms")).toBeTruthy();
  });

  it("explains when the role cannot open commercial terms", () => {
    show(controller({canManage: false, listing: null, loadState: "error",
      loadError: "Commercial terms are open to Finance and Admin Owner only."}));
    expect(screen.getByText("Commercial terms are open to Finance and Admin Owner only.")).toBeTruthy();
  });
});
