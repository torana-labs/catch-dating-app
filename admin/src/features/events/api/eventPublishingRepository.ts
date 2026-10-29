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

export function listEventProfiles(
  payload: AdminListEventDetailsPayload = {}
): Promise<AdminListEventDetailsResponse> {
  return listEventDetails(payload);
}

export function listExternalEventProfiles(
  payload: AdminListExternalEventDetailsPayload = {}
): Promise<AdminListExternalEventDetailsResponse> {
  return listExternalEventDetails(payload);
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
