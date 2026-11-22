/// A family of server-maintained read models scoped to one owner.
///
/// Every row of every model in the family carries its owner's id in
/// [scopeField] and its row shape in `version`; one readiness document per
/// owner, at `[readinessCollection]/{ownerId}`, says which of the family's
/// models are active through integer markers. Firestore rules authorize every
/// read; nothing here grants access.
final class ReadModelFamily {
  const ReadModelFamily({
    required this.readinessCollection,
    required this.scopeField,
    required this.version,
  });

  /// The collection holding one readiness document per owner.
  final String readinessCollection;

  /// The field naming a row's owner.
  final String scopeField;

  /// The row shape every model in the family serves.
  final int version;
}

/// The Host read models: organizer-scoped views the Host app lists, whose
/// readiness lives in `hostDirectorySummaries/{organizerId}`.
const hostReadModels = ReadModelFamily(
  readinessCollection: 'hostDirectorySummaries',
  scopeField: 'organizerId',
  version: 1,
);
