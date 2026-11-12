import type {ProgramHotelHandoverCallableResponse} from "../../firebase";
import {programmeHotelHandoverCopy as copy} from "../../content/programmes";
import {programmeDayTime} from "./programmeLinkModel";

export type HotelHandoverView = ProgramHotelHandoverCallableResponse;
export type HandoverRoom = HotelHandoverView["rooms"][number];
type HandoverGuest = HandoverRoom["guests"][number];

/** One room's ID count: "2 of 2" when every guest's ID is checked. */
export function roomIdCount(room: HandoverRoom): {accepted: number; total: number; tone: "success" | "warning"} {
  const accepted = room.guests.filter((guest) => guest.idStatus === "accepted").length;
  return {accepted, total: room.guests.length, tone: accepted === room.guests.length ? "success" : "warning"};
}

/** The ID photos the desk may open in this room: accepted IDs only, as the read gives them. */
export function roomIdLinks(room: HandoverRoom): {key: string; label: string; href: string}[] {
  return room.guests.flatMap((guest) => [
    guest.frontUrl ? {key: `${guest.guestId}-front`, label: copy.openFront(guest.displayName), href: guest.frontUrl} : null,
    guest.backUrl ? {key: `${guest.guestId}-back`, label: copy.openBack(guest.displayName), href: guest.backUrl} : null,
    guest.visaUrl ? {key: `${guest.guestId}-visa`, label: copy.openVisa(guest.displayName), href: guest.visaUrl} : null,
  ].filter((link): link is {key: string; label: string; href: string} => link !== null));
}

const csvCell = (value: string) => /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

/** The rooming list as CSV: room, guest, arrival, departure and ID status. No ID numbers or images. */
export function roomingListCsv(view: HotelHandoverView): string {
  const lines = [copy.csvHeader.join(",")];
  for (const room of view.rooms) {
    for (const guest of room.guests) {
      lines.push([
        room.roomLabel ?? copy.noRoom,
        guest.displayName,
        room.arrivesAtMillis === null ? "" : programmeDayTime(room.arrivesAtMillis),
        room.departsAtMillis === null ? "" : programmeDayTime(room.departsAtMillis),
        copy.csvIdStatus[guest.idStatus],
      ].map(csvCell).join(","));
    }
  }
  return `${lines.join("\n")}\n`;
}

/** Saves the rooming list as a file in the browser; nothing is sent anywhere. */
export function downloadRoomingList(view: HotelHandoverView) {
  const url = URL.createObjectURL(new Blob([roomingListCsv(view)], {type: "text/csv;charset=utf-8"}));
  const link = document.createElement("a");
  link.href = url;
  link.download = copy.csvFile(view.hotelName);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
