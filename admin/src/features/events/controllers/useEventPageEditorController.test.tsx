import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {sampleEventDetails} from "../../../shared/api/sampleData";
import * as repository from "../api/eventPublishingRepository";
import {useEventPageEditorController} from "./useEventPageEditorController";

vi.mock("../api/eventPublishingRepository", () => ({
  loadEventProfile: vi.fn(),
  saveEventProfile: vi.fn(),
}));

const event = {
  ...sampleEventDetails["mumbai-padel-mixer-1"]!,
  hostPilotReview: {realEvent: false, revision: 3, reviewedAt: 100},
};

function wrapper({children}: {children: ReactNode}) {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function setup() {
  const onError = vi.fn();
  const onNotice = vi.fn();
  const hook = renderHook(
    () => useEventPageEditorController(event.eventId, {onError, onNotice}),
    {wrapper}
  );
  return {...hook, onError, onNotice};
}

describe("useEventPageEditorController", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.mocked(repository.loadEventProfile).mockReset().mockResolvedValue({event} as never);
    vi.mocked(repository.saveEventProfile).mockReset().mockResolvedValue(
      {eventId: event.eventId, updatedFieldCount: 1} as never
    );
  });

  it("asks for a note before a changed page can be saved", async () => {
    const {onError, result} = setup();
    await waitFor(() => expect(result.current.form).not.toBeNull());
    expect(result.current.canSave).toBe(false);

    act(() => result.current.update("description", "New words"));
    expect(result.current.diffRows.map((row) => row.field)).toHaveLength(1);
    expect(result.current.canSave).toBe(false);
    await act(async () => {
      expect(await result.current.save()).toBe(false);
    });
    expect(repository.saveEventProfile).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.stringContaining("review note"));

    act(() => result.current.update("reviewNote", "Tidied the copy"));
    await waitFor(() => expect(result.current.canSave).toBe(true));
    await act(async () => {
      expect(await result.current.save()).toBe(true);
    });
    expect(vi.mocked(repository.saveEventProfile).mock.calls[0]![0]).toEqual({
      eventId: event.eventId,
      reviewNote: "Tidied the copy",
      fields: {description: "New words"},
    });
  });

  it("discards back to the saved event", async () => {
    const {result} = setup();
    await waitFor(() => expect(result.current.form).not.toBeNull());
    act(() => result.current.update("description", "New words"));
    act(() => result.current.discard());
    expect(result.current.form?.description).toBe(event.description);
    expect(result.current.diffRows).toEqual([]);
  });

  it("saves the pilot review alone and binds the reviewed revision", async () => {
    const {result} = setup();
    await waitFor(() => expect(result.current.form).not.toBeNull());
    act(() => result.current.update("description", "Not part of the review"));
    await act(async () => {
      await result.current.savePilotReview(true, "Real supported pilot");
    });
    expect(vi.mocked(repository.saveEventProfile).mock.calls[0]![0]).toEqual({
      eventId: event.eventId,
      reviewNote: "Real supported pilot",
      fields: {hostPilotReview: {realEvent: true, expectedRevision: 3}},
    });
  });

  it("never edits the retired Cross Paths pilot", async () => {
    const {result} = setup();
    await waitFor(() => expect(result.current.form).not.toBeNull());
    expect(result.current.form).not.toHaveProperty("crossPathsDiscoveryEnabled");
  });
});
