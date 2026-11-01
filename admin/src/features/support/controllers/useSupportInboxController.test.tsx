import {act, renderHook, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {resetSampleSupport} from "../../../shared/api/sampleSupport";
import {useSupportInboxController} from "./useSupportInboxController";
import {
  supportFromLabel,
  supportWaitingLabel,
  supportWaitingTone,
} from "./supportLabels";

describe("useSupportInboxController", () => {
  beforeEach(() => resetSampleSupport());

  it("lists open conversations longest waiting first", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useSupportInboxController({
      onError: vi.fn(), onNotice: vi.fn()}), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    expect(result.current.items.map((item) => item.displayName)).toEqual([
      "Meher Bhatt", "Ishaan Bose", "Kabir Shah", "Rhea Kapoor"]);
    expect(result.current.counts).toEqual(
      {open: 4, mine: 1, waitingOnThem: 1});
    act(() => result.current.setAudience("organizer"));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    await waitFor(() => expect(result.current.detailState).toBe("ready"));
    expect(result.current.savedReplies.map((reply) => reply.title))
      .toEqual(["Looking into it", "Refund timing"]);
  });

  it("records a reply, which moves the conversation to waiting on them",
    async () => {
      const {wrapper} = createQueryHarness();
      const onNotice = vi.fn();
      const {result} = renderHook(() => useSupportInboxController({
        onError: vi.fn(), onNotice}), {wrapper});
      await waitFor(() => expect(result.current.loadState).toBe("ready"));
      act(() => result.current.select(result.current.items[3]
        .conversationId));
      await waitFor(() => expect(result.current.detail?.conversation
        .displayName).toBe("Rhea Kapoor"));
      expect(result.current.detail?.conversation.links[0].kind)
        .toBe("payment");
      await act(async () => {
        expect(await result.current.reply("Looking at it now.")).toBe(true);
      });
      await waitFor(() => expect(result.current.counts?.waitingOnThem)
        .toBe(2));
      expect(onNotice).toHaveBeenCalledWith("Reply recorded.");
    });

  it("logs an email as a new conversation and refuses a bad address",
    async () => {
      const {wrapper} = createQueryHarness();
      const onError = vi.fn();
      const {result} = renderHook(() => useSupportInboxController({
        onError, onNotice: vi.fn()}), {wrapper});
      await waitFor(() => expect(result.current.loadState).toBe("ready"));
      await act(async () => {
        expect(await result.current.logEmail({address: "nope",
          displayName: null, text: "Hi"})).toBe(false);
      });
      expect(onError).toHaveBeenCalledWith(
        "Enter the email address it came from.");
      await act(async () => {
        expect(await result.current.logEmail({address: "tara@example.com",
          displayName: "Tara K.", text: "Can I bring a friend?"}))
          .toBe(true);
      });
      await waitFor(() => expect(result.current.counts?.open).toBe(5));
    });
});

describe("support labels", () => {
  it("words the wait as the board does", () => {
    const now = Date.parse("2026-11-01T12:00:00.000Z");
    expect(supportWaitingLabel(now - 2 * 3600_000, now)).toBe("2 hours");
    expect(supportWaitingLabel(now - 26 * 3600_000, now)).toBe("1 day");
    expect(supportWaitingLabel(null, now)).toBeNull();
    expect(supportWaitingTone(now - 5 * 3600_000, now)).toBe("warning");
    expect(supportWaitingTone(now - 3600_000, now)).toBeNull();
    expect(supportFromLabel({audience: "organizer"})).toBe("Organizer");
  });
});
