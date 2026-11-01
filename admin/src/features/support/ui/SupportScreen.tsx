import {
  CatchButton,
  CatchField,
  CatchGap,
  CatchIndexRow,
  CatchPaneLayout,
  CatchTable,
  CatchText,
  CatchWorkspaceHeader,
  type CatchTableColumn,
} from "@catch/web-ui";
import {useState} from "react";
import type {
  SavedReply,
  SupportDetail,
  SupportSummary,
  SupportView,
} from "../api/supportInboxRepository";
import {
  supportFromLabel,
  supportWaitingLabel,
  supportWaitingTone,
} from "../controllers/supportLabels";
import type {SupportInboxController} from
  "../controllers/useSupportInboxController";

interface SupportRow {
  key: string;
  conversation: {title: string; subtitle: string};
  from: {label: string; tone: "neutral"};
  waiting: {text: string; tone?: "warning"};
}

const columns: CatchTableColumn<SupportRow>[] = [
  {key: "conversation", label: "Conversation", kind: "title"},
  {key: "from", label: "From", kind: "badge", width: "110px"},
  {key: "waiting", label: "Waiting", width: "110px", sort: "desc",
    align: "end"},
];

const channelLabel: Record<SupportSummary["channel"], string> = {
  whatsapp: "WhatsApp", instagram: "Instagram", email: "email",
};

function row(item: SupportSummary, nowMs: number): SupportRow {
  const tone = supportWaitingTone(item.waitingSinceMillis, nowMs);
  return {
    key: item.conversationId,
    conversation: {title: item.subject,
      subtitle: `${item.displayName ?? item.contactLabel} · ` +
        channelLabel[item.channel]},
    from: {label: supportFromLabel(item), tone: "neutral"},
    waiting: {text: supportWaitingLabel(item.waitingSinceMillis, nowMs) ??
      "—", ...(tone ? {tone} : {})},
  };
}

/**
 * Support (board AdminSupport): guest and organizer conversations from
 * WhatsApp, Instagram and logged email, longest waiting first, with the
 * conversation beside them. A reply is recorded here and sent from the
 * channel; the WhatsApp reply trial stays one link away.
 */
export function SupportScreen({
  detailOpen,
  inbox,
  nowMs,
  onOpenTrial,
  onSelect,
  userUid,
}: {
  /** The URL names a conversation; on narrow screens it replaces the list. */
  detailOpen: boolean;
  inbox: SupportInboxController;
  nowMs: number;
  onOpenTrial: () => void;
  onSelect: (conversationId: string) => void;
  userUid: string | null;
}) {
  const counts = inbox.counts;
  const rows = inbox.items.map((item) => row(item, nowMs));
  const audiences = [
    {value: null, label: "All"}, {value: "guest" as const, label: "Guests"},
    {value: "organizer" as const, label: "Organizers"},
  ];
  return (
    <CatchPaneLayout
      detail={inbox.detail ? (
        <ConversationDetail detail={inbox.detail} inbox={inbox} nowMs={nowMs}
          userUid={userUid} />
      ) : undefined}
      detailOpen={detailOpen && inbox.detail !== null}
      main={
        <>
          <CatchWorkspaceHeader
            actions={<CatchButton label="WhatsApp reply trial"
              onPressed={onOpenTrial} size="sm" variant="secondary" />}
            count={counts?.open}
            filters={{chips: audiences.map((chip) => ({label: chip.label,
              selected: inbox.audience === chip.value,
              onPressed: () => inbox.setAudience(chip.value)}))}}
            note="replies within 4 hours"
            title="Support"
            views={{
              items: [
                {value: "open", label: "Open", count: counts?.open},
                {value: "mine", label: "Mine", count: counts?.mine},
                {value: "waitingOnThem", label: "Waiting on them",
                  count: counts?.waitingOnThem},
                {value: "closed", label: "Closed"},
              ],
              value: inbox.view,
              onChanged: (value) => inbox.setView(value as SupportView),
            }}
          />
          {rows.length === 0 ? (
            <CatchText as="p" color="ink2" variant="bodyM">
              {inbox.loadState === "loading" ? "Loading conversations" :
                "No one is waiting."}
            </CatchText>
          ) : (
            <CatchTable
              columns={columns}
              density="compact"
              label="Support conversations"
              onRowPressed={(selected) => onSelect(selected.key)}
              rows={rows}
              selectedKey={inbox.selectedId}
            />
          )}
        </>
      }
      pattern="queue"
    />
  );
}

function Fact({label, value, tone}: {label: string; value: string;
  tone?: "attentionText"}) {
  return (
    <CatchIndexRow title={label} titleVariant="supporting"
      trailing={<CatchText as="span" color={tone ?? "ink"}
        variant="supportingStrong">{value}</CatchText>} />
  );
}

const linkKinds: Record<SupportDetail["conversation"]["links"][number][
  "kind"], string> = {
  booking: "Booking", payment: "Money issue", safetyCase: "Safety case",
};

function timeLabel(ms: number): string {
  return new Date(ms).toLocaleString("en-GB", {day: "numeric",
    month: "short", hour: "numeric", minute: "2-digit",
    timeZone: "Asia/Kolkata"});
}

function ConversationDetail({
  detail,
  inbox,
  nowMs,
  userUid,
}: {
  detail: SupportDetail;
  inbox: SupportInboxController;
  nowMs: number;
  userUid: string | null;
}) {
  const [text, setText] = useState("");
  const [savedReply, setSavedReply] = useState<SavedReply | null>(null);
  const conversation = detail.conversation;
  const name = conversation.displayName ?? conversation.contactLabel;
  const waiting = supportWaitingLabel(conversation.waitingSinceMillis, nowMs);
  const busy = inbox.isSaving;
  const send = async (kind: "reply" | "note") => {
    const done = kind === "reply" ?
      await inbox.reply(text, savedReply?.replyId ?? null) :
      await inbox.addNote(text);
    if (done) {
      setText("");
      setSavedReply(null);
    }
  };
  return (
    <>
      <CatchWorkspaceHeader kicker="Support" title={conversation.subject} />
      <CatchGap size="section">
        <CatchGap size="related">
          <Fact label={supportFromLabel(conversation)} value={name} />
          <Fact label="Channel" value={`${channelLabel[conversation.channel]}` +
            ` · ${conversation.contactAddress}`} />
          <Fact label="Waiting" tone={supportWaitingTone(
            conversation.waitingSinceMillis, nowMs) ? "attentionText" :
            undefined} value={waiting ?? "Not waiting"} />
          <Fact label="Owner" value={conversation.ownerUid === userUid &&
            userUid ? "You" : conversation.ownerUid ?? "No one yet"} />
          {conversation.links.map((link) => (
            <Fact key={link.path} label={linkKinds[link.kind]}
              value={link.label} />
          ))}
        </CatchGap>
        <CatchGap size="related">
          <CatchText as="h2" variant="sectionTitle">Conversation</CatchText>
          {detail.messages.map((message) => (
            <CatchIndexRow
              key={message.messageId}
              subtitle={`${message.direction === "inbound" ? name :
                message.direction === "note" ? "Note for the team" :
                  "Reply"} · ${timeLabel(message.atMillis)}`}
              title={message.text}
              titleMaxLines={6}
              titleVariant="bodyM"
            />
          ))}
        </CatchGap>
        <CatchGap size="related">
          <CatchText as="h2" variant="sectionTitle">Reply</CatchText>
          {inbox.savedReplies.length > 0 ? (
            <CatchField<SavedReply>
              hintText="Start from a saved reply"
              itemLabelBuilder={(reply) => reply.title}
              itemValueBuilder={(reply) => reply.replyId}
              onChanged={(reply) => {
                setSavedReply(reply);
                if (reply) setText(reply.body);
              }}
              recipe="select"
              title="Saved replies"
              value={savedReply}
              values={inbox.savedReplies}
            />
          ) : null}
          <CatchField
            helperText={`Send it from ${channelLabel[conversation.channel]}` +
              ", then record it here."}
            maxLength={4000}
            maxLines={5}
            onChanged={setText}
            recipe="input"
            title={`Reply to ${name}`}
            value={text}
          />
          <CatchGap direction="horizontal" size="related" wrap>
            <CatchButton label="Record reply"
              onPressed={text.trim() && !busy ? () => void send("reply") :
                null} size="sm" />
            <CatchButton label="Add a note"
              onPressed={text.trim() && !busy ? () => void send("note") :
                null} size="sm" variant="secondary" />
            {conversation.ownerUid !== userUid && userUid ? (
              <CatchButton label="Take it"
                onPressed={busy ? null : () => void inbox.assign(userUid)}
                size="sm" variant="secondary" />
            ) : null}
            {conversation.status !== "closed" ? (
              <CatchButton label="Close"
                onPressed={busy ? null : () => void inbox.setStatus("closed")}
                size="sm" variant="secondary" />
            ) : (
              <CatchButton label="Reopen"
                onPressed={busy ? null : () => void inbox.setStatus("open")}
                size="sm" variant="secondary" />
            )}
          </CatchGap>
        </CatchGap>
      </CatchGap>
    </>
  );
}
