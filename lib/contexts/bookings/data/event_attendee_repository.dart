import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/data/read_limit_policy.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show
        CreateEventRosterHandoffCallableRequest,
        ImportEventAttendeesCallableRequest,
        MarkEventAttendeeAttendanceCallableRequest,
        SetEventAttendeeAttendanceCallableRequest;
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part '../../events/data/event_attendee_repository.g.dart';

class EventAttendeeRepository {
  const EventAttendeeRepository(this._db, this._functions);

  static const _collectionPath = 'eventAttendees';

  final FirebaseFirestore _db;
  final FirebaseFunctions _functions;

  CollectionReference<EventAttendee> get _attendeesRef => _db
      .collection(_collectionPath)
      .withDocumentIdConverter<EventAttendee>(
        idField: 'id',
        fromJson: EventAttendee.fromJson,
        toJson: (attendee) => attendee.toJson(),
      );

  Stream<List<EventAttendee>> watchForEvent(String eventId) =>
      withBackendErrorStream(
        () => _attendeesRef
            .where('eventId', isEqualTo: eventId)
            .limit(ReadLimitPolicy.boundedWorkingSet)
            .snapshots()
            .map((snapshot) {
              final attendees = snapshot.docs
                  .map((document) => document.data())
                  .where(
                    (attendee) =>
                        attendee.status != EventAttendeeStatus.cancelled,
                  )
                  .toList();
              attendees.sort(
                (left, right) => left.displayName.toLowerCase().compareTo(
                  right.displayName.toLowerCase(),
                ),
              );
              return attendees;
            }),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch operational event attendees',
          resource: _collectionPath,
        ),
      );

  Future<EventAttendeeImportResult> importAttendees({
    required String eventId,
    required String importKey,
    required String fileName,
    required EventAttendeeImportFormat format,
    required List<EventAttendeeImportRow> rows,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('importEventAttendees')
          .call<Object?>(
            ImportEventAttendeesCallableRequest(
              eventId: eventId,
              importKey: importKey,
              fileName: fileName,
              format: format.name,
              rows: rows.map((row) => row.toJson()).toList(growable: false),
            ).toJson(),
          );
      return EventAttendeeImportResult.fromCallableData(result.data);
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'import operational event attendees',
      resource: _collectionPath,
    ),
  );

  Future<EventAttendeeAttendanceResult> setAttendance({
    required String eventId,
    required String attendeeId,
    required bool desiredCheckedIn,
    required int expectedRevision,
    required String clientOperationId,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('setEventAttendeeAttendance')
          .call<Object?>(
            SetEventAttendeeAttendanceCallableRequest(
              eventId: eventId,
              attendeeId: attendeeId,
              desiredCheckedIn: desiredCheckedIn,
              expectedRevision: expectedRevision,
              clientOperationId: clientOperationId,
            ).toJson(),
          );
      return EventAttendeeAttendanceResult.fromCallableData(result.data);
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'mark operational attendee attendance',
      resource: _collectionPath,
    ),
  );

  /// Compatibility boundary for released clients. New Host code must use
  /// [setAttendance] so retries never invert state.
  @Deprecated('Use setAttendance with an absolute desired state.')
  Future<bool> markAttendance({
    required String eventId,
    required String attendeeId,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('markEventAttendeeAttendance')
          .call<Object?>(
            MarkEventAttendeeAttendanceCallableRequest(
              eventId: eventId,
              attendeeId: attendeeId,
            ).toJson(),
          );
      final data = result.data;
      if (data case {'attended': final bool attended}) return attended;
      throw const FormatException('Invalid operational attendance response.');
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'mark operational attendee attendance',
      resource: _collectionPath,
    ),
  );

  Future<EventRosterHandoffInstructions> createRosterHandoff({
    required String eventId,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('createEventRosterHandoff')
          .call<Object?>(
            CreateEventRosterHandoffCallableRequest(eventId: eventId).toJson(),
          );
      return EventRosterHandoffInstructions.fromCallableData(result.data);
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'create event roster forwarding instructions',
      resource: _collectionPath,
    ),
  );
}

// keepalive: One Firebase-backed repository instance serves every Host event.
@Riverpod(keepAlive: true)
EventAttendeeRepository eventAttendeeRepository(Ref ref) =>
    EventAttendeeRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(firebaseFunctionsProvider),
    );

@riverpod
Stream<List<EventAttendee>> watchEventAttendees(Ref ref, String eventId) =>
    ref.watch(eventAttendeeRepositoryProvider).watchForEvent(eventId);

class EventAttendeeAttendanceResult {
  const EventAttendeeAttendanceResult({
    required this.attendeeId,
    required this.checkedIn,
    required this.acceptedRevision,
    required this.replayed,
    required this.changed,
  });

  factory EventAttendeeAttendanceResult.fromCallableData(Object? value) {
    if (value case final Map<Object?, Object?> data) {
      return EventAttendeeAttendanceResult(
        attendeeId: data['attendeeId'] as String,
        checkedIn: data['checkedIn'] as bool,
        acceptedRevision: (data['acceptedRevision'] as num).toInt(),
        replayed: data['replayed'] as bool,
        changed: data['changed'] as bool,
      );
    }
    throw const FormatException('Invalid operational attendance response.');
  }

  final String attendeeId;
  final bool checkedIn;
  final int acceptedRevision;
  final bool replayed;
  final bool changed;
}
