import 'package:catch_dating_app/contexts/live/domain/event_assignment_feature_choice.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callables/list_event_assignment_feature_choices_callable_request.g.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assignment_feature_choice_repository.g.dart';

abstract interface class EventAssignmentFeatureChoiceStore {
  Future<EventAssignmentFeatureChoices> list(String eventId);
  Future<void> decide({
    required String eventId,
    required EventAssignmentFeatureChoice choice,
    required bool grant,
    required String requestId,
  });
}

@riverpod
EventAssignmentFeatureChoiceStore eventAssignmentFeatureChoiceStore(Ref ref) =>
    EventAssignmentFeatureChoiceRepository(
      ref.watch(firebaseFunctionsProvider),
    );

/// Matching consent is independent of form sharing and messaging permission.
class EventAssignmentFeatureChoiceRepository
    implements EventAssignmentFeatureChoiceStore {
  const EventAssignmentFeatureChoiceRepository(this._functions);
  final FirebaseFunctions _functions;

  @override
  Future<EventAssignmentFeatureChoices> list(String eventId) =>
      withBackendErrorContext(
        () async {
          final result = await _functions
              .httpsCallable('listEventAssignmentFeatureChoices')
              .call<Object?>(
                ListEventAssignmentFeatureChoicesCallableRequest(
                  eventId: eventId,
                ).toJson(),
              );
          return EventAssignmentFeatureChoices.fromJson(result.data, eventId);
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'review own event matching answers',
          resource: 'eventAssignmentFeatureConsents',
        ),
        mapper: mapMissingCallableAsUnavailable,
      );

  @override
  Future<void> decide({
    required String eventId,
    required EventAssignmentFeatureChoice choice,
    required bool grant,
    required String requestId,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('setEventAssignmentFeatureConsent')
          .call<Object?>({
            'eventId': eventId,
            'featureId': choice.featureId,
            'responseId': choice.responseId,
            'decision': grant ? 'grant' : 'withdraw',
            'expectedRevision': choice.revision,
            'requestId': requestId,
          });
      final body = result.data;
      if (body is! Map ||
          body['eventId'] != eventId ||
          body['featureId'] != choice.featureId ||
          body['status'] != (grant ? 'granted' : 'withdrawn') ||
          body['revision'] is! int ||
          (body['revision'] as int) <= choice.revision ||
          body['receiptId'] is! String ||
          body['replayed'] is! bool) {
        throw const FormatException('Invalid matching decision response.');
      }
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'save event matching permission',
      resource: 'eventAssignmentFeatureConsents',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );
}
