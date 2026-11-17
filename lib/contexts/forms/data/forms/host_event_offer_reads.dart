import 'dart:async';
import 'dart:convert';

import 'package:catch_dating_app/contexts/forms/domain/forms/host_event_offer.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:crypto/crypto.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_event_offer_reads.g.dart';

/// Lists the offers of an event for the given contacts while listened to.
typedef HostEventOffersWatch =
    Stream<List<Map<String, Object?>>> Function({
      required String organizerId,
      required String eventId,
      required Set<String> contactIds,
    });

/// One contact's offer for an event while listened to; null while none.
typedef HostEventOfferWatch =
    Stream<HostEventOffer?> Function({
      required String organizerId,
      required String eventId,
      required String contactId,
    });

/// Manager listeners on `organizerEventOffers`: rules let a current manager
/// of the offer's organizer read it. The stored document is exactly what
/// `getEventOffer` returned; the effective status (an offered offer past
/// its expiry reads as expired) comes from the app clock. Never authority:
/// every command still rechecks the offer's revision and generation.
class HostEventOfferReads {
  const HostEventOfferReads(this._db, {this.clock = const AppClock()});

  static const _collection = 'organizerEventOffers';

  /// The most contacts one list listens to (Firestore's `in` bound). An
  /// offer workspace holds at most 25 responses.
  static const maxContacts = 30;

  /// How long a read after a write waits for the written revision.
  static const writeVisibleTimeout = Duration(seconds: 30);

  final FirebaseFirestore _db;
  final AppClock clock;

  /// The server's offer document id for one contact on one event.
  static String offerId({
    required String organizerId,
    required String eventId,
    required String contactId,
  }) {
    final digest = sha256
        .convert(utf8.encode([organizerId, eventId, contactId].join('\u001f')))
        .toString()
        .substring(0, 40);
    // copy:allow-inline(Server offer document identity, never rendered as product copy.)
    return 'applicationoffer_$digest';
  }

  /// The event's offers to [contactIds] while listened to, as list items
  /// (the shape `listEventOffers` returned), lowest offer id first. The
  /// device cache serves the last list at once and changes arrive live.
  Stream<List<Map<String, Object?>>> watchOffers({
    required String organizerId,
    required String eventId,
    required Set<String> contactIds,
  }) {
    if (contactIds.isEmpty) return Stream.value(const []);
    if (contactIds.length > maxContacts) {
      throw ArgumentError('At most $maxContacts contacts per offer list.');
    }
    return withBackendErrorStream(
      // firestore-index: organizerEventOffers (organizerId:ASCENDING,eventId:ASCENDING,contactId:ASCENDING)
      () => _db
          .collection(_collection)
          .where('organizerId', isEqualTo: organizerId)
          .where('eventId', isEqualTo: eventId)
          .where('contactId', whereIn: contactIds.toList()..sort())
          .snapshots()
          .map((snapshot) {
            final now = clock.now();
            final items =
                [
                  for (final doc in snapshot.docs)
                    _item(
                      _offer(doc.id, doc.data(), now),
                      organizerId: organizerId,
                      eventId: eventId,
                    ),
                ]..sort(
                  (a, b) => (a['offerId']! as String).compareTo(
                    b['offerId']! as String,
                  ),
                );
            return List<Map<String, Object?>>.unmodifiable(items);
          }),
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch event offers',
        resource: _collection,
      ),
    );
  }

  /// One contact's offer for the event while listened to; null while there
  /// is none. A document the device has not cached yet stays loading offline
  /// instead of reading as missing.
  Stream<HostEventOffer?> watchOffer({
    required String organizerId,
    required String eventId,
    required String contactId,
  }) {
    final id = offerId(
      organizerId: organizerId,
      eventId: eventId,
      contactId: contactId,
    );
    return withBackendErrorStream(
      () => _db
          .collection(_collection)
          .doc(id)
          .snapshots()
          .where((doc) => doc.exists || !doc.metadata.isFromCache)
          .map((doc) {
            final data = doc.data();
            if (data == null) return null;
            final offer = _offer(doc.id, data, clock.now());
            if (offer.organizerId != organizerId ||
                offer.eventId != eventId ||
                offer.contactId != contactId) {
              throw const FormatException('Offer detail does not match.');
            }
            return offer;
          }),
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch event offer',
        resource: _collection,
      ),
    );
  }

  /// The offer once its listener shows at least [minRevision]: after a
  /// command is acknowledged, the revision it wrote. Fails after
  /// [writeVisibleTimeout] rather than waiting forever.
  Future<HostEventOffer> currentOffer({
    required String organizerId,
    required String eventId,
    required String contactId,
    int minRevision = 1,
  }) async =>
      (await watchOffer(
            organizerId: organizerId,
            eventId: eventId,
            contactId: contactId,
          )
          .firstWhere((offer) => offer != null && offer.revision >= minRevision)
          .timeout(writeVisibleTimeout))!;

  static HostEventOffer _offer(
    String id,
    Map<String, Object?> data,
    DateTime now,
  ) {
    if (data['offerId'] != id) {
      throw const FormatException('Offer identity is invalid.');
    }
    final stored = {...data, 'sourceKind': data['sourceKind'] ?? 'application'};
    final status = stored['status'];
    final expires = stored['expiresAtMillis'];
    final expired =
        status == 'offered' &&
        expires is int &&
        now.millisecondsSinceEpoch >= expires;
    return HostEventOffer.fromCallableData({
      'offer': stored,
      'effectiveStatus': expired ? 'expired' : status,
    });
  }

  static Map<String, Object?> _item(
    HostEventOffer offer, {
    required String organizerId,
    required String eventId,
  }) {
    if (offer.organizerId != organizerId || offer.eventId != eventId) {
      throw const FormatException('Offer list contains a foreign event.');
    }
    return {
      'offerId': offer.offerId,
      'eventId': offer.eventId,
      'contactId': offer.contactId,
      'sourceKind': offer.sourceKind.name,
      'sourceId': offer.sourceId,
      'status': offer.status.name,
      'effectiveStatus': offer.effectiveStatus.name,
      'paymentStatus': offer.manualPayment.status.name,
      'revision': offer.revision,
      'generation': offer.generation,
      'expiresAtMillis': offer.expiresAt.millisecondsSinceEpoch,
    };
  }
}

@riverpod
HostEventOfferReads hostEventOfferReads(Ref ref) => HostEventOfferReads(
  ref.watch(firebaseFirestoreProvider),
  clock: ref.watch(appClockProvider),
);
