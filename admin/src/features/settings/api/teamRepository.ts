import {
  getAdminUserRoles,
  listAdminRoleAssignments,
  setAdminUserRoles,
} from "../../../shared/api/adminApi";
import type {
  AdminGetAdminUserRolesPayload,
  AdminGetAdminUserRolesResponse,
  AdminListAdminRoleAssignmentsPayload,
  AdminListAdminRoleAssignmentsResponse,
  AdminSetAdminUserRolesPayload,
  AdminSetAdminUserRolesResponse,
} from "../../../shared/types/adminTypes";

export async function loadAdminUserRoles(
  payload: AdminGetAdminUserRolesPayload
): Promise<AdminGetAdminUserRolesResponse> {
  return getAdminUserRoles(payload);
}

export async function loadAdminRoleAssignments(
  payload: AdminListAdminRoleAssignmentsPayload = {}
): Promise<AdminListAdminRoleAssignmentsResponse> {
  return listAdminRoleAssignments(payload);
}

export async function saveAdminUserRoles(
  payload: AdminSetAdminUserRolesPayload
): Promise<AdminSetAdminUserRolesResponse> {
  return setAdminUserRoles(payload);
}
