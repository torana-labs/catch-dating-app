import {
  CatchBadge,
  CatchButton,
  CatchChoiceInput,
  CatchFilePickerButton,
  CatchIcon,
  CatchIndexRow,
  CatchStack,
  CatchSurface,
  CatchText,
} from "@catch/web-ui";
import {programmeGuestIdsCopy as copy} from "../../content/programmes";
import {ProgrammeLinkFrame, ProgrammePrivacyNote} from "./ProgrammeLinkFrame";
import {PROGRAMME_UPLOAD_TYPES, type ProgrammeLinkCredential, type ProgrammeLinkScreen} from "./programmeLinkModel";
import {
  guestIdKinds,
  guestIdNeeded,
  useProgrammeGuestIdsController,
  type GuestIdDraft,
  type GuestIdKind,
  type GuestIdMember,
  type GuestIdStatusView,
} from "./useProgrammeGuestIdsController";

export function ProgrammeGuestIdsPage({credential}: {credential: ProgrammeLinkCredential | null}) {
  const controller = useProgrammeGuestIdsController(credential);
  return <ProgrammeGuestIdsView {...controller} />;
}

const statusLine: Record<GuestIdMember["status"], string> = {
  missing: copy.statusMissing,
  submitted: copy.statusSubmitted,
  accepted: copy.statusAccepted,
  askedAgain: copy.statusAskedAgain,
};

const accept = PROGRAMME_UPLOAD_TYPES.join(",");

/**
 * The household's IDs for the hotel (web only, no app), drawn as the
 * RbProgIdGuest board: the kicker, title and lead, who sees the IDs and for
 * how long, a tile per member with Added or Add, and the open member's kind
 * of ID, front and back photos and Save. The read gives names and status
 * only; the photos go straight to a signed upload.
 */
export function ProgrammeGuestIdsView({screen, refresh, refreshing, draft, open, setKind, choose, save}: {
  screen: ProgrammeLinkScreen<GuestIdStatusView>;
  refresh: () => void;
  refreshing: boolean;
  draft: GuestIdDraft;
  open: (guestId: string) => void;
  setKind: (kind: GuestIdKind) => void;
  choose: (side: "front" | "back", file: File | null) => void;
  save: () => void;
}) {
  return (
    <ProgrammeLinkFrame refresh={refresh} refreshing={refreshing} screen={screen}
      title={screen.kind === "ready" ? screen.view.programTitle : null}>
      {(view) => (
        <>
          <CatchStack gap={6}>
            <CatchText tone="secondary" variant="label-kicker">{view.householdLabel}</CatchText>
            <CatchText as="h1" variant="page-title">{copy.title}</CatchText>
            <CatchText tone="secondary" variant="body">{copy.lead}</CatchText>
          </CatchStack>
          <ProgrammePrivacyNote>{copy.privacy}</ProgrammePrivacyNote>
          {view.members.map((member) => member.guestId === draft.guestId ? (
            <MemberEditor choose={choose} draft={draft} key={member.guestId} member={member} save={save} setKind={setKind} />
          ) : (
            <CatchSurface block="tile" key={member.guestId} padding="sm">
              <CatchIndexRow density="compact" subtitle={statusLine[member.status]} title={member.displayName}
                trailing={<MemberBadge member={member} />} wrap />
              {draft.pending ? null : (
                <CatchStack align="start">
                  <CatchButton label={guestIdNeeded(member) ? copy.add : copy.replace(member.displayName)}
                    onPressed={() => open(member.guestId)} size="sm" variant="quiet" />
                </CatchStack>
              )}
            </CatchSurface>
          ))}
          <CatchText role="status" tone="secondary" variant="body-small">{draft.notice}</CatchText>
        </>
      )}
    </ProgrammeLinkFrame>
  );
}

function MemberBadge({member}: {member: GuestIdMember}) {
  return guestIdNeeded(member)
    ? <CatchBadge label={copy.add} tone="warning" />
    : <CatchBadge icon={<CatchIcon name="check" size={16} />} label={copy.added} tone="success" />;
}

/** The open member's tile: the kind of ID, the front and back, the help line and Save. */
function MemberEditor({member, draft, setKind, choose, save}: {
  member: GuestIdMember;
  draft: GuestIdDraft;
  setKind: (kind: GuestIdKind) => void;
  choose: (side: "front" | "back", file: File | null) => void;
  save: () => void;
}) {
  const disabled = draft.pending;
  return (
    <CatchSurface aria-label={member.displayName} as="section" block="tile">
      <CatchIndexRow density="compact" subtitle={statusLine[member.status]} title={member.displayName}
        trailing={<MemberBadge member={member} />} wrap />
      <CatchStack gap={6}>
        <CatchText tone="secondary" variant="label-action">{copy.kindLabel}</CatchText>
        <CatchChoiceInput<GuestIdKind>
          onChanged={disabled ? null : setKind}
          options={guestIdKinds.map((kind) => ({value: kind, label: copy.kinds[kind]}))}
          recipe="segmented"
          selected={draft.kind}
        />
      </CatchStack>
      <CatchStack direction="row" equal gap={8}>
        <CatchFilePickerButton accept={accept} label={draft.front ? copy.chosen(copy.front) : copy.front}
          leading={<CatchIcon name={draft.front ? "check" : "addPhoto"} />}
          onChanged={disabled ? null : (file) => choose("front", file)}
          semanticsLabel={copy.chooseFront(member.displayName)} variant="secondary" />
        <CatchFilePickerButton accept={accept} label={draft.back ? copy.chosen(copy.back) : copy.back}
          leading={<CatchIcon name={draft.back ? "check" : "addPhoto"} />}
          onChanged={disabled ? null : (file) => choose("back", file)}
          semanticsLabel={copy.chooseBack(member.displayName)} variant="secondary" />
      </CatchStack>
      <CatchText tone="secondary" variant="body-small">{copy.help}</CatchText>
      <CatchButton fill label={disabled ? copy.saving : copy.save(member.displayName)}
        onPressed={disabled || !draft.front ? null : save} status={disabled ? "loading" : "idle"} />
    </CatchSurface>
  );
}
