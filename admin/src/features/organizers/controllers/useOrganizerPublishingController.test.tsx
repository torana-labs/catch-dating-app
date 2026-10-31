import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook, waitFor} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {AdminOrganizerListRow} from "../../../shared/types/adminTypes";
import {
  buildOrganizerListPayload,
  countBlockingIssues,
  countDiffRows,
  filterOrganizerRows,
  organizerNeedsPublish,
  useOrganizerPublishingController,
} from "./useOrganizerPublishingController";

const repository = vi.hoisted(() => ({
  listOrganizerProfiles: vi.fn(),
  loadOrganizerProfile: vi.fn(),
  publishOrganizerProfile: vi.fn(),
  saveOrganizerProfile: vi.fn(),
}));

vi.mock("../api/organizerPublishingRepository", () => repository);

const readyRow: AdminOrganizerListRow = {
  organizerId: "afterfly",
  name: "AFTER FLY",
  organizerType: "eventProducer",
  publicCategoryLabel: "Event organizer",
  displayCategory: "eventOrganizer",
  cityName: "Indore",
  citySlug: "in-mp-indore",
  regionName: "Madhya Pradesh",
  countryCode: "IN",
  appVisibility: "discoverable",
  claimState: "claimed",
  ownershipState: "ownerVerified",
  canonicalPath: "/organizers/afterfly/",
  publishStatus: "published",
  indexStatus: "index",
  robots: "index, follow",
  sourceConfidence: "ownerVerified",
  verificationStatus: "ownerVerified",
  routeStatus: "valid",
  routeReservationStatus: "reserved",
  searchIndexStatus: "indexed",
};

function createWrapper() {
  const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
  return function Wrapper({children}: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useOrganizerPublishingController", () => {
  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    repository.listOrganizerProfiles.mockResolvedValue({
      generatedAt: "2026-07-13T00:00:00.000Z",
      rows: [readyRow, {...readyRow, organizerId: "draft", publishStatus: "draft"}],
    });
  });

  it("loads the directory and hands selection to route ownership", async () => {
    const onSelectOrganizerId = vi.fn();
    const {result} = renderHook(
      () => useOrganizerPublishingController({
        onError: vi.fn(),
        onNotice: vi.fn(),
        onSelectOrganizerId,
      }),
      {wrapper: createWrapper()}
    );

    await waitFor(() => expect(result.current.isListLoading).toBe(false));
    expect(result.current.rows).toHaveLength(2);
    act(() => result.current.selectOrganizer("afterfly"));
    expect(onSelectOrganizerId).toHaveBeenCalledWith("afterfly");
  });

  it("classifies publish debt and builds server-filter payloads", () => {
    const draftRow = {...readyRow, publishStatus: "draft" as const};
    expect(organizerNeedsPublish(readyRow)).toBe(false);
    expect(organizerNeedsPublish(draftRow)).toBe(true);
    expect(filterOrganizerRows([readyRow, draftRow], "needsPublish")).toEqual([
      draftRow,
    ]);
    expect(buildOrganizerListPayload("published", "  after  ")).toMatchObject({
      limit: 100,
      publishStatus: "published",
      query: "after",
    });
  });

  it("keeps route/search issue filters and validation counters explicit", () => {
    const routeIssue = {
      ...readyRow,
      organizerId: "route-issue",
      routeReservationStatus: "missing" as const,
    };
    const searchIssue = {
      ...readyRow,
      organizerId: "search-issue",
      searchIndexStatus: "missing" as const,
    };
    expect(filterOrganizerRows([readyRow, routeIssue, searchIssue], "routeIssues"))
      .toEqual([routeIssue]);
    expect(filterOrganizerRows([readyRow, routeIssue, searchIssue], "searchIssues"))
      .toEqual([searchIssue]);
    expect(countBlockingIssues([
      {severity: "blocker"},
      {severity: "warning"},
      {severity: "blocker"},
    ] as never)).toBe(2);
    expect(countDiffRows([{field: "name"}, {field: "city"}] as never)).toBe(2);
  });
});
