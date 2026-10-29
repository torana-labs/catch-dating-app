import 'dart:convert';

import 'package:catch_dating_app/contexts/live/data/event_assistance_accountability_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_membership_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_membership_receivers.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_staff_change.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter/services.dart';

/// Reads the same backend-produced synthetic fixture used by native parity tests.
Future<Map<String, Object?>>? _fixtureCache;
Future<Map<String, Object?>> loadAssistancePreviewFixtures() =>
    _fixtureCache ??= _loadFixtures();
Future<Map<String, Object?>> _loadFixtures() async =>
    (jsonDecode(
              await rootBundle.loadString(
                '../test/event_rehearsal/fixtures/staff_reviews.json',
              ),
            )
            as Map)
        .cast<String, Object?>();

const previewUnconfirmed = NetworkException(
  'unavailable',
  'Preview: save confirmation is unavailable. Retry preserves the same observation.',
);

class AssistancePreviewLiveRepository
    implements EventAssistanceAccountabilityRepository {
  @override
  Future<EventAssistanceAccountabilityView> fetch(
    EventAssistanceAccountabilityScope scope,
  ) async => EventAssistanceAccountabilityResult.fromCallableData({
    'outcome': 'read',
    'operationRevision': null,
    'view': {
      'context': scope.group.context,
      'groupId': scope.group.groupId,
      'attendeeId': scope.attendeeId,
      'checkpoint': ?scope.checkpoint?.toJson(),
      'serverTime': 1000,
      'sourceHash': 'a' * 64,
      'revision': 0,
      'episodeId': null,
      'disposition': 'unresolved',
      'availability': {'kind': 'ready'},
    },
  }, expectedScope: scope).view;
  @override
  Future<EventAssistanceAccountabilityResult> apply(
    EventAssistanceAccountabilityChange change,
  ) async => throw previewUnconfirmed;
}

/// No production transport is reachable. Controls expose a deterministic retry state.
class AssistancePreviewPracticeRepository implements EventRehearsalRepository {
  AssistancePreviewPracticeRepository(this.fixtures);
  final Map<String, Object?> fixtures;
  EventRehearsalBootstrap get snapshot =>
      EventRehearsalBootstrap.fromCallableData(fixtures['manager']);
  @override
  Future<EventRehearsalBootstrap> fetch(String sessionId) async => snapshot;
  @override
  Stream<EventRehearsalBootstrap> watch(String sessionId) =>
      Stream.value(snapshot);
  @override
  Future<EventRehearsalBootstrap> fetchPracticeRole({
    required String sessionId,
    required String practiceOperatorId,
    required String hostUid,
  }) async => EventRehearsalBootstrap.fromCallableData(
    fixtures[practiceOperatorId.split(':').last],
  );
  @override
  Future<EventRehearsalBootstrap> applyAssistance(
    RehearsalAssistanceChange change,
  ) async => throw previewUnconfirmed;
  @override
  Future<EventRehearsalBootstrap> applyStaff(
    RehearsalStaffChange change,
  ) async => throw previewUnconfirmed;
  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw UnsupportedError('No live operations in assistance previews.');
}

/// The live adapter also uses synthetic fixture evidence and never a callable.
class AssistancePreviewMembershipRepository
    implements EventAssistanceMembershipRepository {
  AssistancePreviewMembershipRepository(this.fixtures);
  final Map<String, Object?> fixtures;
  @override
  Future<EventAssistanceMembershipView> fetch(
    EventAssistanceGuestScope scope,
  ) async {
    final snapshot = EventRehearsalBootstrap.fromCallableData(
      fixtures['manager'],
    );
    final row = snapshot.membershipReviews!.rows.first;
    final choices = rehearsalMembershipReceivers(snapshot.session, row);
    final raw =
        (((fixtures['manager'] as Map)['membershipReviews'] as Map)['rows']
                    as List)
                .first
            as Map;
    return EventAssistanceMembershipView.fromJson({
      for (final entry in raw.entries)
        if (entry.key != 'availability' && entry.key != 'attendeeId')
          entry.key: entry.value,
      'context': scope.context,
      'attendeeId': scope.attendeeId,
      if (choices != null)
        'handoverReview': {
          'expiresAt': choices.expiresAt,
          'receivers': [
            for (final receiver in choices.receivers)
              {
                'operatorId': receiver.operatorId,
                'displayName': receiver.displayName,
                'groups': [
                  for (final group in receiver.groups.entries)
                    {'groupId': group.key, 'validUntil': group.value},
                ],
              },
          ],
        },
    }, expectedScope: scope);
  }

  @override
  Future<EventAssistanceMembershipResult> apply(
    EventAssistanceMembershipChange change,
  ) async => throw previewUnconfirmed;
}
