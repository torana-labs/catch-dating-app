import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_repository.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/streams/combine_latest.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_offer_configuration_reads.g.dart';

/// Manager listeners behind an event's offer settings: the event's
/// `eventSetupPreferences` document (rules let a current manager get it) and
/// the event document itself, combined on the phone.
class EventOfferConfigurationReads {
  const EventOfferConfigurationReads(this._db, {this.clock = const AppClock()});

  static const _preferencesPath = 'eventSetupPreferences';
  static const _eventsPath = 'events';
  static final _documentId = RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$');

  final FirebaseFirestore _db;

  /// Sets the suggested expiry on every composed configuration.
  final AppClock clock;

  // Each listener carries its own error context. The outer context covers
  // combining them; an error a listener already mapped passes through it
  // unchanged.
  Stream<EventOfferConfiguration> watch({
    required String organizerId,
    required String eventId,
  }) {
    if (!_documentId.hasMatch(organizerId) || !_documentId.hasMatch(eventId)) {
      throw ArgumentError('Organizer and event ids are required');
    }
    return withBackendErrorStream(
      () => combineLatest(
        _document(_eventsPath, eventId, 'watch offer settings event'),
        _document(_preferencesPath, eventId, 'watch event offer settings'),
        (event, preferences) => EventOfferConfiguration.compose(
          organizerId: organizerId,
          eventId: eventId,
          event: event,
          preferences: preferences,
          now: clock.now(),
        ),
      ),
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch event offer settings',
        resource: _preferencesPath,
      ),
    );
  }

  Stream<Map<String, Object?>?> _document(
    String collection,
    String id,
    String action,
  ) => withBackendErrorStream(
    () => _db
        .collection(collection)
        .doc(id)
        .snapshots()
        .map((snapshot) => snapshot.data()),
    context: BackendErrorContext(
      service: BackendService.firestore,
      action: action,
      resource: collection,
    ),
  );
}

@riverpod
EventOfferConfigurationReads eventOfferConfigurationReads(Ref ref) =>
    EventOfferConfigurationReads(
      ref.watch(firebaseFirestoreProvider),
      clock: ref.watch(appClockProvider),
    );

/// The offer settings read owner. It is a Firestore listener pair: it
/// declares no cache tags or lifetime, and writes never invalidate it; a
/// screen restarts it only after it ended in an error.
@riverpod
Stream<EventOfferConfiguration> eventOfferConfiguration(
  Ref ref, {
  required String organizerId,
  required String eventId,
}) => ref
    .watch(eventOfferConfigurationReadsProvider)
    .watch(organizerId: organizerId, eventId: eventId);
