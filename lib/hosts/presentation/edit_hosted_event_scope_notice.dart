import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EditHostedEventScopeNotice extends StatelessWidget {
  const EditHostedEventScopeNotice({
    super.key,
    required this.isCancelled,
    required this.scheduleLocked,
    required this.policyLocked,
  });

  final bool isCancelled;
  final bool scheduleLocked;
  final bool policyLocked;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final title = isCancelled
        ? context.l10n.hostsEditHostedEventScreenTitleCancelledEvent
        : scheduleLocked
        ? context.l10n.hostsEditHostedEventScreenTitleScheduleLocked
        : context.l10n.hostsEditHostedEventScreenTitlePublishedEvent;
    final message = isCancelled
        ? context.l10n.hostsEditHostedEventScreenMessageCancelledEventsCannotBe
        : scheduleLocked
        ? context.l10n.hostsEditHostedEventScreenMessageYouCanStillUpdate
        : policyLocked
        ? context.l10n.hostsEditHostedEventScreenMessageYouCanEditThe
        : context.l10n.hostsEditHostedEventScreenMessageYouCanEditSchedule;

    return CatchSurface(
      padding: CatchInsets.content,
      borderRole: CatchBorderRole.separator,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            isCancelled
                ? CatchIcons.blockRounded
                : CatchIcons.infoOutlineRounded,
            color: isCancelled ? t.danger : t.primary,
          ),
          gapW12,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: CatchText(
                        title,
                        variant: CatchTextVariant.sectionTitle,
                      ),
                    ),
                    if (scheduleLocked && !isCancelled)
                      CatchBadge(
                        label:
                            context.l10n.hostsEditHostedEventScreenLabelLocked,
                      ),
                  ],
                ),
                gapH4,
                CatchText(
                  message,
                  variant: CatchTextVariant.supporting,
                  color: t.ink2,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
