import 'dart:async';
import 'dart:convert';

import 'package:catch_dating_app/contexts/events/data/event_callable_adapters.dart';
import 'package:catch_dating_app/contexts/events/data/event_callable_responses.dart';
import 'package:catch_dating_app/contexts/events/data/event_stream_utils.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_invite_link.dart';
import 'package:catch_dating_app/contexts/events/domain/event_private_access.dart';
import 'package:catch_dating_app/contexts/events/domain/event_venue_session.dart';
import 'package:catch_dating_app/contexts/formats/formats.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/cursor_page.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/firestore_chunks.dart';
import 'package:catch_platform/firebase/firestore_converters.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show
        CancelEventCallableRequest,
        CreateEventVenueSessionCallableRequest,
        CreateEventInviteLinkCallableRequest,
        CreateEventWaitlistOffersCallableRequest,
        DisableEventInviteLinkCallableRequest,
        EventIdCallableRequest,
        EventJoinRequestDecisionCallableRequest,
        GetEventInviteLinkTokenCallableRequest,
        MarkEventAttendanceCallableRequest,
        RecordEventInviteLinkOpenCallableRequest,
        RecordEventShareIntentCallableRequest,
        SendEventBroadcastCallableRequest,
        SelfCheckInAttendanceCallableRequest,
        UpdateEventCallableRequest;
import 'package:catch_platform/streams/combine_latest.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_repository.g.dart';
part 'event_repository_actions.dart';

const _collectionPath = 'events';

class EventRepository with EventRepositoryActions {
  const EventRepository(
    this._db,
    this._functions, {
    this._clock = const AppClock(),
  });

  final FirebaseFirestore _db;

  /// The upcoming-events window starts at this clock's now.
  final AppClock _clock;
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

  /// The organizer's current events for its page and the Host's event
  /// pickers, by start time: the live and coming ones (soonest ending first,
  /// one directory page) and the most recently ended ones (one directory
  /// page), each a bounded listener. The boundary is the repository clock
  /// when the listener opens. Older history pages through
  /// [fetchPastEventsPage]; cancelled events are not included.
  Stream<List<Event>> watchEventsForOrganizer({required String organizerId}) {
    final boundary = Timestamp.fromDate(_clock.now());
    Query<Map<String, dynamic>> active() => _db
        .collection(_collectionPath)
        .where('publicationState', isEqualTo: 'published')
        .where('organizerId', isEqualTo: organizerId)
        .where('status', isEqualTo: EventLifecycleStatus.active.name);
    // firestore-index: events (organizerId:ASCENDING,publicationState:ASCENDING,status:ASCENDING,endTime:ASCENDING,__name__:ASCENDING)
    final current = active()
        .where('endTime', isGreaterThan: boundary)
        .orderBy('endTime')
        .orderBy(FieldPath.documentId)
        .limit(ReadLimitPolicy.directoryPage);
    // firestore-index: events (organizerId:ASCENDING,publicationState:ASCENDING,status:ASCENDING,endTime:DESCENDING,__name__:DESCENDING)
    final recent = active()
        .where('endTime', isLessThanOrEqualTo: boundary)
        .orderBy('endTime', descending: true)
        .orderBy(FieldPath.documentId, descending: true)
        .limit(ReadLimitPolicy.directoryPage);
    List<Event> events(QuerySnapshot<Map<String, dynamic>> snap) => [
      for (final event in snap.docs.map(publishedRichEvent).whereType<Event>())
        if (!event.synthetic) event,
    ];
    return withBackendErrorStream(
      () => combineLatest(
        current.snapshots().map(events),
        recent.snapshots().map(events),
        (coming, ended) {
          final byId = {
            for (final event in [...ended, ...coming]) event.id: event,
          };
          return List<Event>.unmodifiable(
            byId.values.toList()
              ..sort((a, b) => a.startTime.compareTo(b.startTime)),
          );
        },
      ),
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch organizer events',
        resource: _collectionPath,
      ),
    );
  }

  /// Fetches the organizer's nearest live and future events as a cursor page.
  ///
  /// The fixed [sessionBoundary] keeps paging stable while the Host Events
  /// screen is open. Presentation logic can still move an event from live to
  /// past as its clock advances without reissuing the Firestore query.
  Future<CursorPage<Event, PageCursor<Event>>> fetchActiveEventsPage({
    required String organizerId,
    required DateTime sessionBoundary,
    PageCursor<Event>? startAfter,
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

  /// The organizer's published active events that end after [endsAfter],
  /// the soonest ending first, kept current while listened to. A caller's
  /// clock moves an event from upcoming to live to over; [endsAfter] is a
  /// boundary the caller resets on purpose (the start of its day).
  Stream<List<Event>> watchActiveEventsForOrganizer({
    required String organizerId,
    required DateTime endsAfter,
    int limit = ReadLimitPolicy.directoryPage,
  }) => withBackendErrorStream(
    // firestore-index: events (organizerId:ASCENDING,publicationState:ASCENDING,status:ASCENDING,endTime:ASCENDING,__name__:ASCENDING)
    () => _db
        .collection(_collectionPath)
        .where('publicationState', isEqualTo: 'published')
        .where('organizerId', isEqualTo: organizerId)
        .where('status', isEqualTo: EventLifecycleStatus.active.name)
        .where('endTime', isGreaterThan: Timestamp.fromDate(endsAfter))
        .orderBy('endTime')
        .orderBy(FieldPath.documentId)
        .limit(limit)
        .snapshots()
        .map(
          (snap) => List<Event>.unmodifiable(
            snap.docs
                .map(publishedRichEvent)
                .whereType<Event>()
                .where((event) => !event.synthetic),
          ),
        ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch active organizer events',
      resource: _collectionPath,
    ),
  );

  /// Fetches completed organizer events newest-first with an opaque cursor.
  Future<CursorPage<Event, PageCursor<Event>>> fetchPastEventsPage({
    required String organizerId,
    required DateTime sessionBoundary,
    PageCursor<Event>? startAfter,
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
  Future<CursorPage<Event, PageCursor<Event>>> fetchCancelledEventsPage({
    required String organizerId,
    PageCursor<Event>? startAfter,
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

  Future<CursorPage<Event, PageCursor<Event>>> _fetchOrganizerEventsPage(
    Query<Map<String, dynamic>> query, {
    required PageCursor<Event>? startAfter,
    required int limit,
    required String action,
  }) async {
    final windowed = query.startAfterCursor(startAfter);
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
      final nowDateTime = _clock.now();
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
  clock: ref.watch(appClockProvider),
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
Stream<List<Event>> watchEventsForOrganizer(Ref ref, String organizerId) => ref
    .watch(eventRepositoryProvider)
    .watchEventsForOrganizer(organizerId: organizerId);

/// The organizer's live and coming events, as a Firestore listener: it
/// declares no cache tags or lifetime, and writes never invalidate it.
@riverpod
Stream<List<Event>> watchActiveEventsForOrganizer(
  Ref ref,
  ActiveOrganizerEventsQuery query,
) => ref
    .watch(eventRepositoryProvider)
    .watchActiveEventsForOrganizer(
      organizerId: query.organizerId,
      endsAfter: query.endsAfter,
    );

@riverpod
Stream<EventVenueSession> eventVenueSession(Ref ref, String eventId) async* {
  while (ref.mounted) {
    final session = await ref
        .read(eventRepositoryProvider)
        .createVenueSession(eventId: eventId);
    yield session;
    final nowMillis = ref.read(appClockProvider).now().millisecondsSinceEpoch;
    final waitMillis = (session.refreshAfterMillis - nowMillis)
        .clamp(1000, 240000)
        .toInt();
    await Future<void>.delayed(Duration(milliseconds: waitMillis));
  }
}

/// One organizer's events that end after the start of the given day.
/// The day, not the instant, keys the listener, so it is reused all day.
class ActiveOrganizerEventsQuery {
  ActiveOrganizerEventsQuery({required this.organizerId, required DateTime day})
    : endsAfter = DateTime(day.year, day.month, day.day);

  final String organizerId;
  final DateTime endsAfter;

  @override
  bool operator ==(Object other) =>
      other is ActiveOrganizerEventsQuery &&
      other.organizerId == organizerId &&
      other.endsAfter == endsAfter;

  @override
  int get hashCode => Object.hash(organizerId, endsAfter);
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
