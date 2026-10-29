import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_result.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_setting.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/get_event_assistance_runtime_config_callable_request.g.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_runtime_repository.g.dart';

class EventAssistanceRuntimeRepository {
  const EventAssistanceRuntimeRepository(this._functions);
  final FirebaseFunctions _functions;
  Future<AssistanceRuntimeView> fetch(EventAssistanceRuntimeScope scope) =>
      _fetch(scope, null);
  Future<AssistanceRuntimeView> fetchSenderPage(
    EventAssistanceRuntimeScope scope, {
    required Map<AssistanceMessageRoute, String> cursors,
  }) => _fetch(scope, Map.unmodifiable(cursors));
  Future<AssistanceRuntimeView> _fetch(
    EventAssistanceRuntimeScope scope,
    Map<AssistanceMessageRoute, String>? cursors,
  ) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('getEventAssistanceRuntimeConfig')
          .call<Object?>(
            GetEventAssistanceRuntimeConfigCallableRequest(
              context: scope.context,
              senderCursors: cursors?.map(
                (key, value) => MapEntry(key.name, value),
              ),
            ).toJson(),
          );
      final view = AssistanceRuntimeResult.fromCallableData(
        response.data,
        expectedScope: scope,
      ).view;
      if (cursors != null) {
        if (view.senderSetup == null) {
          throw const FormatException('Event sender discovery is unavailable.');
        }
        view.senderSetup!.requireAdvancing(cursors);
      }
      return view;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'load event automation',
      resource: 'eventAssistanceRuntimeConfigs',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );
  Future<AssistanceRuntimeResult> apply(AssistanceRuntimeChange change) =>
      withBackendErrorContext(
        () async {
          final response = await _functions
              .httpsCallable('setEventAssistanceRuntimeConfig')
              .call<Object?>(change.toJson());
          return AssistanceRuntimeResult.fromCallableData(
            response.data,
            expectedScope: change.snapshot.scope,
            expectedChange: change,
          );
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'save event automation',
          resource: 'eventAssistanceRuntimeConfigs',
        ),
        mapper: mapMissingCallableAsUnavailable,
      );
}

/// Typed command and pagination seam used by runtime presentation state.
final class EventAssistanceRuntimeCommands {
  const EventAssistanceRuntimeCommands(this._repository);

  final EventAssistanceRuntimeRepository _repository;

  Future<AssistanceRuntimeResult> apply(AssistanceRuntimeChange change) =>
      _repository.apply(change);

  Future<AssistanceRuntimeView> fetchSenderPage(
    EventAssistanceRuntimeScope scope, {
    required Map<AssistanceMessageRoute, String> cursors,
  }) => _repository.fetchSenderPage(scope, cursors: cursors);
}

@riverpod
EventAssistanceRuntimeRepository eventAssistanceRuntimeRepository(Ref ref) =>
    EventAssistanceRuntimeRepository(ref.watch(firebaseFunctionsProvider));

@riverpod
EventAssistanceRuntimeCommands eventAssistanceRuntimeCommands(Ref ref) =>
    EventAssistanceRuntimeCommands(
      ref.watch(eventAssistanceRuntimeRepositoryProvider),
    );
