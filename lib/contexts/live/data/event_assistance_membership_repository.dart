import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/get_event_assistance_membership_callable_request.g.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/transfer_event_assistance_group_callable_request.g.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_membership_repository.g.dart';

class EventAssistanceMembershipRepository {
  const EventAssistanceMembershipRepository(this._functions);
  final FirebaseFunctions _functions;

  Future<EventAssistanceMembershipView> fetch(
    EventAssistanceGuestScope scope,
  ) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('getEventAssistanceMembership')
          .call<Object?>(
            GetEventAssistanceMembershipCallableRequest(
              context: scope.context,
              attendeeId: scope.attendeeId,
            ).toJson(),
          );
      final result = EventAssistanceMembershipResult.fromCallableData(
        response.data,
        expectedScope: scope,
      );
      if (result.outcome != AssistanceMembershipOutcome.read) {
        throw const FormatException('Invalid membership read outcome.');
      }
      return result.view;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'load guest group membership',
      resource: 'eventAssistanceMemberships',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );

  Future<EventAssistanceMembershipResult> apply(
    EventAssistanceMembershipChange change,
  ) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('transferEventAssistanceGroup')
          .call<Object?>(
            TransferEventAssistanceGroupCallableRequest(
              command: change.command,
              expectedSourceHash: change.snapshot.sourceHash,
            ).toJson(),
          );
      final result = EventAssistanceMembershipResult.fromCallableData(
        response.data,
        expectedScope: change.snapshot.scope,
      );
      change.requireResult(result);
      return result;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'change guest group membership',
      resource: 'eventAssistanceMemberships',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );
}

@riverpod
EventAssistanceMembershipRepository eventAssistanceMembershipRepository(
  Ref ref,
) => EventAssistanceMembershipRepository(ref.watch(firebaseFunctionsProvider));
