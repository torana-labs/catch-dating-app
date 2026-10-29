import 'dart:math' as math;

import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_assignment_kind.dart';

String eventSuccessRevealHostHeadline({
  required EventSuccessRevealAssignmentKind kind,
  required bool isCountingDown,
  required bool allRevealed,
  required int targetRound,
  required int roundCount,
  required int remainingSeconds,
}) {
  if (roundCount == 0) return 'Build the queue before the reveal';
  if (isCountingDown) {
    return 'Round ${targetRound + 1} opens in ${remainingSeconds}s';
  }
  if (allRevealed) return 'Every reveal is live';
  return 'Create the next room-wide beat';
}

String eventSuccessRevealHostBody({
  required EventSuccessRevealAssignmentKind kind,
  required List<EventSuccessAssignment> assignments,
  required int roundIndex,
  required int roundCount,
  required bool allRevealed,
}) {
  if (roundCount == 0) {
    if (kind == EventSuccessRevealAssignmentKind.standings) {
      return 'Record a complete outcome round here. It will use this same synchronized reveal when the host is ready.';
    }
    return 'Generate ${kind.assignmentNounPlural} first, then drop a countdown so everyone gets the assignment together.';
  }
  if (allRevealed) {
    return 'All ${kind.assignmentNounPlural} have been released. Reset only if the host wants to rehearse or restart the live flow.';
  }
  if (kind == EventSuccessRevealAssignmentKind.standings) {
    return 'Round ${roundIndex + 1} standings are ready. The table stays masked until the host releases this shared reveal.';
  }
  if (kind == EventSuccessRevealAssignmentKind.microPods) {
    final groupRotationCount = _uniqueGroupRotationCountForRound(
      assignments,
      roundIndex,
    );
    if (groupRotationCount > 0) {
      final groupWord = groupRotationCount == 1 ? 'group' : 'groups';
      return '$groupRotationCount rotating $groupWord queued for round ${roundIndex + 1}; reveal names once the host has the room.';
    }
    final groups = _assignmentCountsByLabel(assignments);
    return '${assignments.length} attendees across ${groups.length} ${kind.assignmentNounPlural}; reveal names once the host has the room.';
  }
  final roundPairCount = _uniquePairCountForRound(assignments, roundIndex);
  final mutualCount = _strongCompatibilityPairCount(assignments, roundIndex);
  final pairingWord = roundPairCount == 1 ? 'pairing' : 'pairings';
  final verb = roundPairCount == 1 ? 'is' : 'are';
  final clueVerb = mutualCount == 1 ? 'has' : 'have';
  return '$roundPairCount $pairingWord $verb queued for round ${roundIndex + 1}. $mutualCount $clueVerb a stronger shared clue.';
}

int eventSuccessRevealRemainingSeconds(EventSuccessPlan plan, DateTime now) =>
    (plan.revealRemaining(now).inMilliseconds / 1000)
        .ceil()
        .clamp(0, 60)
        .toInt();

int eventSuccessRevealSafeRoundIndex(int value, int roundCount) {
  if (roundCount <= 0) return 0;
  return value.clamp(0, roundCount - 1).toInt();
}

int eventSuccessRevealMaxRotationRoundCount(
  List<EventSuccessAssignment> assignments,
) {
  var maxRounds = 0;
  for (final assignment in assignments) {
    maxRounds = math.max(maxRounds, assignment.rotationSlots.length);
    maxRounds = math.max(maxRounds, assignment.groupRotationSlots.length);
  }
  return maxRounds;
}

Map<String, int> _assignmentCountsByLabel(
  List<EventSuccessAssignment> assignments,
) {
  final counts = <String, int>{};
  for (final assignment in assignments) {
    counts.update(assignment.label, (value) => value + 1, ifAbsent: () => 1);
  }
  return counts;
}

int _uniquePairCountForRound(
  List<EventSuccessAssignment> assignments,
  int roundIndex,
) {
  final pairs = <String>{};
  for (final assignment in assignments) {
    for (final slot in assignment.rotationSlots) {
      if (slot.roundIndex != roundIndex) continue;
      final uids = [assignment.uid, slot.peerUid]..sort();
      pairs.add(uids.join('__'));
    }
  }
  return pairs.length;
}

int _strongCompatibilityPairCount(
  List<EventSuccessAssignment> assignments,
  int roundIndex,
) {
  final pairs = <String>{};
  for (final assignment in assignments) {
    for (final slot in assignment.rotationSlots) {
      if (slot.roundIndex != roundIndex ||
          !eventSuccessRevealIsStrongCompatibilitySignal(slot.compatibility)) {
        continue;
      }
      final uids = [assignment.uid, slot.peerUid]..sort();
      pairs.add(uids.join('__'));
    }
  }
  return pairs.length;
}

/// Mono "config" line for the rotation run-of-show list (design-system
/// `RotationCard` config): unit kind · round cadence · repeat strategy · reveal
/// countdown. Rendered uppercase by the mono-label style.
String eventSuccessRevealRotationConfigLine(
  EventSuccessStructureConfig config,
) {
  final parts = <String>[config.unitKind.label];
  final interval = config.rotationIntervalMinutes;
  if (interval != null && interval > 0) {
    parts.add('$interval min rounds');
  }
  parts.add(config.rotationRepeatStrategy.label);
  parts.add('${config.revealCountdownSeconds}s reveal');
  return parts.join(' · ');
}

/// Human pairings for a revealed rotation round ("Asha ⇄ Kabir, Meera ⇄ Zara").
/// Returns null when the round has no pairings; group rotations fall back to a
/// group count. Callers must only pass revealed rounds — hidden rounds stay
/// masked.
String? eventSuccessRevealRevealRoundPairsLabel(
  List<EventSuccessAssignment> assignments,
  int roundIndex,
  Map<String, PublicProfile> profilesByUid,
) {
  final seen = <String>{};
  final pairs = <String>[];
  for (final assignment in assignments) {
    for (final slot in assignment.rotationSlots) {
      if (slot.roundIndex != roundIndex) continue;
      final ids = [assignment.uid, slot.peerUid]..sort();
      if (!seen.add(ids.join('__'))) continue;
      final a = profilesByUid[ids[0]]?.name ?? 'Guest';
      final b = profilesByUid[ids[1]]?.name ?? 'Guest';
      pairs.add('$a ⇄ $b');
    }
  }
  if (pairs.isNotEmpty) return pairs.join(', ');
  final groupCount = _uniqueGroupRotationCountForRound(assignments, roundIndex);
  if (groupCount > 0) {
    return '$groupCount ${groupCount == 1 ? 'group' : 'groups'} this round';
  }
  return null;
}

int _uniqueGroupRotationCountForRound(
  List<EventSuccessAssignment> assignments,
  int roundIndex,
) {
  final groups = <String>{};
  for (final assignment in assignments) {
    for (final slot in assignment.groupRotationSlots) {
      if (slot.roundIndex != roundIndex) continue;
      final uids = [assignment.uid, ...slot.peerUids]..sort();
      groups.add('${slot.unitLabel}:${uids.join('__')}');
    }
  }
  return groups.length;
}

EventSuccessRotationSlot? eventSuccessRevealSlotForRound(
  EventSuccessAssignment assignment,
  int roundIndex,
) {
  for (final slot in assignment.rotationSlots) {
    if (slot.roundIndex == roundIndex) return slot;
  }
  return null;
}

EventSuccessGroupRotationSlot? eventSuccessRevealGroupSlotForRound(
  EventSuccessAssignment assignment,
  int roundIndex,
) {
  for (final slot in assignment.groupRotationSlots) {
    if (slot.roundIndex == roundIndex) return slot;
  }
  return null;
}

String eventSuccessRevealCompatibilityLabel(String value) => switch (value) {
  'mutual_interest' => 'Mutual interest',
  'questionnaire_match' => 'Shared clue',
  'balanced' => 'Balanced',
  'social' => 'Social fit',
  'mixed' => 'Mixed group',
  _ => 'Host fit',
};

String eventSuccessRevealCompatibilityExplanation(String value) =>
    switch (value) {
      'mutual_interest' => 'You both showed stronger interest for this round.',
      'questionnaire_match' =>
        'You share an event answer that can make this round easier to start.',
      'balanced' => 'Balanced by the host for variety and comfort.',
      'social' => 'A lightweight social pairing for this format.',
      'mixed' => 'A group fit balanced across romantic and social signals.',
      _ => 'Adjusted by the host for the live room.',
    };

bool eventSuccessRevealIsStrongCompatibilitySignal(String value) =>
    value == 'mutual_interest' || value == 'questionnaire_match';

String eventSuccessRevealSkipLabel(EventSuccessRevealAssignmentKind kind) =>
    kind == EventSuccessRevealAssignmentKind.rotations
    ? 'Skip rotations'
    : 'Skip micro-pods';

String eventSuccessRevealJoinLabel(EventSuccessRevealAssignmentKind kind) =>
    kind == EventSuccessRevealAssignmentKind.rotations
    ? 'Join rotations'
    : 'Join micro-pods';

extension EventSuccessRevealCapitalization on String {
  String get capitalized {
    if (isEmpty) return this;
    return '${this[0].toUpperCase()}${substring(1)}';
  }
}
