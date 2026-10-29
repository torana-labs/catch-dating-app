import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';

List<EventSuccessOutcomeUnit> eventSuccessHostOutcomeUnits({
  required Event event,
  required EventSuccessPlan plan,
  required List<EventSuccessAssignment> assignments,
  required List<EventSuccessAssignment> rotationAssignments,
  required List<EventAttendee> operationalAttendees,
  required List<PublicProfile> profiles,
}) {
  final outcome = EventSuccessActivityProfile.forFormat(
    event.eventFormat,
  ).unitOutcome;
  if (outcome == EventSuccessUnitOutcome.score) {
    final units = <String, EventSuccessOutcomeUnit>{};
    final unitLabels = <String>{};
    for (final assignment in assignments) {
      final unitKey = assignment.unitIndex?.toString() ?? assignment.label;
      final label = _boundedOutcomeLabel(
        assignment.unitLabel ?? assignment.label,
      );
      units.putIfAbsent(
        unitKey,
        () => EventSuccessOutcomeUnit(
          id: _safeOutcomeUnitId('${assignment.moduleId}_unit_$unitKey'),
          label: label,
        ),
      );
      unitLabels.add(_normalizedOutcomeLabelKey(label));
    }
    for (final attendee in operationalAttendees) {
      if (!attendee.isCheckedIn) continue;
      final arrivalGroup = attendee.arrivalGroup;
      if (arrivalGroup == null) continue;
      final label = _boundedOutcomeLabel(arrivalGroup);
      final labelKey = _normalizedOutcomeLabelKey(label);
      if (labelKey.isEmpty || !unitLabels.add(labelKey)) continue;
      units['arrival_group_$labelKey'] = EventSuccessOutcomeUnit(
        id: _safeOutcomeUnitId('arrival_group_$labelKey'),
        label: label,
      );
    }
    final result = units.values.toList()
      ..sort((a, b) => a.label.compareTo(b.label));
    return result;
  }
  if (outcome == EventSuccessUnitOutcome.rank) {
    final targetRound = plan.publishedRotationRoundIndex < 0
        ? 0
        : plan.publishedRotationRoundIndex;
    final profilesByUid = {
      for (final profile in profiles) profile.uid: profile,
    };
    final units = <String, EventSuccessOutcomeUnit>{};
    for (final assignment in rotationAssignments) {
      for (final slot in assignment.rotationSlots) {
        if (slot.roundIndex != targetRound) continue;
        final uids = [assignment.uid, slot.peerUid]..sort();
        final pairKey = slot.slotId ?? uids.join('_');
        units.putIfAbsent(
          pairKey,
          () => EventSuccessOutcomeUnit(
            id: _safeOutcomeUnitId('round_${targetRound}_$pairKey'),
            label: _boundedOutcomeLabel(
              '${profilesByUid[uids[0]]?.name ?? 'Guest'} + '
              '${profilesByUid[uids[1]]?.name ?? 'Guest'}',
            ),
          ),
        );
      }
    }
    final result = units.values.toList()
      ..sort((a, b) => a.label.compareTo(b.label));
    return result;
  }
  return const [];
}

String _safeOutcomeUnitId(String value) {
  final normalized = value.replaceAll(RegExp(r'[^A-Za-z0-9_-]'), '_');
  final safe = normalized.isEmpty ? 'unit' : normalized;
  return safe.length <= 120 ? safe : safe.substring(0, 120);
}

String _boundedOutcomeLabel(String value) {
  final normalized = value.trim().replaceAll(RegExp(r'\s+'), ' ');
  final trimmed = normalized.isEmpty ? 'Unit' : normalized;
  return trimmed.length <= 80 ? trimmed : trimmed.substring(0, 80);
}

String _normalizedOutcomeLabelKey(String value) =>
    value.trim().replaceAll(RegExp(r'\s+'), ' ').toLowerCase();
