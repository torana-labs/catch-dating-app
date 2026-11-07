import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_button.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_gap.dart';
import 'package:catch_ui/src/primitives/catch_row_press_surface.dart';
import 'package:catch_ui/src/primitives/catch_text.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

/// The system list row's vertical padding: 10, 12 or 14.
enum CatchIndexRowSize { compact, regular, roomy }

/// The colour of a row's marker dot or status text.
enum CatchIndexRowTone { neutral, success, warning, danger, info }

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

/// The one small secondary button at the end of a row: "Review", "Offer".
@immutable
class CatchIndexRowAction {
  const CatchIndexRowAction({required this.label, this.onPressed});

  final String label;

  /// Null disables the button.
  final VoidCallback? onPressed;
}

/// Canonical hairline index row for compact directories and browse lists.
///
/// A [subtitle] and a [footer] stack under the title for browse rows that
/// carry a second fact line and badges, such as an organiser's event list.
///
/// The system list row adds a [marker] dot or a [date] tile before the text,
/// a [status] at the end of the title line, a [meta] line and a [progress]
/// meter under it, and an [action] button at the end; [leading] wins over
/// [date], which wins over [marker]. Without a [density] the row keeps the
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

  /// The date tile's width; its height is [CatchSpacing.s16].
  static const double dateTileWidth = 56;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final density = this.density;
    final system = density != null;
    final subtitleText = subtitle?.trim();
    final hasSubtitle = subtitleText != null && subtitleText.isNotEmpty;
    final metaText = meta?.trim();
    final hasMeta = metaText != null && metaText.isNotEmpty;
    final progress = this.progress;
    final action = this.action;
    final Widget titleText = titleStyle == null && system
        ? CatchText(
            title,
            variant: CatchTextVariant.titleRow,
            maxLines: titleMaxLines,
          )
        : Text(
            title,
            maxLines: titleMaxLines,
            overflow: TextOverflow.ellipsis,
            style: titleStyle ?? CatchTextStyles.titleL(context, color: t.ink),
          );
    final status = this.status;
    final titleLine = status == null
        ? titleText
        : Row(
            spacing: CatchSpacing.s2,
            children: [
              Expanded(child: titleText),
              CatchText(
                status,
                variant: CatchTextVariant.labelKicker,
                tone: switch (statusTone) {
                  CatchIndexRowTone.neutral => CatchTextTone.secondary,
                  CatchIndexRowTone.success => CatchTextTone.success,
                  CatchIndexRowTone.warning => CatchTextTone.warning,
                  CatchIndexRowTone.danger => CatchTextTone.danger,
                  CatchIndexRowTone.info => CatchTextTone.info,
                },
                maxLines: 1,
              ),
            ],
          );
    final lineGap = system ? gapH3 : gapH2;
    final stacked =
        hasSubtitle || footer != null || hasMeta || progress != null;
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
              if (hasMeta) ...[
                lineGap,
                CatchText(
                  metaText,
                  variant: CatchTextVariant.bodyMeta,
                  tone: CatchTextTone.secondary,
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
    final date = this.date;
    final format = date?.format;
    final marker = this.marker;
    final lead =
        leading ??
        (date != null
            ? SizedBox(
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
                        CatchText(
                          date.day,
                          variant: CatchTextVariant.labelBadge,
                        ),
                        CatchText(
                          date.date,
                          variant: CatchTextVariant.displaySm,
                          numeric: true,
                        ),
                      ],
                    ),
                  ),
                ),
              )
            : marker != null
            ? SizedBox.square(
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
              )
            : null);
    final row = Row(
      children: [
        if (lead != null) ...[lead, if (system) gapW12 else gapW16],
        Expanded(child: copy),
        if (trailing != null) ...[gapW12, trailing!],
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
          ?status,
          if (hasSubtitle) subtitleText,
          if (hasMeta) metaText,
        ].join(', ');
    final padded = ConstrainedBox(
      constraints: minimum,
      child: Padding(padding: padding, child: row),
    );
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
          variant: CatchButtonVariant.secondary,
          size: CatchButtonSize.sm,
        ),
      ],
    );
    return system
        ? withAction
        : DecoratedBox(decoration: line, child: withAction);
  }
}
