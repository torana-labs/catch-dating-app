// C// Cap// Cap// Capture f// Capture fix// Capture fixtures shared by more than one catalog entry. Only the entries
// that import this file depend on it.

import 'dart:async';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart' show Fake;
import '../../../events/events_test_helpers.dart';

class CaptureMatchRepository extends Fake implements MatchRepository {
  CaptureMatchRepository({required this.matches});

  final List<Match> matches;

  @override
  Stream<Match?> watchMatch({required String matchId}) =>
      Stream.value(_matchFor(matchId));

  @override
  Stream<List<Match>> watchMatchesForUser({required String uid}) =>
      Stream.value([
        for (final match in matches)
          if (!match.isBlocked &&
              (match.user1Id == uid || match.user2Id == uid))
            match,
      ]);

  @override
  Future<void> resetUnread({
    required String matchId,
    required String uid,
  }) async {}

  Match? _matchFor(String id) {
    for (final match in matches) {
      if (match.id == id) return match;
    }
    return null;
  }
}

const matchChatViewerUid = 'nyc_jordan_ellis_002';
const matchChatOtherProfile = PublicProfile(
  uid: 'nyc_aanya_reference_001',
  name: 'Aanya',
  age: 29,
  gender: Gender.woman,
  city: 'Mumbai',
  occupation: 'Product designer',
  company: 'Studio Sunday',
);
final matchChatEvent = buildEvent(
  id: 'event-match-chat-context',
  organizerId: 'club-match-chat-padel',
  startTime: DateTime(2026, 6, 22, 18),
  endTime: DateTime(2026, 6, 22, 20),
  meetingPoint: 'Pali Hill Padel Club',
  startingPointLat: 19.0644,
  startingPointLng: 72.8295,
  locationDetails: 'Meet beside court 2',
  eventFormat: const EventFormatSnapshot(
    activityKind: ActivityKind.padel,
    interactionModel: EventInteractionModel.pairedRotations,
    customActivityLabel: 'Doubles ladder + drinks',
  ),
  bookedCount: 18,
  checkedInCount: 16,
  capacityLimit: 22,
  description: 'A low-pressure padel ladder with drinks after the final set.',
);
final matchChatMatch = Match(
  id: 'match-chat-context',
  user1Id: matchChatViewerUid,
  user2Id: matchChatOtherProfile.uid,
  eventIds: [matchChatEvent.id],
  createdAt: DateTime(2026, 6, 22, 9, 38),
  lastMessageAt: DateTime(2026, 6, 22, 9, 42),
  lastMessagePreview: 'Deal. 9am, court 2.',
  lastMessageSenderId: matchChatOtherProfile.uid,
  unreadCounts: const {matchChatViewerUid: 1},
);

class ReferenceChromeSafeArea extends StatelessWidget {
  const ReferenceChromeSafeArea({super.key, required this.child});

  static const _fallbackInsets = EdgeInsets.only(top: 44, bottom: 44);

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final padding = media.padding;
    final resolvedPadding = EdgeInsets.only(
      top: padding.top == 0 ? _fallbackInsets.top : padding.top,
      bottom: padding.bottom == 0 ? _fallbackInsets.bottom : padding.bottom,
      left: padding.left,
      right: padding.right,
    );

    return MediaQuery(
      data: media.copyWith(
        padding: resolvedPadding,
        viewPadding: resolvedPadding,
      ),
      child: child,
    );
  }
}
