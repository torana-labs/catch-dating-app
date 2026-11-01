import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, cleanup, fireEvent, render, renderHook, screen, waitFor} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {
  sampleEventDetails,
  sampleExternalEventRows,
} from "../../../shared/api/sampleData";
import type {AdminEventListRow, AdminListExternalEventDetailsResponse} from "../../../shared/types/adminTypes";
import {
  buildEventListPayload,
  buildExternalEventListPayload,
  filterEventRows,
  filterExternalEventRows,
  useEventPublishingController,
} from "./useEventPublishingController";

import {eventPublishingDirectoryPanels} from "../ui/eventPublishingDirectoryPanels";

const repository = vi.hoisted(() => ({
  listExternalEventProfiles: vi.fn(),
  listEventProfiles: vi.fn(),
  loadEventProfile: vi.fn(),
  saveEventProfile: vi.fn(),
  takedownExternalEventProfile: vi.fn(),
}));

vi.mock("../api/eventPublishingRepository", () => repository);

function createWrapper(
  queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}})
) {
  return function Wrapper({children}: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useEventPublishingController", () => {
  afterEach(cleanup);
  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    repository.listEventProfiles.mockResolvedValue({generatedAt: null, rows: []});
    repository.listExternalEventProfiles.mockResolvedValue({generatedAt: null, rows: []});
  });

  it("loads only the active directory boundary without eagerly loading detail", async () => {
    const {result} = renderHook(
      () => useEventPublishingController({onError: vi.fn(), onNotice: vi.fn()}),
      {wrapper: createWrapper()}
    );

    await waitFor(() => {
      expect(result.current.isListLoading).toBe(false);
    });
    expect(repository.listEventProfiles).toHaveBeenCalledWith(
      buildEventListPayload("launchCities", "")
    );
    expect(repository.listExternalEventProfiles).not.toHaveBeenCalled();
    expect(repository.loadEventProfile).not.toHaveBeenCalled();
    expect(result.current.view).toBe("list");
  });

  it("loads only the external workspace when it is selected", async () => {
    const external = renderHook(
      () => useEventPublishingController({
        activeWorkspace: "external",
        onError: vi.fn(),
        onNotice: vi.fn(),
      }),
      {wrapper: createWrapper()}
    );

    await waitFor(() => {
      expect(repository.listExternalEventProfiles).toHaveBeenCalled();
    });
    expect(repository.listEventProfiles).not.toHaveBeenCalled();
    expect(external.result.current.view).toBe("external");
  });

  it("loads a route-selected event even when the directory query is disabled", async () => {
    const event = sampleEventDetails["mumbai-padel-mixer-1"];
    const onError = vi.fn();
    repository.loadEventProfile.mockResolvedValue({event});
    const {result} = renderHook(
      () => useEventPublishingController({
        onError,
        onNotice: vi.fn(),
        selectedEventId: event.eventId,
      }),
      {wrapper: createWrapper()}
    );

    await waitFor(() => expect(result.current.event?.eventId).toBe(event.eventId));
    expect(repository.listEventProfiles).not.toHaveBeenCalled();
    expect(repository.loadEventProfile).toHaveBeenCalledWith({eventId: event.eventId});
    expect(result.current.view).toBe("detail");
  });

  it("dry-runs before applying an external-event takedown", async () => {
    repository.takedownExternalEventProfile
      .mockResolvedValueOnce({outcome: "would_remove", writeApplied: false})
      .mockResolvedValueOnce({
        outcome: "removed",
        targetPath: "externalEvents/event-1",
        writeApplied: true,
      });
    const {result} = renderHook(
      () => useEventPublishingController({
        activeWorkspace: "external",
        onError: vi.fn(),
        onNotice: vi.fn(),
      }),
      {wrapper: createWrapper()}
    );

    await act(async () => {
      expect(await result.current.takedownExternalEvent({
        eventId: "event-1",
        reviewNote: "Official source marks the event cancelled.",
        checklist: {
          sourceStatusReviewed: true,
          takedownAuthorityReviewed: true,
          downstreamVisibilityReviewed: true,
        },
      })).toBe(true);
    });

    expect(repository.takedownExternalEventProfile).toHaveBeenCalledTimes(2);
    expect(repository.takedownExternalEventProfile.mock.calls[0]?.[0])
      .toMatchObject({executionMode: "dry_run"});
    expect(repository.takedownExternalEventProfile.mock.calls[1]?.[0])
      .toMatchObject({executionMode: "apply"});
  });

  it.each(["empty", "other row"] as const)(
    "does not resurrect a cached list row when detail returns %s",
    async (resultKind) => {
      const row = sampleExternalEventRows.find((entry) => entry.publicationStatus === "public")!;
      const detail = deferred<AdminListExternalEventDetailsResponse>();
      repository.listExternalEventProfiles.mockImplementation((payload) =>
        payload.limit === 10 ? detail.promise : Promise.resolve({generatedAt: "2026-10-17T00:00:00.000Z", rows: [row]})
      );
      const onError = vi.fn();
      const onNotice = vi.fn();
      const {result, rerender} = renderHook(
        ({selectedId}: {selectedId: string | null}) => useEventPublishingController({
          activeWorkspace: "external", selectedExternalEventId: selectedId, onError, onNotice,
        }),
        {wrapper: createWrapper(), initialProps: {selectedId: null as string | null}}
      );
      await waitFor(() => expect(result.current.externalRows).toEqual([row]));
      rerender({selectedId: row.eventId});
      await waitFor(() => expect(repository.listExternalEventProfiles).toHaveBeenCalledWith({
        query: row.eventId, publicationStatus: "public", timeWindow: "all", limit: 10,
      }));
      const duringLoad = result.current.selectedExternalEvent;
      await act(async () => detail.resolve({
        generatedAt: "2026-10-17T00:00:00.000Z",
        rows: resultKind === "empty" ? [] : [{...row, eventId: "another-external-event"}],
      }));
      await waitFor(() => expect(result.current.isExternalListLoading).toBe(false));
      expect(duringLoad).toBeNull();
      expect(result.current.externalRows).toEqual([row]);
      expect(result.current.selectedExternalEvent).toBeNull();
    }
  );

  it("renders retryable error without stale detail or takedown, then recovers", async () => {
    const row = sampleExternalEventRows.find((entry) => entry.publicationStatus === "public")!;
    const failure = deferred<AdminListExternalEventDetailsResponse>();
    const retry = deferred<AdminListExternalEventDetailsResponse>();
    const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
    repository.listExternalEventProfiles
      .mockResolvedValueOnce({generatedAt: "2026-10-17T00:00:00.000Z", rows: [row]})
      .mockImplementationOnce(() => failure.promise)
      .mockImplementationOnce(() => retry.promise);
    const onError = vi.fn();
    const onNotice = vi.fn();
    function Inventory() {
      const controller = useEventPublishingController({
        activeWorkspace: "external", selectedExternalEventId: row.eventId, onError, onNotice,
      });
      return <eventPublishingDirectoryPanels.ExternalEventDetailView controller={controller} />;
    }
    render(<Inventory />, {wrapper: createWrapper(client)});
    await screen.findByRole("button", {name: "Remove external event"});
    let refresh!: Promise<void>;
    act(() => { refresh = client.invalidateQueries({queryKey: ["admin", "events"]}); });
    await screen.findByText("Loading external event");
    expect(screen.queryByRole("button", {name: "Remove external event"})).toBeNull();
    await act(async () => {
      failure.reject(new Error("Detail connection failed."));
      await refresh;
    });
    await screen.findByText("Unable to load external event");
    expect(screen.queryByText("External event unavailable")).toBeNull();
    expect(screen.queryByText("This record was not found", {exact: false})).toBeNull();
    expect(screen.queryByRole("button", {name: "Remove external event"})).toBeNull();
    expect(screen.queryByLabelText(`External event supply detail for ${row.title}`)).toBeNull();
    fireEvent.click(screen.getByRole("button", {name: "Retry"}));
    await screen.findByText("Loading external event");
    expect(screen.queryByRole("button", {name: "Remove external event"})).toBeNull();
    await act(async () => retry.resolve({generatedAt: "2026-10-17T00:00:00.000Z", rows: [row]}));
    await screen.findByRole("button", {name: "Remove external event"});
    expect(onError).toHaveBeenLastCalledWith(null);
    expect(repository.listExternalEventProfiles).toHaveBeenCalledTimes(3);
    expect(repository.listExternalEventProfiles.mock.calls.every(([payload]) =>
      payload.query === row.eventId && payload.limit === 10)).toBe(true);
  });

  it("renders unavailable after takedown even while the disabled list retains its row", async () => {
    const row = sampleExternalEventRows.find((entry) => entry.publicationStatus === "public")!;
    let removed = false;
    repository.listExternalEventProfiles.mockImplementation((payload) => Promise.resolve({
      generatedAt: "2026-10-17T00:00:00.000Z", rows: payload.limit === 10 && removed ? [] : [row],
    }));
    repository.takedownExternalEventProfile.mockImplementation(async (payload) => {
      if (payload.executionMode === "apply") removed = true;
      return {targetPath: row.targetPath, writeApplied: removed};
    });
    const onError = vi.fn();
    const onNotice = vi.fn();
    let controller!: ReturnType<typeof useEventPublishingController>;
    function Inventory({selectedId}: {selectedId: string | null}) {
      controller = useEventPublishingController({
        activeWorkspace: "external", selectedExternalEventId: selectedId, onError, onNotice,
      });
      return <eventPublishingDirectoryPanels.ExternalEventDetailView controller={controller} />;
    }
    const {rerender} = render(<Inventory selectedId={null} />, {wrapper: createWrapper()});
    await waitFor(() => expect(controller.externalRows).toEqual([row]));
    rerender(<Inventory selectedId={row.eventId} />);
    await screen.findByRole("button", {name: "Remove external event"});
    await act(async () => {
      expect(await controller.takedownExternalEvent({
        eventId: row.eventId, reviewNote: "Official source confirmed removal.",
        checklist: {sourceStatusReviewed: true, takedownAuthorityReviewed: true, downstreamVisibilityReviewed: true},
      })).toBe(true);
    });
    await screen.findByText("External event unavailable");
    expect(controller.externalRows).toEqual([row]);
    expect(controller.selectedExternalEvent).toBeNull();
    expect(screen.queryByRole("button", {name: "Remove external event"})).toBeNull();
    expect(onNotice).toHaveBeenCalledWith(`Removed ${row.targetPath} from external discovery.`);
  });

  it("keeps selected detail identity when an older route request finishes later", async () => {
    const row = sampleExternalEventRows.find((entry) => entry.publicationStatus === "public")!;
    const older = deferred<AdminListExternalEventDetailsResponse>();
    const newer = {...row, eventId: "newer-external", title: "Newer external event"};
    repository.listExternalEventProfiles.mockImplementation((payload) =>
      payload.query === row.eventId ? older.promise : Promise.resolve({generatedAt: "2026-10-17T00:00:00.000Z", rows: [newer]})
    );
    const onError = vi.fn();
    const onNotice = vi.fn();
    const {result, rerender} = renderHook(
      ({selectedId}) => useEventPublishingController({
        activeWorkspace: "external", selectedExternalEventId: selectedId, onError, onNotice,
      }),
      {wrapper: createWrapper(), initialProps: {selectedId: row.eventId}}
    );
    await waitFor(() => expect(repository.listExternalEventProfiles).toHaveBeenCalledTimes(1));
    rerender({selectedId: newer.eventId});
    await waitFor(() => expect(result.current.selectedExternalEvent).toEqual(newer));
    onError.mockClear();
    await act(async () => older.resolve({generatedAt: "2026-10-17T00:00:00.000Z", rows: [row]}));
    expect(result.current.selectedExternalEvent).toEqual(newer);
    expect(onError).not.toHaveBeenCalled();
  });

  it.each(["success", "failure"] as const)(
    "does not change feedback when a previous detail retry finishes with %s",
    async (outcome) => {
      const row = sampleExternalEventRows.find((entry) => entry.publicationStatus === "public")!;
      const retry = deferred<AdminListExternalEventDetailsResponse>();
      const newer = {...row, eventId: "newer-external"};
      repository.listExternalEventProfiles
        .mockResolvedValueOnce({generatedAt: "2026-10-17T00:00:00.000Z", rows: [row]})
        .mockImplementationOnce(() => retry.promise)
        .mockRejectedValueOnce(new Error("Current detail failed."));
      const onError = vi.fn();
      const onNotice = vi.fn();
      const {result, rerender} = renderHook(
        ({selectedId}) => useEventPublishingController({
          activeWorkspace: "external", selectedExternalEventId: selectedId, onError, onNotice,
        }),
        {wrapper: createWrapper(), initialProps: {selectedId: row.eventId}}
      );
      await waitFor(() => expect(result.current.selectedExternalEvent).toEqual(row));
      let pending!: Promise<boolean>;
      act(() => { pending = result.current.refreshExternalList(); });
      await waitFor(() => expect(repository.listExternalEventProfiles).toHaveBeenCalledTimes(2));
      rerender({selectedId: newer.eventId});
      await waitFor(() => expect(onError).toHaveBeenLastCalledWith("Current detail failed."));
      onError.mockClear();
      await act(async () => {
        if (outcome === "success") {
          retry.resolve({generatedAt: "2026-10-17T00:00:00.000Z", rows: [row]});
        } else {
          retry.reject(new Error("Old detail failed."));
        }
        await pending;
      });
      expect(onError).not.toHaveBeenCalled();
      expect(result.current.selectedExternalEventId).toBe(newer.eventId);
      expect(result.current.isExternalDetailError).toBe(true);
      expect(result.current.selectedExternalEvent).toBeNull();
    }
  );

  it.each(["detail", "directory"] as const)(
    "ignores a held inventory refresh failure after navigating to %s",
    async (destination) => {
      const row = sampleExternalEventRows.find((entry) => entry.publicationStatus === "public")!;
      const refresh = deferred<AdminListExternalEventDetailsResponse>();
      repository.listExternalEventProfiles
        .mockResolvedValueOnce({generatedAt: "2026-10-17T00:00:00.000Z", rows: [row]})
        .mockImplementationOnce(() => refresh.promise)
        .mockResolvedValueOnce({generatedAt: "2026-10-17T00:00:00.000Z", rows: [row]});
      const onError = vi.fn();
      const onNotice = vi.fn();
      const {result, rerender} = renderHook(
        ({selectedId, workspace}: {
          selectedId: string | null; workspace: "external" | "directory";
        }) => useEventPublishingController({
          activeWorkspace: workspace, selectedExternalEventId: selectedId, onError, onNotice,
        }),
        {wrapper: createWrapper(), initialProps: {
          selectedId: null as string | null, workspace: "external" as "external" | "directory",
        }}
      );
      await waitFor(() => expect(result.current.externalRows).toEqual([row]));
      let pending!: Promise<boolean>;
      act(() => { pending = result.current.refreshExternalList(); });
      await waitFor(() => expect(repository.listExternalEventProfiles).toHaveBeenCalledTimes(2));
      rerender(destination === "detail" ?
        {selectedId: row.eventId, workspace: "external"} :
        {selectedId: null, workspace: "directory"});
      if (destination === "detail") {
        await waitFor(() => expect(result.current.selectedExternalEvent).toEqual(row));
      } else {
        await waitFor(() => expect(repository.listEventProfiles).toHaveBeenCalledTimes(1));
      }
      onError.mockClear();
      await act(async () => {
        refresh.reject(new Error("Previous inventory failed."));
        expect(await pending).toBe(false);
      });
      expect(onError).not.toHaveBeenCalled();
      if (destination === "detail") expect(result.current.selectedExternalEvent).toEqual(row);
    }
  );

  it("preserves a same-event dirty takedown draft through refetch and recovery, then retires it on absence", async () => {
    const row = sampleExternalEventRows.find((entry) => entry.publicationStatus === "public")!;
    const nextRow = {...row, eventId: "different-external", title: "Different event"};
    const refresh = deferred<AdminListExternalEventDetailsResponse>();
    repository.listExternalEventProfiles
      .mockResolvedValueOnce({generatedAt: "2026-10-17T00:00:00.000Z", rows: [row]})
      .mockImplementationOnce(() => refresh.promise)
      .mockResolvedValueOnce({generatedAt: "2026-10-17T00:00:00.000Z", rows: [row]})
      .mockResolvedValueOnce({generatedAt: "2026-10-17T00:00:00.000Z", rows: []})
      .mockResolvedValueOnce({generatedAt: "2026-10-17T00:00:00.000Z", rows: [row]})
      .mockResolvedValueOnce({generatedAt: "2026-10-17T00:00:00.000Z", rows: [nextRow]});
    const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
    const onError = vi.fn();
    const onNotice = vi.fn();
    function Inventory({selectedId}: {selectedId: string}) {
      const controller = useEventPublishingController({
        activeWorkspace: "external", selectedExternalEventId: selectedId, onError, onNotice,
      });
      return <eventPublishingDirectoryPanels.ExternalEventDetailView controller={controller} />;
    }
    const {rerender} = render(<Inventory selectedId={row.eventId} />, {wrapper: createWrapper(client)});
    const note = await screen.findByLabelText("Takedown review note");
    fireEvent.change(note, {target: {value: "Retain this reviewed explanation."}});
    const checks = ["Official source status reviewed", "Takedown authority reviewed",
      "Downstream app and web visibility reviewed"];
    checks.forEach((label) => fireEvent.click(screen.getByLabelText(label)));
    expect((screen.getByRole("button", {name: "Remove external event"}) as HTMLButtonElement).disabled).toBe(false);
    let pending!: Promise<void>;
    act(() => { pending = client.invalidateQueries({queryKey: ["admin", "events"]}); });
    await screen.findByText("Loading external event");
    expect(screen.queryByRole("button", {name: "Remove external event"})).toBeNull();
    await act(async () => {
      refresh.reject(new Error("Connection interrupted."));
      await pending;
    });
    await screen.findByRole("button", {name: "Retry"});
    expect(screen.queryByRole("button", {name: "Remove external event"})).toBeNull();
    fireEvent.click(screen.getByRole("button", {name: "Retry"}));
    await screen.findByLabelText("Takedown review note");
    expect((screen.getByLabelText("Takedown review note") as HTMLTextAreaElement).value)
      .toBe("Retain this reviewed explanation.");
    checks.forEach((label) => expect((screen.getByLabelText(label) as HTMLInputElement).checked).toBe(true));
    expect((screen.getByRole("button", {name: "Remove external event"}) as HTMLButtonElement).disabled).toBe(false);
    await act(async () => { await client.invalidateQueries({queryKey: ["admin", "events"]}); });
    await screen.findByText("External event unavailable");
    await act(async () => { await client.invalidateQueries({queryKey: ["admin", "events"]}); });
    await screen.findByLabelText("Takedown review note");
    expect((screen.getByLabelText("Takedown review note") as HTMLTextAreaElement).value).toBe("");
    checks.forEach((label) => expect((screen.getByLabelText(label) as HTMLInputElement).checked).toBe(false));
    fireEvent.change(screen.getByLabelText("Takedown review note"), {target: {value: "Only for the previous event."}});
    checks.forEach((label) => fireEvent.click(screen.getByLabelText(label)));
    rerender(<Inventory selectedId={nextRow.eventId} />);
    await screen.findByLabelText(`External event supply detail for ${nextRow.title}`);
    expect((screen.getByLabelText("Takedown review note") as HTMLTextAreaElement).value).toBe("");
    checks.forEach((label) => expect((screen.getByLabelText(label) as HTMLInputElement).checked).toBe(false));
    expect(repository.takedownExternalEventProfile).not.toHaveBeenCalled();
  });

  it("does not clear a mutation failure merely because existing detail data is successful", async () => {
    const row = sampleExternalEventRows.find((entry) => entry.publicationStatus === "public")!;
    repository.listExternalEventProfiles.mockResolvedValue({
      generatedAt: "2026-10-17T00:00:00.000Z", rows: [row],
    });
    repository.takedownExternalEventProfile.mockRejectedValue(new Error("Takedown was not accepted."));
    const onError = vi.fn();
    const onNotice = vi.fn();
    const {result, rerender} = renderHook(() => useEventPublishingController({
      activeWorkspace: "external", selectedExternalEventId: row.eventId, onError, onNotice,
    }), {wrapper: createWrapper()});
    await waitFor(() => expect(result.current.selectedExternalEvent).toEqual(row));
    await act(async () => {
      expect(await result.current.takedownExternalEvent({
        eventId: row.eventId, reviewNote: "Reviewed removal request.",
        checklist: {sourceStatusReviewed: true, takedownAuthorityReviewed: true, downstreamVisibilityReviewed: true},
      })).toBe(false);
    });
    rerender();
    expect(onError).toHaveBeenLastCalledWith("Takedown was not accepted.");
    expect(result.current.selectedExternalEvent).toEqual(row);
    expect(repository.listExternalEventProfiles).toHaveBeenCalledTimes(1);
  });

  it("normalizes query and filter payloads", () => {
    expect(buildEventListPayload("cancelled", "  mixer  ")).toMatchObject({
      limit: 100,
      query: "mixer",
      status: "cancelled",
    });
    expect(buildExternalEventListPayload("public", "  run  ")).toMatchObject({
      limit: 100,
      publicationStatus: "public",
      query: "run",
    });
  });

  it("applies time, capacity, launch-market, search, and review filters", () => {
    const base: AdminEventListRow = {
      eventId: "event-1",
      organizerId: "club-1",
      organizerName: "Sunday Club",
      title: "Sunday Table",
      activityKind: "singlesMixer",
      activityLabel: "Singles mixer",
      startTime: "2026-07-02T18:00:00.000Z",
      citySlug: "in-mp-indore",
      meetingPoint: "Indore",
      status: "active",
      availability: "available",
      crossPathsDiscoveryEnabled: false,
      bookedCount: 8,
      capacityLimit: 8,
      priceInPaise: 120000,
      currency: "INR",
      searchIndexStatus: "indexed",
    };
    const rows = [
      base,
      {...base, eventId: "past", startTime: "2026-06-01T18:00:00.000Z"},
      {...base, eventId: "search", searchIndexStatus: "missing" as const},
    ];
    expect(filterEventRows(rows, "upcoming", "2026-07-01T00:00:00.000Z"))
      .toEqual([base, rows[2]]);
    expect(filterEventRows(rows, "full", "2026-07-01T00:00:00.000Z"))
      .toEqual([base, rows[2]]);
    expect(filterEventRows(rows, "searchIssues", "2026-07-01T00:00:00.000Z"))
      .toEqual([rows[2]]);

    expect(filterExternalEventRows(sampleExternalEventRows, "reviewOpen", "2026-06-01T00:00:00.000Z"))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({publicationStatus: "draft"}),
      ]));
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((complete, fail) => {
    resolve = complete;
    reject = fail;
  });
  return {promise, resolve, reject};
}

describe("supported pilot review", () => {
  afterEach(cleanup);
  it("shows an explicit real-event choice and binds the reviewed revision", async () => {
    const {formFromEventProfile, buildEventSavePayload} = await import("./eventPublishingHelpers");
    const {eventPublishingEditorPanels} = await import("../ui/eventPublishingEditorPanels");
    const event = {...sampleEventDetails["mumbai-padel-mixer-1"],
      hostPilotReview: {realEvent: false, revision: 3, reviewedAt: 100}};
    const form = formFromEventProfile(event);
    const onFormChange = vi.fn();
    render(<eventPublishingEditorPanels.EventEditor
      event={event} eventId={event.eventId} form={form}
      diffRows={[]} isDetailLoading={false} isSaving={false}
      validationIssues={[]} onEventIdChange={vi.fn()}
      onFormChange={onFormChange} onLoad={vi.fn()} onSave={vi.fn()}
    />);
    const choice = screen.getByRole("checkbox", {
      name: "I reviewed this as a real pilot event, not a test",
    });
    expect((choice as HTMLInputElement).checked).toBe(false);
    fireEvent.click(choice);
    const changed = {...onFormChange.mock.calls[0][0], reviewNote: "Real supported pilot"};
    expect(buildEventSavePayload(event, changed)).toEqual({
      eventId: event.eventId, reviewNote: "Real supported pilot",
      fields: {hostPilotReview: {realEvent: true, expectedRevision: 3}},
    });
    expect(screen.getByText(/Earlier check-ins are excluded/)).toBeTruthy();
  });
});
