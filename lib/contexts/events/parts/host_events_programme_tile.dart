import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One programme as a tile: its dates, its name and how many functions it
/// holds. It draws nothing of its own.
class HostEventsProgrammeTile extends StatelessWidget {
  const HostEventsProgrammeTile({
    super.key,
    required this.programme,
    this.onTap,
  });

  final OrganizerProgramListRow programme;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final startsAt = programme.startsAt;
    final endsAt = programme.endsAt;
    String day(DateTime value) =>
        '${value.day} ${EventFormatters.longMonth(value)}';
    final dates = startsAt == null
        ? null
        : endsAt == null || endsAt == startsAt
        ? day(startsAt)
        : l10n.hostEventsProgrammeDates(
            from: '${startsAt.day}',
            to: day(endsAt),
          );
    final functions = programme.functionCount;
    return CatchSurface(
      onPress: onTap,
      semanticLabel: programme.title,
      child: CatchStack(
        gap: CatchStackGap.g4,
        children: [
          if (dates != null)
            CatchText(
              dates,
              variant: CatchTextVariant.labelKicker,
              tone: CatchTextTone.secondary,
            ),
          CatchText(programme.title, variant: CatchTextVariant.displaySm),
          if (functions != null)
            CatchText(
              l10n.hostEventsProgrammeFunctions(count: functions),
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            ),
        ],
      ),
    );
  }
}
