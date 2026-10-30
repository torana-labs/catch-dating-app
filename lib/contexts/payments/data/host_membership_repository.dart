import 'package:catch_dating_app/contexts/payments/domain/host_membership.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_benefit_use.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_checkout.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_plan.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_membership_repository.g.dart';

/// Member-side reads and commands for paid host memberships. Every write is
/// a callable; Firestore reads are limited by rules to the member's own
/// records and published plans.
class HostMembershipRepository {
  const HostMembershipRepository({required this._db, required this._functions});

  static const _memberships = 'hostMemberships';
  static const _plans = 'hostMembershipPlans';
  static const _benefitUses = 'hostMembershipBenefitUses';

  final FirebaseFirestore _db;
  final FirebaseFunctions _functions;

  Stream<List<HostMembership>> watchMyMemberships(String uid) =>
      withBackendErrorStream(
        () => _db
            .collection(_memberships)
            .where('uid', isEqualTo: uid)
            .limit(ReadLimitPolicy.historyPage)
            .snapshots()
            .map(
              (snap) => List.unmodifiable(
                snap.docs.map(
                  (doc) => HostMembership.fromMap(doc.id, doc.data()),
                ),
              ),
            ),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch memberships',
          resource: _memberships,
        ),
      );

  Stream<List<HostMembershipBenefitUse>> watchMyBenefitUses(String uid) =>
      withBackendErrorStream(
        () => _db
            .collection(_benefitUses)
            .where('uid', isEqualTo: uid)
            .limit(ReadLimitPolicy.boundedWorkingSet)
            .snapshots()
            .map(
              (snap) => List.unmodifiable(
                snap.docs.map(
                  (doc) => HostMembershipBenefitUse.fromMap(doc.id, doc.data()),
                ),
              ),
            ),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch membership savings',
          resource: _benefitUses,
        ),
      );

  Stream<List<HostMembershipPlan>> watchPublishedPlans(
    String organizerId,
  ) => withBackendErrorStream(
    // firestore-index: hostMembershipPlans (organizerId:ASCENDING,status:ASCENDING)
    () => _db
        .collection(_plans)
        .where('organizerId', isEqualTo: organizerId)
        .where('status', isEqualTo: HostMembershipPlanStatus.published.name)
        .limit(ReadLimitPolicy.directoryPage)
        .snapshots()
        .map(
          (snap) => List<HostMembershipPlan>.unmodifiable(
            snap.docs
                .map((doc) => HostMembershipPlan.fromMap(doc.id, doc.data()))
                .toList()
              ..sort(
                (a, b) => a.sortOrder.compareTo(b.sortOrder) != 0
                    ? a.sortOrder.compareTo(b.sortOrder)
                    : a.name.compareTo(b.name),
              ),
          ),
        ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch membership plans',
      resource: _plans,
    ),
  );

  Future<HostMembershipCheckout> prepareCheckout({
    required String organizerId,
    required String planId,
    required HostMembershipInterval interval,
  }) => _checkout({
    'action': 'prepare',
    'organizerId': organizerId,
    'planId': planId,
    'interval': interval.name,
  }, action: 'start membership checkout');

  Future<HostMembershipCheckout> refreshCheckout(String checkoutId) =>
      _checkout({
        'action': 'refresh',
        'checkoutId': checkoutId,
      }, action: 'refresh membership checkout');

  Future<HostMembershipCheckout> _checkout(
    Map<String, Object?> payload, {
    required String action,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('manageHostMembershipCheckout')
          .call<Object?>(payload);
      return HostMembershipCheckout.fromResponse(result.data);
    },
    context: BackendErrorContext(
      service: BackendService.functions,
      action: action,
      resource: 'manageHostMembershipCheckout',
    ),
  );

  Future<void> manageMembership({
    required String membershipId,
    required HostMembershipAction action,
  }) => withBackendErrorContext(
    () => _functions.httpsCallable('manageMyHostMembership').call<Object?>({
      'action': action.name,
      'membershipId': membershipId,
    }),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'change membership',
      resource: 'manageMyHostMembership',
    ),
  );
}

@riverpod
HostMembershipRepository hostMembershipRepository(Ref ref) =>
    HostMembershipRepository(
      db: ref.watch(firebaseFirestoreProvider),
      functions: ref.watch(firebaseFunctionsProvider),
    );

@riverpod
Stream<List<HostMembership>> watchMyHostMemberships(Ref ref, String uid) =>
    ref.watch(hostMembershipRepositoryProvider).watchMyMemberships(uid);

@riverpod
Stream<List<HostMembershipBenefitUse>> watchMyHostMembershipBenefitUses(
  Ref ref,
  String uid,
) => ref.watch(hostMembershipRepositoryProvider).watchMyBenefitUses(uid);

@riverpod
Stream<List<HostMembershipPlan>> watchPublishedHostMembershipPlans(
  Ref ref,
  String organizerId,
) => ref
    .watch(hostMembershipRepositoryProvider)
    .watchPublishedPlans(organizerId);
