import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting_result.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/get_event_assistance_setting_callable_request.g.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_late_join_setting_repository.g.dart';

/// Preferences use manager-authorized callables, without Firestore or sends.
class EventAssistanceLateJoinSettingRepository {
  const EventAssistanceLateJoinSettingRepository(this._functions);
  final FirebaseFunctions _functions;

  Future<LateJoinSettingView> fetch(EventAssistanceGroupScope scope) =>
      withBackendErrorContext(
        () async {
          final response = await _functions
              .httpsCallable('getEventAssistanceSetting')
              .call<Object?>(
                GetEventAssistanceSettingCallableRequest(
                  context: scope.context,
                  groupId: scope.groupId,
                  workflowKind: 'lateJoin',
                ).toJson(),
              );
          return LateJoinSettingResult.fromCallableData(
            response.data,
            expectedScope: scope,
          ).view;
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'load late arrival settings',
          resource: 'eventAssistanceSettings',
        ),
        mapper: mapMissingCallableAsUnavailable,
      );

  Future<LateJoinSettingResult> apply(LateJoinSettingChange change) =>
      withBackendErrorContext(
        () async {
          final response = await _functions
              .httpsCallable('setEventAssistanceSetting')
              .call<Object?>(change.toJson());
          return LateJoinSettingResult.fromCallableData(
            response.data,
            expectedScope: change.snapshot.scope,
            expectedChange: change,
          );
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'save late arrival settings',
          resource: 'eventAssistanceSettings',
        ),
        mapper: mapMissingCallableAsUnavailable,
      );
}

/// Typed mutation seam used by the late-arrival setting editor.
final class EventAssistanceLateJoinSettingCommands {
  const EventAssistanceLateJoinSettingCommands(this._repository);

  final EventAssistanceLateJoinSettingRepository _repository;

  Future<LateJoinSettingResult> apply(LateJoinSettingChange change) =>
      _repository.apply(change);
}

@riverpod
EventAssistanceLateJoinSettingRepository
eventAssistanceLateJoinSettingRepository(Ref ref) =>
    EventAssistanceLateJoinSettingRepository(
      ref.watch(firebaseFunctionsProvider),
    );

@riverpod
EventAssistanceLateJoinSettingCommands eventAssistanceLateJoinSettingCommands(
  Ref ref,
) => EventAssistanceLateJoinSettingCommands(
  ref.watch(eventAssistanceLateJoinSettingRepositoryProvider),
);
