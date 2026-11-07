import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_badge.dart';
import 'package:catch_ui/src/components/catch_button.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_root.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_gap.dart';
import 'package:catch_ui/src/primitives/catch_row_press_surface.dart';
import 'package:catch_ui/src/primitives/catch_text.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

/// The system list row's vertical padding: 10, 12 or 14.
enum CatchIndexRowSize { compact, regular, roomy }

/// The colour of a row's marker dot, status, meta or leading icon tile.
enum CatchIndexRowTone { neutral, success, warning, danger, info }

/// How a system row's title reads: [unread] in bold, [done] (a step already
/// run) in the secondary ink at regular weight.
enum CatchIndexRowEmphasis { regular, unread, done }

/// A small badge right after a row's title: "New", "Regular".
@immutable
class CatchIndexRowBadge {
  const CatchIndexRowBadge({
    required this.label,
    this.tone = CatchBadgeTone.neutral,
    this.format,
    this.icon,
  });

  final String label;
  final CatchBadgeTone tone;

  /// Fills the badge with the format colour; wins over [tone].
  final CatchFormat? format;
  final IconData? icon;
}

/// The day-and-date tile that leads an event row, tinted by its format.
@immutable
class CatchIndexRowDate {
  const CatchIndexRowDate({required this.day, required this.date, this.format});

  /// The caller's short weekday, such as "Sun".
  final String day;

  /// The day of the month, such as "1".
  final String date;

  /// Tints the tile with the format colour; null draws a neutral tile.
  final CatchFormat? format;
}

/// The thin meter under a row's text: how full an event is.
@immutable
class CatchIndexRowProgress {
  const CatchIndexRowProgress({
    required this.value,
    required this.label,
    this.max = 100,
  }) : assert(max > 0);

  final num value;
  final num max;

  /// The meter's screen-reader label, such as "Booked".
  final String label;
}

/// The one small button at the end of a row: "Review", "Check in".
@immutable
class CatchIndexRowAction {
  const CatchIndexRowAction({
    required this.label,
    this.onPressed,
    this.variant = CatchIndexRowActionVariant.secondary,
  });

  final String label;

  /// Null disables the button.
  final VoidCallback? onPressed;

  /// secondary by default; primary for the one move a row asks for, such as
  /// checking a guest in.
  final CatchIndexRowActionVariant variant;
}

/// A row action's button style.
enum CatchIndexRowActionVariant { secondary, primary }

/// Canonical hairline index row for compact directories and browse lists.
///
/// A [subtitle] and a [footer] stack under the title for browse rows that
/// carry a second fact line and badges, such as an organiser's event list.
///
/// The system list row adds a [marker] dot, a [date] tile, a leading [icon]
/// or a [rank] before the text, with a [time] ahead of any of them; a
/// [badge] and a [status] on the title line; [body] copy, a [meta] line and a
/// [progress] meter under it; and a [value], the [trailing] control, an
/// [action] button and a [chevron] at the end. [leading] (an avatar, a
/// CatchMarker for a ring, a number or a live step) wins over [date], then
/// [icon], [marker] and [rank]. A selected system row sits on a tile that
/// bleeds 12 px past the row's edges, so its text stays in line with its
/// neighbours. Without a [density] the row keeps the
/// 66 px minimum and draws its own bottom hairline. With one it is the
/// system row: 10, 12 or 14 above and below, no minimum and no line of its
/// own, because the enclosing [CatchSection] owns the lines between rows.
///
/// [CatchSection]: CatchSection
class CatchIndexRow extends StatelessWidget {
  const CatchIndexRow({
    super.key,
    required this.title,
    required this.onTap,
    this.subtitle,
    this.footer,
    this.leading,
    this.trailing,
    this.selected = false,
    this.semanticLabel,
    this.titleStyle,
    this.titleMaxLines = 1,
    this.marker,
    this.date,
    this.meta,
    this.status,
    this.statusTone = CatchIndexRowTone.neutral,
    this.progress,
    this.action,
    this.density,
    this.time,
    this.icon,
    this.iconTone = CatchIndexRowTone.neutral,
    this.rank,
    this.badge,
    this.body,
    this.metaTone = CatchIndexRowTone.neutral,
    this.value,
    this.emphasis = CatchIndexRowEmphasis.regular,
    this.chevron = false,
  });

  final String title;
  final VoidCallback? onTap;
  final String? subtitle;
  final Widget? footer;
  final Widget? leading;
  final Widget? trailing;
  final bool selected;
  final String? semanticLabel;
  final TextStyle? titleStyle;
  final int titleMaxLines;

  /// A tone dot before the text: what kind of attention a task needs.
  final CatchIndexRowTone? marker;
  final CatchIndexRowDate? date;

  /// A muted line under the subtitle: "6:30 AM · 32 of 40 booked".
  final String? meta;

  /// Short text at the end of the title line: "8 left", "Full".
  final String? status;
  final CatchIndexRowTone statusTone;
  final CatchIndexRowProgress? progress;
  final CatchIndexRowAction? action;

  /// Null keeps the hairline index row; a size selects the system row.
  final CatchIndexRowSize? density;

  /// A clock time ahead of the leading part: a plan step's start.
  final String? time;

  /// A round 40 px tile with this icon, tinted by [iconTone].
  final IconData? icon;
  final CatchIndexRowTone iconTone;

  /// A place in a ranking: a team on the scoreboard.
  final int? rank;
  final CatchIndexRowBadge? badge;

  /// Longer copy that wraps under the title: a review, a message.
  final String? body;

  /// [meta] in the secondary ink, or the success ink ("Booked on Catch").
  final CatchIndexRowTone metaTone;

  /// A value at the end: "CSV", "41", "₹7,400".
  final String? value;
  final CatchIndexRowEmphasis emphasis;

  /// A disclosure chevron at the end, for a row that opens something.
  final bool chevron;

  /// The width a [time] takes before the leading part.
  static const double timeWidth = CatchSpacing.s10;

  /// The width a [rank] takes.
  static const double rankWidth = CatchSpacing.s7;

  /// How far a selected row's tile reaches past each edge.
  static const double selectedBleed = CatchSpacing.s3;

  /// The date tile's width; its height is [CatchSpacing.s16].
  static const double dateTileWidth = 56;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final density = this.density;
    final system = density != null;
    final sizeClass = CatchRootScope.sizeClassOf(context);
    final subtitleText = subtitle?.trim();
    final hasSubtitle = subtitleText != null && subtitleText.isNotEmpty;
    final metaText = meta?.trim();
    final hasMeta = metaText != null && metaText.isNotEmpty;
    final bodyText = body?.trim();
    final hasBody = bodyText != null && bodyText.isNotEmpty;
    final progress = this.progress;
    final action = this.action;
    final badge = this.badge;
    final Widget titleText;
    if (titleStyle == null && system) {
      final base = CatchTextVariant.titleRow.style(sizeClass);
      titleText = Text(
        title,
        maxLines: titleMaxLines,
        overflow: TextOverflow.ellipsis,
        style: switch (emphasis) {
          CatchIndexRowEmphasis.regular => base,
          CatchIndexRowEmphasis.unread => base.copyWith(
            fontWeight: FontWeight.w700,
          ),
          CatchIndexRowEmphasis.done => base.copyWith(
            color: t.ink2,
            fontWeight: FontWeight.w400,
          ),
        },
      );
    } else {
      titleText = Text(
        title,
        maxLines: titleMaxLines,
        overflow: TextOverflow.ellipsis,
        style: titleStyle ?? CatchTextStyles.titleL(context, color: t.ink),
      );
    }
    final status = this.status;
    final statusText = status == null
        ? null
        : CatchText(
            status,
            variant: CatchTextVariant.labelKicker,
            tone: _textTone(statusTone),
            maxLines: 1,
          );
    final Widget titleLine;
    if (badge != null) {
      final format = badge.format;
      titleLine = Row(
        spacing: CatchSpacing.s2,
        children: [
          Flexible(child: titleText),
          CatchBadge(
            label: badge.label,
            tone: badge.tone,
            icon: badge.icon,
            backgroundColor: format?.accent,
            foregroundColor: format?.ink,
          ),
          if (statusText != null) ...[const Spacer(), statusText],
        ],
      );
    } else if (statusText != null) {
      titleLine = Row(
        spacing: CatchSpacing.s2,
        children: [
          Expanded(child: titleText),
          statusText,
        ],
      );
    } else {
      titleLine = titleText;
    }
    final lineGap = system ? gapH3 : gapH2;
    final stacked =
        hasSubtitle || footer != null || hasMeta || hasBody || progress != null;
    final copy = !stacked
        ? titleLine
        : Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              titleLine,
              if (hasSubtitle) ...[
                lineGap,
                if (system)
                  CatchText(
                    subtitleText,
                    variant: CatchTextVariant.bodyMeta,
                    tone: CatchTextTone.secondary,
                    maxLines: 1,
                  )
                else
                  Text(
                    subtitleText,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: CatchTextStyles.supporting(context, color: t.ink2),
                  ),
              ],
              if (hasBody) ...[lineGap, CatchText(bodyText)],
              if (hasMeta) ...[
                lineGap,
                CatchText(
                  metaText,
                  variant: CatchTextVariant.bodyMeta,
                  tone: metaTone == CatchIndexRowTone.neutral
                      ? CatchTextTone.secondary
                      : _textTone(metaTone),
                ),
              ],
              if (progress != null) ...[
                gapH3,
                gapH4,
                Semantics(
                  label: progress.label,
                  value: '${progress.value} / ${progress.max}',
                  child: ExcludeSemantics(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(CatchRadius.pill),
                      child: SizedBox(
                        width: double.infinity,
                        height: GeneratedCatchStrokeTokens.meterMd,
                        child: DecoratedBox(
                          decoration: BoxDecoration(color: t.track),
                          child: FractionallySizedBox(
                            alignment: AlignmentDirectional.centerStart,
                            widthFactor: (progress.value / progress.max)
                                .clamp(0, 1)
                                .toDouble(),
                            child: ColoredBox(color: t.primary),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
              if (footer != null) ...[gapH6, footer!],
            ],
          );
    final main = leading ?? _leadPart(context, t);
    final time = this.time;
    final timeText = time == null
        ? null
        : SizedBox(
            width: timeWidth,
            child: CatchText(
              time,
              variant: CatchTextVariant.bodyMeta,
              tone: CatchTextTone.secondary,
              numeric: true,
              maxLines: 1,
            ),
          );
    final lead = timeText != null && main != null
        ? Row(
            mainAxisSize: MainAxisSize.min,
            spacing: CatchSpacing.s3,
            children: [timeText, main],
          )
        : timeText ?? main;
    final value = this.value;
    final ends = <Widget>[
      if (value != null)
        CatchText(
          value,
          tone: CatchTextTone.secondary,
          numeric: true,
          maxLines: 1,
        ),
      ?trailing,
      if (chevron && action == null)
        Icon(CatchIcons.disclosure, size: CatchIconSize.xs, color: t.ink2),
    ];
    final row = Row(
      crossAxisAlignment: hasBody
          ? CrossAxisAlignment.start
          : CrossAxisAlignment.center,
      children: [
        if (lead != null) ...[lead, if (system) gapW12 else gapW16],
        Expanded(child: copy),
        if (ends.isNotEmpty) ...[
          gapW12,
          if (ends.length == 1)
            ends.single
          else
            Row(
              mainAxisSize: MainAxisSize.min,
              spacing: CatchSpacing.s2,
              children: ends,
            ),
        ],
      ],
    );
    final padding = system
        ? EdgeInsets.symmetric(
            vertical: switch (density) {
              CatchIndexRowSize.compact => CatchSpacing.micro10,
              CatchIndexRowSize.regular => CatchSpacing.s3,
              CatchIndexRowSize.roomy => CatchSpacing.micro14,
            },
          )
        // A stacked row keeps a band above and below its copy; a
        // single-line row centres in the minimum height as before.
        : stacked
        ? const EdgeInsets.symmetric(vertical: CatchSpacing.s3)
        : EdgeInsets.zero;
    final minimum = BoxConstraints(
      minHeight: system ? 0 : CatchLayout.eventTypeIndexRowHeight,
    );
    final line = BoxDecoration(
      border: Border(bottom: BorderSide(color: t.line)),
    );
    final label =
        semanticLabel ??
        [
          title,
          ?badge?.label,
          ?status,
          if (hasSubtitle) subtitleText,
          if (hasBody) bodyText,
          if (hasMeta) metaText,
          ?value,
        ].join(', ');
    Widget padded = ConstrainedBox(
      constraints: minimum,
      child: Padding(padding: padding, child: row),
    );
    if (system && selected) {
      // The tile reaches past the row, so the text keeps its column.
      padded = Stack(
        clipBehavior: Clip.none,
        children: [
          PositionedDirectional(
            start: -selectedBleed,
            end: -selectedBleed,
            top: 0,
            bottom: 0,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: t.tile,
                borderRadius: BorderRadius.circular(CatchRadius.md),
              ),
            ),
          ),
          padded,
        ],
      );
    }
    final rowSemantics = Semantics(
      button: onTap != null,
      enabled: onTap != null,
      selected: selected,
      label: label,
      onTap: onTap,
      child: ExcludeSemantics(
        child: CatchRowPressSurface(
          onTap: onTap,
          semanticButton: false,
          child: action == null && !system
              ? DecoratedBox(decoration: line, child: padded)
              : padded,
        ),
      ),
    );
    if (action == null) return rowSemantics;
    // The action keeps its own button beside the row's one tap target.
    final withAction = Row(
      children: [
        Expanded(child: rowSemantics),
        gapW12,
        CatchButton(
          label: action.label,
          onPressed: action.onPressed,
          variant: switch (action.variant) {
            CatchIndexRowActionVariant.secondary =>
              CatchButtonVariant.secondary,
            CatchIndexRowActionVariant.primary => CatchButtonVariant.primary,
          },
          size: CatchButtonSize.sm,
        ),
      ],
    );
    return system
        ? withAction
        : DecoratedBox(decoration: line, child: withAction);
  }

  /// The leading part the row draws itself: the date tile, the icon tile,
  /// the marker dot or the rank, in that order.
  Widget? _leadPart(BuildContext context, CatchTokens t) {
    final date = this.date;
    if (date != null) {
      final format = date.format;
      return SizedBox(
        width: dateTileWidth,
        height: CatchSpacing.s16,
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: format?.accent ?? t.tile,
            borderRadius: BorderRadius.circular(CatchRadius.sm),
          ),
          child: DefaultTextStyle.merge(
            style: TextStyle(color: format?.ink ?? t.ink),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              spacing: CatchSpacing.micro2,
              children: [
                CatchText(date.day, variant: CatchTextVariant.labelBadge),
                CatchText(
                  date.date,
                  variant: CatchTextVariant.displaySm,
                  numeric: true,
                ),
              ],
            ),
          ),
        ),
      );
    }
    final icon = this.icon;
    if (icon != null) {
      final ground = CatchRootScope.groundOf(context);
      return SizedBox.square(
        dimension: GeneratedCatchSizeTokens.avatarMd,
        child: DecoratedBox(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: switch (iconTone) {
              CatchIndexRowTone.neutral =>
                ground == CatchGround.tile || ground == CatchGround.nested
                    ? t.nested
                    : t.tile,
              CatchIndexRowTone.success => t.tintMint,
              CatchIndexRowTone.warning => t.tintYellow,
              CatchIndexRowTone.danger => t.tintCoral,
              CatchIndexRowTone.info => t.tintIndigo,
            },
          ),
          child: Icon(icon, size: CatchIconSize.control, color: t.ink),
        ),
      );
    }
    final marker = this.marker;
    if (marker != null) {
      return SizedBox.square(
        dimension: CatchSpacing.micro10,
        child: DecoratedBox(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: switch (marker) {
              CatchIndexRowTone.neutral => t.ink,
              CatchIndexRowTone.success => t.formatCourts,
              CatchIndexRowTone.warning => t.formatGames,
              CatchIndexRowTone.danger => t.formatRun,
              CatchIndexRowTone.info => t.indigo,
            },
          ),
        ),
      );
    }
    final rank = this.rank;
    if (rank != null) {
      return SizedBox(
        width: rankWidth,
        child: CatchText(
          '$rank',
          variant: CatchTextVariant.displaySm,
          numeric: true,
          align: TextAlign.center,
        ),
      );
    }
    return null;
  }

  static CatchTextTone _textTone(CatchIndexRowTone tone) => switch (tone) {
    CatchIndexRowTone.neutral => CatchTextTone.secondary,
    CatchIndexRowTone.success => CatchTextTone.success,
    CatchIndexRowTone.warning => CatchTextTone.warning,
    CatchIndexRowTone.danger => CatchTextTone.danger,
    CatchIndexRowTone.info => CatchTextTone.info,
  };
}
