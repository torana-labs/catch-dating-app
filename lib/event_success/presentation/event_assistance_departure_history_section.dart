import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

typedef EventAssistanceDepartureHistoryItem = ({
  int revision,
  int confirmedAt,
  String? title,
  int rosterSize,
  int reportRevision,
  int accountedForCount,
  bool hasCheckpoint,
});

/// Saved records use readable record rows, with disclosure only for report detail.
class EventAssistanceDepartureHistorySection extends StatelessWidget {
  const EventAssistanceDepartureHistorySection({
    super.key,
    required this.items,
    required this.contextMessage,
    required this.onCheckpoint,
    required this.onReload,
    this.onEarlier,
    this.onNewer,
  });
  final List<EventAssistanceDepartureHistoryItem> items;
  final String contextMessage;
  final ValueChanged<int> onCheckpoint;
  final VoidCallback onReload;
  final VoidCallback? onEarlier, onNewer;
  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final local = MaterialLocalizations.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchText(contextMessage, variant: CatchTextVariant.supporting),
        gapH8,
        CatchText(
          l10n.eventAssistanceHistoryBody,
          variant: CatchTextVariant.supporting,
        ),
        gapH12,
        if (items.isEmpty)
          CatchText(
            l10n.eventAssistanceHistoryEmpty,
            variant: CatchTextVariant.supporting,
          ),
        if (items.isNotEmpty)
          CatchSection.containedRows(
            children: items.map((row) {
              final content = CatchRecordLayout(
                icon: CatchIcons.group,
                title: row.title ?? l10n.eventAssistanceHistoryEarlierSetup,
                metadata: l10n.eventAssistanceHistoryDepartureAt(
                  number: row.revision,
                  date: local.formatMediumDate(
                    DateTime.fromMillisecondsSinceEpoch(row.confirmedAt),
                  ),
                  time: local.formatTimeOfDay(
                    TimeOfDay.fromDateTime(
                      DateTime.fromMillisecondsSinceEpoch(row.confirmedAt),
                    ),
                  ),
                ),
                facts: [
                  l10n.eventAssistanceHistoryRosterSize(count: row.rosterSize),
                  if (row.hasCheckpoint)
                    row.reportRevision == 0
                        ? l10n.eventAssistanceHistoryNoReport
                        : l10n.eventAssistanceHistoryObserved(
                            count: row.accountedForCount,
                            total: row.rosterSize,
                          )
                  else
                    l10n.eventAssistanceHistoryNoCheckpoint,
                ],
              );
              final key = ValueKey('checkpoint.history.${row.revision}');
              return row.hasCheckpoint
                  ? CatchField.navigate(
                      key: key,
                      content: content,
                      onActivate: () => onCheckpoint(row.revision),
                    )
                  : CatchField.read(key: key, content: content);
            }).toList(),
          ),
        gapH12,
        Wrap(
          spacing: CatchSpacing.s2,
          runSpacing: CatchSpacing.s2,
          children: [
            if (onNewer != null)
              CatchButton(
                label: l10n.eventAssistanceHistoryNewer,
                variant: CatchButtonVariant.secondary,
                onPressed: onNewer,
              ),
            if (onEarlier != null)
              CatchButton(
                label: l10n.eventAssistanceHistoryEarlier,
                variant: CatchButtonVariant.secondary,
                onPressed: onEarlier,
              ),
            CatchButton(
              label: l10n.eventAssistanceHistoryReload,
              variant: CatchButtonVariant.ghost,
              onPressed: onReload,
            ),
          ],
        ),
      ],
    );
  }
}
