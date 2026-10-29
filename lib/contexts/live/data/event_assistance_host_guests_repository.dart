import 'package:catch_dating_app/contexts/live/domain/event_assistance_host_guests.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/get_event_assistance_host_guests_callable_request.g.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_host_guests_repository.g.dart';

/// Reads selected guests through current server authority. No SDK writes,
/// hidden enrollment, evaluation, message delivery or attendance inference.
class EventAssistanceHostGuestsRepository {
  const EventAssistanceHostGuestsRepository(this._functions);
  final FirebaseFunctions _functions;

  Future<EventAssistanceHostGuestsView> fetch(
    EventAssistanceGuestSelection selection,
  ) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('getEventAssistanceHostGuests')
          .call<Object?>(
            GetEventAssistanceHostGuestsCallableRequest(
              context: selection.context,
              attendeeIds: selection.attendeeIds,
            ).toJson(),
          );
      return EventAssistanceHostGuestsView.fromCallableData(
        result.data,
        expectedSelection: selection,
      );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'load guest assistance',
      resource: 'eventAssistanceGuests',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );
}

@riverpod
EventAssistanceHostGuestsRepository eventAssistanceHostGuestsRepository(
  Ref ref,
) => EventAssistanceHostGuestsRepository(ref.watch(firebaseFunctionsProvider));
