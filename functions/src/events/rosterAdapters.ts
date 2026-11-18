// The guest-list converters moved to functions/src/guestImport (#2061), the
// one importer every surface shares. This module keeps the names the
// forwarded-roster path and its tests import.

export type {
  ExternalRosterProvider,
  NormalizedRosterImportRow,
  PreparedRosterImport,
  RosterAdapterDetection,
  RosterAdapterId,
  RosterAdapterSupport,
} from "../guestImport/canonical";
export type {GuestTable as RosterMatrix} from "../guestImport/table";
export {normalizeHeader, parseCsvMatrix} from "../guestImport/table";
export {
  detectRosterAdapter,
  normalizeRosterMatrix,
  prepareCsvRosterImport,
} from "../guestImport/registry";
