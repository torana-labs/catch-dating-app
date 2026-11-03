import {
  listOrganizerDetails,
  loadOrganizerDetails,
  saveOrganizerDetails,
  setOrganizerIndexStatus as setOrganizerIndexStatusRequest,
} from "../../../shared/api/adminApi";
import type {
  AdminGetOrganizerDetailsPayload,
  AdminGetOrganizerDetailsResponse,
  AdminListOrganizerDetailsPayload,
  AdminListOrganizerDetailsResponse,
  AdminSetOrganizerIndexStatusPayload,
  AdminSetOrganizerIndexStatusResponse,
  AdminUpdateOrganizerDetailsPayload,
  AdminUpdateOrganizerDetailsResponse,
} from "../../../shared/types/adminTypes";

export function loadOrganizerProfile(
  payload: AdminGetOrganizerDetailsPayload
): Promise<AdminGetOrganizerDetailsResponse> {
  return loadOrganizerDetails(payload);
}

export function saveOrganizerProfile(
  payload: AdminUpdateOrganizerDetailsPayload
): Promise<AdminUpdateOrganizerDetailsResponse> {
  return saveOrganizerDetails(payload);
}

export function publishOrganizerProfile(
  payload: AdminSetOrganizerIndexStatusPayload
): Promise<AdminSetOrganizerIndexStatusResponse> {
  return setOrganizerIndexStatusRequest(payload);
}
