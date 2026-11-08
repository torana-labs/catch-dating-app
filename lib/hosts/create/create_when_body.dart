import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_settings_copy.dart';
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
    this.onRepeat,
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

  /// Every week on this weekday; null hides the switch.
  final ValueChanged<bool>? onRepeat;
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
            context.l10n.hostCreateStepTitle(step: CreateStep.when.name),
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
                    month.format(days.first) == month.format(days.last)
                        ? context.l10n.hostCreateDateSingle(
                            date: month.format(days.first),
                          )
                        : context.l10n.hostCreateDateRange(
                            from: month.format(days.first),
                            to: month.format(days.last),
                          ),
                    variant: CatchTextVariant.labelAction,
                  ),
                ),
                CatchButton(
                  key: const ValueKey<String>('create-pick-date'),
                  label: context.l10n.hostCreatePickDate,
                  variant: CatchButtonVariant.quiet,
                  size: CatchButtonSize.sm,
                  leading: CatchIcon(CatchIcons.date),
                  onPressed: onPickDate,
                ),
              ],
            ),
            CatchRail(
              label: context.l10n.hostCreateDates,
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
              CatchText(
                context.l10n.hostCreateDateNeeded,
                variant: CatchTextVariant.bodySmall,
                tone: CatchTextTone.danger,
              ),
          ],
        ),
        if (onRepeat != null && picked != null && state.eventId != null)
          CatchIndexRow(
            title: CreateSettingsCopy.repeatOn(
              DateFormat.EEEE(locale).format(picked),
            ),
            subtitle: CreateSettingsCopy.repeatBody,
            onTap: null,
            trailing: CatchToggleInput(
              key: const ValueKey<String>('create-repeat-weekly'),
              value: state.repeatWeekly,
              semanticLabel: CreateSettingsCopy.repeat,
              contractExemption:
                  'Sets up the weekly series when the event publishes.',
              onChanged: onRepeat,
            ),
          ),
        CatchStack(
          direction: CatchStackDirection.row,
          equal: true,
          children: [
            CatchFieldLanes.single(
              child: CatchField.action(
                key: const ValueKey<String>('create-starts'),
                copy: copy,
                title: context.l10n.hostCreateStarts,
                valueText: start,
                onTap: onStart,
                errorText: state.problems.contains(CreateProblem.start)
                    ? context.l10n.hostCreateStartNeeded
                    : null,
              ),
            ),
            CatchFieldLanes.single(
              child: CatchField.action(
                key: const ValueKey<String>('create-ends'),
                copy: copy,
                title: context.l10n.hostCreateEnds,
                valueText: end,
                onTap: start == null ? null : onEnd,
              ),
            ),
          ],
        ),
        CatchStack(
          gap: CatchStackGap.g8,
          children: [
            CatchText(
              context.l10n.hostCreateWhere,
              variant: CatchTextVariant.labelAction,
            ),
            if (place != null && lat != null && lng != null) ...[
              AspectRatio(
                aspectRatio: 21 / 9,
                child: MapPreview(
                  coordinate: LocationCoordinate(lat, lng),
                  fallbackLabel: context.l10n.hostCreateOnTheMap(place: place),
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
                  label: context.l10n.hostCreateChange,
                  onPressed: onPlace,
                ),
              ),
            ] else
              CatchFieldLanes.single(
                child: CatchField.action(
                  key: const ValueKey<String>('create-place'),
                  copy: copy,
                  title: context.l10n.hostCreatePickPlace,
                  icon: CatchIcons.location,
                  onTap: onPlace,
                  errorText: state.problems.contains(CreateProblem.place)
                      ? context.l10n.hostCreatePlaceNeeded
                      : null,
                ),
              ),
          ],
        ),
        CatchFieldLanes.single(
          child: CatchField.input(
            key: const ValueKey<String>('create-directions'),
            copy: copy,
            title: context.l10n.hostCreateHowToFindYou,
            initialValue: draft.locationDetails ?? '',
            onChanged: onDirections,
          ),
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
