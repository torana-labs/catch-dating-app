import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/host_provider_setup_reads.dart';
import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

export 'host_provider_setup_reads.dart'
    show externalEventMappingId, hostProviderCatalog, hostProviderSetupProvider;

part 'host_provider_repository.g.dart';

/// Whether the server's connection view could be read completely.
enum HostProviderSetupCoverage {
  /// The connections are every connection the organizer has.
  complete,

  /// The organizer has more than 20 connections; the first 20 are shown.
  overCap,

  /// A connection failed validation; the rows are the last valid ones.
  invalidSource,

  /// The server has not written the organizer's connection view yet.
  missing,
}

/// The typed reason the door cannot show provider setup.
class HostProviderSetupUnavailable implements Exception {
  const HostProviderSetupUnavailable(this.coverage);

  final HostProviderSetupCoverage coverage;

  @override
  String toString() => 'HostProviderSetupUnavailable(${coverage.name})';
}

/// How long a connect or disconnect waits for the listeners to deliver its
/// write before it lets the listeners catch up on their own.
const hostProviderSetupReflectionTimeout = Duration(seconds: 20);

enum HostProviderAvailability {
  available,
  exportOnly,
  configurationRequired,
  partnerAccessRequired,
  sampleRequired,
  manualOnly,
}

enum HostProviderImportSupport { verified, generic, sampleRequired }

class HostProviderCapabilities {
  const HostProviderCapabilities({
    required this.fileImport,
    required this.eventList,
    required this.rosterIdentity,
    required this.registrationStatus,
    required this.providerCheckIn,
    required this.orderAmount,
    required this.refundStatus,
    required this.referralCode,
    required this.webhooks,
    required this.writeBookings,
  });

  factory HostProviderCapabilities.fromMap(Map<Object?, Object?> map) =>
      HostProviderCapabilities(
        fileImport: map.containsKey('fileImport')
            ? _requiredBool(map, 'fileImport')
            : false,
        eventList: _requiredBool(map, 'eventList'),
        rosterIdentity: _requiredBool(map, 'rosterIdentity'),
        registrationStatus: _requiredBool(map, 'registrationStatus'),
        providerCheckIn: _requiredBool(map, 'providerCheckIn'),
        orderAmount: _requiredBool(map, 'orderAmount'),
        refundStatus: _requiredBool(map, 'refundStatus'),
        referralCode: _requiredBool(map, 'referralCode'),
        webhooks: _requiredBool(map, 'webhooks'),
        writeBookings: _requiredBool(map, 'writeBookings'),
      );

  final bool fileImport;
  final bool eventList;
  final bool rosterIdentity;
  final bool registrationStatus;
  final bool providerCheckIn;
  final bool orderAmount;
  final bool refundStatus;
  final bool referralCode;
  final bool webhooks;
  final bool writeBookings;
}

class HostProviderCatalogEntry {
  const HostProviderCatalogEntry({
    required this.provider,
    required this.displayName,
    required this.adapterClass,
    required this.availability,
    required this.importSupport,
    required this.connectionMethod,
    required this.capabilities,
    required this.requirement,
  });

  factory HostProviderCatalogEntry.fromMap(Map<Object?, Object?> map) =>
      HostProviderCatalogEntry(
        provider: _providerFromWire(_requiredString(map, 'provider')),
        displayName: _requiredString(map, 'displayName'),
        adapterClass: _requiredString(map, 'adapterClass'),
        availability: HostProviderAvailability.values.byName(
          _requiredString(map, 'availability'),
        ),
        importSupport: HostProviderImportSupport.values.byName(
          _requiredString(map, 'importSupport'),
        ),
        connectionMethod: _requiredString(map, 'connectionMethod'),
        capabilities: HostProviderCapabilities.fromMap(
          _requiredMap(map['capabilities'], 'provider capabilities'),
        ),
        requirement: _requiredString(map, 'requirement'),
      );

  final ExternalBookingProvider provider;
  final String displayName;
  final String adapterClass;
  final HostProviderAvailability availability;
  final HostProviderImportSupport importSupport;
  final String connectionMethod;
  final HostProviderCapabilities capabilities;
  final String requirement;
}

class HostProviderConnection {
  const HostProviderConnection({
    required this.connectionId,
    required this.status,
    required this.externalAccountId,
    required this.externalAccountName,
    required this.capabilities,
    required this.revision,
    required this.lastHealthSyncAt,
    required this.lastSuccessfulSyncAt,
  });

  factory HostProviderConnection.fromMap(Map<Object?, Object?> map) =>
      HostProviderConnection(
        connectionId: _requiredString(map, 'connectionId'),
        status: _requiredString(map, 'status'),
        externalAccountId: _requiredString(map, 'externalAccountId'),
        externalAccountName: _requiredString(map, 'externalAccountName'),
        capabilities: HostProviderCapabilities.fromMap(
          _requiredMap(map['capabilities'], 'connection capabilities'),
        ),
        revision: _requiredInt(map, 'revision'),
        lastHealthSyncAt: _dateTimeFromMillis(map['lastHealthSyncAtMillis']),
        lastSuccessfulSyncAt: _dateTimeFromMillis(
          map['lastSuccessfulSyncAtMillis'],
        ),
      );

  final String connectionId;
  final String status;
  final String externalAccountId;
  final String externalAccountName;
  final HostProviderCapabilities capabilities;
  final int revision;
  final DateTime? lastHealthSyncAt;
  final DateTime? lastSuccessfulSyncAt;
}

class HostProviderEventMapping {
  const HostProviderEventMapping({
    required this.mappingId,
    required this.connectionId,
    required this.externalEventId,
    required this.status,
    required this.revision,
    required this.lastSyncAt,
    required this.lastSuccessfulSyncAt,
    required this.lastSyncStatus,
    required this.lastSyncRunId,
  });

  factory HostProviderEventMapping.fromMap(Map<Object?, Object?> map) =>
      HostProviderEventMapping(
        mappingId: _requiredString(map, 'mappingId'),
        connectionId: _requiredString(map, 'connectionId'),
        externalEventId: _requiredString(map, 'externalEventId'),
        status: _requiredString(map, 'status'),
        revision: _requiredInt(map, 'revision'),
        lastSyncAt: _dateTimeFromMillis(map['lastSyncAtMillis']),
        lastSuccessfulSyncAt: _dateTimeFromMillis(
          map['lastSuccessfulSyncAtMillis'],
        ),
        lastSyncStatus: _requiredString(map, 'lastSyncStatus'),
        lastSyncRunId: _nullableString(map['lastSyncRunId']),
      );

  final String mappingId;
  final String connectionId;
  final String externalEventId;
  final String status;
  final int revision;
  final DateTime? lastSyncAt;
  final DateTime? lastSuccessfulSyncAt;
  final String lastSyncStatus;
  final String? lastSyncRunId;
}

class HostProviderSetup {
  const HostProviderSetup({
    required this.organizerId,
    required this.eventId,
    required this.providers,
    required this.connections,
    required this.mapping,
    this.sourceCoverage = HostProviderSetupCoverage.complete,
  });

  factory HostProviderSetup.fromCallableData(Object? data) {
    final map = _requiredMap(data, 'provider setup response');
    return HostProviderSetup(
      organizerId: _requiredString(map, 'organizerId'),
      eventId: _requiredString(map, 'eventId'),
      providers: _mapList(
        map['providers'],
        'providers',
      ).map(HostProviderCatalogEntry.fromMap).toList(growable: false),
      connections: _mapList(
        map['connections'],
        'connections',
      ).map(HostProviderConnection.fromMap).toList(growable: false),
      mapping: map['mapping'] == null
          ? null
          : HostProviderEventMapping.fromMap(
              _requiredMap(map['mapping'], 'provider mapping'),
            ),
    );
  }

  final String organizerId;
  final String eventId;
  final List<HostProviderCatalogEntry> providers;
  final List<HostProviderConnection> connections;
  final HostProviderEventMapping? mapping;

  /// Whether [connections] is complete; a command response always is.
  final HostProviderSetupCoverage sourceCoverage;

  /// Whether this listener delivery reflects a command's [receipt]: its
  /// mapping and mapped connection at or past the receipt's revisions.
  bool reflects(HostProviderSetup receipt) {
    if (sourceCoverage != HostProviderSetupCoverage.complete) return false;
    final wanted = receipt.mapping;
    if (wanted == null) return mapping == null;
    final current = mapping;
    if (current == null ||
        current.mappingId != wanted.mappingId ||
        current.revision < wanted.revision) {
      return false;
    }
    final wantedConnection = receipt.mappedConnection;
    if (wantedConnection == null) return true;
    final connection = mappedConnection;
    return connection != null &&
        connection.revision >= wantedConnection.revision;
  }

  HostProviderCatalogEntry? catalogFor(ExternalBookingProvider provider) {
    for (final entry in providers) {
      if (entry.provider == provider) return entry;
    }
    return null;
  }

  HostProviderConnection? get mappedConnection {
    final connectionId = mapping?.connectionId;
    if (connectionId == null) return null;
    for (final connection in connections) {
      if (connection.connectionId == connectionId) return connection;
    }
    return null;
  }
}

class HostProviderSyncResult {
  const HostProviderSyncResult({
    required this.runId,
    required this.status,
    required this.pageCount,
    required this.receivedCount,
    required this.createdCount,
    required this.updatedCount,
    required this.skippedCount,
    required this.truncated,
    required this.replayed,
  });

  factory HostProviderSyncResult.fromCallableData(Object? data) {
    final map = _requiredMap(data, 'provider sync response');
    return HostProviderSyncResult(
      runId: _requiredString(map, 'runId'),
      status: _requiredString(map, 'status'),
      pageCount: _requiredInt(map, 'pageCount'),
      receivedCount: _requiredInt(map, 'receivedCount'),
      createdCount: _requiredInt(map, 'createdCount'),
      updatedCount: _requiredInt(map, 'updatedCount'),
      skippedCount: _requiredInt(map, 'skippedCount'),
      truncated: _requiredBool(map, 'truncated'),
      replayed: _requiredBool(map, 'replayed'),
    );
  }

  final String runId;
  final String status;
  final int pageCount;
  final int receivedCount;
  final int createdCount;
  final int updatedCount;
  final int skippedCount;
  final bool truncated;
  final bool replayed;
}

class HostProviderEventChoice {
  const HostProviderEventChoice({
    required this.externalEventId,
    required this.name,
    required this.startAt,
  });

  factory HostProviderEventChoice.fromMap(Map<Object?, Object?> map) =>
      HostProviderEventChoice(
        externalEventId: _requiredString(map, 'externalEventId'),
        name: _requiredString(map, 'name'),
        startAt: DateTime.fromMillisecondsSinceEpoch(
          _requiredInt(map, 'startAtMillis'),
          isUtc: true,
        ),
      );

  final String externalEventId;
  final String name;
  final DateTime startAt;
}

class HostProviderEventChoices {
  const HostProviderEventChoices({
    required this.calendarName,
    required this.events,
    required this.truncated,
  });

  factory HostProviderEventChoices.fromCallableData(Object? data) {
    final map = _requiredMap(data, 'Luma event list response');
    return HostProviderEventChoices(
      calendarName: _requiredString(map, 'calendarName'),
      events: _mapList(
        map['events'],
        'Luma events',
      ).map(HostProviderEventChoice.fromMap).toList(growable: false),
      truncated: _requiredBool(map, 'truncated'),
    );
  }

  final String calendarName;
  final List<HostProviderEventChoice> events;
  final bool truncated;
}

class HostProviderRepository {
  const HostProviderRepository(this._functions, {this.setups});

  final FirebaseFunctions _functions;

  /// The manager listeners behind provider setup; reads need them.
  final HostProviderSetupReads? setups;

  /// The catalog, the organizer's connections and the event's mapping,
  /// updated while it is listened to.
  Stream<HostProviderSetup> watch({
    required String organizerId,
    required String eventId,
  }) {
    final reads = setups;
    if (reads == null) {
      throw StateError('Provider setup reads need the setup listeners.');
    }
    return reads.watch(organizerId: organizerId, eventId: eventId);
  }

  /// Completes when the listeners deliver a setup that reflects a command's
  /// [receipt], so the door leaves its pending state on the listener's data
  /// instead of rereading. After [timeout], or if a listener fails, it
  /// completes anyway: the command succeeded, and the door's own listener
  /// shows whatever arrives next.
  Future<void> untilReflected(
    HostProviderSetup receipt, {
    Duration timeout = hostProviderSetupReflectionTimeout,
  }) async {
    final settled = Completer<void>();
    void settle() {
      if (!settled.isCompleted) settled.complete();
    }

    // The command's write stands either way: a listener failure is the door
    // listener's to report, and the wait never outlives [timeout].
    final deadline = Timer(timeout, settle);
    final subscription =
        watch(
          organizerId: receipt.organizerId,
          eventId: receipt.eventId,
        ).listen(
          (setup) {
            if (setup.reflects(receipt)) settle();
          },
          onError: (Object _) => settle(),
          onDone: settle,
        );
    await settled.future;
    deadline.cancel();
    await subscription.cancel();
  }

  Future<HostProviderSetup> connectLuma({
    required String organizerId,
    required String eventId,
    required String externalEventId,
    required String apiKey,
  }) => _call(
    name: 'connectOrganizerLumaProvider',
    payload: ConnectOrganizerLumaProviderCallableRequest(
      organizerId: organizerId,
      eventId: eventId,
      externalEventId: externalEventId,
      apiKey: apiKey,
    ).toJson(),
    action: 'connect Luma calendar',
    parse: HostProviderSetup.fromCallableData,
  );

  Future<HostProviderEventChoices> listLumaEvents({
    required String organizerId,
    required String eventId,
    required String apiKey,
  }) => _call(
    name: 'listOrganizerLumaEvents',
    payload: ListOrganizerLumaEventsCallableRequest(
      organizerId: organizerId,
      eventId: eventId,
      apiKey: apiKey,
    ).toJson(),
    action: 'verify Luma calendar',
    parse: HostProviderEventChoices.fromCallableData,
  );

  Future<HostProviderSyncResult> syncEvent({
    required String organizerId,
    required String eventId,
    required String clientOperationId,
  }) => _call(
    name: 'syncOrganizerProviderEvent',
    payload: SyncOrganizerProviderEventCallableRequest(
      organizerId: organizerId,
      eventId: eventId,
      clientOperationId: clientOperationId,
    ).toJson(),
    action: 'sync provider roster',
    parse: HostProviderSyncResult.fromCallableData,
  );

  Future<HostProviderSetup> disconnect({
    required String organizerId,
    required String eventId,
    required String connectionId,
  }) => _call(
    name: 'disconnectOrganizerProvider',
    payload: DisconnectOrganizerProviderCallableRequest(
      organizerId: organizerId,
      eventId: eventId,
      connectionId: connectionId,
    ).toJson(),
    action: 'disconnect booking provider',
    parse: HostProviderSetup.fromCallableData,
  );

  Future<T> _call<T>({
    required String name,
    required Map<String, Object?> payload,
    required String action,
    required T Function(Object?) parse,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable(name)
          .call<Object?>(payload);
      return parse(result.data);
    },
    context: BackendErrorContext(
      service: BackendService.functions,
      action: action,
      resource: name,
    ),
  );
}

// keepalive: one provider client coordinates setup, sync, and disconnect state
// across every external-booking management surface.
@Riverpod(keepAlive: true)
HostProviderRepository hostProviderRepository(Ref ref) =>
    HostProviderRepository(
      ref.watch(firebaseFunctionsProvider),
      setups: HostProviderSetupReads(ref.watch(firebaseFirestoreProvider)),
    );

ExternalBookingProvider _providerFromWire(String value) => switch (value) {
  'generic' => ExternalBookingProvider.generic,
  'luma' => ExternalBookingProvider.luma,
  'eventbrite' => ExternalBookingProvider.eventbrite,
  'partiful' => ExternalBookingProvider.partiful,
  'posh' => ExternalBookingProvider.posh,
  'bookmyshow' => ExternalBookingProvider.bookmyshow,
  'district' => ExternalBookingProvider.district,
  'sortmyscene' => ExternalBookingProvider.sortmyscene,
  'airbnb' => ExternalBookingProvider.airbnb,
  _ => throw FormatException('Unknown provider $value.'),
};

Map<Object?, Object?> _requiredMap(Object? value, String label) {
  if (value is Map<Object?, Object?>) return value;
  throw FormatException('Invalid $label.');
}

List<Map<Object?, Object?>> _mapList(Object? value, String label) {
  if (value is! List<Object?>) throw FormatException('Invalid $label.');
  return value.map((item) => _requiredMap(item, label)).toList(growable: false);
}

String _requiredString(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is String && value.isNotEmpty) return value;
  throw FormatException('Response was missing $key.');
}

String? _nullableString(Object? value) {
  if (value == null) return null;
  if (value is String) return value;
  throw const FormatException('Expected a nullable string.');
}

int _requiredInt(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is num) return value.toInt();
  throw FormatException('Response was missing numeric $key.');
}

bool _requiredBool(Map<Object?, Object?> map, String key) {
  final value = map[key];
  if (value is bool) return value;
  throw FormatException('Response was missing boolean $key.');
}

DateTime? _dateTimeFromMillis(Object? value) => value == null
    ? null
    : DateTime.fromMillisecondsSinceEpoch((value as num).toInt());
