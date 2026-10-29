import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_cases_page.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/list_event_assistance_cases_callable_request.g.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/resolve_event_assistance_case_callable_request.g.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_cases_repository.g.dart';

class EventAssistanceCasesRepository {
  const EventAssistanceCasesRepository(this._functions);
  final FirebaseFunctions _functions;

  Future<EventAssistanceCasesPage> fetch(EventAssistanceCaseQuery query) =>
      withBackendErrorContext(
        () async {
          final response = await _functions
              .httpsCallable('listEventAssistanceCases')
              .call<Object?>(
                ListEventAssistanceCasesCallableRequest(
                  context: query.context,
                  status: query.status.name,
                  cursor: query.cursor,
                ).toJson(),
              );
          return EventAssistanceCasesPage.fromCallableData(
            response.data,
            expectedQuery: query,
          );
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'load guest help requests',
          resource: 'eventAssistanceCases',
        ),
        mapper: mapMissingCallableAsUnavailable,
      );

  Future<EventAssistanceCaseResult> apply(EventAssistanceCaseChange change) =>
      withBackendErrorContext(
        () async {
          final response = await _functions
              .httpsCallable('resolveEventAssistanceCase')
              .call<Object?>(
                ResolveEventAssistanceCaseCallableRequest(
                  command: change.command,
                  expectedSourceHash: change.snapshot.sourceHash,
                ).toJson(),
              );
          return EventAssistanceCaseResult.fromCallableData(
            response.data,
            expectedChange: change,
          );
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'update guest help request',
          resource: 'eventAssistanceCases',
        ),
        mapper: mapMissingCallableAsUnavailable,
      );
}

/// Typed mutation seam used by the case editor.
final class EventAssistanceCaseCommands {
  const EventAssistanceCaseCommands(this._repository);

  final EventAssistanceCasesRepository _repository;

  Future<EventAssistanceCaseResult> apply(EventAssistanceCaseChange change) =>
      _repository.apply(change);
}

@riverpod
EventAssistanceCasesRepository eventAssistanceCasesRepository(Ref ref) =>
    EventAssistanceCasesRepository(ref.watch(firebaseFunctionsProvider));

@riverpod
EventAssistanceCaseCommands eventAssistanceCaseCommands(Ref ref) =>
    EventAssistanceCaseCommands(
      ref.watch(eventAssistanceCasesRepositoryProvider),
    );
