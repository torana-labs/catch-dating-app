import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_journey.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'organizer_journey_repository.g.dart';

/// Listeners on `hostOrganizerJourneyViews`: one view per reader of an
/// organizer, holding only that reader's own claim. Rules let the reader get
/// their view while they manage the organizer or wait on a claim, and list
/// their waiting views; the server writes them.
class OrganizerJourneyRepository {
  const OrganizerJourneyRepository(this._firestore);

  static const views = 'hostOrganizerJourneyViews';

  /// The most pages someone can wait to claim at once, as the callable read.
  static const maxWaitingClaims = 5;
  static final _documentId = RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$');

  final FirebaseFirestore _firestore;

  /// One organizer's journey for [uid], one of its hosts; empty until the
  /// server has written it.
  Stream<List<OrganizerJourney>> watchOrganizer(
    String organizerId,
    String uid,
  ) {
    if (!_documentId.hasMatch(organizerId) || !_documentId.hasMatch(uid)) {
      throw ArgumentError('Organizer and account ids are required');
    }
    return withBackendErrorStream(
      () => _firestore
          .collection(views)
          .doc('${organizerId}_$uid')
          .snapshots()
          .map((snapshot) {
            final data = snapshot.data();
            return [
              if (data != null)
                _journey(data, uid: uid, organizerId: organizerId),
            ];
          }),
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch organizer journey',
        resource: views,
      ),
    );
  }

  /// Each page [uid] is waiting to claim.
  Stream<List<OrganizerJourney>> watchWaiting(String uid) {
    if (!_documentId.hasMatch(uid)) throw ArgumentError.value(uid, 'uid');
    return withBackendErrorStream(
      () => _firestore
          .collection(views)
          .where('uid', isEqualTo: uid)
          .where('waitingClaim', isEqualTo: true)
          .limit(maxWaitingClaims)
          .snapshots()
          .map(
            (snapshot) => [
              for (final doc in snapshot.docs) _journey(doc.data(), uid: uid),
            ],
          ),
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch waiting claims',
        resource: views,
      ),
    );
  }

  static OrganizerJourney _journey(
    Map<String, Object?> data, {
    required String uid,
    String? organizerId,
  }) {
    final journey = data['journey'];
    if (data['version'] != 1 ||
        data['uid'] != uid ||
        (organizerId != null && data['organizerId'] != organizerId) ||
        journey is! Map ||
        journey['organizerId'] != data['organizerId']) {
      throw const FormatException('Organizer journey view changed identity');
    }
    return OrganizerJourney.fromJson(Map<String, Object?>.from(journey));
  }
}

@riverpod
OrganizerJourneyRepository organizerJourneyRepository(Ref ref) =>
    OrganizerJourneyRepository(ref.watch(firebaseFirestoreProvider));

/// One organizer's journey for its hosts, or, with null, each page the
/// signed-in account is waiting to claim. A Firestore listener: a claim
/// decided while the sheet is open shows without a reload.
@riverpod
Stream<List<OrganizerJourney>> organizerJourneys(Ref ref, String? organizerId) {
  final auth = ref.watch(uidProvider);
  final uid = auth.asData?.value;
  if (uid == null || uid.isEmpty) {
    if (auth.isLoading) return const Stream.empty();
    throw const SignInRequiredException('read organizer journeys');
  }
  final repository = ref.watch(organizerJourneyRepositoryProvider);
  return organizerId == null
      ? repository.watchWaiting(uid)
      : repository.watchOrganizer(organizerId, uid);
}
