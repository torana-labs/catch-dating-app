import 'package:catch_dating_app/contexts/live/domain/event_assistance_deliveries_page.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_scope.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/list_event_assistance_deliveries_callable_request.g.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/repair_event_assistance_delivery_callable_request.g.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_deliveries_repository.g.dart';

class EventAssistanceDeliveriesRepository {
  const EventAssistanceDeliveriesRepository(this._functions);
  final FirebaseFunctions _functions;

  Future<EventAssistanceDeliveriesPage> fetch(
    EventAssistanceDeliveryQuery query,
  ) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('listEventAssistanceDeliveries')
          .call<Object?>(
            ListEventAssistanceDeliveriesCallableRequest(
              context: query.context,
              cursor: query.cursor,
            ).toJson(),
          );
      return EventAssistanceDeliveriesPage.fromCallableData(
        response.data,
        expectedQuery: query,
      );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'load event message deliveries',
      resource: 'eventAssistanceMessages',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );

  Future<EventAssistanceDeliveryResult> apply(
    EventAssistanceDeliveryChange change,
  ) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('repairEventAssistanceDelivery')
          .call<Object?>(
            RepairEventAssistanceDeliveryCallableRequest(
              command: change.command,
              expectedMessageRevision: change.snapshot.revision,
              expectedReviewHash: change.snapshot.reviewHash,
            ).toJson(),
          );
      return EventAssistanceDeliveryResult.fromCallableData(
        response.data,
        expectedChange: change,
      );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'take over message delivery',
      resource: 'eventAssistanceMessages',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );
}

@riverpod
EventAssistanceDeliveriesRepository eventAssistanceDeliveriesRepository(
  Ref ref,
) => EventAssistanceDeliveriesRepository(ref.watch(firebaseFunctionsProvider));
