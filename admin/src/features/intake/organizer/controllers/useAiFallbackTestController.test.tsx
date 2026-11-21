import {act, cleanup, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../../shared/test/queryHarness";
import {useAiFallbackTestController} from "./useAiFallbackTestController";

const repository = vi.hoisted(() => ({
  runAiFallbackTestCall: vi.fn(),
  describeAiFallbackTest: vi.fn(),
}));
vi.mock("../api/aiFallbackTestRepository", () => repository);

describe("useAiFallbackTestController", () => {
  afterEach(cleanup);
  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    repository.describeAiFallbackTest.mockImplementation((result: {ok: boolean}) =>
      result.ok ? "Sign-in worked." : "The token exchange was refused (401).");
  });

  it("reports a passing test call as a notice", async () => {
    const {wrapper} = createQueryHarness();
    const onNotice = vi.fn();
    const onError = vi.fn();
    repository.runAiFallbackTestCall.mockResolvedValue({ok: true});
    const {result} = renderHook(() => useAiFallbackTestController({onError, onNotice}), {wrapper});
    await act(async () => { await result.current.run(true); });
    expect(repository.runAiFallbackTestCall.mock.calls[0][0]).toEqual({dryRun: true});
    expect(onError).toHaveBeenCalledWith(null);
    expect(onNotice).toHaveBeenCalledWith("Sign-in worked.");
  });

  it("reports a failed step and a thrown error as errors", async () => {
    const {wrapper} = createQueryHarness();
    const onError = vi.fn();
    repository.runAiFallbackTestCall.mockResolvedValueOnce({ok: false});
    const {result} = renderHook(() => useAiFallbackTestController({onError, onNotice: vi.fn()}), {wrapper});
    await act(async () => { await result.current.run(false); });
    expect(onError).toHaveBeenLastCalledWith("The token exchange was refused (401).");
    repository.runAiFallbackTestCall.mockRejectedValueOnce(new Error("Only admins can run this."));
    await act(async () => { await result.current.run(false); });
    expect(onError).toHaveBeenLastCalledWith("Only admins can run this.");
  });
});
