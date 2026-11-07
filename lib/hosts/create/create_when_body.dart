import 'package:catch_dating_app/hosts/create/create_copy.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/locations/shared/map_preview.dart';
import 'package:catch_kernel/location_coordinate.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// The days the strip shows before the calendar takes over.
const createDayRailLength = 21;

/// Step two in board order: the date head and three weeks of days, Starts
/// and Ends side by side, the place on a map with Change, and how to find
/// the host.
class CreateWhenBody extends StatelessWidget {
  const CreateWhenBody({
    super.key,
    required this.state,
    required this.today,
    required this.onDate,
    required this.onPickDate,
    required this.onStart,
    required this.onEnd,
    required this.onPlace,
    required this.onDirections,
    this.showTitle = false,
    this.enableNetworkTiles = true,
  });

  final CreateFlowState state;

  /// The first day of the strip.
  final DateTime today;
  final ValueChanged<DateTime> onDate;
  final VoidCallback onPickDate;
  final VoidCallback onStart;
  final VoidCallback onEnd;
  final VoidCallback onPlace;
  final ValueChanged<String> onDirections;
  final bool showTitle;

  /// False draws the map's no-network fallback (previews and captures).
  final bool enableNetworkTiles;

  @override
  Widget build(BuildContext context) {
    final copy = catchFieldCopy(context.l10n);
    final locale = Localizations.localeOf(context).toLanguageTag();
    final draft = state.draft;
    final picked = DateTime.tryParse(draft.eventLocalDate ?? '');
    final days = [
      for (var i = 0; i < createDayRailLength; i++)
        DateTime(today.year, today.month, today.day + i),
    ];
    final month = DateFormat.MMM(locale);
    final weekday = DateFormat.E(locale);
    final start = createClock(draft.eventLocalStartTime, locale);
    final end = createEndClock(
      draft.eventLocalStartTime,
      draft.durationMinutes,
      locale,
    );
    final lat = draft.startingPointLat;
    final lng = draft.startingPointLng;
    final place = draft.meetingPoint;
    return CatchStack(
      gap: CatchStackGap.g24,
      children: [
        if (showTitle)
          CatchText(
            CreateCopy.stepTitle(CreateStep.when),
            variant: CatchTextVariant.displaySection,
          ),
        CatchStack(
          children: [
            CatchStack(
              direction: CatchStackDirection.row,
              justify: CatchStackJustify.between,
              align: CatchStackAlign.center,
              children: [
                Expanded(
                  child: CatchText(
                    CreateCopy.dateRange(
                      month.format(days.first),
                      month.format(days.last),
                    ),
                    variant: CatchTextVariant.labelAction,
                  ),
                ),
                CatchButton(
                  key: const ValueKey<String>('create-pick-date'),
                  label: CreateCopy.pickDate,
                  variant: CatchButtonVariant.quiet,
                  size: CatchButtonSize.sm,
                  leading: CatchIcon(CatchIcons.date),
                  onPressed: onPickDate,
                ),
              ],
            ),
            CatchRail(
              label: CreateCopy.dates,
              itemWidth: 48,
              wrap: CatchRailMode.never,
              children: [
                for (final day in days)
                  CatchChoiceTile(
                    key: ValueKey<String>('create-day-${day.day}'),
                    variant: CatchChoiceTileVariant.day,
                    title: weekday.format(day),
                    subtitle: '${day.day}',
                    selected: picked != null && _sameDay(picked, day),
                    onTap: () => onDate(day),
                  ),
              ],
            ),
            if (state.problems.contains(CreateProblem.date))
              const CatchText(
                CreateCopy.dateNeeded,
                variant: CatchTextVariant.bodySmall,
                tone: CatchTextTone.danger,
              ),
          ],
        ),
        CatchStack(
          direction: CatchStackDirection.row,
          equal: true,
          children: [
            CatchField.action(
              key: const ValueKey<String>('create-starts'),
              copy: copy,
              title: CreateCopy.starts,
              valueText: start,
              onTap: onStart,
              errorText: state.problems.contains(CreateProblem.start)
                  ? CreateCopy.startNeeded
                  : null,
            ),
            CatchField.action(
              key: const ValueKey<String>('create-ends'),
              copy: copy,
              title: CreateCopy.ends,
              valueText: end,
              onTap: start == null ? null : onEnd,
            ),
          ],
        ),
        CatchStack(
          gap: CatchStackGap.g8,
          children: [
            const CatchText(
              CreateCopy.where,
              variant: CatchTextVariant.labelAction,
            ),
            if (place != null && lat != null && lng != null) ...[
              AspectRatio(
                aspectRatio: 21 / 9,
                child: MapPreview(
                  coordinate: LocationCoordinate(lat, lng),
                  fallbackLabel: CreateCopy.onTheMap(place),
                  enableNetworkTiles: enableNetworkTiles,
                ),
              ),
              CatchIndexRow(
                key: const ValueKey<String>('create-place'),
                title: place,
                subtitle: draft.meetingLocationAddress,
                density: CatchIndexRowSize.compact,
                onTap: onPlace,
                action: CatchIndexRowAction(
                  label: CreateCopy.change,
                  onPressed: onPlace,
                ),
              ),
            ] else
              CatchField.action(
                key: const ValueKey<String>('create-place'),
                copy: copy,
                title: CreateCopy.pickPlace,
                icon: CatchIcons.location,
                onTap: onPlace,
                errorText: state.problems.contains(CreateProblem.place)
                    ? CreateCopy.placeNeeded
                    : null,
              ),
          ],
        ),
        CatchField.input(
          key: const ValueKey<String>('create-directions'),
          copy: copy,
          title: CreateCopy.howToFindYou,
          initialValue: draft.locationDetails ?? '',
          onChanged: onDirections,
        ),
      ],
    );
  }
}

bool _sameDay(DateTime a, DateTime b) =>
    a.year == b.year && a.month == b.month && a.day == b.day;

/// A stored "HH:mm" as the locale's clock, such as 7:30 PM.
String? createClock(String? localTime, String locale) {
  final parts = localTime?.split(':');
  if (parts == null || parts.length != 2) return null;
  final hour = int.tryParse(parts[0]);
  final minute = int.tryParse(parts[1]);
  if (hour == null || minute == null) return null;
  return DateFormat.jm(locale).format(DateTime(2000, 1, 1, hour, minute));
}

/// The end clock, [durationMinutes] after the start.
String? createEndClock(String? localTime, int durationMinutes, String locale) {
  final parts = localTime?.split(':');
  if (parts == null || parts.length != 2) return null;
  final hour = int.tryParse(parts[0]);
  final minute = int.tryParse(parts[1]);
  if (hour == null || minute == null) return null;
  return DateFormat.jm(
    locale,
  ).format(DateTime(2000, 1, 1, hour, minute + durationMinutes));
}
