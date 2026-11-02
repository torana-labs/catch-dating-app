import {act, renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {usePaymentSettingsController} from "./usePaymentSettingsController";

describe("usePaymentSettingsController", () => {
  it("starts from the decided defaults and saves the GST switch", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => usePaymentSettingsController(),
      {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    expect(result.current.state?.settings.gstRegistered).toBe(false);
    expect(result.current.state?.nextInvoiceNumber).toBe("2026-27/032");
    await act(async () => {
      expect(await result.current.save((settings) => ({...settings,
        gstRegistered: true}))).toBe(true);
    });
    await waitFor(() => expect(result.current.state?.revision).toBe(1));
    expect(result.current.state?.settings.gstRegistered).toBe(true);
  });
});
