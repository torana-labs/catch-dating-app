import 'dart:async';

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firestore_chunks.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
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

/// Guests read the public copy at `publicEvents/{id}` (#1666), whose fields
/// match `events/{id}` except that a price hidden until booking opens is left
/// out. The apps then show the hidden-price label, so the copy decodes with a
/// zero price rather than failing.
Map<String, dynamic> eventJsonForDecode(Map<String, dynamic> data) =>
    data['priceInPaise'] is! int && data['priceHiddenUntilBookingOpens'] == true
    ? {...data, 'priceInPaise': 0}
    : data;

/// Public rich-event reads cannot decode a private first-save event. The
/// manager's private basics reader uses its own authorized projection.
Event? publishedRichEvent(DocumentSnapshot<Map<String, dynamic>> snapshot) {
  final raw = snapshot.data();
  final data = raw == null ? null : eventJsonForDecode(raw);
  if (data == null ||
      data['publicationState'] != 'published' ||
      (data['organizerId'] is! String && data['organizerId'] is! String) ||
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
      fromFirestore: (snapshot, _) => Event.fromJson({
        ...eventJsonForDecode(snapshot.data()!),
        'id': snapshot.id,
      }),
      toFirestore: (event, _) => event.toJson(),
    );
