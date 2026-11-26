import {
  listExternalEventDetails,
  listEventDetails,
  loadEventDetails,
  saveEventDetails,
  takedownExternalEvent,
} from "../../../shared/api/adminApi";
import type {
  AdminGetEventDetailsPayload,
  AdminGetEventDetailsResponse,
  AdminListExternalEventDetailsPayload,
  AdminListExternalEventDetailsResponse,
  AdminListEventDetailsPayload,
  AdminListEventDetailsResponse,
  AdminTakedownExternalEventPayload,
  AdminTakedownExternalEventResponse,
  AdminUpdateEventDetailsPayload,
  AdminUpdateEventDetailsResponse,
} from "../../../shared/types/adminTypes";

export function listExternalEventProfiles(
  payload: AdminListExternalEventDetailsPayload = {}
): Promise<AdminListExternalEventDetailsResponse> {
  return listExternalEventDetails(payload);
}

/** One imported event by id, read directly rather than found in a list. */
export async function loadExternalEventProfile(
  eventId: string
): Promise<AdminListExternalEventDetailsResponse["rows"][number] | null> {
  const response = await listExternalEventDetails({eventId});
  return response.rows.find((row) => row.eventId === eventId) ?? null;
}

export function loadEventProfile(
  payload: AdminGetEventDetailsPayload
): Promise<AdminGetEventDetailsResponse> {
  return loadEventDetails(payload);
}

export function saveEventProfile(
  payload: AdminUpdateEventDetailsPayload
): Promise<AdminUpdateEventDetailsResponse> {
  return saveEventDetails(payload);
}

export function takedownExternalEventProfile(
  payload: AdminTakedownExternalEventPayload
): Promise<AdminTakedownExternalEventResponse> {
  return takedownExternalEvent(payload);
}
