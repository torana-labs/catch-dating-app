import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_avatar_row.dart';
import 'package:catch_ui/src/components/catch_badge.dart';
import 'package:catch_ui/src/components/catch_metric_value.dart';
import 'package:catch_ui/src/components/catch_person_avatar_item.dart';
import 'package:catch_ui/src/primitives/catch_surface.dart';
import 'package:catch_ui/src/primitives/catch_text.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

/// The system EventCard variants Flutter draws. The system also has cover,
/// compact and external; they arrive with their first screen.
enum CatchEventCardVariant { poster }

/// One event as a card, in the system's EventCard API.
///
/// The poster is the one event a screen is about (Today, a host's next
/// night): a spotlight in the [format] colour with the [when] badge and the
/// [formatLabel] kicker on top, the title and the [place], then the [counts]
/// (two or three values with their labels) and the [people] who are coming,
/// with a "+N" for the rest of [peopleTotal]. The spotlight sets the format
/// for everything inside it, so the text takes the format ink. Callers format
/// every value; the card owns the layout and the tint, both from tokens.
class CatchEventCard extends StatelessWidget {
  const CatchEventCard({
    super.key,
    required this.title,
    required this.format,
    this.variant = CatchEventCardVariant.poster,
    this.formatLabel,
    this.when,
    this.place,
    this.counts = const <CatchMetricValue>[],
    this.people = const <CatchPersonAvatarItem>[],
    this.peopleTotal,
    this.onTap,
    this.semanticLabel,
  });

  final String title;

  /// Tints the poster.
  final CatchFormat format;
  final CatchEventCardVariant variant;

  /// The format's name as a kicker: "Trivia".
  final String? formatLabel;

  /// The badge on top: "Tonight · doors at 7:30".
  final String? when;
  final String? place;

  /// Two or three values with their labels: 26 Booked, 4 Waitlist.
  final List<CatchMetricValue> counts;

  /// The first faces of who is coming; the card shows up to four.
  final List<CatchPersonAvatarItem> people;

  /// Everyone coming, for the "+N" after [people]; null counts [people].
  final int? peopleTotal;
  final VoidCallback? onTap;

  /// The button's label when [onTap] is set; null reads the card's text.
  final String? semanticLabel;

  /// The most faces the poster shows before the "+N".
  static const int peopleLimit = 4;

  @override
  Widget build(BuildContext context) {
    final when = this.when;
    final formatLabel = this.formatLabel;
    final place = this.place;
    return CatchSurface(
      block: CatchSurfaceBlock.spotlight,
      color: switch (format) {
        CatchFormat.run => CatchSurfaceColor.run,
        CatchFormat.dinner => CatchSurfaceColor.dinner,
        CatchFormat.games => CatchSurfaceColor.games,
        CatchFormat.courts => CatchSurfaceColor.courts,
        CatchFormat.nightsOut => CatchSurfaceColor.nightsOut,
      },
      onPress: onTap,
      semanticLabel: semanticLabel,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: CatchSpacing.s4,
        children: [
          if (when != null || formatLabel != null)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              spacing: CatchSpacing.s3,
              children: [
                if (when != null)
                  Flexible(child: CatchBadge.solid(label: when)),
                if (formatLabel != null)
                  CatchText(
                    formatLabel,
                    variant: CatchTextVariant.labelKicker,
                    maxLines: 1,
                  ),
              ],
            ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: CatchSpacing.micro6,
            children: [
              Semantics(
                header: true,
                child: CatchText(title, variant: CatchTextVariant.displayTitle),
              ),
              if (place != null)
                CatchText(place, variant: CatchTextVariant.body),
            ],
          ),
          if (counts.isNotEmpty || people.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: CatchSpacing.s1),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.end,
                spacing: CatchSpacing.s3,
                children: [
                  if (counts.isNotEmpty)
                    Flexible(
                      child: Wrap(
                        spacing: CatchSpacing.micro18,
                        runSpacing: CatchSpacing.s2,
                        children: [
                          for (final count in counts)
                            Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              spacing: CatchSpacing.micro2,
                              children: [
                                CatchText(
                                  count.unit.isEmpty
                                      ? count.value
                                      : '${count.value} ${count.unit}',
                                  variant: CatchTextVariant.displaySection,
                                  numeric: true,
                                ),
                                CatchText(
                                  count.label,
                                  variant: CatchTextVariant.labelKicker,
                                ),
                              ],
                            ),
                        ],
                      ),
                    ),
                  if (people.isNotEmpty)
                    CatchAvatarRow(
                      items: people,
                      totalCount: peopleTotal,
                      size: GeneratedCatchSizeTokens.avatarSm,
                      limit: peopleLimit,
                      borderColor: format.accent,
                      countLabelBuilder: (count) => '+$count',
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
