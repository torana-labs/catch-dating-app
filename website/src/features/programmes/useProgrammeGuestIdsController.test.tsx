import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook, waitFor} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
const read = vi.hoisted(() => vi.fn());
const createUpload = vi.hoisted(() => vi.fn());
const upload = vi.hoisted(() => vi.fn());
const submit = vi.hoisted(() => vi.fn());
vi.mock("../../firebase", () => ({
  getProgramGuestIdStatus: read,
  createProgramAssetUpload: createUpload,
  uploadProgramAsset: upload,
  submitProgramGuestId: submit,
}));
import {programmeFixtures, programmeGuestIdsCopy} from "../../content/programmes";
import {programmeLinkCredential} from "./programmeLinkModel";
import {useProgrammeGuestIdsController} from "./useProgrammeGuestIdsController";

const token = programmeFixtures.token;
const credential = {token};

function harness(input: typeof credential | null = credential) {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  const wrapper = ({children}: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => useProgrammeGuestIdsController(input), {wrapper});
}

const photo = (name: string, type = "image/jpeg", size = 2048) =>
  new File([new Uint8Array(size)], name, {type});

describe("programme guest IDs controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    read.mockResolvedValue(programmeFixtures.guestIds);
    let n = 0;
    createUpload.mockImplementation(async () => {
      n += 1;
      return {programId: "fixture-program", kind: "guestId", assetId: `guestId_${String(n).repeat(40)}`,
        storagePath: "programs/p/guestIds/x", uploadUrl: "https://upload.example", uploadFields: {key: "x"}, expiresAtMillis: 1};
    });
    upload.mockResolvedValue(undefined);
    submit.mockResolvedValue({programId: "fixture-program", guestId: "fixture-guest-3", status: "submitted", revision: 1});
  });

  it("accepts only well-formed path tokens and reads nothing without one", () => {
    expect(programmeLinkCredential(token)).toEqual(credential);
    expect(programmeLinkCredential("short.x")).toBeNull();
    expect(programmeLinkCredential("no-dot-but-long-enough-value-here")).toBeNull();
    const h = harness(null);
    expect(h.result.current.screen).toEqual({kind: "unavailable", reason: "invalid"});
    expect(read).not.toHaveBeenCalled();
    h.unmount();
  });

  it("opens the first member still to add", async () => {
    const h = harness();
    await waitFor(() => expect(h.result.current.screen.kind).toBe("ready"));
    expect(read).toHaveBeenCalledWith(credential);
    expect(h.result.current.draft.guestId).toBe("fixture-guest-3");
    h.unmount();
  });

  it("uploads each photo to its signed policy, then submits the ID with the uploads' ids", async () => {
    const h = harness();
    await waitFor(() => expect(h.result.current.screen.kind).toBe("ready"));
    const front = photo("front.jpg");
    const back = photo("back.png", "image/png");
    act(() => {
      h.result.current.setKind("passport");
      h.result.current.choose("front", front);
      h.result.current.choose("back", back);
    });
    act(() => h.result.current.save());
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(createUpload).toHaveBeenCalledWith(expect.objectContaining({kind: "guestId", token, contentType: "image/jpeg", sizeBytes: 2048}));
    expect(upload).toHaveBeenCalledWith(expect.objectContaining({uploadUrl: "https://upload.example"}), front);
    expect(upload).toHaveBeenCalledWith(expect.anything(), back);
    const payload = submit.mock.calls[0][0];
    expect(payload).toMatchObject({token, guestId: "fixture-guest-3", idKind: "passport"});
    expect(payload.frontAssetId).toMatch(/^guestId_[a-f0-9]{40}$/);
    expect(payload.backAssetId).toMatch(/^guestId_[a-f0-9]{40}$/);
    expect(payload.requestId).toMatch(/^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$/);
    await waitFor(() => expect(h.result.current.draft.notice).toBe(programmeGuestIdsCopy.saved("Kamla Mehra")));
    expect(read).toHaveBeenCalledTimes(2);
    h.unmount();
  });

  it("refuses a file it cannot upload and never saves without a front", async () => {
    const h = harness();
    await waitFor(() => expect(h.result.current.screen.kind).toBe("ready"));
    act(() => h.result.current.choose("front", photo("notes.txt", "text/plain")));
    expect(h.result.current.draft.notice).toBe(programmeGuestIdsCopy.wrongType);
    act(() => h.result.current.choose("front", photo("huge.jpg", "image/jpeg", 11 * 1024 * 1024)));
    expect(h.result.current.draft.notice).toBe(programmeGuestIdsCopy.tooLarge);
    act(() => h.result.current.save());
    expect(h.result.current.draft.notice).toBe(programmeGuestIdsCopy.needFront);
    expect(createUpload).not.toHaveBeenCalled();
    h.unmount();
  });

  it("says so when the save fails", async () => {
    submit.mockRejectedValueOnce(new Error("offline"));
    const h = harness();
    await waitFor(() => expect(h.result.current.screen.kind).toBe("ready"));
    act(() => h.result.current.choose("front", photo("front.jpg")));
    act(() => h.result.current.save());
    await waitFor(() => expect(h.result.current.draft.notice).toBe(programmeGuestIdsCopy.failed));
    expect(h.result.current.draft.front).not.toBeNull();
    h.unmount();
  });

  it("sorts an expired link from a withdrawn one", async () => {
    read.mockRejectedValueOnce(Object.assign(new Error("expired"), {code: "functions/deadline-exceeded"}));
    const h = harness();
    await waitFor(() => expect(h.result.current.screen).toEqual({kind: "unavailable", reason: "expired"}));
    h.unmount();
  });
});
