import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// A clock time short enough for a row's time column: "7:30".
String staffClock(DateTime at) => DateFormat('h:mm').format(at.toLocal());

/// When and where a function runs: "7:30 to 11:00 PM · Durbar hall".
String staffFunctionWhen(AppLocalizations l10n, ProgramFunction function) => [
  l10n.hostStaffTimeRange(
    start: AppTimeFormatters.time(function.startsAt.toLocal()),
    end: AppTimeFormatters.time(function.endsAt.toLocal()),
  ),
  ?function.venueName,
].join(' · ');

/// One function of the programme: its start time, name, when and where, and
/// how many are in out of those expected. A finished function reads done.
class StaffFunctionRow extends StatelessWidget {
  const StaffFunctionRow({
    super.key,
    required this.function,
    required this.now,
    this.onTap,
  });

  final ProgramFunction function;
  final DateTime now;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final done = !function.endsAt.isAfter(now);
    return CatchIndexRow(
      time: staffClock(function.startsAt),
      title: function.name,
      subtitle: staffFunctionWhen(l10n, function),
      meta: l10n.hostStaffFunctionCounts(
        checkedIn: function.checkedInCount,
        expected: function.expectedCount,
      ),
      marker: CatchIndexRowTone.neutral,
      emphasis: done
          ? CatchIndexRowEmphasis.done
          : CatchIndexRowEmphasis.regular,
      density: CatchIndexRowSize.compact,
      onTap: onTap,
    );
  }
}
