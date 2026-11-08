import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// What the function sheet saves: `upsertProgramFunction`'s name, venue
/// and times.
@immutable
class HostProgrammeFunctionDraft {
  const HostProgrammeFunctionDraft({
    required this.name,
    required this.venue,
    required this.startsAt,
    required this.endsAt,
  });

  final String name;
  final String venue;
  final DateTime startsAt;
  final DateTime endsAt;
}

/// Adds or edits a function: its name, venue, day and times. The day is
/// one of the programme's days and the times are half-hour slots.
class HostProgrammeFunctionSheet extends StatefulWidget {
  const HostProgrammeFunctionSheet({
    super.key,
    required this.program,
    this.function,
  });

  final OrganizerProgramSettings program;

  /// The function being edited; null adds one.
  final OrganizerFunctionDetail? function;

  @override
  State<HostProgrammeFunctionSheet> createState() =>
      _HostProgrammeFunctionSheetState();
}

class _HostProgrammeFunctionSheetState
    extends State<HostProgrammeFunctionSheet> {
  late String _name = widget.function?.name ?? '';
  late String _venue = widget.function?.venueName ?? '';
  late DateTime _day = _dayOf(
    widget.function?.startsAt ?? widget.program.startsAt,
  );
  late int _start = _slotOf(widget.function?.startsAt) ?? 36;
  late int _end = _slotOf(widget.function?.endsAt) ?? 44;

  static DateTime _dayOf(DateTime value) =>
      DateTime(value.year, value.month, value.day);

  static int? _slotOf(DateTime? value) =>
      value == null ? null : value.hour * 2 + (value.minute >= 30 ? 1 : 0);

  List<DateTime> get _days {
    final first = _dayOf(widget.program.startsAt);
    final last = _dayOf(widget.program.endsAt);
    final days = <DateTime>[];
    for (
      var day = first;
      !day.isAfter(last);
      day = DateTime(day.year, day.month, day.day + 1)
    ) {
      days.add(day);
    }
    if (!days.contains(_day)) days.insert(0, _day);
    return days;
  }

  DateTime _at(int slot) =>
      DateTime(_day.year, _day.month, _day.day, slot ~/ 2, slot.isOdd ? 30 : 0);

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final slots = [for (var slot = 12; slot < 48; slot++) slot];
    final ready =
        _name.trim().isNotEmpty && _venue.trim().isNotEmpty && _end > _start;
    return CatchSheet(
      title: widget.function == null
          ? l10n.hostProgrammeAddFunction
          : l10n.hostProgrammeFunctionEditTitle,
      keyboardSafe: true,
      footer: CatchButton(
        key: const ValueKey<String>('host-programme-function-save'),
        label: l10n.hostProgrammeSave,
        fullWidth: true,
        onPressed: ready
            ? () => Navigator.of(context).pop(
                HostProgrammeFunctionDraft(
                  name: _name.trim(),
                  venue: _venue.trim(),
                  startsAt: _at(_start),
                  endsAt: _at(_end),
                ),
              )
            : null,
      ),
      child: CatchSection(
        dividers: CatchSectionPlacement.none,
        children: [
          CatchField.input(
            key: const ValueKey<String>('host-programme-function-name'),
            copy: copy,
            title: l10n.hostProgrammeFunctionName,
            contractExemption: 'Function name the planner types.',
            initialValue: _name,
            placeholder: l10n.hostProgrammeFunctionNamePlaceholder,
            maxLength: 80,
            textCapitalization: TextCapitalization.words,
            onChanged: (value) => setState(() => _name = value),
          ),
          CatchField.input(
            key: const ValueKey<String>('host-programme-function-venue'),
            copy: copy,
            title: l10n.hostProgrammeFunctionVenue,
            contractExemption: 'Function venue the planner types.',
            initialValue: _venue,
            leading: CatchIcon(CatchIcons.location),
            maxLength: 120,
            onChanged: (value) => setState(() => _venue = value),
          ),
          CatchField.select(
            copy: copy,
            title: l10n.hostProgrammeFunctionDay,
            contractExemption: 'One of the programme days.',
            values: _days,
            value: _day,
            itemLabelBuilder: AppTimeFormatters.weekdayDayMonth,
            onChanged: (value) {
              if (value != null) setState(() => _day = value);
            },
          ),
          CatchStack(
            direction: CatchStackDirection.row,
            equal: true,
            children: [
              CatchField.select(
                copy: copy,
                title: l10n.hostProgrammeFunctionStarts,
                contractExemption: 'Half-hour start slot.',
                values: slots,
                value: _start,
                itemLabelBuilder: (slot) => AppTimeFormatters.time(_at(slot)),
                onChanged: (value) {
                  if (value != null) setState(() => _start = value);
                },
              ),
              CatchField.select(
                copy: copy,
                title: l10n.hostProgrammeFunctionEnds,
                contractExemption: 'Half-hour end slot.',
                values: [...slots, 48],
                value: _end,
                itemLabelBuilder: (slot) => AppTimeFormatters.time(_at(slot)),
                onChanged: (value) {
                  if (value != null) setState(() => _end = value);
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}
