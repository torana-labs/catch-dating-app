import type {SupportInboxController} from "../features/support/controllers/useSupportInboxController";
import {SupportScreen} from "../features/support/ui/SupportScreen";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {noop} from "./adminRouteStoryKit";

const meta = {
  title: "Admin Dashboard/Routes",
  parameters: {
    catchComponentRegistry: {
      path: "design/admin/components.json",
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const storySupportInbox: SupportInboxController = {
  view: "open", audience: null,
  items: [
    {conversationId: `whatsapp-${"a1".padEnd(64, "0")}`, channel: "whatsapp", contactLabel: "+91 ••••• 01234",
      displayName: "Rhea Kapoor", audience: "guest", subject: "I paid but have no ticket", status: "open", ownerUid: null,
      waitingSinceMillis: Date.parse("2026-11-01T10:00:00Z"), lastMessageAtMillis: Date.parse("2026-11-01T10:00:00Z"),
      lastMessagePreview: "I paid but have no ticket", linkCount: 1},
    {conversationId: `whatsapp-${"a4".padEnd(64, "0")}`, channel: "whatsapp", contactLabel: "+91 ••••• 99881",
      displayName: "Meher Bhatt", audience: "organizer", subject: "A payout is not showing in Razorpay", status: "open",
      ownerUid: "sample-owner", waitingSinceMillis: Date.parse("2026-10-31T10:00:00Z"),
      lastMessageAtMillis: Date.parse("2026-10-31T10:00:00Z"), lastMessagePreview: "Last week's payout", linkCount: 0},
  ],
  counts: {open: 2, mine: 1, waitingOnThem: 1},
  selectedId: `whatsapp-${"a1".padEnd(64, "0")}`,
  detail: {
    conversation: {conversationId: `whatsapp-${"a1".padEnd(64, "0")}`, channel: "whatsapp", contactLabel: "+91 ••••• 01234",
      displayName: "Rhea Kapoor", audience: "guest", subject: "I paid but have no ticket", status: "open", ownerUid: null,
      waitingSinceMillis: Date.parse("2026-11-01T10:00:00Z"), lastMessageAtMillis: Date.parse("2026-11-01T10:00:00Z"),
      lastMessagePreview: "I paid but have no ticket", linkCount: 1, contactAddress: "+919800001234", uid: "user_204",
      organizerId: null, links: [{kind: "payment", path: "publicEventPayments/sample-pay-rhea", label: "₹1,500 captured, no booking"}]},
    messages: [{messageId: "m1", direction: "inbound", text: "Hi, I paid ₹1,500 for Takeoff on Saturday but I have no ticket.",
      authorUid: null, atMillis: Date.parse("2026-11-01T10:00:00Z"), deliveryState: "received"}],
  },
  savedReplies: [{replyId: "sample-reply-looking", title: "Looking into it",
    body: "Sorry about that. I'm looking at it now and will reply here.", active: true, updatedAtMillis: 0}],
  loadState: "ready", detailState: "ready", isSaving: false,
  setView: noop, setAudience: noop, select: noop,
  reply: async () => true, addNote: async () => true, logEmail: async () => true,
  assign: async () => true, setStatus: async () => true, setLinks: async () => true, saveReply: async () => true,
};

export const SupportRouteStory: Story = {
  name: "Support",
  parameters: {
    catchComponent: {id: "route_support", states: ["open-conversations", "conversation"]},
  },
  render: () => (
    <SupportScreen detailOpen inbox={storySupportInbox} nowMs={Date.parse("2026-11-01T12:00:00Z")}
      onOpenTrial={noop} onSelect={noop} userUid="sample-owner" />
  ),
};
