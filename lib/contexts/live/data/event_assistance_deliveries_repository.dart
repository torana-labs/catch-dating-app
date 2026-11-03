import 'package:catch_dating_app/contexts/live/data/live_a_listener_streams.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_deliveries_page.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_scope.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:catch_platform/schema_contracts/generated/callables/repair_event_assistance_delivery_callable_request.g.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_deliveries_repository.g.dart';

/// The rows of one view page and whether the listener saw one more.
typedef _ViewRows = ({
  List<AssistanceDeliveryViewDocument> views,
  bool hasMore,
});

class EventAssistanceDeliveriesRepository {
  const EventAssistanceDeliveriesRepository(
    this._db,
    this._functions, {
    this.clock = const AppClock(),
  });

  static const viewsCollection = 'hostEventDeliveryViews';

  final FirebaseFirestore _db;
  final FirebaseFunctions _functions;

  /// Lapses manual handoffs on screen at each view's relevantUntilMillis.
  final AppClock clock;

  /// One page of an event's live message deliveries, as the delivery view
  /// triggers last wrote them, read against the app clock. Emits on every
  /// snapshot and again when a row's manual handoff lapses.
  Stream<EventAssistanceDeliveriesPage> watchPage(
    EventAssistanceDeliveryQuery query,
  ) => withBackendErrorStream(
    () => clockedListener<_ViewRows, EventAssistanceDeliveriesPage>(
      _views(query),
      clock: clock,
      build: (rows, now) => EventAssistanceDeliveriesPage.fromViews(
        query: query,
        views: rows.views,
        hasMore: rows.hasMore,
        nowMillis: now.millisecondsSinceEpoch,
      ),
      nextRebuildAt: (page) => switch (page.nextActionLapseMillis) {
        final millis? => DateTime.fromMillisecondsSinceEpoch(millis),
        null => null,
      },
    ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'load event message deliveries',
      resource: viewsCollection,
    ),
  );

  // Rules list a view only for a manager of the organizer the query names.
  Stream<_ViewRows> _views(EventAssistanceDeliveryQuery query) =>
      withBackendErrorStream(
        () {
          Query<Map<String, dynamic>> rows = _db
              .collection(viewsCollection)
              .where('organizerId', isEqualTo: query.organizerId)
              .where('eventId', isEqualTo: query.eventId)
              .orderBy(FieldPath.documentId);
          final cursor = query.cursor;
          if (cursor != null) rows = rows.startAfter([cursor]);
          return rows
              .limit(ReadLimitPolicy.hostLiveReviewPage + 1)
              .snapshots()
              .map((snapshot) {
                final docs = snapshot.docs;
                return (
                  views: [
                    for (final doc in docs.take(
                      eventAssistanceDeliveryPageSize,
                    ))
                      (
                        id: doc.id,
                        data: doc.data(),
                        evaluatedAtMillis: _millis(doc.data()['evaluatedAt']),
                      ),
                  ],
                  hasMore: docs.length > eventAssistanceDeliveryPageSize,
                );
              });
        },
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch event message deliveries',
          resource: viewsCollection,
        ),
      );

  Future<EventAssistanceDeliveryResult> apply(
    EventAssistanceDeliveryChange change,
  ) => withBackendErrorContext(
    () async {
      final response = await _functions
          .httpsCallable('repairEventAssistanceDelivery')
          .call<Object?>(
            RepairEventAssistanceDeliveryCallableRequest(
              command: change.command,
              expectedMessageRevision: change.snapshot.revision,
              expectedReviewHash: change.snapshot.reviewHash,
            ).toJson(),
          );
      return EventAssistanceDeliveryResult.fromCallableData(
        response.data,
        expectedChange: change,
      );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'take over message delivery',
      resource: 'eventAssistanceMessages',
    ),
    mapper: mapMissingCallableAsUnavailable,
  );
}

int _millis(Object? value) {
  if (value is Timestamp) return value.millisecondsSinceEpoch;
  throw const FormatException('A view has no evaluation time.');
}

@riverpod
EventAssistanceDeliveriesRepository eventAssistanceDeliveriesRepository(
  Ref ref,
) => EventAssistanceDeliveriesRepository(
  ref.watch(firebaseFirestoreProvider),
  ref.watch(firebaseFunctionsProvider),
  clock: ref.watch(appClockProvider),
);
