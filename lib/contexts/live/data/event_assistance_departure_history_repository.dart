import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure_history.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/list_event_assistance_departure_rosters_callable_request.g.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_departure_history_repository.g.dart';

class EventAssistanceDepartureHistoryRepository {
  const EventAssistanceDepartureHistoryRepository(this._functions);
  final FirebaseFunctions _functions;

  Future<EventAssistanceDepartureHistoryPage> fetch(
    EventAssistanceDepartureHistoryQuery query, {
    required String actorUid,
  }) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('listEventAssistanceDepartureRosters')
          .call<Object?>(
            ListEventAssistanceDepartureRostersCallableRequest(
              context: query.group.context,
              groupId: query.group.groupId,
              beforeRevision: query.beforeRevision,
            ).toJson(),
          );
      return EventAssistanceDepartureHistoryPage.fromCallableData(
        response.data,
        expectedQuery: query,
        expectedActorUid: actorUid,
      );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'load departure history',
      resource: 'eventAssistanceDepartureRosters',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );
}

@riverpod
EventAssistanceDepartureHistoryRepository
eventAssistanceDepartureHistoryRepository(Ref ref) =>
    EventAssistanceDepartureHistoryRepository(
      ref.watch(firebaseFunctionsProvider),
    );
