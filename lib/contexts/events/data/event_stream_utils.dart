import 'dart:async';

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firestore_chunks.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

/// Shared realtime `documentId whereIn` fan-out for typed collections.
///
/// The result preserves the caller's stable ID order, de-duplicates chunk
/// emissions, and waits until every chunk has emitted before publishing.
Stream<List<T>> watchDocumentsByIds<T>({
  required List<String> ids,
  required CollectionReference<T> collection,
  required String Function(T value) idOf,
  required BackendErrorContext context,
  List<T> Function(List<T> values)? transform,
}) {
  final uniqueIds = ids.toSet().toList()..sort();
  if (uniqueIds.isEmpty) return Stream.value(const []);

  var subscriptions = <StreamSubscription<QuerySnapshot<T>>>[];
  var closed = false;
  late final StreamController<List<T>> controller;

  void emit({
    required Map<int, List<T>> valuesByChunk,
    required int chunkCount,
  }) {
    if (valuesByChunk.length < chunkCount || controller.isClosed) return;
    final byId = <String, T>{};
    for (final values in valuesByChunk.values) {
      for (final value in values) {
        byId[idOf(value)] = value;
      }
    }
    final ordered = <T>[
      for (final id in uniqueIds)
        if (byId[id] != null) byId[id]!,
    ];
    controller.add(
      List.unmodifiable(transform == null ? ordered : transform(ordered)),
    );
  }

  controller = StreamController<List<T>>(
    onListen: () {
      final chunks = chunkedForWhereIn(uniqueIds).toList(growable: false);
      final valuesByChunk = <int, List<T>>{};
      for (var index = 0; index < chunks.length; index += 1) {
        final sub = collection
            .where(FieldPath.documentId, whereIn: chunks[index])
            .limit(ReadLimitPolicy.multiIdChunk)
            .snapshots()
            .listen((snapshot) {
              if (closed) return;
              valuesByChunk[index] = snapshot.docs
                  .map((document) => document.data())
                  .toList(growable: false);
              emit(valuesByChunk: valuesByChunk, chunkCount: chunks.length);
            }, onError: controller.addError);
        subscriptions.add(sub);
      }
    },
    onCancel: () async {
      closed = true;
      for (final subscription in subscriptions) {
        await subscription.cancel();
      }
      subscriptions = [];
      if (!controller.isClosed) await controller.close();
    },
  );

  return withBackendErrorStream(() => controller.stream, context: context);
}

/// Realtime reads of individual documents by ID, for documents a list query
/// may not return (Firestore list rules can be stricter than single reads).
///
/// The result preserves the caller's stable ID order, skips missing
/// documents, and waits until every document has emitted before publishing.
Stream<List<T>> watchDocumentsOneByOne<T>({
  required List<String> ids,
  required CollectionReference<T> collection,
  required BackendErrorContext context,
  List<T> Function(List<T> values)? transform,
}) {
  final uniqueIds = ids.toSet().toList()..sort();
  if (uniqueIds.isEmpty) return Stream.value(const []);

  var subscriptions = <StreamSubscription<DocumentSnapshot<T>>>[];
  var closed = false;
  late final StreamController<List<T>> controller;
  final valuesById = <String, T?>{};

  void emit() {
    if (valuesById.length < uniqueIds.length || controller.isClosed) return;
    final ordered = <T>[
      for (final id in uniqueIds)
        if (valuesById[id] != null) valuesById[id] as T,
    ];
    controller.add(
      List.unmodifiable(transform == null ? ordered : transform(ordered)),
    );
  }

  controller = StreamController<List<T>>(
    onListen: () {
      for (final id in uniqueIds) {
        subscriptions.add(
          collection.doc(id).snapshots().listen((snapshot) {
            if (closed) return;
            valuesById[id] = snapshot.exists ? snapshot.data() : null;
            emit();
          }, onError: controller.addError),
        );
      }
    },
    onCancel: () async {
      closed = true;
      for (final subscription in subscriptions) {
        await subscription.cancel();
      }
      subscriptions = [];
      if (!controller.isClosed) await controller.close();
    },
  );

  return withBackendErrorStream(() => controller.stream, context: context);
}

/// Listens to [idStream] — a stream of event-ID lists — and reconciles them
/// against the real-time document state from [eventsRef].
///
/// On each emission from [idStream]:
///  1. Cancels previous real-time subscriptions (generation-gated to avoid
///     stale emissions from a previous set).
///  2. Chunks IDs respecting Firestore's `whereIn` limit.
///  3. Subscribes to a snapshot per chunk.
///  4. Once all chunks arrive, emits a sorted (by [Event.startTime]) list.
///
/// The returned stream is single-subscription by design.
///
/// This extracted common code was previously duplicated in
/// [EventRepository._watchEventsForParticipationStatuses] and
/// [SavedEventRepository.watchSavedEventDetailsForUser].
Stream<List<Event>> watchEventsByIdStream({
  required Stream<List<String>> idStream,
  required CollectionReference<Event> eventsRef,
  required BackendErrorContext context,
  bool descending = false,
}) {
  var eventSubs = <StreamSubscription<QuerySnapshot<Map<String, dynamic>>>>[];
  var generation = 0;
  var closed = false;

  late final StreamController<List<Event>> controller;

  void cancelEventSubscriptions() {
    for (final sub in eventSubs) {
      unawaited(sub.cancel());
    }
    eventSubs = [];
  }

  void emitSortedEvents({
    required List<String> eventIds,
    required Map<int, List<Event>> eventsByChunk,
    required int chunkCount,
  }) {
    if (eventsByChunk.length < chunkCount || controller.isClosed) return;

    final byId = <String, Event>{};
    for (final events in eventsByChunk.values) {
      for (final event in events) {
        byId[event.id] = event;
      }
    }

    final events =
        [
          for (final id in eventIds)
            if (byId[id] != null) byId[id]!,
        ]..sort(
          (a, b) => descending
              ? b.startTime.compareTo(a.startTime)
              : a.startTime.compareTo(b.startTime),
        );
    controller.add(events);
  }

  controller = StreamController<List<Event>>(
    onListen: () {
      StreamSubscription<List<String>>? idSub;
      idSub = idStream.listen((eventIds) {
        generation += 1;
        final localGeneration = generation;
        cancelEventSubscriptions();

        if (eventIds.isEmpty) {
          if (!controller.isClosed) controller.add(const []);
          return;
        }

        final chunks = chunkedForWhereIn(eventIds).toList(growable: false);
        final eventsByChunk = <int, List<Event>>{};

        for (var i = 0; i < chunks.length; i += 1) {
          final chunk = chunks[i];
          final sub = eventsRef.firestore
              .collection(eventsRef.path)
              .where('publicationState', isEqualTo: 'published')
              .where(FieldPath.documentId, whereIn: chunk)
              .limit(ReadLimitPolicy.multiIdChunk)
              .snapshots()
              .listen((eventSnap) {
                if (closed || localGeneration != generation) return;
                eventsByChunk[i] = eventSnap.docs
                    .map(publishedRichEvent)
                    .whereType<Event>()
                    .toList();
                emitSortedEvents(
                  eventIds: eventIds,
                  eventsByChunk: eventsByChunk,
                  chunkCount: chunks.length,
                );
              }, onError: controller.addError);
          eventSubs.add(sub);
        }
      }, onError: controller.addError);

      controller.onCancel = () async {
        closed = true;
        cancelEventSubscriptions();
        await idSub?.cancel();
        if (!controller.isClosed) {
          await controller.close();
        }
      };
    },
  );

  return withBackendErrorStream(() => controller.stream, context: context);
}

/// Watches events for one or more clubs without requiring one subscription per
/// club. Firestore `whereIn` limits are handled by the shared chunk helper and
/// every emission is de-duplicated and ordered by start time.
Stream<List<Event>> watchEventsForOrganizerIdsStream({
  required List<String> organizerIds,
  required CollectionReference<Event> eventsRef,
  required BackendErrorContext context,
}) {
  final uniqueOrganizerIds = organizerIds.toSet().toList()..sort();
  if (uniqueOrganizerIds.isEmpty) return Stream.value(const []);

  var eventSubs = <StreamSubscription<QuerySnapshot<Map<String, dynamic>>>>[];
  var closed = false;
  late final StreamController<List<Event>> controller;

  void emitEvents({
    required Map<int, List<Event>> eventsByChunk,
    required int chunkCount,
  }) {
    if (eventsByChunk.length < chunkCount || controller.isClosed) return;
    final byId = <String, Event>{};
    for (final events in eventsByChunk.values) {
      for (final event in events) {
        byId[event.id] = event;
      }
    }
    final events = byId.values.toList()
      ..sort((a, b) => a.startTime.compareTo(b.startTime));
    controller.add(List.unmodifiable(events));
  }

  controller = StreamController<List<Event>>(
    onListen: () {
      final chunks = chunkedForWhereIn(uniqueOrganizerIds).toList(growable: false);
      final eventsByChunk = <int, List<Event>>{};
      for (var index = 0; index < chunks.length; index += 1) {
        final chunk = chunks[index];
        // firestore-index: events (organizerId:ASCENDING,publicationState:ASCENDING)
        final sub = eventsRef.firestore
            .collection(eventsRef.path)
            .where('publicationState', isEqualTo: 'published')
            .where('organizerId', whereIn: chunk)
            .limit(ReadLimitPolicy.boundedWorkingSet)
            .snapshots()
            .listen((snapshot) {
              if (closed) return;
              eventsByChunk[index] = snapshot.docs
                  .map(publishedRichEvent)
                  .whereType<Event>()
                  .toList(growable: false);
              emitEvents(
                eventsByChunk: eventsByChunk,
                chunkCount: chunks.length,
              );
            }, onError: controller.addError);
        eventSubs.add(sub);
      }
    },
    onCancel: () async {
      closed = true;
      for (final sub in eventSubs) {
        await sub.cancel();
      }
      eventSubs = [];
      if (!controller.isClosed) await controller.close();
    },
  );

  return withBackendErrorStream(() => controller.stream, context: context);
}

/// Public rich-event reads cannot decode a private first-save event. The
/// manager's private basics reader uses its own authorized projection.
Event? publishedRichEvent(DocumentSnapshot<Map<String, dynamic>> snapshot) {
  final data = snapshot.data();
  final explicitState = data?['publicationState'];
  final legacyPublic =
      data != null &&
      !data.containsKey('publicationState') &&
      !data.containsKey('setupRevision');
  if (data == null ||
      (explicitState != 'published' && !legacyPublic) ||
      (data['organizerId'] is! String && data['clubId'] is! String) ||
      data['startTime'] is! Timestamp ||
      data['endTime'] is! Timestamp ||
      data['meetingPoint'] is! String ||
      data['distanceKm'] is! num ||
      data['pace'] is! String ||
      data['capacityLimit'] is! int ||
      data['description'] is! String ||
      data['priceInPaise'] is! int) {
    return null;
  }
  return Event.fromJson({...data, 'id': snapshot.id});
}

/// Attach rich decoding only after the public query has been constrained.
Query<Event> decodePublishedEventQuery(Query<Map<String, dynamic>> query) =>
    query.withConverter<Event>(
      fromFirestore: (snapshot, _) =>
          Event.fromJson({...snapshot.data()!, 'id': snapshot.id}),
      toFirestore: (event, _) => event.toJson(),
    );
