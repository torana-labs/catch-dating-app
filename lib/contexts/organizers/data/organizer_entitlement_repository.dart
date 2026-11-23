import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/streams/clocked_listener.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
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

/// What the Host app needs from an organiser's plan grants: whether a
/// weddings plan is in force.
class OrganizerEntitlement {
  const OrganizerEntitlement({
    required this.organizerId,
    required this.hasWeddingsPlan,
    this.nextChangeAt,
  });

  final String organizerId;

  /// An active, unrevoked grant of a weddings plan. Spent units still count:
  /// a planner who has used every wedding on the plan is still a planner.
  final bool hasWeddingsPlan;

  /// When a weddings plan grant next starts or ends, or null.
  final DateTime? nextChangeAt;

  /// The entitlement from a `hostOrganizerEntitlementViews` document
  /// (#2306) at [now]; a missing view means no grants. A grant is active
  /// while unrevoked and inside its validity window, as the server's
  /// `grantIsActive` decides it.
  factory OrganizerEntitlement.fromView(
    Map<Object?, Object?>? view,
    String expectedOrganizerId,
    DateTime now,
  ) {
    if (view == null) {
      return OrganizerEntitlement(
        organizerId: expectedOrganizerId,
        hasWeddingsPlan: false,
      );
    }
    final grants = view['grants'];
    if (view['organizerId'] != expectedOrganizerId ||
        view['version'] != 1 ||
        grants is! List ||
        grants.any(
          (grant) =>
              grant is! Map ||
              grant['sku'] is! String ||
              grant['validFromMillis'] is! int ||
              (grant['validUntilMillis'] != null &&
                  grant['validUntilMillis'] is! int) ||
              (grant['revokedAtMillis'] != null &&
                  grant['revokedAtMillis'] is! int),
        )) {
      throw const FormatException('Invalid organizer entitlement.');
    }
    final millis = now.millisecondsSinceEpoch;
    var active = false;
    int? next;
    for (final grant in grants.cast<Map<Object?, Object?>>()) {
      if (!organizerWeddingsPlanSkus.contains(grant['sku']) ||
          grant['revokedAtMillis'] != null) {
        continue;
      }
      final from = grant['validFromMillis']! as int;
      final until = grant['validUntilMillis'] as int?;
      if (from <= millis && (until == null || until > millis)) active = true;
      for (final instant in [from, ?until]) {
        if (instant > millis && (next == null || instant < next)) {
          next = instant;
        }
      }
    }
    return OrganizerEntitlement(
      organizerId: expectedOrganizerId,
      hasWeddingsPlan: active,
      nextChangeAt: next == null
          ? null
          : DateTime.fromMillisecondsSinceEpoch(next),
    );
  }
}

/// The organiser's plan grants read through a listener on
/// `hostOrganizerEntitlementViews` (#2306) instead of the
/// `getOrganizerEntitlement` callable. Rules admit the organiser's current
/// owner and managers; a grant starting or ending is applied on the app
/// clock with no new snapshot.
class OrganizerEntitlementRepository {
  const OrganizerEntitlementRepository(
    this._firestore, [
    this._clock = const AppClock(),
  ]);

  static const views = 'hostOrganizerEntitlementViews';

  final FirebaseFirestore _firestore;
  final AppClock _clock;

  Stream<OrganizerEntitlement> watch(String organizerId) =>
      withBackendErrorStream(
        () => clockedListener<Map<String, Object?>?, OrganizerEntitlement>(
          _firestore
              .collection(views)
              .doc(organizerId)
              .snapshots()
              .map((snapshot) => snapshot.data()),
          clock: _clock,
          build: (view, now) =>
              OrganizerEntitlement.fromView(view, organizerId, now),
          nextRebuildAt: (entitlement) => entitlement.nextChangeAt,
        ),
        context: BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch organizer plan',
          resource: organizerId,
        ),
      );
}

@riverpod
OrganizerEntitlementRepository organizerEntitlementRepository(Ref ref) =>
    OrganizerEntitlementRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(appClockProvider),
    );

/// The signed-in manager's view of one organiser's plan grants, live.
@riverpod
Stream<OrganizerEntitlement> organizerEntitlementStream(
  Ref ref,
  String organizerId,
) {
  final auth = ref.watch(uidProvider);
  final uid = !auth.isLoading && !auth.hasError ? auth.asData?.value : null;
  if (uid == null || uid.isEmpty) {
    return Stream.error(const SignInRequiredException('read organizer plan'));
  }
  return ref.watch(organizerEntitlementRepositoryProvider).watch(organizerId);
}

/// The signed-in manager's view of one organiser's plan grants.
@riverpod
Future<OrganizerEntitlement> organizerEntitlement(
  Ref ref,
  String organizerId,
) => ref.watch(organizerEntitlementStreamProvider(organizerId).future);
