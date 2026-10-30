import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff_change.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callables/get_event_assistance_group_staff_callable_request.g.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_group_staff_repository.g.dart';

class EventAssistanceGroupStaffRepository {
  const EventAssistanceGroupStaffRepository(this._functions);
  final FirebaseFunctions _functions;

  Future<EventAssistanceGroupStaffView> fetch(
    EventAssistanceGroupStaffLookup lookup,
  ) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('getEventAssistanceGroupStaff')
          .call<Object?>(
            GetEventAssistanceGroupStaffCallableRequest(
              context: lookup.group.context,
              groupId: lookup.group.groupId,
              phoneNumber: lookup.phoneNumber,
            ).toJson(),
          );
      final result = EventAssistanceGroupStaffResult.fromCallableData(
        response.data,
        expectedLookup: lookup,
      );
      if (result.outcome != AssistanceGroupStaffOutcome.read) {
        throw const FormatException('Invalid group staff lookup outcome.');
      }
      return result.view;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'look up group staff',
      resource: 'eventStaffGrants',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );

  Future<EventAssistanceGroupStaffResult> apply(
    EventAssistanceGroupStaffChange change,
  ) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('setEventAssistanceGroupStaff')
          .call<Object?>(change.toJson());
      final result = EventAssistanceGroupStaffResult.fromCallableData(
        response.data,
        expectedLookup: change.snapshot.lookup,
      );
      change.requireResult(result);
      return result;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'change group staff duty',
      resource: 'eventStaffGrants',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );
}

@riverpod
EventAssistanceGroupStaffRepository eventAssistanceGroupStaffRepository(
  Ref ref,
) => EventAssistanceGroupStaffRepository(ref.watch(firebaseFunctionsProvider));
