import {act, renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {usePeopleSearchController} from "./usePeopleSearchController";

describe("usePeopleSearchController", () => {
  it("searches only when submitted", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => usePeopleSearchController(),
      {wrapper});
    act(() => result.current.setDraft("Arjun"));
    expect(result.current.loadState).toBe("idle");
    act(() => result.current.search());
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    expect(result.current.result?.kind).toBe("name");
    expect(result.current.selected?.uid).toBe("user_829");
  });

  it("finds a person by user id", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => usePeopleSearchController(),
      {wrapper});
    act(() => result.current.setDraft("user_412"));
    act(() => result.current.search());
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(result.current.result?.kind).toBe("uid");
  });
});
