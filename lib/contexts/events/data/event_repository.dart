import 'dart:async';
import 'dart:convert';

import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/events/data/event_callable_adapters.dart';
import 'package:catch_dating_app/contexts/events/data/event_callable_responses.dart';
import 'package:catch_dating_app/contexts/events/data/event_stream_utils.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_invite_link.dart';
import 'package:catch_dating_app/contexts/events/domain/event_private_access.dart';
import 'package:catch_dating_app/contexts/events/domain/event_venue_session.dart';
import 'package:catch_dating_app/contexts/events/domain/event_viewer_state.dart';
import 'package:catch_dating_app/contexts/formats/formats.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/cursor_page.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/firebase/firestore_chunks.dart';
import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show
        CancelEventCallableRequest,
        CreateEventVenueSessionCallableRequest,
        CreateEventInviteLinkCallableRequest,
        CreateEventWaitlistOffersCallableRequest,
        DisableEventInviteLinkCallableRequest,
        EventIdCallableRequest,
        GetEventViewerStateCallableRequest,
        EventJoinRequestDecisionCallableRequest,
        GetEventInviteLinkTokenCallableRequest,
        MarkEventAttendanceCallableRequest,
        RecordEventInviteLinkOpenCallableRequest,
        RecordEventShareIntentCallableRequest,
        SendEventBroadcastCallableRequest,
        SelfCheckInAttendanceCallableRequest,
        UpdateEventCallableRequest;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_repository.g.dart';
part 'event_repository_actions.dart';

const _collectionPath = 'events';

class EventRepository with EventRepositoryActions {
  const EventRepository(this._db, this._functions);

  final FirebaseFirestore _db;
  @override
  final FirebaseFunctions _functions;

  CollectionReference<Event> get _eventsRef => _db
      .collection(_collectionPath)
      .withDocumentIdConverter<Event>(
        idField: 'id',
        fromJson: Event.fromJson,
        toJson: (event) => event.toJson(),
      );

  CollectionReference<EventPrivateAccess> get _privateAccessRef => _db
      .collection('eventPrivateAccess')
      .withDocumentIdConverter<EventPrivateAccess>(
        idField: 'id',
        fromJson: EventPrivateAccess.fromJson,
        toJson: (access) => access.toJson(),
      );

  CollectionReference<EventInviteLink> get _inviteLinksRef => _db
      .collection('eventInviteLinks')
      .withDocumentIdConverter<EventInviteLink>(
        idField: 'id',
        fromJson: EventInviteLink.fromJson,
        toJson: (link) => link.toJson(),
      );

  // ── Read ──────────────────────────────────────────────────────────────────

  Future<EventViewerState> fetchViewerState({
    required String eventId,
    String? inviteCode,
    String? publicPaymentId,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('getEventViewerState')
          .call<Object?>(
            GetEventViewerStateCallableRequest(
              eventId: eventId,
              inviteCode: inviteCode,
              publicPaymentId: publicPaymentId,
              includeHostMembership: true,
            ).toJson(),
          );
      final viewer = EventViewerState.fromResponse(result.data);
      if (viewer.eventId != eventId) {
        throw const FormatException('Mismatched event viewer scope');
      }
      return viewer;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'read event viewer state',
      resource: 'getEventViewerState',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );

  Future<Event?> fetchEvent(String id) => withBackendErrorContext(
    () async {
      final doc = await _db.collection(_collectionPath).doc(id).get();
      return publishedRichEvent(doc);
    },
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'fetch event',
      resource: _collectionPath,
    ),
  );

  Stream<Event?> watchEvent(String id) => withBackendErrorStream(
    () => _db
        .collection(_collectionPath)
        .doc(id)
        .snapshots()
        .map(publishedRichEvent),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch event',
      resource: _collectionPath,
    ),
  );

  Stream<EventPrivateAccess?> watchPrivateAccess(String eventId) =>
      withBackendErrorStream(
        () => _privateAccessRef
            .doc(eventId)
            .snapshots()
            .map((doc) => doc.exists ? doc.data() : null),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch event private access',
          resource: 'eventPrivateAccess',
        ),
      );

  Stream<List<EventInviteLink>> watchInviteLinks(
    String eventId,
  ) => withBackendErrorStream(
    // firestore-index: eventInviteLinks (eventId:ASCENDING,createdAt:ASCENDING)
    () => _inviteLinksRef
        .where('eventId', isEqualTo: eventId)
        .orderBy('createdAt')
        .limit(ReadLimitPolicy.boundedWorkingSet)
        .snapshots()
        .map((snap) => snap.docs.map((doc) => doc.data()).toList()),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch event invite links',
      resource: 'eventInviteLinks',
    ),
  );

  Stream<List<Event>> watchEventsForOrganizer({
    required String organizerId,
  }) => withBackendErrorStream(
    // firestore-index: events (organizerId:ASCENDING,publicationState:ASCENDING,startTime:ASCENDING)
    () => _db
        .collection(_collectionPath)
        .where('publicationState', isEqualTo: 'published')
        .where('organizerId', isEqualTo: organizerId)
        .orderBy('startTime')
        .limit(ReadLimitPolicy.historyPage)
        .snapshots()
        .map(
          (snap) => snap.docs
              .map(publishedRichEvent)
              .whereType<Event>()
              .where((event) => !event.synthetic)
              .toList(),
        ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch organizer events',
      resource: _collectionPath,
    ),
  );

  /// Fetches the organizer's nearest live and future events as a cursor page.
  ///
  /// The fixed [sessionBoundary] keeps paging stable while the Host Events
  /// screen is open. Presentation logic can still move an event from live to
  /// past as its clock advances without reissuing the Firestore query.
  Future<CursorPage<Event, DocumentSnapshot<Event>>> fetchActiveEventsPage({
    required String organizerId,
    required DateTime sessionBoundary,
    DocumentSnapshot<Event>? startAfter,
    int limit = ReadLimitPolicy.directoryPage,
  }) => _fetchOrganizerEventsPage(
    // firestore-index: events (organizerId:ASCENDING,publicationState:ASCENDING,status:ASCENDING,endTime:ASCENDING,__name__:ASCENDING)
    _db
        .collection(_collectionPath)
        .where('publicationState', isEqualTo: 'published')
        .where('organizerId', isEqualTo: organizerId)
        .where('status', isEqualTo: EventLifecycleStatus.active.name)
        .where('endTime', isGreaterThan: Timestamp.fromDate(sessionBoundary))
        .orderBy('endTime')
        .orderBy(FieldPath.documentId),
    startAfter: startAfter,
    limit: limit,
    action: 'fetch active organizer events page',
  );

  /// Fetches completed organizer events newest-first with an opaque cursor.
  Future<CursorPage<Event, DocumentSnapshot<Event>>> fetchPastEventsPage({
    required String organizerId,
    required DateTime sessionBoundary,
    DocumentSnapshot<Event>? startAfter,
    int limit = ReadLimitPolicy.directoryPage,
  }) => _fetchOrganizerEventsPage(
    // firestore-index: events (organizerId:ASCENDING,publicationState:ASCENDING,status:ASCENDING,endTime:DESCENDING,__name__:DESCENDING)
    _db
        .collection(_collectionPath)
        .where('publicationState', isEqualTo: 'published')
        .where('organizerId', isEqualTo: organizerId)
        .where('status', isEqualTo: EventLifecycleStatus.active.name)
        .where(
          'endTime',
          isLessThanOrEqualTo: Timestamp.fromDate(sessionBoundary),
        )
        .orderBy('endTime', descending: true)
        .orderBy(FieldPath.documentId, descending: true),
    startAfter: startAfter,
    limit: limit,
    action: 'fetch past organizer events page',
  );

  /// Fetches cancelled organizer events newest-first with an opaque cursor.
  ///
  /// Cancelled events keep `publicationState == 'published'`, so they share
  /// the published index family; the timeline merges them into history.
  Future<CursorPage<Event, DocumentSnapshot<Event>>> fetchCancelledEventsPage({
    required String organizerId,
    DocumentSnapshot<Event>? startAfter,
    int limit = ReadLimitPolicy.directoryPage,
  }) => _fetchOrganizerEventsPage(
    // firestore-index: events (organizerId:ASCENDING,publicationState:ASCENDING,status:ASCENDING,startTime:DESCENDING,__name__:DESCENDING)
    _db
        .collection(_collectionPath)
        .where('publicationState', isEqualTo: 'published')
        .where('organizerId', isEqualTo: organizerId)
        .where('status', isEqualTo: EventLifecycleStatus.cancelled.name)
        .orderBy('startTime', descending: true)
        .orderBy(FieldPath.documentId, descending: true),
    startAfter: startAfter,
    limit: limit,
    action: 'fetch cancelled organizer events page',
  );

  Future<CursorPage<Event, DocumentSnapshot<Event>>> _fetchOrganizerEventsPage(
    Query<Map<String, dynamic>> query, {
    required DocumentSnapshot<Event>? startAfter,
    required int limit,
    required String action,
  }) async {
    final windowed = startAfter == null
        ? query
        : query.startAfterDocument(startAfter);
    final page = await decodePublishedEventQuery(windowed)
        .fetchDocumentCursorPage(
          limit: limit,
          errorContext: BackendErrorContext(
            service: BackendService.firestore,
            action: action,
            resource: _collectionPath,
          ),
        );
    return CursorPage(
      items: List.unmodifiable(
        page.items
            .map((document) => document.data())
            .where((event) => !event.synthetic),
      ),
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
    );
  }

  Stream<List<Event>> watchEventsForOrganizers({
    required List<String> organizerIds,
  }) =>
      watchEventsForOrganizerIdsStream(
        organizerIds: organizerIds,
        eventsRef: _eventsRef,
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch events for hosted organizers',
          resource: _collectionPath,
        ),
      ).map(
        (events) =>
            events.where((event) => !event.synthetic).toList(growable: false),
      );

  Stream<List<Event>> watchEventsByIds({required List<String> eventIds}) {
    final uniqueIds = eventIds.toSet().toList()..sort();
    if (uniqueIds.isEmpty) return Stream.value(const []);

    return watchEventsByIdStream(
      idStream: Stream.value(uniqueIds),
      eventsRef: _eventsRef,
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch events by id',
        resource: _collectionPath,
      ),
    );
  }

  /// Streams the events whose ids [idStream] emits, re-querying whenever the
  /// ids change. Other contexts use this to read events they reference.
  Stream<List<Event>> watchEventsForIdStream(
    Stream<List<String>> idStream, {
    bool descending = false,
    String action = 'watch events by id stream',
  }) => watchEventsByIdStream(
    idStream: idStream,
    eventsRef: _eventsRef,
    descending: descending,
    context: BackendErrorContext(
      service: BackendService.firestore,
      action: action,
      resource: _collectionPath,
    ),
  );

  /// Generates a new unique Firestore document ID for an event without writing it.
  String generateId() => _eventsRef.doc().id;

  /// Generates a stable client request id without writing a broadcast receipt.
  String generateBroadcastRequestId() =>
      _db.collection('eventBroadcastRequests').doc().id;

  /// Fetches upcoming events from the given club IDs.
  Future<List<Event>> fetchUpcomingEventsForOrganizers(
    List<String> organizerIds,
  ) => withBackendErrorContext(
    () async {
      // firestore-index: events (organizerId:ASCENDING,publicationState:ASCENDING,startTime:ASCENDING)
      final uniqueOrganizerIds = organizerIds.toSet().toList()..sort();
      if (uniqueOrganizerIds.isEmpty) return [];
      final nowDateTime = DateTime.now();
      final now = Timestamp.fromDate(nowDateTime);
      final events = <Event>[];
      for (final chunk in chunkedForWhereIn(uniqueOrganizerIds)) {
        final snap = await _db
            .collection(_collectionPath)
            .where('publicationState', isEqualTo: 'published')
            .where('organizerId', whereIn: chunk)
            .where('startTime', isGreaterThan: now)
            .orderBy('startTime')
            .limit(ReadLimitPolicy.directoryPage)
            .get();
        events.addAll(
          snap.docs
              .map(publishedRichEvent)
              .whereType<Event>()
              .where(
                (event) =>
                    !event.isCancelled && event.startTime.isAfter(nowDateTime),
              ),
        );
      }
      events.sort((a, b) => a.startTime.compareTo(b.startTime));
      return events.take(ReadLimitPolicy.directoryPage).toList(growable: false);
    },
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'fetch recommended events',
      resource: _collectionPath,
    ),
  );
}

@riverpod
EventRepository eventRepository(Ref ref) => EventRepository(
  ref.watch(firebaseFirestoreProvider),
  ref.watch(firebaseFunctionsProvider),
);

@riverpod
Stream<Event?> watchEvent(Ref ref, String eventId) =>
    ref.watch(eventRepositoryProvider).watchEvent(eventId);

@riverpod
Stream<EventPrivateAccess?> watchEventPrivateAccess(Ref ref, String eventId) =>
    ref.watch(eventRepositoryProvider).watchPrivateAccess(eventId);

@riverpod
Stream<List<EventInviteLink>> watchEventInviteLinks(Ref ref, String eventId) =>
    ref.watch(eventRepositoryProvider).watchInviteLinks(eventId);

@riverpod
Stream<List<Event>> watchEventsForOrganizer(Ref ref, String organizerId) =>
    ref.watch(eventRepositoryProvider).watchEventsForOrganizer(organizerId: organizerId);

@riverpod
Stream<EventVenueSession> eventVenueSession(Ref ref, String eventId) async* {
  while (ref.mounted) {
    final session = await ref
        .read(eventRepositoryProvider)
        .createVenueSession(eventId: eventId);
    yield session;
    final nowMillis = DateTime.now().millisecondsSinceEpoch;
    final waitMillis = (session.refreshAfterMillis - nowMillis)
        .clamp(1000, 240000)
        .toInt();
    await Future<void>.delayed(Duration(milliseconds: waitMillis));
  }
}

@riverpod
Stream<List<Event>> watchEventsForOrganizers(
  Ref ref,
  EventsForOrganizersQuery query,
) => ref
    .watch(eventRepositoryProvider)
    .watchEventsForOrganizers(organizerIds: query.organizerIds);

@riverpod
Stream<List<Event>> watchEventsByIds(Ref ref, EventsByIdQuery query) => ref
    .watch(eventRepositoryProvider)
    .watchEventsByIds(eventIds: query.eventIds);

class EventsByIdQuery {
  EventsByIdQuery._(Iterable<String> eventIds)
    : eventIds = List.unmodifiable(eventIds.toSet().toList()..sort());

  factory EventsByIdQuery(Iterable<String> eventIds) =>
      EventsByIdQuery._(eventIds);

  static const _equality = ListEquality<String>();

  final List<String> eventIds;

  @override
  bool operator ==(Object other) {
    return other is EventsByIdQuery &&
        _equality.equals(other.eventIds, eventIds);
  }

  @override
  int get hashCode => _equality.hash(eventIds);
}

class EventsForOrganizersQuery {
  EventsForOrganizersQuery._(Iterable<String> organizerIds)
    : organizerIds = List.unmodifiable(organizerIds.toSet().toList()..sort());

  factory EventsForOrganizersQuery(Iterable<String> organizerIds) =>
      EventsForOrganizersQuery._(organizerIds);

  static const _equality = ListEquality<String>();

  final List<String> organizerIds;

  @override
  bool operator ==(Object other) =>
      other is EventsForOrganizersQuery &&
      _equality.equals(other.organizerIds, organizerIds);

  @override
  int get hashCode => _equality.hash(organizerIds);
}

class RecommendedEventsQuery {
  RecommendedEventsQuery._(Iterable<String> followedOrganizerIds)
    : followedOrganizerIds = List.unmodifiable(
        (followedOrganizerIds.toSet().toList()..sort()),
      );

  factory RecommendedEventsQuery.fromOrganizerIds(
    Iterable<String> followedOrganizerIds,
  ) => RecommendedEventsQuery._(followedOrganizerIds);

  static const _equality = ListEquality<String>();

  final List<String> followedOrganizerIds;

  @override
  bool operator ==(Object other) {
    return other is RecommendedEventsQuery &&
        _equality.equals(other.followedOrganizerIds, followedOrganizerIds);
  }

  @override
  int get hashCode => _equality.hash(followedOrganizerIds);
}

/// Returns upcoming events from clubs the user follows.
@riverpod
Future<List<Event>> recommendedEvents(Ref ref, RecommendedEventsQuery query) =>
    ref
        .watch(eventRepositoryProvider)
        .fetchUpcomingEventsForOrganizers(query.followedOrganizerIds);

/// The UID isolates the local provider generation; it is never sent as authority.
@riverpod
Future<EventViewerState> eventViewerState(
  Ref ref,
  String eventId,
  String uid, {
  String? inviteCode,
}) async {
  final currentUid = await ref.watch(uidProvider.future);
  if (currentUid != uid) throw StateError('Event viewer account changed');
  ref.watch(watchEventProvider(eventId));
  final refresh = Timer(const Duration(minutes: 1), ref.invalidateSelf);
  ref.onDispose(refresh.cancel);
  return ref
      .watch(eventRepositoryProvider)
      .fetchViewerState(eventId: eventId, inviteCode: inviteCode);
}
