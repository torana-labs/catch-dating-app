import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_root.dart';
import 'package:catch_ui/src/primitives/catch_row_press_surface.dart';
import 'package:catch_ui/src/primitives/catch_text.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

/// A month of days, Monday first, for picking a date past the day strip: the
/// system Calendar.
///
/// It opens on [month] and steps a month at a time with its two arrows.
/// [value] is the caller's chosen day, filled in ink; days before [min] are
/// muted and cannot be picked; [marked] days (something already on) carry a
/// small dot under the number, and [repeats] (the next weekly dates) a ring.
/// With [markedLabel] or [repeatsLabel] it closes with a legend of the dot
/// and the ring. Month names, weekday initials and spoken dates come from the
/// platform's localizations; [label] names the group.
class CatchCalendar extends StatefulWidget {
  const CatchCalendar({
    super.key,
    required this.month,
    required this.label,
    this.value,
    this.onChanged,
    this.min,
    this.marked = const <DateTime>[],
    this.repeats = const <DateTime>[],
    this.markedLabel,
    this.repeatsLabel,
  });

  /// The month shown first; only its year and month are read.
  final DateTime month;
  final String label;

  /// The chosen day; only its date is read.
  final DateTime? value;

  /// Null shows the month read-only.
  final ValueChanged<DateTime>? onChanged;

  /// Days before this cannot be picked.
  final DateTime? min;
  final List<DateTime> marked;
  final List<DateTime> repeats;

  /// The legend's line for the dot: "You already have something on".
  final String? markedLabel;

  /// The legend's line for the ring: "Rings show the next weekly dates".
  final String? repeatsLabel;

  /// A day cell's smallest side.
  static const double dayMinExtent = CatchSpacing.s10;

  /// A day cell's largest side, on wide panes.
  static const double dayMaxExtent = CatchSpacing.s12;

  /// The month arrows' diameter.
  static const double stepExtent = CatchSpacing.s10;

  /// The marked dot's diameter.
  static const double dotExtent = CatchSpacing.s1;

  @override
  State<CatchCalendar> createState() => _CatchCalendarState();
}

class _CatchCalendarState extends State<CatchCalendar> {
  late DateTime _shown = DateTime(widget.month.year, widget.month.month);

  @override
  void didUpdateWidget(CatchCalendar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.month.year != widget.month.year ||
        oldWidget.month.month != widget.month.month) {
      _shown = DateTime(widget.month.year, widget.month.month);
    }
  }

  static DateTime _day(DateTime date) =>
      DateTime(date.year, date.month, date.day);

  void _step(int months) =>
      setState(() => _shown = DateTime(_shown.year, _shown.month + months));

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final localizations = MaterialLocalizations.of(context);
    final ground = CatchRootScope.groundOf(context);
    final stepFill =
        ground == CatchGround.tile ||
            ground == CatchGround.nested ||
            ground == CatchGround.nightTile
        ? t.nested
        : t.tile;
    final value = widget.value == null ? null : _day(widget.value!);
    final min = widget.min == null ? null : _day(widget.min!);
    final marked = {for (final day in widget.marked) _day(day)};
    final repeats = {for (final day in widget.repeats) _day(day)};
    // DateTime.weekday runs Monday 1 to Sunday 7; narrowWeekdays starts on
    // Sunday.
    final initials = [
      for (var index = 1; index <= 7; index++)
        localizations.narrowWeekdays[index % 7],
    ];
    final lead = _shown.weekday - 1;
    final days = DateUtils.getDaysInMonth(_shown.year, _shown.month);
    final cells = <DateTime?>[
      for (var index = 0; index < lead; index++) null,
      for (var day = 1; day <= days; day++)
        DateTime(_shown.year, _shown.month, day),
    ];
    while (cells.length % 7 != 0) {
      cells.add(null);
    }

    Widget stepButton(IconData icon, String tooltip, int months) => Tooltip(
      message: tooltip,
      child: Semantics(
        button: true,
        label: tooltip,
        child: ExcludeSemantics(
          child: SizedBox.square(
            dimension: CatchCalendar.stepExtent,
            child: Material(
              color: stepFill,
              shape: const CircleBorder(),
              clipBehavior: Clip.antiAlias,
              child: InkWell(
                onTap: () => _step(months),
                child: Icon(icon, size: CatchIconSize.md, color: t.ink),
              ),
            ),
          ),
        ),
      ),
    );

    Widget cell(DateTime? date) {
      if (date == null) return const SizedBox.shrink();
      final off = min != null && date.isBefore(min);
      final picked = date == value;
      final repeat = repeats.contains(date) && !picked;
      final onChanged = widget.onChanged;
      final tap = off || onChanged == null ? null : () => onChanged(date);
      return Semantics(
        button: true,
        selected: picked,
        enabled: tap != null,
        label: localizations.formatFullDate(date),
        onTap: tap,
        excludeSemantics: true,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(
              minHeight: CatchCalendar.dayMinExtent,
              maxHeight: CatchCalendar.dayMaxExtent,
            ),
            child: AspectRatio(
              aspectRatio: 1,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(CatchRadius.sm),
                child: CatchRowPressSurface(
                  onTap: tap,
                  semanticButton: false,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: picked ? t.primary : null,
                      borderRadius: BorderRadius.circular(CatchRadius.sm),
                      border: repeat
                          ? Border.all(color: t.ink, width: CatchStroke.control)
                          : null,
                    ),
                    child: Stack(
                      fit: StackFit.expand,
                      alignment: Alignment.center,
                      children: [
                        Center(
                          child: DefaultTextStyle.merge(
                            style: TextStyle(
                              color: picked
                                  ? t.onPrimary
                                  : off
                                  ? t.ink3
                                  : t.ink,
                            ),
                            child: CatchText(
                              '${date.day}',
                              variant: CatchTextVariant.titleRow,
                              numeric: true,
                            ),
                          ),
                        ),
                        if (marked.contains(date))
                          Positioned(
                            left: 0,
                            right: 0,
                            bottom: CatchSpacing.micro6 - CatchStroke.hairline,
                            child: Center(child: _Dot(color: t.formatRun)),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }

    final markedLabel = widget.markedLabel;
    final repeatsLabel = widget.repeatsLabel;
    return Semantics(
      container: true,
      label: widget.label,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        spacing: CatchSpacing.s3,
        children: [
          Row(
            children: [
              Expanded(
                child: CatchText(
                  localizations.formatMonthYear(_shown),
                  variant: CatchTextVariant.titleRow,
                ),
              ),
              stepButton(
                CatchIcons.back,
                localizations.previousMonthTooltip,
                -1,
              ),
              const SizedBox(width: CatchSpacing.s1),
              stepButton(CatchIcons.forward, localizations.nextMonthTooltip, 1),
            ],
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            spacing: CatchSpacing.s1,
            children: [
              ExcludeSemantics(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: CatchSpacing.s1),
                  child: Row(
                    spacing: CatchSpacing.s1,
                    children: [
                      for (final initial in initials)
                        Expanded(
                          child: CatchText(
                            initial,
                            variant: CatchTextVariant.labelBadge,
                            tone: CatchTextTone.secondary,
                            align: TextAlign.center,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              for (var start = 0; start < cells.length; start += 7)
                Row(
                  spacing: CatchSpacing.s1,
                  children: [
                    for (final date in cells.sublist(start, start + 7))
                      Expanded(child: cell(date)),
                  ],
                ),
            ],
          ),
          if (markedLabel != null || repeatsLabel != null)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              spacing: CatchSpacing.s1,
              children: [
                if (markedLabel != null)
                  _LegendLine(
                    mark: _Dot(color: t.formatRun, extent: CatchSpacing.s2),
                    label: markedLabel,
                  ),
                if (repeatsLabel != null)
                  _LegendLine(
                    mark: SizedBox.square(
                      dimension: CatchSpacing.s3,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(CatchRadius.xs),
                          border: Border.all(
                            color: t.ink,
                            width: CatchStroke.control,
                          ),
                        ),
                      ),
                    ),
                    label: repeatsLabel,
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  const _Dot({required this.color, this.extent = CatchCalendar.dotExtent});

  final Color color;
  final double extent;

  @override
  Widget build(BuildContext context) => SizedBox.square(
    dimension: extent,
    child: DecoratedBox(
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    ),
  );
}

/// One legend line: its key, then the muted copy.
class _LegendLine extends StatelessWidget {
  const _LegendLine({required this.mark, required this.label});

  final Widget mark;
  final String label;

  @override
  Widget build(BuildContext context) => Row(
    spacing: CatchSpacing.micro6,
    children: [
      SizedBox(
        width: CatchSpacing.s3,
        child: Center(child: mark),
      ),
      Expanded(
        child: CatchText(
          label,
          variant: CatchTextVariant.bodyMeta,
          tone: CatchTextTone.secondary,
        ),
      ),
    ],
  );
}
