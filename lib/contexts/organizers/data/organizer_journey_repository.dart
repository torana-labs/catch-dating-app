import 'package:catch_dating_app/contexts/organizers/domain/organizer_journey.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'organizer_journey_repository.g.dart';

class OrganizerJourneyRepository {
  const OrganizerJourneyRepository(this._functions);

  final FirebaseFunctions _functions;

  /// One organizer's journey for its hosts, or, with null, each page the caller
  /// is waiting to claim.
  Future<List<OrganizerJourney>> list(String? organizerId) =>
      withBackendErrorContext(
        () async {
          final result = await _functions
              .httpsCallable('listMyOrganizerJourneys')
              .call<Object?>(
                ListMyOrganizerJourneysCallableRequest(
                  organizerId: organizerId,
                ).toJson(),
              );
          final data = Map<String, Object?>.from(result.data! as Map);
          return [
            for (final journey in data['journeys']! as List<Object?>)
              OrganizerJourney.fromJson(
                Map<String, Object?>.from(journey! as Map),
              ),
          ];
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'list organizer journeys',
          resource: 'listMyOrganizerJourneys',
        ),
      );
}

@riverpod
OrganizerJourneyRepository organizerJourneyRepository(Ref ref) =>
    OrganizerJourneyRepository(ref.watch(firebaseFunctionsProvider));

Duration? _noJourneyReadRetry(int retryCount, Object error) => null;

/// No background retry: the sheet has its own Retry, and Today's waiting claims
/// show nothing if the read fails.
@Riverpod(retry: _noJourneyReadRetry)
Future<List<OrganizerJourney>> organizerJourneys(
  Ref ref,
  String? organizerId,
) => ref.watch(organizerJourneyRepositoryProvider).list(organizerId);
