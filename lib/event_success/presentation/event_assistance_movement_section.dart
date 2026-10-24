import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

typedef EventAssistanceMovementGroup = ({String id, String label});

/// Capability-specific entry to the same group controls in both runtimes.
class EventAssistanceMovementSection extends StatefulWidget {
  const EventAssistanceMovementSection({
    super.key,
    required this.groups,
    required this.onDeparture,
    this.onCheckpointHistory,
  });
  final List<EventAssistanceMovementGroup> groups;
  final ValueChanged<String> onDeparture;
  final ValueChanged<String>? onCheckpointHistory;
  @override
  State<EventAssistanceMovementSection> createState() =>
      _EventAssistanceMovementSectionState();
}

class _EventAssistanceMovementSectionState
    extends State<EventAssistanceMovementSection> {
  String? _group;
  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final selected = widget.groups.length == 1
        ? widget.groups.single
        : widget.groups.where((g) => g.id == _group).firstOrNull;
    return CatchSection.divided(
      title: l10n.eventAssistanceMovementTitle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchText(
            l10n.eventAssistanceMovementBody,
            variant: CatchTextVariant.supporting,
          ),
          gapH12,
          if (widget.groups.length > 1) ...[
            CatchField<String>.select(
              copy: catchFieldCopy(l10n),
              title: l10n.eventAssistanceMovementGroup,
              contractExemption:
                  'Navigation to a configured group; the opened departure review authorizes every action.',
              values: widget.groups.map((g) => g.id).toList(),
              value: selected?.id,
              itemLabelBuilder: (id) =>
                  widget.groups.firstWhere((g) => g.id == id).label,
              onChanged: (id) => setState(() => _group = id),
            ),
            gapH12,
          ],
          CatchButton(
            label: l10n.eventAssistanceDepartureTitle,
            variant: CatchButtonVariant.secondary,
            onPressed: selected == null
                ? null
                : () => widget.onDeparture(selected.id),
          ),
          if (widget.onCheckpointHistory != null) ...[
            gapH8,
            CatchButton(
              label: l10n.eventAssistanceHistoryTitle,
              variant: CatchButtonVariant.ghost,
              onPressed: selected == null
                  ? null
                  : () => widget.onCheckpointHistory!(selected.id),
            ),
          ],
        ],
      ),
    );
  }
}
