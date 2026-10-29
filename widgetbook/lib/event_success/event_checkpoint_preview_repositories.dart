import 'dart:convert';

import 'package:catch_dating_app/contexts/live/data/event_assistance_checkpoint_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_history_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_request.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure_history.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:flutter/services.dart';

import 'event_assistance_preview_repositories.dart' show previewUnconfirmed;
import 'event_departure_preview_repositories.dart';

Future<Map<String, Object?>>? _cache;
Future<Map<String, Object?>> loadCheckpointPreviewFixtures() =>
    _cache ??= _load();
Future<Map<String, Object?>> _load() async =>
    (jsonDecode(
              await rootBundle.loadString(
                '../test/event_success/fixtures/checkpoint_reviews.json',
              ),
            )
            as Map)
        .cast<String, Object?>();

final checkpointPreviewScope = EventAssistanceCheckpointScope(
  group: EventAssistanceGroupScope(
    organizerId: 'o-checkpoint-native',
    eventId: 'e-checkpoint-native',
    groupId: 'event:whole',
  ),
  checkpoint: AssistanceAccountabilityCheckpoint(
    checkpointId: 'one',
    progressRevision: 2,
  ),
);

class CheckpointPreviewLiveRepository
    implements EventAssistanceCheckpointRepository {
  CheckpointPreviewLiveRepository(this.fixtures);
  final Map<String, Object?> fixtures;
  @override
  Future<EventAssistanceCheckpointView> fetch(
    EventAssistanceCheckpointScope scope,
  ) async => EventAssistanceCheckpointResult.fromCallableData(
    fixtures['initial'],
    expectedScope: scope,
  ).view;
  @override
  Future<EventAssistanceCheckpointResult> apply(
    EventAssistanceCheckpointChange change,
  ) async => throw previewUnconfirmed;
  @override
  Future<EventAssistanceCheckpointResult> manageRequest(
    EventAssistanceCheckpointRequestChange change,
  ) async => throw previewUnconfirmed;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class CheckpointPreviewHistoryRepository
    implements EventAssistanceDepartureHistoryRepository {
  CheckpointPreviewHistoryRepository(this.fixtures);
  final Map<String, Object?> fixtures;
  @override
  Future<EventAssistanceDepartureHistoryPage> fetch(
    EventAssistanceDepartureHistoryQuery query, {
    required String actorUid,
  }) async => EventAssistanceDepartureHistoryPage.fromCallableData(
    fixtures['historyInitial'],
    expectedQuery: query,
    expectedActorUid: actorUid,
  );
}

/// Existing departure-only previews have no recorded history or live transport.
class EmptyDeparturePreviewHistoryRepository
    implements EventAssistanceDepartureHistoryRepository {
  const EmptyDeparturePreviewHistoryRepository();
  @override
  Future<EventAssistanceDepartureHistoryPage> fetch(
    EventAssistanceDepartureHistoryQuery query, {
    required String actorUid,
  }) async => EventAssistanceDepartureHistoryPage.fromCallableData(
    {
      'context': query.group.context,
      'groupId': query.group.groupId,
      'actorUid': actorUid,
      'validUntil': 9007199254740991,
      'serverTime': 1000,
      'progressRevision': 0,
      'coverage': 'page',
      'rosters': <Object?>[],
      'nextBeforeRevision': null,
    },
    expectedQuery: query,
    expectedActorUid: actorUid,
  );
}

class CheckpointPreviewPracticeRepository
    extends DeparturePreviewPracticeRepository {
  CheckpointPreviewPracticeRepository(super.fixtures);
  @override
  Map<String, Object?> get sample =>
      (fixtures['departed'] as Map).cast<String, Object?>();
}

Future<Map<String, Object?>>? _requestCache;
Future<Map<String, Object?>> loadCheckpointRequestPreviewFixtures() =>
    _requestCache ??= _loadRequests();
Future<Map<String, Object?>> _loadRequests() async =>
    (jsonDecode(
              await rootBundle.loadString(
                '../test/event_rehearsal/fixtures/checkpoint_management.json',
              ),
            )
            as Map)
        .cast<String, Object?>();

class CheckpointRequestPreviewPracticeRepository
    extends DeparturePreviewPracticeRepository {
  CheckpointRequestPreviewPracticeRepository(super.fixtures);
  @override
  Map<String, Object?> get sample =>
      (fixtures['resolved'] as Map).cast<String, Object?>();
}
