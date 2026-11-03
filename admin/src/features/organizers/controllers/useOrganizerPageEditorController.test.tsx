import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {sampleOrganizerDetails} from "../../../shared/api/sampleData";
import * as repository from "../api/organizerPublishingRepository";
import {updateOrganizerSlug} from "./organizerPublishingHelpers";
import {useOrganizerPageEditorController} from "./useOrganizerPageEditorController";

vi.mock("../api/organizerPublishingRepository", () => ({
  loadOrganizerProfile: vi.fn(),
  publishOrganizerProfile: vi.fn(),
  saveOrganizerProfile: vi.fn(),
}));

const organizer = sampleOrganizerDetails.afterfly!;
const allChecked = {
  sourceEvidenceVerified: true,
  mediaRightsVerified: true,
  cadenceVerified: true,
  ownerContactVerified: true,
};

function wrapper({children}: {children: ReactNode}) {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function setup() {
  const onError = vi.fn();
  const onNotice = vi.fn();
  const hook = renderHook(
    () => useOrganizerPageEditorController(organizer.organizerId, {onError, onNotice}),
    {wrapper}
  );
  return {...hook, onError, onNotice};
}

describe("useOrganizerPageEditorController", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.mocked(repository.loadOrganizerProfile).mockReset().mockResolvedValue({organizer} as never);
    vi.mocked(repository.saveOrganizerProfile).mockReset().mockResolvedValue(
      {organizerId: organizer.organizerId, updatedFieldCount: 1} as never
    );
    vi.mocked(repository.publishOrganizerProfile).mockReset().mockResolvedValue(
      {organizerId: organizer.organizerId, publishStatus: "published", robots: "index"} as never
    );
  });

  it("asks for a note before saving a change", async () => {
    const {onError, result} = setup();
    await waitFor(() => expect(result.current.form).not.toBeNull());
    act(() => result.current.setForm({...result.current.form!, headline: "New headline"}));
    expect(result.current.canSave).toBe(false);
    await act(async () => {
      expect(await result.current.save()).toBe(false);
    });
    expect(repository.saveOrganizerProfile).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();

    act(() => result.current.setForm({...result.current.form!, reviewNote: "Checked their site"}));
    await waitFor(() => expect(result.current.canSave).toBe(true));
    await act(async () => {
      expect(await result.current.save()).toBe(true);
    });
    expect(repository.saveOrganizerProfile).toHaveBeenCalledTimes(1);
  });

  it("won't publish without all four confirmations", async () => {
    const {result} = setup();
    await waitFor(() => expect(result.current.form).not.toBeNull());
    act(() => result.current.setForm({
      ...result.current.form!,
      reviewNote: "Checked their site",
      sourceConfidence: "high",
      verificationStatus: "sourceBacked",
    }));
    await act(async () => {
      expect(await result.current.saveAndPublish()).toBe(false);
    });
    expect(repository.publishOrganizerProfile).not.toHaveBeenCalled();
  });

  it("saves changes before publishing, and clears the confirmations afterwards", async () => {
    const {result} = setup();
    await waitFor(() => expect(result.current.form).not.toBeNull());
    act(() => result.current.setForm({
      ...result.current.form!,
      headline: "New headline",
      reviewNote: "Checked their site",
      sourceConfidence: "high",
      verificationStatus: "sourceBacked",
    }));
    act(() => result.current.setChecklist(allChecked));
    if (result.current.publishIssues.some((issue) => issue.severity === "blocker")) {
      throw new Error(JSON.stringify(result.current.publishIssues));
    }
    await act(async () => {
      expect(await result.current.saveAndPublish()).toBe(true);
    });
    const saved = vi.mocked(repository.saveOrganizerProfile).mock.invocationCallOrder[0]!;
    const published = vi.mocked(repository.publishOrganizerProfile).mock.invocationCallOrder[0]!;
    expect(saved).toBeLessThan(published);
    expect(result.current.checklist.mediaRightsVerified).toBe(false);
  });

  it("discards back to the saved organizer", async () => {
    const {result} = setup();
    await waitFor(() => expect(result.current.form).not.toBeNull());
    act(() => result.current.setForm({...result.current.form!, headline: "New headline"}));
    act(() => result.current.discard());
    expect(result.current.diffRows).toEqual([]);
  });

  it("keeps the page's address in step with its slug", async () => {
    const {result} = setup();
    await waitFor(() => expect(result.current.form).not.toBeNull());
    const form = result.current.form!;
    const next = updateOrganizerSlug({...form, publicPageCitySlug: "mumbai"}, "new-name");
    expect(next.publicPageSlug).toBe("new-name");
    expect(next.canonicalPath).toBe("/organizers/mumbai/new-name/");
    expect(updateOrganizerSlug({...form, publicPageCitySlug: ""}, "new-name").canonicalPath)
      .toBe("/organizers/new-name/");
  });
});
