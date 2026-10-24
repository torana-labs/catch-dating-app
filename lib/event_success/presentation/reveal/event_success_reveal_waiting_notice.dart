import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_assignment_kind.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessRevealWaitingNotice extends StatelessWidget {
  const EventSuccessRevealWaitingNotice({super.key, required this.kind});

  final EventSuccessRevealAssignmentKind kind;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchSurface(
      radius: CatchRadius.sm,
      backgroundColor: t.primarySoft,
      borderSpec: CatchBorder.resolve(
        t,
        CatchBorderRole.boundary,
        color: t.primary.withValues(alpha: CatchOpacity.revealSurfaceBorder),
      ),
      padding: CatchInsets.contentDense,
      child: Row(
        children: [
          Icon(CatchIcons.lockClockRounded, color: t.primary),
          gapW10,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CatchText(
                  context
                      .l10n
                      .eventSuccessEventSuccessLiveRevealWidgetsTextTheRoomIsHolding,
                  variant: CatchTextVariant.sectionTitle,
                ),
                gapH2,
                CatchText(
                  context.l10n
                      .eventSuccessEventSuccessLiveRevealWidgetsTextTheHostControlsThe(
                        assignmentNoun: kind.assignmentNoun,
                      ),
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
