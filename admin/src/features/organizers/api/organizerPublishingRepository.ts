import {
  decideOrganizerClaim as decideOrganizerClaimRequest,
  getOrganizerClaimRequestDetails as getOrganizerClaimRequest,
  listOrganizerClaimRequests as listOrganizerClaimRequestRows,
  listOrganizerDetails,
  loadOrganizerDetails,
  saveOrganizerDetails,
  setOrganizerIndexStatus as setOrganizerIndexStatusRequest,
} from "../../../shared/api/adminApi";
import type {
  AdminDecideOrganizerClaimPayload,
  AdminDecideOrganizerClaimResponse,
  AdminGetOrganizerClaimRequestDetailsPayload,
  AdminGetOrganizerClaimRequestDetailsResponse,
  AdminGetOrganizerDetailsPayload,
  AdminGetOrganizerDetailsResponse,
  AdminListOrganizerDetailsPayload,
  AdminListOrganizerDetailsResponse,
  AdminSetOrganizerIndexStatusPayload,
  AdminSetOrganizerIndexStatusResponse,
  AdminUpdateOrganizerDetailsPayload,
  AdminUpdateOrganizerDetailsResponse,
} from "../../../shared/types/adminTypes";

export function listOrganizerClaimRequests() {
  return listOrganizerClaimRequestRows();
}

export function loadOrganizerClaimRequest(
  payload: AdminGetOrganizerClaimRequestDetailsPayload
): Promise<AdminGetOrganizerClaimRequestDetailsResponse> {
  return getOrganizerClaimRequest(payload);
}

export function decideOrganizerClaim(
  payload: AdminDecideOrganizerClaimPayload
): Promise<AdminDecideOrganizerClaimResponse> {
  return decideOrganizerClaimRequest(payload);
}

export function listOrganizerProfiles(
  payload: AdminListOrganizerDetailsPayload = {}
): Promise<AdminListOrganizerDetailsResponse> {
  return listOrganizerDetails(payload);
}

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
