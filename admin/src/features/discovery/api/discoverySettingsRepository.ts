import {
  getDiscoverySettings,
  updateDiscoverySettings,
} from "../../../shared/api/adminApi";
import type {AdminGetDiscoverySettingsCallableResponse} from
  "../../../generated/contracts/adminGetDiscoverySettingsCallableResponse";
import type {AdminUpdateDiscoverySettingsCallablePayload} from
  "../../../generated/contracts/adminUpdateDiscoverySettingsCallablePayload";

export type DiscoverySettingsSnapshot =
  AdminGetDiscoverySettingsCallableResponse;
export type DiscoverySettingsUpdate =
  AdminUpdateDiscoverySettingsCallablePayload;
export type DiscoverySurfaces = DiscoverySettingsUpdate["surfaces"];
export type DiscoverySurface = keyof DiscoverySurfaces;
export type DiscoveryAudience = keyof DiscoverySurfaces[DiscoverySurface];

export function loadDiscoverySettings(): Promise<DiscoverySettingsSnapshot> {
  return getDiscoverySettings();
}

export function saveDiscoverySettings(
  payload: DiscoverySettingsUpdate
): Promise<DiscoverySettingsSnapshot> {
  return updateDiscoverySettings(payload);
}
