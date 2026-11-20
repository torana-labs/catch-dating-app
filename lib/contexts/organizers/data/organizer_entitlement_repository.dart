import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'organizer_entitlement_repository.g.dart';

/// The plans that make an organiser a weddings company. The transport
/// add-on rides on one of these, so it does not count on its own.
const organizerWeddingsPlanSkus = {
  'wedding_essentials',
  'wedding_pro',
  'wedding_signature',
  'planner_annual',
};

/// What the Host app needs from an organiser's plan grants
/// (`getOrganizerEntitlement`): whether a weddings plan is in force.
class OrganizerEntitlement {
  const OrganizerEntitlement({
    required this.organizerId,
    required this.hasWeddingsPlan,
  });

  final String organizerId;

  /// An active, unrevoked grant of a weddings plan. Spent units still count:
  /// a planner who has used every wedding on the plan is still a planner.
  final bool hasWeddingsPlan;

  factory OrganizerEntitlement.fromResponse(
    Object? data,
    String expectedOrganizerId,
  ) {
    final grants = data is Map ? data['grants'] : null;
    if (data is! Map ||
        data['organizerId'] != expectedOrganizerId ||
        grants is! List ||
        grants.any(
          (grant) =>
              grant is! Map ||
              grant['sku'] is! String ||
              grant['active'] is! bool ||
              grant['revoked'] is! bool,
        )) {
      throw const FormatException('Invalid organizer entitlement.');
    }
    return OrganizerEntitlement(
      organizerId: expectedOrganizerId,
      hasWeddingsPlan: grants.cast<Map<Object?, Object?>>().any(
        (grant) =>
            grant['active'] == true &&
            grant['revoked'] == false &&
            organizerWeddingsPlanSkus.contains(grant['sku']),
      ),
    );
  }
}

class OrganizerEntitlementRepository {
  const OrganizerEntitlementRepository(this._functions);
  final FirebaseFunctions _functions;

  Future<OrganizerEntitlement> read(String organizerId) =>
      withBackendErrorContext(
        () async {
          final result = await _functions
              .httpsCallable('getOrganizerEntitlement')
              .call<Object?>(
                GetOrganizerEntitlementCallableRequest(
                  organizerId: organizerId,
                ).toJson(),
              );
          return OrganizerEntitlement.fromResponse(result.data, organizerId);
        },
        context: BackendErrorContext(
          service: BackendService.functions,
          action: 'getOrganizerEntitlement',
          resource: organizerId,
        ),
      );
}

@riverpod
OrganizerEntitlementRepository organizerEntitlementRepository(Ref ref) =>
    OrganizerEntitlementRepository(ref.watch(firebaseFunctionsProvider));

/// The signed-in manager's view of one organiser's plan grants.
@riverpod
Future<OrganizerEntitlement> organizerEntitlement(
  Ref ref,
  String organizerId,
) async {
  final auth = ref.watch(uidProvider);
  final uid = !auth.isLoading && !auth.hasError ? auth.asData?.value : null;
  if (uid == null || uid.isEmpty) {
    throw const SignInRequiredException('read organizer plan');
  }
  final result = await ref
      .watch(organizerEntitlementRepositoryProvider)
      .read(organizerId);
  if (!ref.mounted || ref.read(uidProvider).asData?.value != uid) {
    throw const SignInRequiredException('read organizer plan');
  }
  return result;
}
