import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_attendance_disposition.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/get_event_attendance_disposition_callable_request.g.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/record_event_no_show_callable_request.g.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_attendance_disposition_repository.g.dart';

/// Reviews and submits explicit closeout decisions through their callable owner.
class EventAttendanceDispositionRepository {
  const EventAttendanceDispositionRepository(this._functions);

  final FirebaseFunctions _functions;

  Future<EventAttendanceDispositionView> fetch(
    EventAssistanceGuestScope scope,
  ) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('getEventAttendanceDisposition')
          .call<Object?>(
            GetEventAttendanceDispositionCallableRequest(
              context: scope.context,
              attendeeId: scope.attendeeId,
            ).toJson(),
          );
      final result = EventAttendanceDispositionResult.fromCallableData(
        response.data,
        expectedScope: scope,
      );
      if (result.outcome != AttendanceDispositionOutcome.read) {
        throw const FormatException('Invalid closeout read outcome.');
      }
      return result.view;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'load attendance closeout',
      resource: 'eventAttendanceDispositions',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );

  Future<EventAttendanceDispositionResult> apply(
    EventAttendanceDispositionChange change,
  ) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('recordEventNoShow')
          .call<Object?>(
            RecordEventNoShowCallableRequest(
              command: change.command,
              expectedSourceHash: change.snapshot.sourceHash,
            ).toJson(),
          );
      final result = EventAttendanceDispositionResult.fromCallableData(
        response.data,
        expectedScope: change.snapshot.scope,
      );
      result.requireChange(change);
      return result;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'update attendance closeout',
      resource: 'eventAttendanceDispositions',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );
}

/// Typed mutation seam used by attendance closeout presentation state.
final class EventAttendanceDispositionCommands {
  const EventAttendanceDispositionCommands(this._repository);

  final EventAttendanceDispositionRepository _repository;

  Future<EventAttendanceDispositionResult> apply(
    EventAttendanceDispositionChange change,
  ) => _repository.apply(change);
}

@riverpod
EventAttendanceDispositionRepository eventAttendanceDispositionRepository(
  Ref ref,
) => EventAttendanceDispositionRepository(ref.watch(firebaseFunctionsProvider));

@riverpod
EventAttendanceDispositionCommands eventAttendanceDispositionCommands(
  Ref ref,
) => EventAttendanceDispositionCommands(
  ref.watch(eventAttendanceDispositionRepositoryProvider),
);
