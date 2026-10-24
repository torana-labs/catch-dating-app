import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_visit_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

final class EventAssistanceSweepGuest {
  const EventAssistanceSweepGuest({
    required this.id,
    required this.name,
    required this.disposition,
  });
  final String id, name;
  final AssistanceVisitDisposition disposition;
}

/// The same compact roster opens one guest's visit in live and practice modes.
class EventAssistanceSweepSection extends StatelessWidget {
  const EventAssistanceSweepSection({
    super.key,
    required this.guests,
    required this.onReview,
    this.loading = false,
    this.error,
    this.onReload,
  });
  final List<EventAssistanceSweepGuest> guests;
  final ValueChanged<String>? onReview;
  final bool loading;
  final Object? error;
  final VoidCallback? onReload;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchSection.divided(
      title: l10n.eventSuccessAccountabilityTitle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchText(
            l10n.eventSuccessAccountabilitySubtitle,
            variant: CatchTextVariant.supporting,
          ),
          gapH8,
          if (error != null)
            CatchLocalizedErrorBanner(error!, onRetry: onReload),
          if (loading)
            const CatchLoadingIndicator()
          else if (guests.isEmpty)
            CatchText(
              l10n.eventSuccessAccountabilityEmpty,
              variant: CatchTextVariant.supporting,
            )
          else ...[
            CatchText(
              l10n.eventSuccessAccountabilityProgress(
                resolved: guests
                    .where(
                      (g) =>
                          g.disposition !=
                          AssistanceVisitDisposition.unresolved,
                    )
                    .length,
                total: guests.length,
              ),
              variant: CatchTextVariant.supporting,
            ),
            gapH8,
            CatchFieldLanes.divided(
              children: [
                for (final guest in guests)
                  CatchField.content(
                    key: ValueKey('sweep.guest.${guest.id}'),
                    copy: catchFieldCopy(l10n),
                    title: guest.name,
                    body: assistanceVisitLabel(l10n, guest.disposition),
                    actions: CatchButton(
                      label: l10n.eventAssistanceVisitReview,
                      size: CatchButtonSize.sm,
                      variant: CatchButtonVariant.ghost,
                      onPressed: onReview == null
                          ? null
                          : () => onReview!(guest.id),
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
