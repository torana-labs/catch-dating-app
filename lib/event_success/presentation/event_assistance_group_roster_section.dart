import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

typedef EventAssistanceGroupGuest = ({String id, String name});

/// A compact entry to one guest's group action, shared by both runtimes.
class EventAssistanceGroupRosterSection extends StatefulWidget {
  const EventAssistanceGroupRosterSection({
    super.key,
    required this.guests,
    required this.onReview,
    this.loading = false,
    this.error,
    this.onReload,
  });
  final List<EventAssistanceGroupGuest> guests;
  final ValueChanged<String>? onReview;
  final bool loading;
  final Object? error;
  final VoidCallback? onReload;
  @override
  State<EventAssistanceGroupRosterSection> createState() =>
      _EventAssistanceGroupRosterSectionState();
}

class _EventAssistanceGroupRosterSectionState
    extends State<EventAssistanceGroupRosterSection> {
  String? _selectedId;
  @override
  Widget build(BuildContext context) {
    final selected = widget.guests
        .where((g) => g.id == _selectedId)
        .firstOrNull;
    final l10n = context.l10n;
    return CatchSection.divided(
      title: l10n.eventAssistanceGroupRosterTitle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchText(
            l10n.eventAssistanceGroupRosterBody,
            variant: CatchTextVariant.supporting,
          ),
          gapH12,
          if (widget.error != null)
            CatchLocalizedErrorBanner(widget.error!, onRetry: widget.onReload),
          if (widget.loading)
            const CatchLoadingIndicator()
          else if (widget.guests.isEmpty)
            CatchText(
              l10n.eventAssistanceGroupNoGuests,
              variant: CatchTextVariant.supporting,
            )
          else ...[
            CatchField<String>.select(
              copy: catchFieldCopy(l10n),
              title: l10n.eventAssistanceGroupGuest,
              contractExemption:
                  'Local navigation selection. The selected guest scope is verified by the membership review before any write.',
              values: widget.guests.map((g) => g.id).toList(),
              value: selected?.id,
              itemLabelBuilder: (id) =>
                  widget.guests.firstWhere((g) => g.id == id).name,
              onChanged: (id) => setState(() => _selectedId = id),
            ),
            gapH12,
            CatchButton(
              label: l10n.eventAssistanceGroupReview,
              variant: CatchButtonVariant.secondary,
              onPressed: selected == null || widget.onReview == null
                  ? null
                  : () => widget.onReview!(selected.id),
            ),
          ],
        ],
      ),
    );
  }
}
