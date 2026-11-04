import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {AdminPendingOperationProvider, useAdminOperationPending} from "../../../shared/pendingOperation";
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
  return <QueryClientProvider client={client}><AdminPendingOperationProvider>{children}</AdminPendingOperationProvider></QueryClientProvider>;
}

function setup() {
  const onError = vi.fn();
  const onNotice = vi.fn();
  const hook = renderHook(
    () => {
      const editor = useOrganizerPageEditorController(organizer.organizerId, {onError, onNotice});
      return {...editor, operationPending: useAdminOperationPending()};
    },
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

  const incompletePublished = {...organizer, description: "", area: "",
    publicPage: {...organizer.publicPage, publishStatus: "published" as const},
    publicProfile: {...organizer.publicProfile, headline: null, summary: null},
    provenance: {...organizer.provenance, sourceConfidence: "seedOnly" as const,
      verificationStatus: "unverified" as const}};

  it.each([
    ["email", "correct@example.com"], ["instagramHandle", "correct_handle"],
    ["description", "Corrected copy"],
  ] as const)("saves only an audited %s correction on an incomplete published organizer", async (field, value) => {
    vi.mocked(repository.loadOrganizerProfile).mockResolvedValue({organizer: incompletePublished} as never);
    const {result} = setup();
    await waitFor(() => expect(result.current.form).not.toBeNull());
    act(() => result.current.setForm({...result.current.form!, [field]: value}));
    expect(result.current.canSave).toBe(false);
    await act(async () => { expect(await result.current.save()).toBe(false); });
    expect(repository.saveOrganizerProfile).not.toHaveBeenCalled();
    act(() => result.current.setForm({...result.current.form!, reviewNote: "Corrected from supplied details"}));
    expect(result.current.canSave).toBe(true);
    expect(result.current.canPublish).toBe(false);
    await act(async () => { expect(await result.current.save()).toBe(true); });
    expect(repository.saveOrganizerProfile).toHaveBeenCalledTimes(1);
    expect(vi.mocked(repository.saveOrganizerProfile).mock.calls[0]![0]).toEqual({
      organizerId: organizer.organizerId, reviewNote: "Corrected from supplied details", fields: {[field]: value},
    });
    expect(repository.publishOrganizerProfile).not.toHaveBeenCalled();
  });

  it("short-circuits a no-op save even with legacy gaps or only an audit note", async () => {
    vi.mocked(repository.loadOrganizerProfile).mockResolvedValue({organizer: incompletePublished} as never);
    const {result} = setup();
    await waitFor(() => expect(result.current.form).not.toBeNull());
    act(() => result.current.setForm({...result.current.form!, reviewNote: "No correction needed"}));
    expect(result.current.canSave).toBe(false);
    await act(async () => { expect(await result.current.save()).toBe(true); });
    expect(repository.saveOrganizerProfile).not.toHaveBeenCalled();
    expect(repository.publishOrganizerProfile).not.toHaveBeenCalled();
    expect(result.current.operationPending).toBe(false);
  });

  it("rejects an invalid changed email before taking the lease", async () => {
    vi.mocked(repository.loadOrganizerProfile).mockResolvedValue({organizer: incompletePublished} as never);
    const {result, onError} = setup();
    await waitFor(() => expect(result.current.form).not.toBeNull());
    act(() => result.current.setForm({...result.current.form!, email: "invalid", reviewNote: "Correction"}));
    expect(result.current.canSave).toBe(false);
    await act(async () => { expect(await result.current.save()).toBe(false); });
    expect(onError).toHaveBeenCalledWith("Enter a complete email address or leave the field empty.");
    expect(repository.saveOrganizerProfile).not.toHaveBeenCalled();
    expect(result.current.operationPending).toBe(false);
  });

  it.each([false, true])("holds the shared lease across duplicate saves and releases it after failure=%s", async (fails) => {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    vi.mocked(repository.saveOrganizerProfile).mockImplementationOnce(() => new Promise((done, fail) => {
      resolve = () => done({organizerId: organizer.organizerId, updatedFieldCount: 1} as never);
      reject = fail;
    }));
    const {result, onError} = setup();
    await waitFor(() => expect(result.current.form).not.toBeNull());
    act(() => result.current.setForm({...result.current.form!, email: "new@example.com", reviewNote: "Correction"}));
    let first!: Promise<boolean>;
    act(() => { first = result.current.save(); });
    await waitFor(() => expect(result.current.operationPending).toBe(true));
    await act(async () => { expect(await result.current.save()).toBe(false); });
    expect(repository.saveOrganizerProfile).toHaveBeenCalledTimes(1);
    await act(async () => {
      if (fails) reject(new Error("Save failed")); else resolve();
      expect(await first).toBe(!fails);
    });
    expect(result.current.operationPending).toBe(false);
    if (fails) expect(onError).toHaveBeenCalledWith("Save failed");
  });

  it("keeps publication verification blockers even with every confirmation checked", async () => {
    vi.mocked(repository.loadOrganizerProfile).mockResolvedValue({organizer: incompletePublished} as never);
    const {result} = setup();
    await waitFor(() => expect(result.current.form).not.toBeNull());
    act(() => {
      result.current.setForm({...result.current.form!, reviewNote: "Contact correction", email: "new@example.com"});
      result.current.setChecklist(allChecked);
    });
    expect(result.current.canSave).toBe(true);
    expect(result.current.canPublish).toBe(false);
    await act(async () => { expect(await result.current.saveAndPublish()).toBe(false); });
    expect(repository.saveOrganizerProfile).not.toHaveBeenCalled();
    expect(repository.publishOrganizerProfile).not.toHaveBeenCalled();
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
