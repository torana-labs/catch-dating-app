import 'package:catch_dating_app/contexts/payments/domain/host_membership.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_benefit_use.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_checkout.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_entitlement.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_plan.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
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
  static const _eventRules = 'eventMembershipRules';

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

  /// The member's booked member-price uses with one organizer whose event
  /// starts after [startingAfterMillis], earliest first and at most [limit].
  /// The server's cap reader runs the same query in
  /// `functions/src/hostMemberships/entitlementReader.ts`.
  Stream<List<HostMembershipBenefitUse>> watchUpcomingBenefitUses({
    required String uid,
    required String organizerId,
    required int startingAfterMillis,
    required int limit,
  }) => withBackendErrorStream(
    // firestore-index: hostMembershipBenefitUses (uid:ASCENDING,organizerId:ASCENDING,state:ASCENDING,eventStartMillis:ASCENDING)
    () => _db
        .collection(_benefitUses)
        .where('uid', isEqualTo: uid)
        .where('organizerId', isEqualTo: organizerId)
        .where('state', isEqualTo: HostMembershipBenefitUse.bookedState)
        .where('eventStartMillis', isGreaterThan: startingAfterMillis)
        .orderBy('eventStartMillis')
        .limit(limit)
        .snapshots()
        .map(
          (snap) => List<HostMembershipBenefitUse>.unmodifiable(
            snap.docs.map(
              (doc) => HostMembershipBenefitUse.fromMap(doc.id, doc.data()),
            ),
          ),
        ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch upcoming member-priced bookings',
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

  /// A published event's paid-membership rules; null when it has none.
  Stream<EventMembershipRules?> watchEventRules(String eventId) =>
      withBackendErrorStream(
        () => _db.collection(_eventRules).doc(eventId).snapshots().map((snap) {
          final data = snap.data();
          return data == null ? null : EventMembershipRules.fromMap(data);
        }),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch event membership rules',
          resource: _eventRules,
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
Stream<List<HostMembershipBenefitUse>> watchUpcomingHostMembershipBenefitUses(
  Ref ref, {
  required String uid,
  required String organizerId,
  required int startingAfterMillis,
  required int limit,
}) => ref
    .watch(hostMembershipRepositoryProvider)
    .watchUpcomingBenefitUses(
      uid: uid,
      organizerId: organizerId,
      startingAfterMillis: startingAfterMillis,
      limit: limit,
    );

@riverpod
Stream<List<HostMembershipPlan>> watchPublishedHostMembershipPlans(
  Ref ref,
  String organizerId,
) => ref
    .watch(hostMembershipRepositoryProvider)
    .watchPublishedPlans(organizerId);

@riverpod
Stream<EventMembershipRules?> watchEventMembershipRules(
  Ref ref,
  String eventId,
) => ref.watch(hostMembershipRepositoryProvider).watchEventRules(eventId);
