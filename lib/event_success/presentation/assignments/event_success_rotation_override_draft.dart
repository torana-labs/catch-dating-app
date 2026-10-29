import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';

List<RotationOverrideRoundDraft> eventSuccessRotationOverrideDrafts(
  List<EventSuccessAssignment> assignments,
) {
  final pairsByRound = <int, Map<String, RotationOverridePairDraft>>{};
  for (final assignment in assignments) {
    for (final slot in assignment.rotationSlots) {
      final pairUids = [assignment.uid, slot.peerUid]..sort();
      final key = pairUids.join('__');
      pairsByRound
          .putIfAbsent(slot.roundIndex, () => {})
          .putIfAbsent(
            key,
            () => RotationOverridePairDraft(
              uidA: pairUids.first,
              uidB: pairUids.last,
            ),
          );
    }
  }
  final entries = pairsByRound.entries.toList()
    ..sort((a, b) => a.key.compareTo(b.key));
  return [
    for (final entry in entries)
      RotationOverrideRoundDraft(
        roundIndex: entry.key,
        pairings: entry.value.values.toList(),
      ),
  ];
}

final class RotationOverrideRoundDraft {
  RotationOverrideRoundDraft({
    required this.roundIndex,
    required this.pairings,
  });

  final int roundIndex;
  final List<RotationOverridePairDraft> pairings;
}

final class RotationOverridePairDraft {
  RotationOverridePairDraft({required this.uidA, required this.uidB});

  String? uidA;
  String? uidB;
}
