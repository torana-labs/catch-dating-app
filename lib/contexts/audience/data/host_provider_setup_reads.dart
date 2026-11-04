import 'dart:convert';

import 'package:catch_dating_app/contexts/audience/data/host_provider_repository.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/schema_contracts/generated/organizer_provider_catalog.g.dart';
import 'package:catch_platform/streams/combine_latest.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:crypto/crypto.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_provider_setup_reads.g.dart';

/// The document id of an event's provider mapping, as Functions derives it:
/// `eem_` and the first 48 hex characters of sha256(eventId).
String externalEventMappingId(String eventId) =>
    'eem_${sha256.convert(utf8.encode(eventId)).toString().substring(0, 48)}';

/// The generated provider catalog, in display order.
final List<HostProviderCatalogEntry> hostProviderCatalog = List.unmodifiable([
  for (final entry in organizerProviderCatalog)
    HostProviderCatalogEntry.fromMap({
      'provider': entry.provider,
      'displayName': entry.displayName,
      'adapterClass': entry.adapterClass,
      'availability': entry.availability,
      'importSupport': entry.importSupport,
      'connectionMethod': entry.connectionMethod,
      'capabilities': entry.capabilities,
      'requirement': entry.requirement,
    }),
]);

/// Manager listeners behind the door's provider setup: the organizer's
/// `hostProviderConnectionViews` document, written ahead of time by the
/// server, and the event's `externalEventMappings` document. Rules allow a
/// current manager of the organizer to get both.
class HostProviderSetupReads {
  const HostProviderSetupReads(this._db);

  static const connectionViews = 'hostProviderConnectionViews';
  static const mappings = 'externalEventMappings';
  static final _documentId = RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$');

  final FirebaseFirestore _db;

  /// The catalog, the organizer's connections and the event's mapping,
  /// updated while it is listened to.
  Stream<HostProviderSetup> watch({
    required String organizerId,
    required String eventId,
  }) {
    if (!_documentId.hasMatch(organizerId) || !_documentId.hasMatch(eventId)) {
      throw ArgumentError('Organizer and event ids are required');
    }
    return combineLatest(
      _connections(organizerId),
      _mapping(organizerId, eventId),
      (connections, mapping) => HostProviderSetup(
        organizerId: organizerId,
        eventId: eventId,
        providers: hostProviderCatalog,
        connections: connections.connections,
        mapping: mapping,
        sourceCoverage: connections.coverage,
      ),
    );
  }

  Stream<HostProviderConnectionsView> _connections(String organizerId) =>
      withBackendErrorStream(
        () => _db
            .collection(connectionViews)
            .doc(organizerId)
            .snapshots()
            .map(
              (snapshot) => HostProviderConnectionsView.fromFirestore(
                organizerId: organizerId,
                data: snapshot.data(),
              ),
            ),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch booking provider connections',
          resource: connectionViews,
        ),
      );

  Stream<HostProviderEventMapping?> _mapping(
    String organizerId,
    String eventId,
  ) => withBackendErrorStream(
    () => _db
        .collection(mappings)
        .doc(externalEventMappingId(eventId))
        .snapshots()
        .map(
          (snapshot) => hostProviderEventMappingFromFirestore(
            organizerId: organizerId,
            eventId: eventId,
            mappingId: snapshot.id,
            data: snapshot.data(),
          ),
        ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch booking provider event mapping',
      resource: mappings,
    ),
  );
}

/// One read of `hostProviderConnectionViews/{organizerId}`.
class HostProviderConnectionsView {
  const HostProviderConnectionsView({
    required this.coverage,
    required this.connections,
  });

  /// Parses the document; [data] is null when the server has not written it.
  /// A document for another organizer is a [FormatException].
  factory HostProviderConnectionsView.fromFirestore({
    required String organizerId,
    required Map<String, Object?>? data,
  }) {
    if (data == null) {
      return const HostProviderConnectionsView(
        coverage: HostProviderSetupCoverage.missing,
        connections: [],
      );
    }
    final coverage = switch (data['sourceCoverage']) {
      'complete' => HostProviderSetupCoverage.complete,
      'overCap' => HostProviderSetupCoverage.overCap,
      'invalidSource' => HostProviderSetupCoverage.invalidSource,
      _ => throw const FormatException('Invalid provider connection coverage'),
    };
    final rows = data['connections'];
    if (data['schemaVersion'] != 1 ||
        data['organizerId'] != organizerId ||
        rows is! List<Object?>) {
      throw const FormatException('Provider connection view changed identity');
    }
    return HostProviderConnectionsView(
      coverage: coverage,
      connections: [
        for (final row in rows)
          if (row is Map<Object?, Object?>)
            HostProviderConnection.fromMap(row)
          else
            throw const FormatException('Invalid provider connection row'),
      ],
    );
  }

  final HostProviderSetupCoverage coverage;
  final List<HostProviderConnection> connections;
}

/// Parses `externalEventMappings/{mappingId}`. A missing document, or one
/// for another organizer or event, is no mapping, as the retired callable
/// returned.
HostProviderEventMapping? hostProviderEventMappingFromFirestore({
  required String organizerId,
  required String eventId,
  required String mappingId,
  required Map<String, Object?>? data,
}) {
  if (data == null ||
      data['organizerId'] != organizerId ||
      data['eventId'] != eventId) {
    return null;
  }
  return HostProviderEventMapping.fromMap({
    'mappingId': mappingId,
    'connectionId': data['connectionId'],
    'externalEventId': data['externalEventId'],
    'status': data['status'],
    'revision': data['revision'],
    'lastSyncAtMillis': _millis(data['lastSyncAt']),
    'lastSuccessfulSyncAtMillis': _millis(data['lastSuccessfulSyncAt']),
    'lastSyncStatus': data['lastSyncStatus'],
    'lastSyncRunId': data['lastSyncRunId'],
  });
}

int? _millis(Object? value) => switch (value) {
  null => null,
  final Timestamp timestamp => timestamp.millisecondsSinceEpoch,
  _ => throw const FormatException('Invalid provider mapping timestamp'),
};

/// The door's provider setup read owner. It is a Firestore listener: it
/// declares no cache tags or lifetime, and writes never invalidate it; the
/// door restarts it only after it ended in an error.
@riverpod
Stream<HostProviderSetup> hostProviderSetup(
  Ref ref,
  String organizerId,
  String eventId,
) => ref
    .watch(hostProviderRepositoryProvider)
    .watch(organizerId: organizerId, eventId: eventId);
