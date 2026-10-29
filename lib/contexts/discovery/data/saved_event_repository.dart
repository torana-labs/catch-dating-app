import 'dart:async';

import 'package:catch_dating_app/contexts/discovery/domain/saved_event.dart';
import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part '../../events/data/saved_event_repository.g.dart';

class SavedEventRepository {
  const SavedEventRepository(this._db);

  static const _collectionPath = 'savedEvents';

  final FirebaseFirestore _db;

  CollectionReference<SavedEvent> get _savedEventsRef => _db
      .collection(_collectionPath)
      .withDocumentIdConverter<SavedEvent>(
        idField: 'id',
        fromJson: SavedEvent.fromJson,
        toJson: (savedEvent) => savedEvent.toJson(),
      );

  CollectionReference<Event> get _eventsRef => _db
      .collection('events')
      .withDocumentIdConverter<Event>(
        idField: 'id',
        fromJson: Event.fromJson,
        toJson: (event) => event.toJson(),
      );

  DocumentReference<Map<String, dynamic>> _rawSavedEventRef({
    required String uid,
    required String eventId,
  }) => _db
      .collection(_collectionPath)
      .doc(savedEventId(uid: uid, eventId: eventId));

  Stream<List<SavedEvent>> watchSavedEventsForUser({required String uid}) =>
      withBackendErrorStream(
        () => _savedEventsRef
            .where('uid', isEqualTo: uid)
            .limit(ReadLimitPolicy.boundedWorkingSet)
            .snapshots()
            .map((snap) => snap.docs.map((doc) => doc.data()).toList()),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch saved events',
          resource: _collectionPath,
        ),
      );

  Stream<List<Event>> watchSavedEventDetailsForUser({required String uid}) {
    final idStream = _savedEventsRef
        .where('uid', isEqualTo: uid)
        .limit(ReadLimitPolicy.boundedWorkingSet)
        .snapshots()
        .map(
          (snap) => snap.docs.map((doc) => doc.data().eventId).toSet().toList(),
        );

    return watchEventsByIdStream(
      idStream: idStream,
      eventsRef: _eventsRef,
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch saved event details',
        resource: 'events',
      ),
    );
  }

  Stream<SavedEvent?> watchSavedEvent({
    required String uid,
    required String eventId,
  }) => withBackendErrorStream(
    () => _savedEventsRef
        .doc(savedEventId(uid: uid, eventId: eventId))
        .snapshots()
        .map((snapshot) => snapshot.exists ? snapshot.data() : null),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch saved event',
      resource: _collectionPath,
    ),
  );

  Future<void> saveEvent({required String uid, required String eventId}) =>
      withBackendErrorContext(
        () => _rawSavedEventRef(uid: uid, eventId: eventId).set({
          'uid': uid,
          'eventId': eventId,
          'savedAt': FieldValue.serverTimestamp(),
        }),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'save event',
          resource: _collectionPath,
        ),
      );

  Future<void> unsaveEvent({required String uid, required String eventId}) =>
      withBackendErrorContext(
        () => _rawSavedEventRef(uid: uid, eventId: eventId).delete(),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'unsave event',
          resource: _collectionPath,
        ),
      );
}

// keepalive: saved-event repository is shared by calendar, saved list, and
// event detail save state.
@Riverpod(keepAlive: true)
SavedEventRepository savedEventRepository(Ref ref) =>
    SavedEventRepository(ref.watch(firebaseFirestoreProvider));

@riverpod
Stream<List<SavedEvent>> watchSavedEventsForUser(Ref ref, String uid) =>
    ref.watch(savedEventRepositoryProvider).watchSavedEventsForUser(uid: uid);

@riverpod
Stream<SavedEvent?> watchSavedEvent(Ref ref, String uid, String eventId) => ref
    .watch(savedEventRepositoryProvider)
    .watchSavedEvent(uid: uid, eventId: eventId);

@riverpod
Stream<List<Event>> watchSavedEventDetailsForUser(Ref ref, String uid) => ref
    .watch(savedEventRepositoryProvider)
    .watchSavedEventDetailsForUser(uid: uid);
