import 'dart:convert';

import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement_command.dart';
import 'package:flutter/services.dart';

import 'event_assistance_preview_repositories.dart' show previewUnconfirmed;

Future<Map<String, Object?>>? _cache;
Future<Map<String, Object?>> loadDeparturePreviewFixtures() =>
    _cache ??= _load();
Future<Map<String, Object?>> _load() async =>
    (jsonDecode(
              await rootBundle.loadString(
                '../test/event_rehearsal/fixtures/movement_reviews.json',
              ),
            )
            as Map)
        .cast<String, Object?>();

class DeparturePreviewPracticeRepository implements EventRehearsalRepository {
  DeparturePreviewPracticeRepository(this.fixtures);
  final Map<String, Object?> fixtures;
  Map<String, Object?> get sample =>
      (fixtures['ready'] as Map).cast<String, Object?>();
  EventRehearsalBootstrap get snapshot =>
      EventRehearsalBootstrap.fromCallableData({
        'session': sample['session'],
        'actors': sample['actors'],
        'actions': <Object?>[],
        'guestUrl': 'https://catchdates.com/rehearse/practicepublic1234567890',
        'canUseInternalFaults': false,
        'movementReview': sample['review'],
        'staffReview': (sample['review'] as Map)['staffReview'],
      });
  @override
  Future<EventRehearsalBootstrap> fetch(String sessionId) async => snapshot;
  @override
  Future<RehearsalMovementReview> fetchMovement({
    required EventRehearsalBootstrap snapshot,
    required RehearsalMovementSelection selection,
    required String actorUid,
  }) async => RehearsalMovementReview.fromJson(
    sample['review'],
    session: snapshot.session,
    actors: snapshot.actors,
    selection: selection,
    expectedActorUid: actorUid,
  );
  @override
  Future<EventRehearsalBootstrap> applyMovement(
    RehearsalMovementChange change,
  ) async => throw previewUnconfirmed;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// Live-shaped review from fictional fixture data; no Firebase transport.
class DeparturePreviewLiveRepository
    implements EventAssistanceDepartureRepository {
  DeparturePreviewLiveRepository(this.practice);
  final DeparturePreviewPracticeRepository practice;
  @override
  Future<EventAssistanceGroupProgressView> fetch(
    EventAssistanceGroupScope scope, {
    required String actorUid,
  }) async {
    final sample = practice.snapshot.movementReview!;
    return EventAssistanceGroupProgressResult.fromCallableData(
      {
        'outcome': 'read',
        'operationRevision': null,
        'actorUid': actorUid,
        'departureAuthority': {
          'kind': 'canConfirm',
          'validUntil': sample.endAt + 14400000,
          'checkpointReporter': 'anyAuthorizedOperator',
        },
        'view': {
          'context': scope.context,
          'groupId': scope.groupId,
          'serverTime': sample.serverTime,
          'revision': 0,
          'sourceHash': sample.sourceHash,
          'eventOpen': true,
          'runtimeLive': true,
          'freshness': 'unconfirmed',
          'progress': null,
          'guidance': null,
          'destinations': [
            for (final d in sample.destinations)
              {
                'alternativeId': d.alternativeId,
                'target': d.target.toJson(),
                'label': d.label,
                'location': {
                  'name': d.label,
                  'notes': d.text,
                  'latitude': 0,
                  'longitude': 0,
                },
              },
          ],
        },
      },
      expectedScope: scope,
      expectedActorUid: actorUid,
    ).view;
  }

  @override
  Future<EventAssistanceDepartureRosterReview> reviewRoster(
    EventAssistanceGroupProgressView snapshot,
    EventAssistanceDepartureRosterSelection selection,
  ) async => EventAssistanceDepartureRosterReview.fromCallableData(
    {
      'context': snapshot.scope.context,
      'groupId': snapshot.scope.groupId,
      'serverTime': snapshot.serverTime,
      'progressRevision': snapshot.revision,
      'selection': {
        'attendeeIds': selection.attendeeIds,
        'expectedSourceHash': snapshot.sourceHash,
      },
    },
    snapshot: snapshot,
    expectedSelection: selection,
  );
  @override
  Future<EventAssistanceGroupProgressResult> confirm(
    EventAssistanceDepartureChange change,
  ) async => throw previewUnconfirmed;
}
