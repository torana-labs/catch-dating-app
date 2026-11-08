import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook, waitFor} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
const read = vi.hoisted(() => vi.fn());
const createUpload = vi.hoisted(() => vi.fn());
const upload = vi.hoisted(() => vi.fn());
const upsert = vi.hoisted(() => vi.fn());
vi.mock("../../firebase", () => ({
  getProgramHamperWebView: read,
  createProgramAssetUpload: createUpload,
  uploadProgramAsset: upload,
  upsertProgramHamper: upsert,
}));
import {programmeFixtures, programmeHampersCopy} from "../../content/programmes";
import {useProgrammeHampersController} from "./useProgrammeHampersController";

const token = programmeFixtures.token;
const rooms = programmeFixtures.hampers.rooms;
const pending = rooms.find((room) => room.status === "pending")!;

function harness() {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  const wrapper = ({children}: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => useProgrammeHampersController({token}), {wrapper});
}

describe("programme hampers controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    read.mockResolvedValue(programmeFixtures.hampers);
    createUpload.mockResolvedValue({programId: "fixture-program", kind: "hamper", assetId: `hamper_${"a".repeat(40)}`,
      storagePath: "programs/p/hampers/x", uploadUrl: "https://upload.example", uploadFields: {}, expiresAtMillis: 1});
    upload.mockResolvedValue(undefined);
    upsert.mockResolvedValue({});
  });

  it("picks a room on Placed, then marks it with the photo through a signed upload", async () => {
    const h = harness();
    await waitFor(() => expect(h.result.current.screen.kind).toBe("ready"));
    act(() => h.result.current.pick(pending));
    expect(h.result.current.draft.stayId).toBe(pending.stayId);
    expect(upsert).not.toHaveBeenCalled();
    const file = new File([new Uint8Array(512)], "hamper.jpg", {type: "image/jpeg"});
    act(() => h.result.current.photo(file));
    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));
    expect(createUpload).toHaveBeenCalledWith(expect.objectContaining({kind: "hamper", token, contentType: "image/jpeg", sizeBytes: 512}));
    expect(upload).toHaveBeenCalledWith(expect.anything(), file);
    expect(upsert.mock.calls[0][0]).toMatchObject({token, stayId: pending.stayId, status: "placed", photoAssetId: `hamper_${"a".repeat(40)}`});
    await waitFor(() => expect(h.result.current.draft.notice).toBe(programmeHampersCopy.savedRoom(programmeHampersCopy.room(pending.roomLabel))));
    expect(h.result.current.draft.stayId).toBeNull();
    h.unmount();
  });

  it("marks the picked room without a photo when Placed is pressed again", async () => {
    const h = harness();
    await waitFor(() => expect(h.result.current.screen.kind).toBe("ready"));
    act(() => h.result.current.pick(pending));
    act(() => h.result.current.pick(pending));
    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));
    expect(createUpload).not.toHaveBeenCalled();
    expect(upsert.mock.calls[0][0]).not.toHaveProperty("photoAssetId");
    h.unmount();
  });

  it("asks for a room before a photo and refuses a file it cannot upload", async () => {
    const h = harness();
    await waitFor(() => expect(h.result.current.screen.kind).toBe("ready"));
    act(() => h.result.current.photo(new File(["x"], "a.jpg", {type: "image/jpeg"})));
    expect(h.result.current.draft.notice).toBe(programmeHampersCopy.pickRoom);
    act(() => h.result.current.pick(pending));
    act(() => h.result.current.photo(new File(["x"], "a.pdf", {type: "application/pdf"})));
    expect(h.result.current.draft.notice).toBe(programmeHampersCopy.photoProblem);
    expect(upsert).not.toHaveBeenCalled();
    h.unmount();
  });
});
