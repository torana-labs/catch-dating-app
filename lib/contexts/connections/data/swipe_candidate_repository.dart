import 'package:catch_dating_app/contexts/connections/data/swipe_candidate_callable_response.dart';
import 'package:catch_dating_app/contexts/profiles/profiles.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show EventIdCallableRequest;
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'swipe_candidate_repository.g.dart';

class SwipeCandidateRepository {
  const SwipeCandidateRepository(this._functions);

  final FirebaseFunctions _functions;

  Future<List<PublicProfile>> fetchCandidates({required String eventId}) =>
      withBackendErrorContext(
        () async {
          final result = await _functions
              .httpsCallable('fetchSwipeCandidates')
              .call<Object?>(EventIdCallableRequest(eventId: eventId).toJson());
          return FetchSwipeCandidatesCallableResponse.fromCallableData(
            result.data,
          ).profiles;
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'fetch swipe candidates',
          resource: 'fetchSwipeCandidates',
        ),
      );
}

@riverpod
SwipeCandidateRepository swipeCandidateRepository(Ref ref) =>
    SwipeCandidateRepository(ref.watch(firebaseFunctionsProvider));

@riverpod
Future<List<PublicProfile>> swipeCandidates(Ref ref, String eventId) => ref
    .watch(swipeCandidateRepositoryProvider)
    .fetchCandidates(eventId: eventId);
