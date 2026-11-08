import 'package:catch_dating_app/contexts/live/parts/formats_court_row.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One new table or team as a row: its name, how many sit there and who,
/// as avatars under it. The row draws nothing of its own.
class FormatsTableRow extends StatelessWidget {
  const FormatsTableRow({super.key, required this.label, required this.people});

  final String label;
  final List<String> people;

  @override
  Widget build(BuildContext context) => CatchIndexRow(
    title: label,
    subtitle: context.l10n.hostFormatsPeopleCount(count: people.length),
    onTap: null,
    density: CatchIndexRowSize.compact,
    footer: FormatsPlayersRow(players: people),
  );
}
