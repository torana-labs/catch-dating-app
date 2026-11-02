import 'package:catch_dating_app/contexts/bookings/domain/host_request.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_requests_repository.g.dart';

/// Everyone waiting across an organizer's coming events, read through a
/// host-authorized callable: an organizer-wide list can't pass the
/// per-event Firestore rule on `eventParticipations`.
class HostRequestsRepository {
  const HostRequestsRepository(this._functions);

  final FirebaseFunctions _functions;

  Future<HostRequests> list(String organizerId) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('listOrganizerRequests')
          .call<Object?>(
            ListOrganizerRequestsCallableRequest(
              organizerId: organizerId,
            ).toJson(),
          );
      return HostRequests.fromJson(
        Map<String, Object?>.from(result.data! as Map),
      );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'list organizer requests',
      resource: 'listOrganizerRequests',
    ),
  );
}

@riverpod
HostRequestsRepository hostRequestsRepository(Ref ref) =>
    HostRequestsRepository(ref.watch(firebaseFunctionsProvider));

Duration? _noRequestsReadRetry(int retryCount, Object error) => null;

/// The sidebar watches this from the Host shell, so a failed read must not
/// keep retrying in the background. The Requests screen offers its own Retry.
@Riverpod(retry: _noRequestsReadRetry)
Future<HostRequests> hostOrganizerRequests(Ref ref, String organizerId) =>
    ref.watch(hostRequestsRepositoryProvider).list(organizerId);
