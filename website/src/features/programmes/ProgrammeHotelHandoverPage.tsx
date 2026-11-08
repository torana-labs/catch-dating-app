import {CatchButton, CatchMetricTile, CatchStack, CatchSurface, CatchTable, CatchText, type CatchTableColumn} from "@catch/web-ui";
import {getProgramHotelHandover} from "../../firebase";
import {programmeHotelHandoverCopy as copy} from "../../content/programmes";
import {ProgrammeLinkFrame, ProgrammePrivacyNote} from "./ProgrammeLinkFrame";
import {
  downloadRoomingList,
  roomIdCount,
  roomIdLinks,
  type HandoverRoom,
  type HotelHandoverView,
} from "./programmeHotelHandoverModel";
import {programmeDay, programmeDayTime, type ProgrammeLinkCredential, type ProgrammeLinkScreen} from "./programmeLinkModel";
import {useProgrammeLinkRead} from "./useProgrammeLinkRead";

export function ProgrammeHotelHandoverPage({credential}: {credential: ProgrammeLinkCredential | null}) {
  const read = useProgrammeLinkRead("hotel", credential, getProgramHotelHandover);
  return <ProgrammeHotelHandoverView {...read} download={downloadRoomingList} />;
}

interface RoomRow {
  key: string;
  room: string;
  guests: {title: string};
  arrives: {title: string; subtitle?: string};
  ids: {label: string; tone: "success" | "warning"};
  source: HandoverRoom;
}

const columns: readonly CatchTableColumn<RoomRow>[] = [
  {key: "room", label: copy.columnRoom, width: "80px"},
  {key: "guests", label: copy.columnGuests, kind: "title"},
  {key: "arrives", label: copy.columnArrives, kind: "title"},
  {key: "ids", label: copy.columnIds, kind: "badge"},
  {
    key: "source", label: copy.columnOpen,
    render: (row) => (
      <CatchStack direction="row" gap={4} wrap>
        {roomIdLinks(row.source).map((link) => (
          <CatchButton href={link.href} key={link.key} label={link.label} newTab size="sm" variant="quiet" />
        ))}
      </CatchStack>
    ),
  },
];

function rowsOf(view: HotelHandoverView): RoomRow[] {
  return view.rooms.map((room, index) => {
    const count = roomIdCount(room);
    return {
      key: room.roomLabel ?? `room-${index}`,
      room: room.roomLabel ?? copy.noRoom,
      guests: {title: room.guests.map((guest) => guest.displayName).join(", ")},
      arrives: {
        title: room.arrivesAtMillis === null ? "" : programmeDayTime(room.arrivesAtMillis),
        subtitle: room.departsAtMillis === null ? undefined : copy.departs(programmeDay(room.departsAtMillis)),
      },
      ids: {label: copy.idsOf(count.accepted, count.total), tone: count.tone},
      source: room,
    };
  });
}

/**
 * The hotel front desk's rooming list (web link, 1280), drawn as the
 * RbProgHotelHandover board: the site bar with the hotel, who it is from,
 * the title and lead, Download the rooming list, four figures, the floating
 * table with each room's ID status and the accepted IDs to open, and the
 * privacy notice. Only accepted IDs carry photos, signed for a few minutes.
 */
export function ProgrammeHotelHandoverView({screen, refresh, refreshing, download}: {
  screen: ProgrammeLinkScreen<HotelHandoverView>;
  refresh: () => void;
  refreshing: boolean;
  download: (view: HotelHandoverView) => void;
}) {
  return (
    <ProgrammeLinkFrame
      branding={screen.kind === "ready" ? screen.view.branding : undefined}
      refresh={refresh} refreshing={refreshing} screen={screen}
      title={screen.kind === "ready" ? copy.topBar(screen.view.hotelName) : null} wide>
      {(view) => (
        <>
          <CatchStack gap={12}>
            <CatchText tone="secondary" variant="label-kicker">{copy.kicker(view.organizerName, view.programTitle)}</CatchText>
            <CatchText as="h1" variant="display-lg">{copy.title}</CatchText>
            <CatchText tone="secondary" variant="body-lead">
              {copy.lead(view.counts.guests, view.counts.rooms, programmeDay(view.expiresAtMillis))}
            </CatchText>
            <CatchStack align="start">
              <CatchButton label={copy.download} leadingIcon="download" onPressed={() => download(view)} variant="secondary" />
            </CatchStack>
          </CatchStack>
          <CatchStack collapseBelow="medium" direction="row" equal gap={12}>
            <CatchMetricTile label={copy.statRooms} value={view.counts.rooms} />
            <CatchMetricTile label={copy.statGuests} value={view.counts.guests} />
            <CatchMetricTile label={copy.statIds} value={copy.statIdsValue(view.counts.idsAccepted, view.counts.guests)} />
            <CatchMetricTile label={copy.statMissing} note={view.counts.idsMissing > 0 ? copy.statMissingNote : undefined}
              noteTone="warning" value={view.counts.idsMissing} />
          </CatchStack>
          <CatchSurface block="floating">
            <CatchTable columns={columns} label={copy.table} rowKey="key" rows={rowsOf(view)} />
          </CatchSurface>
          <CatchText tone="secondary" variant="body-small">{copy.photosExpire}</CatchText>
          <ProgrammePrivacyNote>{copy.privacy}</ProgrammePrivacyNote>
        </>
      )}
    </ProgrammeLinkFrame>
  );
}
