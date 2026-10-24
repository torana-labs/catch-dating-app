import 'package:catch_dating_app/event_success/domain/event_assistance_case.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_case_managers.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

typedef EventAssistanceHelpItem = ({
  String id,
  String? displayName,
  AssistanceCaseCategory category,
  int receivedAt,
  AssistanceCaseAssignment? assignment,
  AssistanceCaseResolutionOutcome? resolution,
  bool sourceChanged,
});

EventAssistanceHelpItem liveHelpItem(AssistanceHostCase row) => (
  id: row.scope.caseId,
  displayName: row.displayName,
  category: row.category,
  receivedAt: row.receivedAt,
  assignment: switch (row) {
    AssistanceOpenHostCase(:final assignment) ||
    AssistanceClosedHostCase(:final assignment) => assignment,
    _ => null,
  },
  resolution: row is AssistanceClosedHostCase ? row.resolution.outcome : null,
  sourceChanged: row is AssistanceStaleHostCase,
);

/// Page controls and readable request records shared by live and practice.
class EventAssistanceHelpQueueSection extends StatelessWidget {
  const EventAssistanceHelpQueueSection({
    super.key,
    required this.items,
    required this.status,
    required this.onStatus,
    required this.onReview,
    required this.onReload,
    this.options,
    this.onPrevious,
    this.onNext,
    this.contextMessage,
  });
  final List<EventAssistanceHelpItem> items;
  final AssistanceCaseStatus status;
  final AssistanceCaseManagerOptions? options;
  final ValueChanged<AssistanceCaseStatus> onStatus;
  final ValueChanged<String> onReview;
  final VoidCallback onReload;
  final VoidCallback? onPrevious, onNext;
  final String? contextMessage;
  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchText(
          l10n.eventAssistanceHelpBody,
          variant: CatchTextVariant.supporting,
        ),
        if (contextMessage != null) ...[
          gapH8,
          CatchText(contextMessage!, variant: CatchTextVariant.supporting),
        ],
        gapH12,
        Wrap(
          spacing: CatchSpacing.s2,
          runSpacing: CatchSpacing.s2,
          children: [
            for (final choice in AssistanceCaseStatus.values)
              Semantics(
                selected: status == choice,
                child: CatchButton(
                  key: ValueKey('help.status.${choice.name}'),
                  label: choice == AssistanceCaseStatus.open
                      ? l10n.eventAssistanceHelpOpen
                      : l10n.eventAssistanceHelpHandled,
                  variant: status == choice
                      ? CatchButtonVariant.primary
                      : CatchButtonVariant.secondary,
                  onPressed: () => onStatus(choice),
                ),
              ),
          ],
        ),
        gapH12,
        if (items.isEmpty)
          CatchText(
            status == AssistanceCaseStatus.open
                ? l10n.eventAssistanceHelpEmptyOpen
                : l10n.eventAssistanceHelpEmptyHandled,
            variant: CatchTextVariant.supporting,
          ),
        if (items.isNotEmpty)
          CatchSection.containedRows(
            children: [
              for (final row in items)
                CatchField.navigate(
                  key: ValueKey('help.request.${row.id}'),
                  content: CatchRecordLayout(
                    icon: CatchIcons.group,
                    title:
                        row.displayName ?? l10n.eventAssistanceHelpUnknownGuest,
                    metadata: helpReceivedLabel(context, row.receivedAt),
                    facts: [
                      helpCategoryLabel(l10n, row.category),
                      if (row.assignment != null)
                        helpAssignmentLabel(l10n, row.assignment!, options)
                      else
                        row.sourceChanged
                            ? l10n.eventAssistanceHelpSourceChanged
                            : l10n.eventAssistanceHelpLegacy,
                      if (row.resolution != null)
                        row.resolution ==
                                AssistanceCaseResolutionOutcome.resolved
                            ? l10n.eventAssistanceHelpResolved
                            : l10n.eventAssistanceHelpDeclined,
                    ],
                  ),
                  onActivate: () => onReview(row.id),
                ),
            ],
          ),
        gapH12,
        CatchText(
          l10n.eventAssistanceHelpPageBody,
          variant: CatchTextVariant.supporting,
        ),
        gapH8,
        Wrap(
          spacing: CatchSpacing.s2,
          runSpacing: CatchSpacing.s2,
          children: [
            if (onPrevious != null)
              CatchButton(
                label: l10n.eventAssistanceHelpPrevious,
                variant: CatchButtonVariant.secondary,
                onPressed: onPrevious,
              ),
            if (onNext != null)
              CatchButton(
                label: l10n.eventAssistanceHelpNext,
                variant: CatchButtonVariant.secondary,
                onPressed: onNext,
              ),
            CatchButton(
              label: l10n.eventAssistanceHelpReload,
              variant: CatchButtonVariant.ghost,
              onPressed: onReload,
            ),
          ],
        ),
      ],
    );
  }
}
