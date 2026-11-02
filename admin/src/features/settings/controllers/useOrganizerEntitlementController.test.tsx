import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook, waitFor} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {OrganizerEntitlementCallableResponse} from
  "../../../generated/contracts/organizerEntitlementCallableResponse";
import {
  parseCountValue,
  useOrganizerEntitlementController,
} from "./useOrganizerEntitlementController";

const mocks = vi.hoisted(() => ({
  loadOrganizerEntitlement: vi.fn(),
  grantOrganizerEntitlement: vi.fn(),
  revokeOrganizerEntitlementGrant: vi.fn(),
}));

vi.mock("../api/grantedPlansRepository", () => mocks);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {mutations: {retry: false}},
  });
  return function Wrapper({children}: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const baseEntitlement: OrganizerEntitlementCallableResponse = {
  schemaVersion: 1,
  organizerId: "organizer-1",
  catalogVersion: 1,
  revision: 2,
  grants: [
    {
      grantId: "grant_existing-1",
      sku: "wedding_pro",
      skuLabel: "Wedding Pro",
      unit: "program",
      quantityTotal: 1,
      quantityConsumed: 0,
      quantityRemaining: 1,
      validFromMillis: 1_800_000_000_000,
      validUntilMillis: null,
      source: "manualInvoice",
      active: true,
      revoked: false,
    },
  ],
  meters: {flightDaysUsed: 0, waConversationsUsed: 0},
  skuCatalog: {
    wedding_pro: {
      label: "Wedding Pro",
      unit: "program",
      priceMinor: 5999900,
      currency: "INR",
      limits: {
        guests: 400,
        functions: 10,
        staffAssignments: 30,
        momentsPerFunction: null,
      },
      capabilitiesAllowed: [
        "arrivalsTransport",
        "accommodation",
        "forms",
        "messaging",
      ],
      includedFlightDays: 0,
      includedWaConversations: 0,
      stakeholderSeats: 6,
    },
    planner_annual: {
      label: "Planner annual (quote)",
      unit: "organizerYear",
      priceMinor: null,
      currency: "INR",
      limits: {
        guests: null,
        functions: null,
        staffAssignments: null,
        momentsPerFunction: null,
      },
      capabilitiesAllowed: [
        "arrivalsTransport",
        "accommodation",
        "forms",
        "messaging",
      ],
      includedFlightDays: 0,
      includedWaConversations: 0,
      stakeholderSeats: null,
    },
  },
};

describe("useOrganizerEntitlementController", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.loadOrganizerEntitlement.mockResolvedValue(baseEntitlement);
  });

  it("loads the trimmed organizer scope and grants with a reused operation id", async () => {
    mocks.grantOrganizerEntitlement
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce({
        schemaVersion: 1,
        organizerId: "organizer-1",
        revision: 3,
        grantId: "grant_entitlement-grant-reused",
        replayed: false,
      });
    mocks.loadOrganizerEntitlement
      .mockResolvedValueOnce(baseEntitlement)
      .mockResolvedValue({...baseEntitlement, revision: 3});
    const {result} = renderHook(() => useOrganizerEntitlementController({
      actorUid: "actor-a",
      onError: vi.fn(),
      onNotice: vi.fn(),
    }), {wrapper: createWrapper()});

    act(() => result.current.setOrganizerId(" organizer-1 "));
    await act(async () => expect(await result.current.load()).toBe(true));
    expect(mocks.loadOrganizerEntitlement.mock.calls[0][0]).toEqual({
      organizerId: "organizer-1",
    });
    expect(result.current.entitlement?.revision).toBe(2);

    act(() => {
      result.current.setGrantField("sku", "planner_annual");
      result.current.setGrantField("quantity", "2");
      result.current.setGrantField("receiptRef", "INV-2026-0042");
      result.current.setGrantField("note", "Manual invoice reconciled.");
    });
    expect(result.current.grantForm.unit).toBe("organizerYear");

    await act(async () => expect(await result.current.grant()).toBe(false));
    await act(async () => expect(await result.current.grant()).toBe(true));

    const firstPayload = mocks.grantOrganizerEntitlement.mock.calls[0][0];
    const retryPayload = mocks.grantOrganizerEntitlement.mock.calls[1][0];
    expect(retryPayload.operationId).toBe(firstPayload.operationId);
    expect(retryPayload).toMatchObject({
      organizerId: "organizer-1",
      sku: "planner_annual",
      unit: "organizerYear",
      quantityTotal: 2,
      source: "manualInvoice",
      receiptRef: "INV-2026-0042",
      note: "Manual invoice reconciled.",
    });
    expect(firstPayload.operationId).toMatch(/^[A-Za-z0-9_-]{16,120}$/u);
    await waitFor(() => expect(result.current.entitlement?.revision).toBe(3));
  });

  it("revokes a loaded grant with a reason and refreshes the ledger", async () => {
    mocks.revokeOrganizerEntitlementGrant.mockResolvedValue({
      schemaVersion: 1,
      organizerId: "organizer-1",
      revision: 3,
      grantId: "grant_existing-1",
      replayed: false,
    });
    const {result} = renderHook(() => useOrganizerEntitlementController({
      actorUid: "actor-a",
      onError: vi.fn(),
      onNotice: vi.fn(),
    }), {wrapper: createWrapper()});

    expect(result.current.revokeDisabledReason).toBe(
      "Load the current entitlement ledger first."
    );
    act(() => result.current.setOrganizerId("organizer-1"));
    await act(async () => void await result.current.load());

    act(() => result.current.setRevokeTargetGrantId("grant_existing-1"));
    expect(result.current.revokeDisabledReason).toBe("Add a revoke reason.");
    act(() => result.current.setRevokeReason("Invoice reversed."));
    await act(async () => expect(await result.current.revoke()).toBe(true));

    expect(mocks.revokeOrganizerEntitlementGrant.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        organizerId: "organizer-1",
        grantId: "grant_existing-1",
        reason: "Invoice reversed.",
      })
    );
    expect(result.current.revokeTargetGrantId).toBeNull();
  });

  it("retries the frozen grant after edits and a page reload", async () => {
    mocks.grantOrganizerEntitlement
      .mockRejectedValueOnce(new Error("response lost"))
      .mockResolvedValueOnce({revision: 3, replayed: true});
    const first = renderHook(() => useOrganizerEntitlementController({
      actorUid: "actor-a",
      onError: vi.fn(), onNotice: vi.fn(),
    }), {wrapper: createWrapper()});
    act(() => {
      first.result.current.setOrganizerId("organizer-1");
      first.result.current.setGrantField("receiptRef", "INV-ONE");
    });
    await act(async () => expect(await first.result.current.grant()).toBe(false));
    const frozen = mocks.grantOrganizerEntitlement.mock.calls[0][0];
    expect(first.result.current.pendingGrant).toEqual(frozen);
    act(() => {
      first.result.current.setOrganizerId("organizer-2");
      first.result.current.setGrantField("quantity", "9");
      first.result.current.setGrantField("receiptRef", "INV-TWO");
    });
    expect(first.result.current.pendingGrant).toEqual(frozen);
    first.unmount();

    const resumed = renderHook(() => useOrganizerEntitlementController({
      actorUid: "actor-a",
      onError: vi.fn(), onNotice: vi.fn(),
    }), {wrapper: createWrapper()});
    expect(resumed.result.current.pendingGrant).toEqual(frozen);
    expect(resumed.result.current.grantDisabledReason).toBeNull();
    await act(async () => expect(await resumed.result.current.grant()).toBe(true));
    expect(mocks.grantOrganizerEntitlement.mock.calls[1][0]).toEqual(frozen);
    expect(resumed.result.current.pendingGrant).toBeNull();
    expect(resumed.result.current.organizerId).toBe("organizer-1");
    resumed.unmount();
  });

  it("clears a pending grant only after the ledger confirms its identity",
    async () => {
      mocks.grantOrganizerEntitlement.mockRejectedValueOnce(
        new Error("response lost"));
      const h = renderHook(() => useOrganizerEntitlementController({
      actorUid: "actor-a",
        onError: vi.fn(), onNotice: vi.fn(),
      }), {wrapper: createWrapper()});
      act(() => {
        h.result.current.setOrganizerId("organizer-1");
        h.result.current.setGrantField("receiptRef", "INV-ONE");
      });
      await act(async () => expect(await h.result.current.grant()).toBe(false));
      const operationId = h.result.current.pendingGrant!.operationId;
      await act(async () => expect(await h.result.current.load()).toBe(true));
      expect(h.result.current.pendingGrant).not.toBeNull();
      mocks.loadOrganizerEntitlement.mockResolvedValue({
        ...baseEntitlement,
        grants: [...baseEntitlement.grants, {
          ...baseEntitlement.grants[0], grantId: `grant_${operationId}`,
        }],
      });
      await act(async () => expect(await h.result.current.load()).toBe(true));
      expect(h.result.current.pendingGrant).toBeNull();
      expect(mocks.grantOrganizerEntitlement).toHaveBeenCalledTimes(1);
      h.unmount();
    });

  it("allows a new operation after a definitive pre-write grant rejection", async () => {
    mocks.grantOrganizerEntitlement
      .mockRejectedValueOnce(Object.assign(new Error("Unit mismatch"), {
        code: "functions/invalid-argument",
      }))
      .mockResolvedValueOnce({revision: 3, replayed: false});
    const h = renderHook(() => useOrganizerEntitlementController({
      actorUid: "actor-a", onError: vi.fn(), onNotice: vi.fn(),
    }), {wrapper: createWrapper()});
    act(() => {
      h.result.current.setOrganizerId("organizer-1");
      h.result.current.setGrantField("receiptRef", "INV-ONE");
      h.result.current.setGrantField("unit", "organizerYear");
    });
    await act(async () => expect(await h.result.current.grant()).toBe(false));
    const rejected = mocks.grantOrganizerEntitlement.mock.calls[0][0];
    expect(h.result.current.pendingGrant).toBeNull();
    act(() => h.result.current.setGrantField("unit", "program"));
    await act(async () => expect(await h.result.current.grant()).toBe(true));
    const corrected = mocks.grantOrganizerEntitlement.mock.calls[1][0];
    expect(corrected.unit).toBe("program");
    expect(corrected.operationId).not.toBe(rejected.operationId);
    h.unmount();
  });

  it("releases only the matching local request validation failure", async () => {
    const invalidRequest = (callable: string, direction = "request") =>
      Object.assign(new Error("Invalid request"), {
        name: "AdminCallableValidationError", callable, direction,
      });
    mocks.grantOrganizerEntitlement
      .mockRejectedValueOnce(invalidRequest("adminGrantOrganizerEntitlement"))
      .mockRejectedValueOnce(invalidRequest(
        "adminGrantOrganizerEntitlement", "response"));
    const h = renderHook(() => useOrganizerEntitlementController({
      actorUid: "actor-a", onError: vi.fn(), onNotice: vi.fn(),
    }), {wrapper: createWrapper()});
    act(() => {
      h.result.current.setOrganizerId("organizer-1");
      h.result.current.setGrantField("receiptRef", "INV-ONE");
      h.result.current.setGrantField("note", "n".repeat(501));
    });
    await act(async () => expect(await h.result.current.grant()).toBe(false));
    expect(h.result.current.pendingGrant).toBeNull();
    act(() => h.result.current.setGrantField("note", "Corrected"));
    await act(async () => expect(await h.result.current.grant()).toBe(false));
    expect(h.result.current.pendingGrant).not.toBeNull();
    h.unmount();
  });

  it("releases a rejected revoke request for correction", async () => {
    mocks.revokeOrganizerEntitlementGrant.mockRejectedValueOnce(
      Object.assign(new Error("Invalid request"), {
        name: "AdminCallableValidationError",
        callable: "adminRevokeOrganizerEntitlementGrant",
        direction: "request",
      }));
    const h = renderHook(() => useOrganizerEntitlementController({
      actorUid: "actor-a", onError: vi.fn(), onNotice: vi.fn(),
    }), {wrapper: createWrapper()});
    act(() => h.result.current.setOrganizerId("organizer-1"));
    await act(async () => expect(await h.result.current.load()).toBe(true));
    act(() => {
      h.result.current.setRevokeTargetGrantId("grant_existing-1");
      h.result.current.setRevokeReason("r".repeat(501));
    });
    await act(async () => expect(await h.result.current.revoke()).toBe(false));
    expect(h.result.current.pendingRevoke).toBeNull();
    h.unmount();
  });

  it("blocks an expired valid-until when valid-from is blank", () => {
    const h = renderHook(() => useOrganizerEntitlementController({
      actorUid: "actor-a", onError: vi.fn(), onNotice: vi.fn(),
    }), {wrapper: createWrapper()});
    act(() => {
      h.result.current.setOrganizerId("organizer-1");
      h.result.current.setGrantField("receiptRef", "INV-ONE");
      h.result.current.setGrantField("validUntil", "2020-01-01T00:00");
    });
    expect(h.result.current.grantDisabledReason).toBe(
      "Valid-until must be in the future when valid-from is blank.");
    h.unmount();
  });

  it("can correct the server's specific pre-write date-window rejection", async () => {
    mocks.grantOrganizerEntitlement.mockRejectedValueOnce(Object.assign(
      new Error("validUntil must be after validFrom."), {
        code: "functions/failed-precondition",
      }));
    const h = renderHook(() => useOrganizerEntitlementController({
      actorUid: "actor-a", onError: vi.fn(), onNotice: vi.fn(),
    }), {wrapper: createWrapper()});
    act(() => {
      h.result.current.setOrganizerId("organizer-1");
      h.result.current.setGrantField("receiptRef", "INV-ONE");
    });
    await act(async () => expect(await h.result.current.grant()).toBe(false));
    expect(h.result.current.pendingGrant).toBeNull();
    h.unmount();
  });

  it("keeps uncertain operations isolated across admin actors", async () => {
    mocks.grantOrganizerEntitlement.mockRejectedValue(new Error("response lost"));
    const actorA = renderHook(() => useOrganizerEntitlementController({
      actorUid: "actor-a", onError: vi.fn(), onNotice: vi.fn(),
    }), {wrapper: createWrapper()});
    act(() => {
      actorA.result.current.setOrganizerId("organizer-1");
      actorA.result.current.setGrantField("receiptRef", "INV-ONE");
    });
    await act(async () => expect(await actorA.result.current.grant()).toBe(false));
    const actorATicket = actorA.result.current.pendingGrant;
    actorA.unmount();

    const actorB = renderHook(() => useOrganizerEntitlementController({
      actorUid: "actor-b", onError: vi.fn(), onNotice: vi.fn(),
    }), {wrapper: createWrapper()});
    expect(actorB.result.current.pendingGrant).toBeNull();
    actorB.unmount();

    const actorAReturns = renderHook(() => useOrganizerEntitlementController({
      actorUid: "actor-a", onError: vi.fn(), onNotice: vi.fn(),
    }), {wrapper: createWrapper()});
    expect(actorAReturns.result.current.pendingGrant).toEqual(actorATicket);
    actorAReturns.unmount();
  });

  it("does not let an old ledger load clear a newer pending operation", async () => {
    let finishOldLoad!: (value: OrganizerEntitlementCallableResponse) => void;
    mocks.loadOrganizerEntitlement.mockImplementationOnce(() =>
      new Promise((resolve) => { finishOldLoad = resolve; }));
    mocks.grantOrganizerEntitlement
      .mockRejectedValueOnce(new Error("response lost"))
      .mockResolvedValueOnce({revision: 3, replayed: false})
      .mockRejectedValueOnce(new Error("response lost"));
    const h = renderHook(() => useOrganizerEntitlementController({
      actorUid: "actor-a", onError: vi.fn(), onNotice: vi.fn(),
    }), {wrapper: createWrapper()});
    act(() => {
      h.result.current.setOrganizerId("organizer-1");
      h.result.current.setGrantField("receiptRef", "INV-ONE");
    });
    await act(async () => expect(await h.result.current.grant()).toBe(false));
    const oldOperationId = h.result.current.pendingGrant!.operationId;
    const oldLoad = h.result.current.load();
    // A confirmed old operation clears its ticket, allowing a new request.
    await act(async () => expect(await h.result.current.grant()).toBe(true));
    act(() => h.result.current.setGrantField("receiptRef", "INV-TWO"));
    await act(async () => expect(await h.result.current.grant()).toBe(false));
    const newOperationId = h.result.current.pendingGrant!.operationId;
    expect(newOperationId).not.toBe(oldOperationId);
    finishOldLoad({...baseEntitlement, grants: [
      ...baseEntitlement.grants,
      {...baseEntitlement.grants[0], grantId: `grant_${oldOperationId}`},
    ]});
    await act(async () => expect(await oldLoad).toBe(true));
    expect(h.result.current.pendingGrant?.operationId).toBe(newOperationId);
    h.unmount();
    const resumed = renderHook(() => useOrganizerEntitlementController({
      actorUid: "actor-a", onError: vi.fn(), onNotice: vi.fn(),
    }), {wrapper: createWrapper()});
    expect(resumed.result.current.pendingGrant?.operationId)
      .toBe(newOperationId);
    resumed.unmount();
  });

  it("retries the frozen revocation after editing and reload", async () => {
    mocks.revokeOrganizerEntitlementGrant
      .mockRejectedValueOnce(new Error("response lost"))
      .mockResolvedValueOnce({revision: 3, replayed: true});
    const first = renderHook(() => useOrganizerEntitlementController({
      actorUid: "actor-a",
      onError: vi.fn(), onNotice: vi.fn(),
    }), {wrapper: createWrapper()});
    act(() => first.result.current.setOrganizerId("organizer-1"));
    await act(async () => expect(await first.result.current.load()).toBe(true));
    act(() => {
      first.result.current.setRevokeTargetGrantId("grant_existing-1");
      first.result.current.setRevokeReason("Invoice reversed");
    });
    await act(async () => expect(await first.result.current.revoke()).toBe(false));
    const frozen = mocks.revokeOrganizerEntitlementGrant.mock.calls[0][0];
    act(() => {
      first.result.current.setRevokeReason("Different reason");
      first.result.current.setRevokeTargetGrantId(null);
    });
    first.unmount();
    const resumed = renderHook(() => useOrganizerEntitlementController({
      actorUid: "actor-a",
      onError: vi.fn(), onNotice: vi.fn(),
    }), {wrapper: createWrapper()});
    expect(resumed.result.current.pendingRevoke).toEqual(frozen);
    await act(async () => expect(await resumed.result.current.revoke()).toBe(true));
    expect(mocks.revokeOrganizerEntitlementGrant.mock.calls[1][0])
      .toEqual(frozen);
    expect(resumed.result.current.pendingRevoke).toBeNull();
    resumed.unmount();
  });

  it("keeps a newer revocation ticket when an older ledger load finishes", async () => {
    let finishOldLoad!: (value: OrganizerEntitlementCallableResponse) => void;
    mocks.loadOrganizerEntitlement
      .mockResolvedValueOnce(baseEntitlement)
      .mockImplementationOnce(() =>
        new Promise((resolve) => { finishOldLoad = resolve; }));
    mocks.revokeOrganizerEntitlementGrant
      .mockRejectedValueOnce(new Error("response lost"))
      .mockResolvedValueOnce({revision: 3, replayed: false})
      .mockRejectedValueOnce(new Error("response lost"));
    const h = renderHook(() => useOrganizerEntitlementController({
      actorUid: "actor-a", onError: vi.fn(), onNotice: vi.fn(),
    }), {wrapper: createWrapper()});
    act(() => h.result.current.setOrganizerId("organizer-1"));
    await act(async () => expect(await h.result.current.load()).toBe(true));
    act(() => {
      h.result.current.setRevokeTargetGrantId("grant_existing-1");
      h.result.current.setRevokeReason("First reason");
    });
    await act(async () => expect(await h.result.current.revoke()).toBe(false));
    const oldLoad = h.result.current.load();
    await act(async () => expect(await h.result.current.revoke()).toBe(true));
    act(() => {
      h.result.current.setRevokeTargetGrantId("grant_existing-1");
      h.result.current.setRevokeReason("Second reason");
    });
    await act(async () => expect(await h.result.current.revoke()).toBe(false));
    const newer = h.result.current.pendingRevoke!.operationId;
    finishOldLoad({...baseEntitlement, grants: [
      {...baseEntitlement.grants[0], revoked: true},
    ]});
    await act(async () => expect(await oldLoad).toBe(true));
    h.unmount();
    const resumed = renderHook(() => useOrganizerEntitlementController({
      actorUid: "actor-a", onError: vi.fn(), onNotice: vi.fn(),
    }), {wrapper: createWrapper()});
    expect(resumed.result.current.pendingRevoke?.operationId).toBe(newer);
    resumed.unmount();
  });
});

describe("parseCountValue", () => {
  it("accepts positive whole quantities and rejects the rest", () => {
    expect(parseCountValue("1")).toBe(1);
    expect(parseCountValue(" 40 ")).toBe(40);
    expect(parseCountValue("0")).toBeNull();
    expect(parseCountValue("1.5")).toBeNull();
    expect(parseCountValue("")).toBeNull();
  });
});
