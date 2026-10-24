import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/core/widgets/event_activity_visuals.dart';
import 'package:catch_dating_app/core/widgets/event_backdrop_image.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Production event card backed by the shared activity visual schema.
///
/// Recommendation-style event card with the shared activity backdrop, ticket
/// edge, and event metadata atoms.
class EventCard extends StatelessWidget {
  const EventCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.timeLabel,
    required this.countdownLabel,
    required this.priceLabel,
    required this.capacityLabel,
    required this.activityKind,
    this.statusLabel,
    this.clockTime,
    this.width,
    this.heroTag,
    this.onTap,
  });

  final String title;
  final String subtitle;
  final String timeLabel;
  final String countdownLabel;
  final String priceLabel;
  final String capacityLabel;
  final ActivityKind activityKind;
  final String? statusLabel;
  final TimeOfDay? clockTime;
  final double? width;
  final Object? heroTag;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final visual = eventActivityVisual(activityKind, context: context);
    final status = statusLabel?.trim();
    final card = SizedBox(
      width: width,
      child: CatchTicket.card(
        onTap: onTap,
        mediaBuilder: (context, _) => Stack(
          fit: StackFit.expand,
          children: [
            EventBackdropImage(visual: visual),
            Positioned(
              left: CatchSpacing.s4,
              bottom: CatchSpacing.s4,
              child: Transform.rotate(
                angle: -0.08,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: t.accent,
                      width: CatchStroke.underline,
                    ),
                    color: t.primaryInk.withValues(
                      alpha: CatchOpacity.subtleFill,
                    ),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: CatchSpacing.s2,
                      vertical: CatchSpacing.s1,
                    ),
                    child: CatchMetadataText(
                      visual.label,
                      color: t.accent,
                      uppercase: true,
                    ),
                  ),
                ),
              ),
            ),
            if (status != null && status.isNotEmpty)
              Positioned(
                top: CatchSpacing.s3,
                right: CatchSpacing.s3,
                left: CatchSpacing.s3,
                child: Align(
                  alignment: Alignment.centerRight,
                  child: CatchBadge.ticketStatus(
                    label: status,
                    color: visual.accent,
                    emphasis: CatchBadgeEmphasis.strong,
                  ),
                ),
              ),
          ],
        ),
        bodyBuilder: (context, _) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                CatchClockIndicator(
                  accent: visual.accent,
                  time: clockTime ?? _parseClockTimeLabel(timeLabel),
                  size: 38,
                  ringColor: t.ink2,
                  hourStrokeWidth: 2.2,
                  minuteStrokeWidth: 1.7,
                  hourLengthFactor: 0.52,
                  minuteLengthFactor: 0.78,
                  centerDotRadius: 2.2,
                ),
                gapW10,
                Expanded(
                  child: CatchMetadataText(
                    context.l10n
                        .coreCatchEventActivityCardsVisiblecopyTimelabelCountdownlabel(
                          timeLabel: timeLabel,
                          countdownLabel: countdownLabel,
                        ),
                    color: t.primary,
                  ),
                ),
                gapW8,
                Text(
                  priceLabel,
                  style: CatchTextStyles.labelL(context, color: t.ink),
                ),
              ],
            ),
            gapH10,
            Text(
              title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: CatchTextStyles.eventDisplay(
                context,
                step: CatchTextStylesSize.s,
                height: 1.02,
              ),
            ),
            gapH6,
            CatchText(
              subtitle,
              maxLines: 1,

              variant: CatchTextVariant.supporting,
              color: t.ink2,
            ),
            gapH12,
            CatchMetadataText(capacityLabel, color: t.ink2),
          ],
        ),
      ),
    );
    return heroTag == null
        ? card
        : CatchHeroViewport(tag: heroTag!, child: card);
  }
}

TimeOfDay _parseClockTimeLabel(String label) {
  final match = RegExp(
    r'^\s*(\d{1,2})(?::(\d{2}))?\s*([aApP][mM])?\s*$',
  ).firstMatch(label);
  if (match == null) return const TimeOfDay(hour: 12, minute: 0);

  var hour = int.tryParse(match.group(1) ?? '') ?? 12;
  final minute = int.tryParse(match.group(2) ?? '0') ?? 0;
  final meridiem = match.group(3)?.toLowerCase();
  if (minute < 0 || minute > 59) return const TimeOfDay(hour: 12, minute: 0);

  if (meridiem == 'pm' && hour != 12) {
    hour += 12;
  } else if (meridiem == 'am' && hour == 12) {
    hour = 0;
  }
  if (hour < 0 || hour > 23) return const TimeOfDay(hour: 12, minute: 0);
  return TimeOfDay(hour: hour, minute: minute);
}
