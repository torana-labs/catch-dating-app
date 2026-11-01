import type {AdminListSupportConversationsCallablePayload} from
  "../../generated/contracts/adminListSupportConversationsCallablePayload";
import type {AdminListSupportConversationsCallableResponse} from
  "../../generated/contracts/adminListSupportConversationsCallableResponse";
import type {AdminGetSupportConversationCallablePayload} from
  "../../generated/contracts/adminGetSupportConversationCallablePayload";
import type {AdminGetSupportConversationCallableResponse} from
  "../../generated/contracts/adminGetSupportConversationCallableResponse";
import type {AdminUpdateSupportConversationCallablePayload} from
  "../../generated/contracts/adminUpdateSupportConversationCallablePayload";
import type {AdminUpdateSupportConversationCallableResponse} from
  "../../generated/contracts/adminUpdateSupportConversationCallableResponse";
import type {AdminRecordSupportMessageCallablePayload} from
  "../../generated/contracts/adminRecordSupportMessageCallablePayload";
import type {AdminRecordSupportMessageCallableResponse} from
  "../../generated/contracts/adminRecordSupportMessageCallableResponse";
import type {AdminListSupportSavedRepliesCallableResponse} from
  "../../generated/contracts/adminListSupportSavedRepliesCallableResponse";
import type {AdminUpsertSupportSavedReplyCallablePayload} from
  "../../generated/contracts/adminUpsertSupportSavedReplyCallablePayload";
import type {AdminUpsertSupportSavedReplyCallableResponse} from
  "../../generated/contracts/adminUpsertSupportSavedReplyCallableResponse";

/**
 * Sample-mode stand-ins for the Support inbox (board AdminSupport). State
 * lives in memory so a recorded reply moves a conversation to "waiting on
 * them", as it does live.
 */

type Detail = AdminGetSupportConversationCallableResponse;
type Conversation = Detail["conversation"];
type Message = Detail["messages"][number];
type SavedReply = AdminListSupportSavedRepliesCallableResponse["items"][
  number];

const HOUR = 3600_000;
const sampleNow = Date.parse("2026-11-01T12:00:00.000Z");
const sampleUid = "sample-owner";
const id = (seed: string) => `whatsapp-${seed.padEnd(64, "0")}`;

function conversation(overrides: Partial<Conversation> &
  Pick<Conversation, "conversationId" | "displayName" | "subject" |
  "audience">): Conversation {
  return {
    channel: "whatsapp",
    contactLabel: "+91 ••••• 01234",
    contactAddress: "+919800001234",
    status: "open",
    ownerUid: null,
    waitingSinceMillis: sampleNow - 2 * HOUR,
    lastMessageAtMillis: sampleNow - 2 * HOUR,
    lastMessagePreview: overrides.subject,
    linkCount: overrides.links?.length ?? 0,
    uid: null,
    organizerId: null,
    links: [],
    ...overrides,
  };
}

interface Thread {conversation: Conversation; messages: Message[]}

function inbound(messageId: string, text: string, atMillis: number):
  Message {
  return {messageId, direction: "inbound", text, authorUid: null, atMillis,
    deliveryState: "received"};
}

const seedThreads = (): Thread[] => [
  {conversation: conversation({conversationId: id("a1"),
    displayName: "Rhea Kapoor", subject: "I paid but have no ticket",
    audience: "guest", uid: "user_204",
    waitingSinceMillis: sampleNow - 2 * HOUR,
    links: [{kind: "payment", path: "publicEventPayments/sample-pay-rhea",
      label: "₹1,500 captured, no booking"}]}),
  messages: [inbound("m1", "Hi, I paid ₹1,500 for Takeoff on Saturday but " +
    "I have no ticket. Money is gone from my account.",
  sampleNow - 2 * HOUR)]},
  {conversation: conversation({conversationId: id("a2"),
    displayName: "Kabir Shah", subject: "Refund for a cancelled run",
    audience: "guest", contactLabel: "+91 ••••• 33410",
    contactAddress: "+919800033410",
    waitingSinceMillis: sampleNow - 5 * HOUR,
    lastMessageAtMillis: sampleNow - 5 * HOUR}),
  messages: [inbound("m2", "The Sunday run was cancelled. When do I get " +
    "my money back?", sampleNow - 5 * HOUR)]},
  {conversation: conversation({conversationId: `email-${"b3".padEnd(64,
    "0")}`, channel: "email", displayName: "Ishaan Bose",
    subject: "The sign-in code never arrives", audience: "unknown",
    contactLabel: "i•••@example.com", contactAddress: "ishaan@example.com",
    waitingSinceMillis: sampleNow - 24 * HOUR,
    lastMessageAtMillis: sampleNow - 24 * HOUR}),
  messages: [inbound("m3", "The sign-in code never arrives on my phone.",
    sampleNow - 24 * HOUR)]},
  {conversation: conversation({conversationId: id("a4"),
    displayName: "Meher Bhatt", subject: "A payout is not showing in " +
      "Razorpay", audience: "organizer", organizerId: "lantern",
    contactLabel: "+91 ••••• 99881", contactAddress: "+919800099881",
    ownerUid: sampleUid, waitingSinceMillis: sampleNow - 26 * HOUR,
    lastMessageAtMillis: sampleNow - 26 * HOUR}),
  messages: [inbound("m4", "Last week's payout isn't in Razorpay yet.",
    sampleNow - 26 * HOUR)]},
  {conversation: conversation({conversationId: id("a5"),
    displayName: "Kunal Rao", subject: "How do I add a co-host?",
    audience: "organizer", organizerId: "padel",
    contactLabel: "+91 ••••• 77120", contactAddress: "+919800077120",
    status: "waitingOnThem", waitingSinceMillis: null,
    lastMessageAtMillis: sampleNow - 48 * HOUR}),
  messages: [
    inbound("m5", "How do I add a co-host?", sampleNow - 50 * HOUR),
    {messageId: "m6", direction: "outbound", text: "Open your page, then " +
      "Team, then Invite. Want me to add them for you?",
    authorUid: sampleUid, atMillis: sampleNow - 48 * HOUR,
    deliveryState: "recorded"}]},
];

const seedReplies = (): SavedReply[] => [
  {replyId: "sample-reply-refund", title: "Refund timing",
    body: "Refunds reach your account in 5 to 7 working days.",
    active: true, updatedAtMillis: sampleNow - 10 * 24 * HOUR},
  {replyId: "sample-reply-looking", title: "Looking into it",
    body: "Sorry about that. I'm looking at it now and will reply here.",
    active: true, updatedAtMillis: sampleNow - 10 * 24 * HOUR},
];

let threads = seedThreads();
let replies = seedReplies();
let counter = 0;

/** Restores the seed state between tests and stories. */
export function resetSampleSupport(): void {
  threads = seedThreads();
  replies = seedReplies();
  counter = 0;
}

function summary(item: Conversation) {
  const {contactAddress: _address, uid: _uid, organizerId: _organizer,
    links, ...rest} = item;
  return {...rest, linkCount: links.length};
}

export function sampleListSupportConversations(
  payload: AdminListSupportConversationsCallablePayload
): AdminListSupportConversationsCallableResponse {
  const all = threads.map((thread) => thread.conversation);
  const open = all.filter((item) => item.status === "open");
  const mine = open.filter((item) => item.ownerUid === sampleUid);
  const waiting = all.filter((item) => item.status === "waitingOnThem");
  let items = payload.view === "open" ? open : payload.view === "mine" ?
    mine : payload.view === "waitingOnThem" ? waiting :
      all.filter((item) => item.status === "closed");
  if (payload.audience) {
    items = items.filter((item) => item.audience === payload.audience);
  }
  const waitingFirst = payload.view === "open" || payload.view === "mine";
  items = [...items].sort((a, b) => waitingFirst ?
    (a.waitingSinceMillis ?? Infinity) - (b.waitingSinceMillis ?? Infinity) :
    b.lastMessageAtMillis - a.lastMessageAtMillis);
  return {
    items: items.slice(0, payload.limit).map(summary),
    counts: {open: open.length, mine: mine.length,
      waitingOnThem: waiting.length},
  };
}

function thread(conversationId: string): Thread {
  const found = threads.find((item) =>
    item.conversation.conversationId === conversationId);
  if (!found) throw new Error("Conversation not found.");
  return found;
}

export function sampleGetSupportConversation(
  payload: AdminGetSupportConversationCallablePayload
): AdminGetSupportConversationCallableResponse {
  const found = thread(payload.conversationId);
  return {conversation: {...found.conversation},
    messages: [...found.messages]};
}

export function sampleUpdateSupportConversation(
  payload: AdminUpdateSupportConversationCallablePayload
): AdminUpdateSupportConversationCallableResponse {
  const found = thread(payload.conversationId);
  found.conversation = {...found.conversation, ownerUid: payload.ownerUid,
    status: payload.status, links: payload.links,
    linkCount: payload.links.length,
    waitingSinceMillis: payload.status === "closed" ? null :
      found.conversation.waitingSinceMillis};
  return {conversationId: payload.conversationId, status: payload.status,
    ownerUid: payload.ownerUid, linkCount: payload.links.length};
}

export function sampleRecordSupportMessage(
  payload: AdminRecordSupportMessageCallablePayload
): AdminRecordSupportMessageCallableResponse {
  counter += 1;
  const messageId = `sample-msg-${counter}`;
  let found = payload.conversationId ?
    thread(payload.conversationId) : null;
  if (!found) {
    const address = (payload.contactAddress ?? "").trim().toLowerCase();
    found = {conversation: conversation({
      conversationId: `email-${String(counter).padStart(64, "0")}`,
      channel: "email", displayName: payload.displayName,
      subject: payload.text.slice(0, 160), audience: "unknown",
      contactAddress: address, contactLabel: `${address.slice(0, 1)}•••@` +
        `${address.split("@")[1] ?? ""}`,
      waitingSinceMillis: sampleNow, lastMessageAtMillis: sampleNow}),
    messages: []};
    threads = [found, ...threads];
  }
  found.messages = [...found.messages, {messageId,
    direction: payload.direction, text: payload.text,
    authorUid: payload.direction === "inbound" ? null : sampleUid,
    atMillis: sampleNow, deliveryState: payload.direction === "inbound" ?
      "received" : "recorded"}];
  if (payload.direction === "outbound") {
    found.conversation = {...found.conversation, status: "waitingOnThem",
      waitingSinceMillis: null, lastMessageAtMillis: sampleNow,
      lastMessagePreview: payload.text.slice(0, 160)};
  }
  return {conversationId: found.conversation.conversationId, messageId};
}

export function sampleListSupportSavedReplies():
  AdminListSupportSavedRepliesCallableResponse {
  return {items: [...replies].sort((a, b) => a.title.localeCompare(b.title))};
}

export function sampleUpsertSupportSavedReply(
  payload: AdminUpsertSupportSavedReplyCallablePayload
): AdminUpsertSupportSavedReplyCallableResponse {
  counter += 1;
  const replyId = payload.replyId ?? `sample-reply-${counter}`;
  replies = [...replies.filter((item) => item.replyId !== replyId), {
    replyId, title: payload.title, body: payload.body,
    active: payload.active, updatedAtMillis: sampleNow}];
  return {replyId};
}
