import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_attendance_report.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/get_event_attendance_report_callable_request.g.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_attendance_report_repository.g.dart';

/// Reads the canonical report without inferring counts from legacy scorecards.
class EventAttendanceReportRepository {
  const EventAttendanceReportRepository(this._functions);
  final FirebaseFunctions _functions;

  Future<EventAttendanceReportView> fetch(EventAssistanceRuntimeScope scope) =>
      withBackendErrorContext(
        () async {
          final response = await _functions
              .httpsCallable('getEventAttendanceReport')
              .call<Object?>(
                GetEventAttendanceReportCallableRequest(
                  context: scope.context,
                ).toJson(),
              );
          return EventAttendanceReportView.fromCallableData(
            response.data,
            expectedScope: scope,
          );
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'load attendance report',
          resource: 'eventAttendees',
        ),
        mapper: mapMissingCallableAsUnavailable,
      );
}

@riverpod
EventAttendanceReportRepository eventAttendanceReportRepository(Ref ref) =>
    EventAttendanceReportRepository(ref.watch(firebaseFunctionsProvider));
