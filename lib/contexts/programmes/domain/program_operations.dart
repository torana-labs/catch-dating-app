import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/travel_leg_revision.dart';
import 'package:catch_dating_app/core/persistence/local_command_journal.dart';

enum ProgramOperationKind { legObservation, dispatch, doorAction, walkIn }

typedef ProgramOperationOutboxStatus = LocalCommandStatus;

class ProgramOperationOutboxEntry {
  const ProgramOperationOutboxEntry._({
    required this.kind,
    required this.programId,
    required this.clientOperationId,
    required this.createdAt,
    required this.status,
    required this.payload,
    this.lastErrorCode,
  });

  factory ProgramOperationOutboxEntry.legObservation({
    required String programId,
    required String legId,
    required String action,
    required String clientOperationId,
    required DateTime createdAt,
    required int expectedRevision,
    TravelLegObservationReference? afterObservation,
    int? manualCurbAtMillis,
    String? manualCurbNote,
  }) => ProgramOperationOutboxEntry._(
    kind: ProgramOperationKind.legObservation,
    programId: programId,
    clientOperationId: clientOperationId,
    createdAt: createdAt,
    status: ProgramOperationOutboxStatus.pending,
    payload: {
      'legId': legId,
      'action': action,
      'expectedRevision': expectedRevision,
      if (afterObservation != null)
        'afterObservation': afterObservation.toJson(),
      'manualCurbAtMillis': manualCurbAtMillis,
      'manualCurbNote': manualCurbNote,
    },
  );

  factory ProgramOperationOutboxEntry.dispatch({
    required String programId,
    required String pickupPointId,
    required String vehicleClassId,
    required String plateDisplay,
    required List<String> legIds,
    required String clientOperationId,
    required DateTime createdAt,
    String? destinationHotelId,
    String? destinationLabel,
    String? vendorId,
    required List<DispatchLegRevision> expectedLegRevisions,
  }) => ProgramOperationOutboxEntry._(
    kind: ProgramOperationKind.dispatch,
    programId: programId,
    clientOperationId: clientOperationId,
    createdAt: createdAt,
    status: ProgramOperationOutboxStatus.pending,
    payload: {
      'pickupPointId': pickupPointId,
      'vehicleClassId': vehicleClassId,
      'plateDisplay': plateDisplay,
      'legIds': legIds,
      'destinationHotelId': destinationHotelId,
      'destinationLabel': destinationLabel,
      'vendorId': vendorId,
      'expectedLegRevisions': expectedLegRevisions
          .map((fence) => fence.toJson())
          .toList(growable: false),
    },
  );

  /// One door journal operation for a function. The server derives the
  /// journal id from scope+function+guest+action+timestamp+actor, so an
  /// outbox replay of this exact entry lands as a duplicate, not a second
  /// check-in.
  factory ProgramOperationOutboxEntry.doorAction({
    required String programId,
    required String functionId,
    required String guestId,
    required String action,
    required String clientOperationId,
    required DateTime createdAt,
    int? partySize,
    String? note,
  }) => ProgramOperationOutboxEntry._(
    kind: ProgramOperationKind.doorAction,
    programId: programId,
    clientOperationId: clientOperationId,
    createdAt: createdAt,
    status: ProgramOperationOutboxStatus.pending,
    payload: {
      'functionId': functionId,
      'guestId': guestId,
      'action': action,
      'partySize': partySize,
      'note': note,
    },
  );

  factory ProgramOperationOutboxEntry.walkIn({
    required String programId,
    required String functionId,
    required String displayName,
    required String clientOperationId,
    required DateTime createdAt,
    int? partySize,
    String? note,
  }) => ProgramOperationOutboxEntry._(
    kind: ProgramOperationKind.walkIn,
    programId: programId,
    clientOperationId: clientOperationId,
    createdAt: createdAt,
    status: ProgramOperationOutboxStatus.pending,
    payload: {
      'functionId': functionId,
      'displayName': displayName,
      'partySize': partySize,
      'note': note,
    },
  );

  factory ProgramOperationOutboxEntry.fromJson(Map<String, Object?> json) {
    final entry = ProgramOperationOutboxEntry._(
      kind: ProgramOperationKind.values.byName(json['kind']! as String),
      programId: json['programId']! as String,
      clientOperationId: json['clientOperationId']! as String,
      createdAt: DateTime.fromMillisecondsSinceEpoch(
        json['createdAtMillis']! as int,
      ),
      status: ProgramOperationOutboxStatus.values.byName(
        json['status']! as String,
      ),
      payload: (json['payload']! as Map<Object?, Object?>)
          .cast<String, Object?>(),
      lastErrorCode: json['lastErrorCode'] as String?,
    );

    final payload = entry.payload;
    switch (entry.kind) {
      case ProgramOperationKind.legObservation:
        requiredString(payload, 'legId');
        if (!{
          'claim',
          'unclaim',
          'markReady',
          'markDisrupted',
        }.contains(payload['action'])) {
          throw const FormatException('Invalid leg action');
        }
        for (final key in ['expectedRevision', 'manualCurbAtMillis']) {
          if (payload[key] != null &&
              (payload[key] is! int || (payload[key]! as int) < 0)) {
            throw const FormatException('Invalid observation revision or time');
          }
        }
        if (payload['afterObservation'] != null) {
          TravelLegObservationReference.fromJson(
            requiredMap(payload['afterObservation'], 'preceding observation'),
          );
        }
        if (payload['manualCurbNote'] != null &&
            payload['manualCurbNote'] is! String) {
          throw const FormatException('Invalid observation note');
        }
      case ProgramOperationKind.dispatch:
        for (final key in ['pickupPointId', 'vehicleClassId', 'plateDisplay']) {
          requiredString(payload, key);
        }
        final legs = stringList(payload['legIds']);
        if (legs.isEmpty ||
            legs.any((id) => id.isEmpty) ||
            legs.toSet().length != legs.length) {
          throw const FormatException('Invalid dispatch legs');
        }
        for (final key in [
          'destinationHotelId',
          'destinationLabel',
          'vendorId',
        ]) {
          if (payload[key] != null && payload[key] is! String) {
            throw const FormatException(
              'Invalid dispatch destination or vendor',
            );
          }
        }
        if (payload['expectedLegRevisions'] != null) {
          for (final fence in mapList(
            payload['expectedLegRevisions'],
            'revision fences',
          )) {
            DispatchLegRevision.fromJson(fence);
          }
        }
      case ProgramOperationKind.doorAction:
        requiredString(payload, 'functionId');
        requiredString(payload, 'guestId');
        if (!{
          'checkIn',
          'undoCheckIn',
          'markNoShow',
          'walkInCreate',
          'partySizeAdjust',
        }.contains(payload['action'])) {
          throw const FormatException('Invalid door action');
        }
        if (payload['partySize'] != null &&
            (payload['partySize'] is! int ||
                (payload['partySize']! as int) < 1)) {
          throw const FormatException('Invalid door party size');
        }
        if (payload['note'] != null && payload['note'] is! String) {
          throw const FormatException('Invalid door note');
        }
      case ProgramOperationKind.walkIn:
        requiredString(payload, 'functionId');
        requiredString(payload, 'displayName');
        if (payload['partySize'] != null &&
            (payload['partySize'] is! int ||
                (payload['partySize']! as int) < 1)) {
          throw const FormatException('Invalid walk-in party size');
        }
        if (payload['note'] != null && payload['note'] is! String) {
          throw const FormatException('Invalid walk-in note');
        }
    }
    return entry;
  }

  final ProgramOperationKind kind;
  final String programId;
  final String clientOperationId;
  final DateTime createdAt;
  final ProgramOperationOutboxStatus status;
  final Map<String, Object?> payload;
  final String? lastErrorCode;

  bool affectsLeg(String legId) => switch (kind) {
    ProgramOperationKind.legObservation => payload['legId'] == legId,
    ProgramOperationKind.dispatch => (payload['legIds']! as List).contains(
      legId,
    ),
    _ => false,
  };

  bool affectsDoorGuest(String functionId, String guestId) =>
      kind == ProgramOperationKind.doorAction &&
      payload['functionId'] == functionId &&
      payload['guestId'] == guestId;

  ProgramOperationOutboxEntry copyWith({
    ProgramOperationOutboxStatus? status,
    String? lastErrorCode,
  }) => ProgramOperationOutboxEntry._(
    kind: kind,
    programId: programId,
    clientOperationId: clientOperationId,
    createdAt: createdAt,
    status: status ?? this.status,
    payload: payload,
    lastErrorCode: lastErrorCode ?? this.lastErrorCode,
  );

  Map<String, Object?> toJson() => {
    'kind': kind.name,
    'programId': programId,
    'clientOperationId': clientOperationId,
    'createdAtMillis': createdAt.millisecondsSinceEpoch,
    'status': status.name,
    'payload': payload,
    'lastErrorCode': lastErrorCode,
  };
}

class ProgramOperationOutboxSummary {
  const ProgramOperationOutboxSummary(this.entries);

  final List<ProgramOperationOutboxEntry> entries;

  int get pendingCount => entries
      .where((entry) => entry.status == ProgramOperationOutboxStatus.pending)
      .length;
  int get needsReviewCount => entries
      .where(
        (entry) => entry.status == ProgramOperationOutboxStatus.needsReview,
      )
      .length;

  /// Most recent local operation; earlier commands remain in the journal.
  ProgramOperationOutboxEntry? forLeg(String legId) {
    for (final entry in entries.reversed) {
      if (entry.affectsLeg(legId)) {
        return entry;
      }
    }
    return null;
  }

  /// Most recent queued door action for a guest row at one function.
  ProgramOperationOutboxEntry? forDoorGuest(String functionId, String guestId) {
    for (final entry in entries.reversed) {
      if (entry.affectsDoorGuest(functionId, guestId)) {
        return entry;
      }
    }
    return null;
  }

  /// Queued walk-ins at one function, in submission order.
  List<ProgramOperationOutboxEntry> walkInsFor(String functionId) => entries
      .where(
        (entry) =>
            entry.kind == ProgramOperationKind.walkIn &&
            entry.payload['functionId'] == functionId,
      )
      .toList(growable: false);
}
