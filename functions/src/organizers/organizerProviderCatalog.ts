import type {OrganizerProviderSetupCallableResponse} from
  "../shared/generated/organizerProviderSetupCallableResponse";
import {
  organizerProviderCatalog as generatedCatalog,
} from "../shared/generated/catalogs/organizerProviderCatalog";

export type ProviderCatalogEntry =
  OrganizerProviderSetupCallableResponse["providers"][number];

/**
 * Honest, field-scoped product availability. Never infer sync from a name.
 * Generated from contracts/catalogs/organizer_providers.json, which the Host
 * app reads through its own generated copy.
 */
export const organizerProviderCatalog: ProviderCatalogEntry[] =
  generatedCatalog.providers.map((entry) => ({
    ...entry,
    capabilities: {...entry.capabilities},
  }));
