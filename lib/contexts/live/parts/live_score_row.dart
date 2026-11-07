import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// One team on the scoreboard: its place, its name and its running total.
class LiveScoreRow extends StatelessWidget {
  const LiveScoreRow({super.key, required this.entry});

  final EventSuccessStandingEntry entry;

  @override
  Widget build(BuildContext context) => CatchIndexRow(
    title: entry.unitLabel,
    onTap: null,
    density: CatchIndexRowSize.compact,
    rank: entry.position,
    value: NumberFormat.decimalPattern(
      Localizations.localeOf(context).toLanguageTag(),
    ).format(entry.value),
  );
}
