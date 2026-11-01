import {listEventDirectory} from "../../../shared/api/adminApi";
import type {AdminListEventDirectoryCallablePayload} from
  "../../../generated/contracts/adminListEventDirectoryCallablePayload";
import type {AdminListEventDirectoryCallableResponse} from
  "../../../generated/contracts/adminListEventDirectoryCallableResponse";

export type EventDirectoryQuery = AdminListEventDirectoryCallablePayload;
export type EventDirectoryPage = AdminListEventDirectoryCallableResponse;
export type EventDirectoryRow = EventDirectoryPage["rows"][number];

/** Catch and imported events, one table; each row names its source. */
export function loadEventDirectory(
  query: EventDirectoryQuery
): Promise<EventDirectoryPage> {
  return listEventDirectory(query);
}
