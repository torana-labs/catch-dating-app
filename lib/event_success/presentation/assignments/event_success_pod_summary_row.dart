import 'package:catch_dating_app/event_success/domain/event_success_assignment.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessPodSummaryRow extends StatelessWidget {
  const EventSuccessPodSummaryRow({super.key, required this.assignments});

  final List<EventSuccessAssignment> assignments;

  @override
  Widget build(BuildContext context) {
    final groups = _assignmentCountsByLabel(assignments);
    return Wrap(
      spacing: CatchSpacing.s2,
      runSpacing: CatchSpacing.s2,
      children: [
        for (final entry in groups.entries)
          CatchBadge(
            label: context.l10n
                .eventSuccessEventSuccessHostOverridesLabelKeyValueAssigned(
                  key: entry.key,
                  value: entry.value,
                ),
            icon: CatchIcons.people,
          ),
      ],
    );
  }
}

Map<String, int> _assignmentCountsByLabel(
  List<EventSuccessAssignment> assignments,
) {
  final counts = <String, int>{};
  for (final assignment in assignments) {
    counts.update(assignment.label, (value) => value + 1, ifAbsent: () => 1);
  }
  return Map.fromEntries(
    counts.entries.toList()..sort((a, b) => a.key.compareTo(b.key)),
  );
}
