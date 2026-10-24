import 'package:catch_dating_app/event_success/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/event_success/domain/event_success_standings.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_assignment_surface.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessStandingsSection extends StatelessWidget {
  const EventSuccessStandingsSection({
    super.key,
    required this.entries,
    required this.unitOutcome,
  });

  final List<EventSuccessStandingEntry> entries;
  final EventSuccessUnitOutcome unitOutcome;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return EventSuccessAssignmentSurface(
      title: context
          .l10n
          .eventSuccessEventSuccessLiveRevealWidgetsTitleUnlockedTogether,
      child: Column(
        children: [
          for (var index = 0; index < entries.length; index++) ...[
            if (index > 0) Divider(height: CatchSpacing.s4, color: t.line),
            Row(
              children: [
                SizedBox(
                  width: CatchSpacing.s9,
                  child: CatchText(
                    '#${entries[index].position}',
                    variant: CatchTextVariant.statusLabel,
                    color: CatchTokens.of(context).ink2,
                  ),
                ),
                Expanded(
                  child: CatchText(
                    entries[index].unitLabel,
                    variant: CatchTextVariant.bodyM,
                    color: CatchTokens.of(context).ink,
                  ),
                ),
                gapW12,
                CatchText(
                  unitOutcome == EventSuccessUnitOutcome.score
                      ? context.l10n.eventSuccessLiveControlPointsValue(
                          points: entries[index].value,
                        )
                      : context.l10n.eventSuccessLiveControlRankValue(
                          rank: entries[index].value.toInt(),
                        ),
                  variant: CatchTextVariant.statusLabel,
                  color: t.primary,
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
