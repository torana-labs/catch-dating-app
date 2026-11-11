import {
  CatchBadge,
  CatchDock,
  CatchFilePickerButton,
  CatchIcon,
  CatchIndexRow,
  CatchMeter,
  CatchPhotoTile,
  CatchSection,
  CatchStack,
  CatchText,
} from "@catch/web-ui";
import {programmeHampersCopy as copy} from "../../content/programmes";
import {ProgrammeLinkFrame} from "./ProgrammeLinkFrame";
import {programmeTime, type ProgrammeLinkCredential, type ProgrammeLinkScreen} from "./programmeLinkModel";
import {
  HAMPER_PHOTO_TYPES,
  useProgrammeHampersController,
  type HamperRoom,
  type HampersDraft,
  type HampersView,
} from "./useProgrammeHampersController";

export function ProgrammeHampersPage({credential}: {credential: ProgrammeLinkCredential | null}) {
  const controller = useProgrammeHampersController(credential);
  return <ProgrammeHampersView {...controller} />;
}

/**
 * The porters' welcome hampers (web link), drawn as the RbProgHampers board:
 * rooms done over a meter, a row per room with Done or Placed, the photos
 * shared with the planner, and the dock's Placed · take a photo for the
 * picked room. Room labels and guest counts only: the read has no names.
 */
export function ProgrammeHampersView({screen, refresh, refreshing, draft, pick, photo}: {
  screen: ProgrammeLinkScreen<HampersView>;
  refresh: () => void;
  refreshing: boolean;
  draft: HampersDraft;
  pick: (room: HamperRoom) => void;
  photo: (file: File | null) => void;
}) {
  return (
    <ProgrammeLinkFrame
      branding={screen.kind === "ready" ? screen.view.branding : undefined}
      refresh={refresh} refreshing={refreshing} screen={screen} title={copy.title}>
      {(view) => {
        const photos = view.rooms.filter((room) => room.photoUrl);
        const picked = view.rooms.find((room) => room.stayId === draft.stayId) ?? null;
        return (
          <>
            <CatchStack gap={8}>
              <CatchText tone="secondary" variant="label-kicker">{view.hotelName}</CatchText>
              <CatchText as="h1" variant="page-title">{copy.done(view.counts.placed, view.counts.rooms)}</CatchText>
              <CatchMeter label={copy.meter} max={Math.max(view.counts.rooms, 1)} thickness={6} value={view.counts.placed} />
            </CatchStack>
            <CatchSection>
              {view.rooms.map((room) => (
                <CatchIndexRow
                  action={room.status === "placed" || draft.pending ? undefined :
                    {label: copy.placed, onPressed: () => pick(room), variant: "primary"}}
                  density="compact"
                  key={room.roomKey}
                  meta={room.status === "placed" && room.placedAtMillis !== null ?
                    copy.placedAt(programmeTime(room.placedAtMillis), room.photoUrl !== null) : copy.notYet}
                  selected={room.stayId === draft.stayId}
                  subtitle={copy.guests(room.guestCount)}
                  title={copy.room(room.roomLabel)}
                  trailing={room.status === "placed" ?
                    <CatchBadge icon={<CatchIcon name="check" size={16} />} label={copy.doneBadge} tone="success" /> : undefined}
                  wrap
                />
              ))}
            </CatchSection>
            {photos.length > 0 ? (
              <CatchSection dividers="none" note={copy.photosNote} title={copy.photos}>
                <CatchStack direction="row" equal gap={8} wrap>
                  {photos.map((room) => (
                    <CatchPhotoTile imageAlt={copy.photoAlt(copy.room(room.roomLabel))} imageUrl={room.photoUrl}
                      key={room.roomKey} title={copy.room(room.roomLabel)} />
                  ))}
                </CatchStack>
              </CatchSection>
            ) : null}
            <CatchText role="status" tone="secondary" variant="body-small">{draft.notice}</CatchText>
            <CatchDock>
              <CatchStack gap={8}>
                {picked ? <CatchText variant="label-action">{copy.selected(copy.room(picked.roomLabel))}</CatchText> : null}
                <CatchFilePickerButton accept={HAMPER_PHOTO_TYPES.join(",")} label={draft.pending ? copy.saving : copy.takePhoto}
                  leading={<CatchIcon name="addPhoto" />} onChanged={draft.pending || !picked ? null : photo}
                  semanticsLabel={picked && !draft.pending ? copy.takePhotoFor(copy.room(picked.roomLabel)) : undefined} />
              </CatchStack>
            </CatchDock>
          </>
        );
      }}
    </ProgrammeLinkFrame>
  );
}
