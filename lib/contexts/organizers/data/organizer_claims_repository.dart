import 'package:catch_dating_app/contexts/organizers/domain/claimable_organizer.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show RequestOrganizerClaimCallableRequest;
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'organizer_claims_repository.g.dart';

/// Claiming a page Catch already holds. `findClaimableOrganizers` lists the
/// pages it found for the signed-in person's verified number (the server
/// reads the number from the sign-in, never from the app);
/// `requestOrganizerClaim` asks for one, and staff or the website's
/// Instagram or Luma check approve it.
class OrganizerClaimsRepository {
  const OrganizerClaimsRepository(this._functions);

  static const _resource = 'organizerClaimRequests';

  final FirebaseFunctions _functions;

  /// The pages found for this person's number. While the feature is off the
  /// answer is [ClaimableOrganizers.none].
  Future<ClaimableOrganizers> findClaimableOrganizers() =>
      withBackendErrorContext(
        () async {
          final result = await _functions
              .httpsCallable('findClaimableOrganizers')
              .call<Object?>(const <String, Object?>{});
          return ClaimableOrganizers.fromCallableData(result.data);
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'find claimable organizers',
          resource: _resource,
        ),
      );

  /// Asks to claim [organizerId]; returns the claim request's id.
  Future<String> requestClaim({
    required String organizerId,
    required String requesterName,
    required OrganizerClaimRole role,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('requestOrganizerClaim')
          .call<Object?>(
            RequestOrganizerClaimCallableRequest(
              organizerId: organizerId,
              requesterName: requesterName.trim(),
              requesterRole: role.name,
            ).toJson(),
          );
      final data = result.data;
      final requestId = data is Map<Object?, Object?>
          ? data['requestId']
          : null;
      if (requestId is! String || requestId.isEmpty) {
        throw StateError(
          'requestOrganizerClaim response was missing requestId.',
        );
      }
      return requestId;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'request organizer claim',
      resource: _resource,
    ),
  );
}

// keepalive: account-free: one stateless callable client for claim reads
// and requests, shared by Catch Host setup across its steps.
@Riverpod(keepAlive: true)
OrganizerClaimsRepository organizerClaimsRepository(Ref ref) =>
    OrganizerClaimsRepository(ref.watch(firebaseFunctionsProvider));
