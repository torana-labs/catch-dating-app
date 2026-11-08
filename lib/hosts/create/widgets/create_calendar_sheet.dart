import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// Pick a date past the day strip: the calendar in a contained sheet with
/// the host's other events marked, and Use with the picked day.
class CreateCalendarSheet extends StatelessWidget {
  const CreateCalendarSheet({
    super.key,
    required this.today,
    required this.value,
    required this.marked,
    required this.onChanged,
    required this.onUse,
  });

  final DateTime today;

  /// The day picked in the sheet so far.
  final DateTime? value;

  /// Days the host already has something on.
  final List<DateTime> marked;
  final ValueChanged<DateTime> onChanged;
  final VoidCallback? onUse;

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context).toLanguageTag();
    final value = this.value;
    return CatchSheet.contained(
      key: const ValueKey<String>('create-calendar-sheet'),
      title: context.l10n.hostCreatePickDate,
      footer: CatchButton(
        key: const ValueKey<String>('create-use-date'),
        label: value == null
            ? context.l10n.hostCreatePickDate
            : context.l10n.hostCreateUseDate(
                date: DateFormat('EEE d MMM', locale).format(value),
              ),
        fullWidth: true,
        onPressed: value == null ? null : onUse,
      ),
      child: CatchCalendar(
        month: value ?? today,
        label: context.l10n.hostCreatePickDate,
        value: value,
        min: today,
        marked: marked,
        markedLabel: marked.isEmpty ? null : context.l10n.hostCreateAlreadyOn,
        onChanged: onChanged,
      ),
    );
  }
}
