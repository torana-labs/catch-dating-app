import 'package:catch_dating_app/event_success/presentation/event_success_progress_status.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

const EdgeInsets _revealBeatPadding = EdgeInsets.symmetric(
  horizontal: CatchSpacing.s2,
  vertical: CatchSpacing.s2,
);

class EventSuccessCountdownStepper extends StatelessWidget {
  const EventSuccessCountdownStepper({
    super.key,
    required this.items,
    required this.currentIndex,
  }) : assert(items.length > 0),
       assert(currentIndex >= 0),
       assert(currentIndex < items.length);

  final List<({String label, IconData icon})> items;
  final int currentIndex;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final resolvedItems = [
      for (final entry in items.indexed)
        (
          item: entry.$2,
          state: EventSuccessProgressStatus.fromPosition(
            index: entry.$1,
            currentIndex: currentIndex,
          ),
        ),
    ];

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final entry in resolvedItems.indexed) ...[
            Expanded(
              child: CatchSurface(
                radius: CatchRadius.pill,
                backgroundColor: switch (entry.$2.state) {
                  EventSuccessProgressStatus.current => t.gold.withValues(
                    alpha: CatchOpacity.revealBeatFillActive,
                  ),
                  EventSuccessProgressStatus.complete => t.success.withValues(
                    alpha: CatchOpacity.revealBeatFillInactive,
                  ),
                  EventSuccessProgressStatus.future => t.ink3.withValues(
                    alpha: CatchOpacity.revealBeatFillInactive,
                  ),
                },
                borderSpec: CatchBorder.resolve(
                  t,
                  CatchBorderRole.boundary,
                  color: switch (entry.$2.state) {
                    EventSuccessProgressStatus.current => t.gold.withValues(
                      alpha: CatchOpacity.revealBeatBorderActive,
                    ),
                    EventSuccessProgressStatus.complete => t.success.withValues(
                      alpha: CatchOpacity.revealBeatBorderInactive,
                    ),
                    EventSuccessProgressStatus.future => t.ink3.withValues(
                      alpha: CatchOpacity.revealBeatBorderInactive,
                    ),
                  },
                ),
                padding: _revealBeatPadding,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      entry.$2.state == EventSuccessProgressStatus.complete
                          ? CatchIcons.checkCircleRounded
                          : entry.$2.item.icon,
                      size: CatchIcon.sm,
                      color: switch (entry.$2.state) {
                        EventSuccessProgressStatus.current => t.gold,
                        EventSuccessProgressStatus.complete => t.success,
                        EventSuccessProgressStatus.future => t.ink3,
                      },
                    ),
                    gapW4,
                    Flexible(
                      child: CatchText(
                        entry.$2.item.label,
                        maxLines: 2,

                        textAlign: TextAlign.center,
                        variant: CatchTextVariant.statusLabel,
                        color: switch (entry.$2.state) {
                          EventSuccessProgressStatus.current => t.gold,
                          EventSuccessProgressStatus.complete => t.success,
                          EventSuccessProgressStatus.future => t.ink3,
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (entry.$1 < resolvedItems.length - 1) gapW8,
          ],
        ],
      ),
    );
  }
}
