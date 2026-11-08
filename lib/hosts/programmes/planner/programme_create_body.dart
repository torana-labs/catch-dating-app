import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/programs/presentation/program_create_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_platform/time/time_zone_catalog.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// Which day a date row picks.
enum HostProgrammeCreateDay { first, last }

/// The new programme form in board order: what is being planned, its name,
/// its first and last day, and its time zone. The create controller owns
/// the values, validation and the command; this only draws them.
class HostProgrammeCreateBody extends StatelessWidget {
  const HostProgrammeCreateBody({
    super.key,
    required this.values,
    required this.showErrors,
    required this.locked,
    required this.titleField,
    required this.onKind,
    required this.onTitle,
    required this.onDay,
    required this.onTimezone,
    this.error,
  });

  final ProgramCreateValues values;
  final bool showErrors;

  /// The command is on its way or already sent, so nothing can change.
  final bool locked;
  final TextEditingController titleField;
  final ValueChanged<ProgramKind> onKind;
  final ValueChanged<String> onTitle;
  final ValueChanged<HostProgrammeCreateDay> onDay;
  final ValueChanged<String> onTimezone;

  /// The last failure, already in words.
  final String? error;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final errors = showErrors
        ? values.errors
        : const <ProgramCreateField, ProgramCreateValidation>{};
    String? message(ProgramCreateField field) => switch (errors[field]) {
      null => null,
      ProgramCreateValidation.required => l10n.hostProgrammeCreateRequired,
      ProgramCreateValidation.tooLong => l10n.hostProgrammeCreateTooLong,
      ProgramCreateValidation.invalidTimezone =>
        l10n.hostProgrammeCreateTimezoneInvalid,
      ProgramCreateValidation.invalidDate =>
        l10n.hostProgrammeCreateDateInvalid,
      ProgramCreateValidation.endAfterStart =>
        l10n.hostProgrammeCreateEndAfterStart,
    };
    final start = values.startsAt;
    final end = values.endsAt;
    final timezone = values.timezone;
    final kinds = [
      ProgramKind.wedding,
      ProgramKind.corporate,
      ProgramKind.other,
    ];
    return CatchPageBody.screen(
      children: [
        if (error != null)
          CatchNotice.inline(
            tone: CatchNoticeTone.danger,
            icon: CatchIcons.error,
            body: error!,
          ),
        CatchSection(
          title: l10n.hostProgrammeCreateWhat,
          dividers: CatchSectionPlacement.none,
          children: [
            CatchStack(
              direction: CatchStackDirection.row,
              equal: true,
              gap: CatchStackGap.g8,
              children: [
                for (final kind in kinds)
                  CatchChoiceTile(
                    key: ValueKey<String>(
                      'host-programme-create-kind-${kind.name}',
                    ),
                    variant: CatchChoiceTileVariant.tile,
                    contractExemption:
                        'Programme kind for createOrganizerProgram.',
                    title: switch (kind) {
                      ProgramKind.wedding => l10n.hostProgrammeKindWedding,
                      ProgramKind.corporate => l10n.hostProgrammeCreateOffsite,
                      _ => l10n.hostProgrammeCreateOther,
                    },
                    icon: switch (kind) {
                      ProgramKind.wedding => CatchIcons.celebrate,
                      ProgramKind.corporate => CatchIcons.business,
                      _ => CatchIcons.event,
                    },
                    format: kind == ProgramKind.wedding
                        ? CatchFormat.nightsOut
                        : null,
                    selected: values.kind == kind,
                    onTap: locked ? null : () => onKind(kind),
                  ),
              ],
            ),
            if (message(ProgramCreateField.kind) case final text?)
              CatchText(
                text,
                variant: CatchTextVariant.bodyMeta,
                tone: CatchTextTone.danger,
              ),
          ],
        ),
        CatchSection(
          dividers: CatchSectionPlacement.none,
          children: [
            CatchField.input(
              key: const ValueKey<String>('host-programme-create-title'),
              copy: copy,
              title: l10n.hostProgrammeCreateName,
              contractExemption: 'Programme title for createOrganizerProgram.',
              controller: titleField,
              placeholder: values.kind == ProgramKind.wedding
                  ? l10n.hostProgrammeCreateNameWedding
                  : l10n.hostProgrammeCreateNamePlaceholder,
              textCapitalization: TextCapitalization.words,
              inputMode: locked
                  ? CatchTextInputMode.readOnly
                  : CatchTextInputMode.editable,
              error: message(ProgramCreateField.title),
              onChanged: onTitle,
            ),
          ],
        ),
        CatchSection(
          children: [
            CatchIndexRow(
              key: const ValueKey<String>('host-programme-create-first'),
              icon: CatchIcons.date,
              title: l10n.hostProgrammeCreateFirstDay,
              subtitle: message(ProgramCreateField.start),
              value: start == null
                  ? l10n.hostProgrammeCreatePick
                  : AppTimeFormatters.weekdayDayMonth(start),
              chevron: true,
              onTap: locked ? null : () => onDay(HostProgrammeCreateDay.first),
            ),
            CatchIndexRow(
              key: const ValueKey<String>('host-programme-create-last'),
              icon: CatchIcons.date,
              title: l10n.hostProgrammeCreateLastDay,
              subtitle: message(ProgramCreateField.end),
              value: end == null
                  ? l10n.hostProgrammeCreatePick
                  : AppTimeFormatters.weekdayDayMonth(end),
              chevron: true,
              onTap: locked ? null : () => onDay(HostProgrammeCreateDay.last),
            ),
          ],
        ),
        CatchSection(
          dividers: CatchSectionPlacement.none,
          children: [
            CatchField.select(
              key: const ValueKey<String>('host-programme-create-timezone'),
              copy: copy,
              title: l10n.hostProgrammeCreateTimezone,
              contractExemption: 'IANA time zone for createOrganizerProgram.',
              values: ianaTimeZoneOptions(selected: timezone),
              value: timezone.isEmpty ? null : timezone,
              itemLabelBuilder: (identifier) => [
                timeZonePlace(identifier),
                timeZoneUtcOffset(identifier, start ?? DateTime.now()),
              ].join(' · '),
              helperText:
                  message(ProgramCreateField.timezone) ??
                  l10n.hostProgrammeCreateTimezoneHelp,
              onChanged: locked
                  ? null
                  : (String? value) {
                      if (value != null) onTimezone(value);
                    },
            ),
          ],
        ),
      ],
    );
  }
}

/// Picks a day on the calendar and returns it.
class HostProgrammeDaySheet extends StatefulWidget {
  const HostProgrammeDaySheet({
    super.key,
    required this.title,
    required this.today,
    this.value,
    this.min,
  });

  final String title;
  final DateTime today;
  final DateTime? value;
  final DateTime? min;

  @override
  State<HostProgrammeDaySheet> createState() => _HostProgrammeDaySheetState();
}

class _HostProgrammeDaySheetState extends State<HostProgrammeDaySheet> {
  late DateTime? _value = widget.value;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final value = _value;
    return CatchSheet(
      title: widget.title,
      footer: CatchButton(
        key: const ValueKey<String>('host-programme-day-use'),
        label: value == null
            ? widget.title
            : l10n.hostProgrammeCreateUseDay(
                day: AppTimeFormatters.weekdayDayMonth(value),
              ),
        fullWidth: true,
        onPressed: value == null
            ? null
            : () => Navigator.of(context).pop(value),
      ),
      child: CatchCalendar(
        month: value ?? widget.min ?? widget.today,
        label: widget.title,
        value: value,
        min: widget.min ?? widget.today,
        onChanged: (day) => setState(() => _value = day),
      ),
    );
  }
}
