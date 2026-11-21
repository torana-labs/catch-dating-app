import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {AdminPendingOperationProvider} from
  "../../../shared/pendingOperation";
import type {
  SupportDetail,
  SupportReplyState,
} from "../api/supportInboxRepository";
import {SupportRouteScreen} from "./SupportRouteScreen";

const conversationId = `whatsapp-${"b1".padEnd(64, "0")}`;
const now = Date.parse("2026-11-21T09:00:00.000Z");
const state: {reply: SupportReplyState;
  messages: SupportDetail["messages"]} = {
  reply: {mode: "send", canSend: true, blockedReason: null,
    windowClosesAtMillis: now + 20 * 3600_000},
  messages: [],
};
const send = vi.fn();

function detail(): SupportDetail {
  return {
    conversation: {conversationId, channel: "whatsapp",
      contactLabel: "+91 ••••• 04321", displayName: "Asha Rao",
      audience: "guest", subject: "Where is my ticket?", status: "open",
      ownerUid: null, waitingSinceMillis: now - 3600_000,
      lastMessageAtMillis: now - 3600_000,
      lastMessagePreview: "Where is my ticket?", linkCount: 0,
      contactAddress: "+919800004321", uid: null, organizerId: null,
      links: [], reply: state.reply},
    messages: state.messages,
  };
}

vi.mock("../api/supportInboxRepository", () => ({
  loadSupportConversations: async () => ({items: [{conversationId,
    channel: "whatsapp", contactLabel: "+91 ••••• 04321",
    displayName: "Asha Rao", audience: "guest",
    subject: "Where is my ticket?", status: "open", ownerUid: null,
    waitingSinceMillis: now - 3600_000, lastMessageAtMillis: now - 3600_000,
    lastMessagePreview: "Where is my ticket?", linkCount: 0}],
  counts: {open: 1, mine: 0, waitingOnThem: 0}}),
  loadSupportConversation: async () => detail(),
  loadSavedReplies: async () => [],
  saveSupportConversation: vi.fn(),
  saveSupportMessage: vi.fn(),
  saveSavedReply: vi.fn(),
  sendSupportReply: (payload: unknown) => send(payload),
}));

vi.mock("../api/adMatchingOptOutRepository", () => ({
  manageAdMatchingOptOut: vi.fn(),
}));

function mount() {
  const onError = vi.fn();
  const onNotice = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({defaultOptions:
      {queries: {retry: false}, mutations: {retry: false}}})}>
      <AdminPendingOperationProvider>
        <SupportRouteScreen conversationId={conversationId} onError={onError}
          onNavigate={vi.fn()} onNotice={onNotice} userUid="ops-1" />
      </AdminPendingOperationProvider>
    </QueryClientProvider>
  );
  return {onError, onNotice};
}

describe("Support WhatsApp replies", () => {
  beforeEach(() => {
    send.mockReset();
    state.reply = {mode: "send", canSend: true, blockedReason: null,
      windowClosesAtMillis: now + 20 * 3600_000};
    state.messages = [{messageId: "m1", direction: "inbound",
      text: "[voice note]", authorUid: null, atMillis: now - 3600_000,
      deliveryState: "received"}];
  });
  afterEach(cleanup);

  it("sends from Catch's number and shows the delivery state", async () => {
    send.mockImplementation(async () => {
      state.messages = [...state.messages, {messageId: "cwsupport_x",
        direction: "outbound", text: "Checking now.", authorUid: "ops-1",
        atMillis: now, deliveryState: "delivered"}];
      return {operationId: `cwsupport_${"0".repeat(64)}`,
        providerMessageId: "wamid.1", deliveryStatus: "accepted",
        replayed: false};
    });
    const {onNotice} = mount();
    await screen.findByText("[voice note]");
    expect(screen.queryByRole("button", {name: "Record reply"})).toBeNull();
    expect(screen.getByText(/Sends from Catch's WhatsApp number/u))
      .toBeTruthy();
    fireEvent.change(screen.getByLabelText("Reply to Asha Rao"),
      {target: {value: " Checking now. "}});
    fireEvent.click(screen.getByRole("button", {name: "Send reply"}));
    await waitFor(() => expect(onNotice).toHaveBeenCalledWith("Reply sent."));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      conversationId, body: "Checking now.", savedReplyId: null,
      clientRequestId: expect.stringMatching(/^[A-Za-z0-9_-]{8,64}$/u)}));
    await screen.findByText(/Delivered/u);
  });

  it("keeps the request id after a lost answer and renews it after a " +
    "refusal", async () => {
    send.mockRejectedValueOnce(Object.assign(new Error("Network lost"),
      {code: "functions/unavailable"}));
    send.mockRejectedValueOnce(Object.assign(new Error(
      "WhatsApp refused the reply, so it was not sent."),
    {code: "functions/failed-precondition"}));
    send.mockResolvedValue({operationId: `cwsupport_${"0".repeat(64)}`,
      providerMessageId: "wamid.1", deliveryStatus: "accepted",
      replayed: false});
    const {onError} = mount();
    await screen.findByText("[voice note]");
    fireEvent.change(screen.getByLabelText("Reply to Asha Rao"),
      {target: {value: "Checking now."}});
    const press = async (calls: number) => {
      fireEvent.click(screen.getByRole("button", {name: "Send reply"}));
      await waitFor(() => expect(send).toHaveBeenCalledTimes(calls));
    };
    const ready = () => waitFor(() => expect(screen.getByRole("button",
      {name: "Send reply"}).hasAttribute("disabled")).toBe(false));
    await press(1);
    await ready();
    await press(2);
    await ready();
    await press(3);
    // Sent: the draft clears.
    await waitFor(() => expect((screen.getByLabelText("Reply to Asha Rao") as
      HTMLInputElement).value).toBe(""));
    const ids = send.mock.calls.map(([payload]) =>
      (payload as {clientRequestId: string}).clientRequestId);
    expect(ids[1]).toBe(ids[0]);
    expect(ids[2]).not.toBe(ids[1]);
    expect(onError).toHaveBeenCalledWith(
      "WhatsApp refused the reply, so it was not sent.");
  });

  it("explains a closed window and does not offer sending", async () => {
    state.reply = {mode: "send", canSend: false,
      blockedReason: "windowClosed", windowClosesAtMillis: now - 3600_000};
    mount();
    await screen.findByText(/within 24 hours of their last message/u);
    fireEvent.change(screen.getByLabelText("Reply to Asha Rao"),
      {target: {value: "Hello"}});
    expect(screen.getByRole("button", {name: "Send reply"})
      .hasAttribute("disabled")).toBe(true);
  });

  it("records instead while sending is switched off", async () => {
    state.reply = {mode: "record", canSend: false,
      blockedReason: "switchedOff", windowClosesAtMillis: null};
    mount();
    await screen.findByText(/Sending from Catch's WhatsApp number is off/u);
    expect(screen.getByRole("button", {name: "Record reply"})).toBeTruthy();
    expect(screen.queryByRole("button", {name: "Send reply"})).toBeNull();
  });
});
