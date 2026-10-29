import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/events/domain/external_event.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/data/cursor_page.dart';
import 'package:catch_dating_app/core/data/read_limit_policy.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'external_event_repository.g.dart';

class ExternalEventDiscoveryQuery {
  ExternalEventDiscoveryQuery._({
    required this.citySlug,
    required this.startAt,
    required this.endBefore,
    required Iterable<ActivityKind> activityKinds,
    required this.limit,
  }) : activityKinds = List.unmodifiable(
         (activityKinds.toSet().toList()
           ..sort((a, b) => a.name.compareTo(b.name))),
       );

  factory ExternalEventDiscoveryQuery.forCity({
    required String citySlug,
    required DateTime startAt,
    DateTime? endBefore,
    Iterable<ActivityKind> activityKinds = const [],
    int limit = ReadLimitPolicy.exploreExternalFeedPage,
  }) {
    return ExternalEventDiscoveryQuery._(
      citySlug: citySlug.trim().toLowerCase(),
      startAt: startAt,
      endBefore: endBefore,
      activityKinds: activityKinds,
      limit: limit.clamp(1, 100).toInt(),
    );
  }

  final String citySlug;
  final DateTime startAt;
  final DateTime? endBefore;
  final List<ActivityKind> activityKinds;
  final int limit;

  @override
  bool operator ==(Object other) {
    return other is ExternalEventDiscoveryQuery &&
        other.citySlug == citySlug &&
        other.startAt == startAt &&
        other.endBefore == endBefore &&
        _sameActivityKinds(other.activityKinds, activityKinds) &&
        other.limit == limit;
  }

  @override
  int get hashCode => Object.hash(
    citySlug,
    startAt,
    endBefore,
    Object.hashAll(activityKinds),
    limit,
  );
}

class ExternalEventRepository {
  const ExternalEventRepository(this._db);

  static const _collectionPath = 'externalEvents';

  final FirebaseFirestore _db;

  CollectionReference<ExternalEvent> get _eventsRef => _db
      .collection(_collectionPath)
      .withDocumentIdConverter<ExternalEvent>(
        idField: 'eventId',
        fromJson: ExternalEvent.fromJson,
        toJson: (_) => throw UnsupportedError(
          'externalEvents are admin-import owned and read-only in the app.',
        ),
      );

  Future<List<ExternalEvent>> fetchDiscoverableExternalEvents(
    ExternalEventDiscoveryQuery query,
  ) async {
    return (await fetchDiscoverableExternalEventsPage(query)).items;
  }

  Future<CursorPage<ExternalEvent, DocumentSnapshot<ExternalEvent>>>
  fetchDiscoverableExternalEventsPage(
    ExternalEventDiscoveryQuery query, {
    DocumentSnapshot<ExternalEvent>? startAfter,
  }) {
    // firestore-index: externalEvents (discovery.citySlug:ASCENDING,discovery.appVisibility:ASCENDING,publicationStatus:ASCENDING,status:ASCENDING,startTime:ASCENDING)
    return withBackendErrorContext(
      () async {
        if (query.citySlug.isEmpty) {
          return CursorPage.empty<
            ExternalEvent,
            DocumentSnapshot<ExternalEvent>
          >();
        }

        // Events of an organizer hidden in the app stay on the website only.
        Query<ExternalEvent> firestoreQuery = _eventsRef
            .where('discovery.citySlug', isEqualTo: query.citySlug)
            .where('discovery.appVisibility', isEqualTo: 'discoverable')
            .where('publicationStatus', isEqualTo: 'public')
            .where('status', isEqualTo: 'active')
            .where(
              'startTime',
              isGreaterThanOrEqualTo: Timestamp.fromDate(query.startAt),
            );
        final endBefore = query.endBefore;
        if (endBefore != null) {
          firestoreQuery = firestoreQuery.where(
            'startTime',
            isLessThan: Timestamp.fromDate(endBefore),
          );
        }

        firestoreQuery = firestoreQuery.orderBy('startTime');
        final page = await firestoreQuery.fetchDocumentCursorPage(
          limit: query.limit,
          startAfter: startAfter,
          errorContext: const BackendErrorContext(
            service: BackendService.firestore,
            action: 'fetch external event discovery',
            resource: _collectionPath,
          ),
        );
        final events =
            page.items
                .map((doc) => doc.data())
                .where((event) => event.isDiscoverableAt(query.startAt))
                .where((event) => _matchesActivityFilter(event, query))
                .toList(growable: false)
              ..sort((a, b) => a.startTime.compareTo(b.startTime));
        return CursorPage(
          items: List.unmodifiable(events),
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        );
      },
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'fetch external event discovery',
        resource: _collectionPath,
      ),
    );
  }
}

bool _matchesActivityFilter(
  ExternalEvent event,
  ExternalEventDiscoveryQuery query,
) {
  return query.activityKinds.isEmpty ||
      query.activityKinds.contains(event.activityKind);
}

bool _sameActivityKinds(List<ActivityKind> left, List<ActivityKind> right) {
  if (left.length != right.length) return false;
  for (var index = 0; index < left.length; index += 1) {
    if (left[index] != right[index]) return false;
  }
  return true;
}

@riverpod
ExternalEventRepository externalEventRepository(Ref ref) {
  return ExternalEventRepository(ref.watch(firebaseFirestoreProvider));
}

@riverpod
Future<List<ExternalEvent>> discoverableExternalEvents(
  Ref ref,
  ExternalEventDiscoveryQuery query,
) {
  return ref
      .watch(externalEventRepositoryProvider)
      .fetchDiscoverableExternalEvents(query);
}
