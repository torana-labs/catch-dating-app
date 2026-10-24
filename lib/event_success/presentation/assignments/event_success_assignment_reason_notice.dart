import 'package:catch_dating_app/event_success/domain/event_success_assignment.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

const EdgeInsets _hostLaunchIssueGap = EdgeInsets.only(bottom: CatchSpacing.s1);

class EventSuccessAssignmentReasonNotice extends StatelessWidget {
  const EventSuccessAssignmentReasonNotice({
    super.key,
    required this.assignments,
  });

  final List<EventSuccessAssignment> assignments;

  @override
  Widget build(BuildContext context) {
    final reasons = _assignmentReasonSummaries(assignments);
    if (reasons.isEmpty) return const SizedBox.shrink();
    final t = CatchTokens.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              CatchIcons.infoOutlineRounded,
              size: CatchIcon.xs,
              color: t.ink2,
            ),
            gapW6,
            CatchText(
              context
                  .l10n
                  .eventSuccessEventSuccessHostOverridesTextAssignmentNotes,
              variant: CatchTextVariant.statusLabel,
              color: t.ink2,
            ),
          ],
        ),
        gapH6,
        for (final reason in reasons)
          Padding(
            padding: _hostLaunchIssueGap,
            child: CatchText(
              reason,
              variant: CatchTextVariant.supporting,
              color: t.ink2,
            ),
          ),
      ],
    );
  }
}

List<String> _assignmentReasonSummaries(
  List<EventSuccessAssignment> assignments,
) {
  final summaries = <String>[];
  for (final assignment in assignments) {
    final summary = assignment.whySummary?.trim();
    if (summary != null && summary.isNotEmpty) summaries.add(summary);
    for (final slot in assignment.rotationSlots) {
      final slotSummary = slot.whySummary?.trim();
      if (slotSummary != null && slotSummary.isNotEmpty) {
        summaries.add(slotSummary);
      }
    }
    for (final slot in assignment.groupRotationSlots) {
      final slotSummary = slot.whySummary?.trim();
      if (slotSummary != null && slotSummary.isNotEmpty) {
        summaries.add(slotSummary);
      }
    }
    for (final slot in assignment.sitOutSlots) {
      summaries.add(slot.whySummary);
    }
  }
  return [...summaries.toSet()].take(3).toList(growable: false);
}
