import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {
  draftFromPolicy,
  requiredConfirmations,
  routingDiff,
  type RoutingPolicy,
} from "../controllers/paymentRoutingForm";
import type {PaymentRoutingController} from "../controllers/usePaymentRoutingController";
import {PaymentRoutingWorkspace} from "./PaymentRoutingScreen";

afterEach(cleanup);

const policy: RoutingPolicy = {policyId: "app", organizerId: null, revision: 3,
  formFee: {route: "razorpayOAuth", mode: "test", currency: "INR", merchantCountry: "IN"},
  eventAdmission: {route: "razorpayOAuth", mode: "live", currency: "INR", merchantCountry: "IN"},
  hostMembership: null, updatedAtMillis: 1};

function controller(overrides: Partial<PaymentRoutingController> = {}) {
  return {canManage: true, policy, loadState: "ready", loadError: null, editor: null,
    isSaving: false, confirmed: false, refresh: vi.fn(), startEdit: vi.fn(),
    cancelEdit: vi.fn(), setPurpose: vi.fn(), review: vi.fn(() => true),
    backToEdit: vi.fn(), setTyped: vi.fn(), save: vi.fn(async () => true),
    ...overrides} as PaymentRoutingController;
}

describe("Payment routing workspace", () => {
  it("shows the route and mode of each purpose", () => {
    render(<PaymentRoutingWorkspace controller={controller()} />);
    expect(screen.getByText("Live: real money")).toBeTruthy();
    expect(screen.getByText("Test mode")).toBeTruthy();
    expect(screen.getByText("Off")).toBeTruthy();
  });

  it("keeps save disabled until each confirmation is typed", () => {
    const draft = {...draftFromPolicy(policy),
      hostMembership: {route: "razorpayRoute" as const, mode: "test" as const}};
    const value = controller({editor: {base: policy, draft, typed: {}, error: null,
      unconfirmed: null, preview: routingDiff(policy, draft),
      confirmations: requiredConfirmations(policy, draft)}});
    render(<PaymentRoutingWorkspace controller={value} />);
    expect(screen.getByText('Type "host memberships route" to confirm')).toBeTruthy();
    const save = screen.getByText("Save routing").closest("button")!;
    expect(save.disabled).toBe(true);
    fireEvent.click(save);
    expect(value.save).not.toHaveBeenCalled();
  });

  it("warns before the first app policy replaces per-connection form fees", () => {
    render(<PaymentRoutingWorkspace controller={controller({policy: {...policy,
      revision: 0, formFee: null, eventAdmission: null, updatedAtMillis: null}})} />);
    expect(screen.getByText("No app policy is saved yet")).toBeTruthy();
    expect(screen.getByText("Mode of each connection")).toBeTruthy();
  });
});
