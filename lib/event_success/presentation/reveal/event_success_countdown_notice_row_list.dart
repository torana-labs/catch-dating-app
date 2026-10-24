import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessCountdownNoticeRowList extends StatelessWidget {
  const EventSuccessCountdownNoticeRowList({super.key, required this.clue});

  final String clue;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        EventSuccessCountdownNotice(
          icon: CatchIcons.visibilityOffOutlined,
          title: context
              .l10n
              .eventSuccessEventSuccessLiveRevealWidgetsTitleNoNamesShownYet,
          body: context
              .l10n
              .eventSuccessEventSuccessLiveRevealWidgetsBodyPartnerDetailsStayLocked,
        ),
        gapH8,
        EventSuccessCountdownNotice(
          icon: CatchIcons.tipsAndUpdatesOutlined,
          title: context
              .l10n
              .eventSuccessEventSuccessLiveRevealWidgetsTitleClueIsLive,
          body: clue,
        ),
      ],
    );
  }
}

class EventSuccessCountdownNotice extends StatelessWidget {
  const EventSuccessCountdownNotice({
    super.key,
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchSurface(
      radius: CatchRadius.sm,
      backgroundColor: t.ink.withValues(alpha: CatchOpacity.revealCueFill),
      borderSpec: CatchBorder.resolve(
        t,
        CatchBorderRole.boundary,
        color: t.ink.withValues(alpha: CatchOpacity.revealCueBorder),
      ),
      padding: CatchInsets.contentDense,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: t.gold, size: CatchIcon.md),
          gapW10,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CatchText(
                  title,
                  variant: CatchTextVariant.sectionTitle,
                  color: t.ink,
                ),
                gapH2,
                CatchText(
                  body,
                  variant: CatchTextVariant.supporting,
                  color: t.ink.withValues(
                    alpha: CatchOpacity.eventSuccessMutedInk,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
