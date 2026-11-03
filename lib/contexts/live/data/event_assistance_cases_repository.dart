import 'package:catch_dating_app/contexts/live/data/live_a_listener_streams.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_managers.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_cases_page.dart';
import 'package:catch_dating_app/contexts/organizers/organizers.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:catch_platform/schema_contracts/generated/callables/resolve_event_assistance_case_callable_request.g.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_assistance_cases_repository.g.dart';

/// The rows of one view page and whether the listener saw one more.
typedef _ViewRows = ({List<AssistanceCaseViewDocument> views, bool hasMore});

class EventAssistanceCasesRepository {
  const EventAssistanceCasesRepository(
    this._db,
    this._functions,
    this._organizers,
  );

  static const viewsCollection = 'hostEventCaseViews';

  final FirebaseFirestore _db;
  final FirebaseFunctions _functions;
  final OrganizersRepository _organizers;

  /// One page of an event's help requests for one status, as the case view
  /// triggers last wrote it, with the handoff choices built from the
  /// organizer document. Emits again whenever either changes.
  Stream<EventAssistanceCasesPage> watchPage(
    EventAssistanceCaseQuery query, {
    required String actorUid,
  }) => withBackendErrorStream(
    () => combineLatestPair(
      _views(query),
      _organizers.watchOrganizer(query.organizerId),
      (rows, organizer) => EventAssistanceCasesPage.fromViews(
        query: query,
        views: rows.views,
        hasMore: rows.hasMore,
        managerOptions: organizer == null
            ? null
            : AssistanceCaseManagerOptions.fromOrganizer(
                organizer: organizer,
                actorUid: actorUid,
              ),
      ),
    ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'load guest help requests',
      resource: viewsCollection,
    ),
  );

  // Rules list a view only for a manager of the organizer the query names.
  // firestore-index: hostEventCaseViews (organizerId:ASCENDING,eventId:ASCENDING,status:ASCENDING,__name__:ASCENDING)
  Stream<_ViewRows> _views(EventAssistanceCaseQuery query) =>
      withBackendErrorStream(
        () {
          Query<Map<String, dynamic>> rows = _db
              .collection(viewsCollection)
              .where('organizerId', isEqualTo: query.organizerId)
              .where('eventId', isEqualTo: query.eventId)
              .where('status', isEqualTo: query.status.name)
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
                    for (final doc in docs.take(eventAssistanceCasePageSize))
                      (
                        id: doc.id,
                        data: doc.data(),
                        evaluatedAtMillis: _millis(doc.data()['evaluatedAt']),
                      ),
                  ],
                  hasMore: docs.length > eventAssistanceCasePageSize,
                );
              });
        },
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch guest help requests',
          resource: viewsCollection,
        ),
      );

  Future<EventAssistanceCaseResult> apply(EventAssistanceCaseChange change) =>
      withBackendErrorContext(
        () async {
          final response = await _functions
              .httpsCallable('resolveEventAssistanceCase')
              .call<Object?>(
                ResolveEventAssistanceCaseCallableRequest(
                  command: change.command,
                  expectedSourceHash: change.snapshot.sourceHash,
                ).toJson(),
              );
          return EventAssistanceCaseResult.fromCallableData(
            response.data,
            expectedChange: change,
          );
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'update guest help request',
          resource: 'eventAssistanceCases',
        ),
        mapper: mapMissingCallableAsUnavailable,
      );
}

int _millis(Object? value) {
  if (value is Timestamp) return value.millisecondsSinceEpoch;
  throw const FormatException('A view has no evaluation time.');
}

/// Typed mutation seam used by the case editor.
final class EventAssistanceCaseCommands {
  const EventAssistanceCaseCommands(this._repository);

  final EventAssistanceCasesRepository _repository;

  Future<EventAssistanceCaseResult> apply(EventAssistanceCaseChange change) =>
      _repository.apply(change);
}

@riverpod
EventAssistanceCasesRepository eventAssistanceCasesRepository(Ref ref) =>
    EventAssistanceCasesRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(firebaseFunctionsProvider),
      ref.watch(organizersRepositoryProvider),
    );

@riverpod
EventAssistanceCaseCommands eventAssistanceCaseCommands(Ref ref) =>
    EventAssistanceCaseCommands(
      ref.watch(eventAssistanceCasesRepositoryProvider),
    );
