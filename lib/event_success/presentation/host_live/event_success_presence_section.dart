import 'dart:async';

import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/event_success/domain/event_success_presence.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessPresenceSection extends StatelessWidget {
  const EventSuccessPresenceSection({
    super.key,
    required this.summary,
    required this.presenceError,
    required this.lateArrivalError,
    required this.resolvingLateArrival,
    required this.onRegenerate,
    required this.onResolveLateArrival,
  });

  final EventSuccessPresenceSummary? summary;
  final Object? presenceError;
  final Object? lateArrivalError;
  final bool resolvingLateArrival;
  final Future<void> Function()? onRegenerate;
  final Future<void> Function(String uid)? onResolveLateArrival;

  @override
  Widget build(BuildContext context) {
    final likelyDeparted = summary?.likelyDeparted ?? const [];
    final lateArrivals = summary?.lateArrivals ?? const [];
    return CatchSurface.card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchSectionHeader(
            padding: EdgeInsets.zero,
            title:
                context.l10n.eventSuccessEventSuccessHostLiveTitleGuestPresence,
            subtitle: context
                .l10n
                .eventSuccessEventSuccessHostLiveSubtitlePresenceNeverChangesPublished,
          ),
          if (presenceError != null) ...[
            gapH10,
            CatchLocalizedErrorBanner(
              presenceError!,
              context: AppErrorContext.event,
            ),
          ],
          if (likelyDeparted.isNotEmpty) ...[
            gapH12,
            CatchText(
              context.l10n
                  .eventSuccessEventSuccessHostLiveTextGuestsMayHaveLeft(
                    count: likelyDeparted.length,
                  ),
              variant: CatchTextVariant.sectionTitle,
            ),
            gapH4,
            CatchText(
              likelyDeparted.map((entry) => entry.displayName).join(', '),
              variant: CatchTextVariant.supporting,
            ),
            gapH10,
            CatchButton(
              label: context
                  .l10n
                  .eventSuccessEventSuccessHostLiveLabelRegenerateNextRound,
              onPressed: onRegenerate == null
                  ? null
                  : () => unawaited(onRegenerate!()),
              variant: CatchButtonVariant.secondary,
              size: CatchButtonSize.sm,
            ),
          ],
          if (lateArrivals.isNotEmpty) ...[
            gapH16,
            CatchText(
              context.l10n.eventSuccessEventSuccessHostLiveTitleLateArrivals,
              variant: CatchTextVariant.sectionTitle,
            ),
            gapH4,
            ...lateArrivals.map(
              (candidate) => Padding(
                padding: CatchInsets.controlVerticalTight,
                child: Row(
                  children: [
                    Expanded(
                      child: CatchText(
                        candidate.displayName,
                        variant: CatchTextVariant.sectionTitle,
                        color: CatchTokens.of(context).ink,
                      ),
                    ),
                    gapW8,
                    CatchButton(
                      label: context
                          .l10n
                          .eventSuccessEventSuccessHostLiveLabelPlaceNextRound,
                      size: CatchButtonSize.sm,
                      status: (resolvingLateArrival)
                          ? CatchButtonStatus.loading
                          : CatchButtonStatus.idle,
                      onPressed:
                          resolvingLateArrival || onResolveLateArrival == null
                          ? null
                          : () =>
                                unawaited(onResolveLateArrival!(candidate.uid)),
                    ),
                  ],
                ),
              ),
            ),
          ],
          if (lateArrivalError != null) ...[
            gapH10,
            CatchLocalizedErrorBanner(
              lateArrivalError!,
              context: AppErrorContext.event,
            ),
          ],
        ],
      ),
    );
  }
}
