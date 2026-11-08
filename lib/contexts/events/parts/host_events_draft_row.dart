import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/domain/private_event_setup_inventory.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One event still being set up as a system list row: its day and date,
/// its name, its start time and whether its details are done yet. It
/// draws nothing of its own.
class HostEventsDraftRow extends StatelessWidget {
  const HostEventsDraftRow({super.key, required this.item, this.onTap});

  final PrivateEventSetupInventoryItem item;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final start = DateTime.fromMillisecondsSinceEpoch(item.startTimeMillis);
    final name = item.name.trim();
    return CatchIndexRow(
      title: name.isEmpty ? l10n.hostEventsDraftUntitled : name,
      onTap: onTap,
      date: CatchIndexRowDate(
        day: EventFormatters.shortWeekday(start),
        date: '${start.day}',
      ),
      meta: item.detailsConfigured
          ? l10n.hostEventsDraftReady(time: EventFormatters.time(start))
          : l10n.hostEventsDraftDetails(time: EventFormatters.time(start)),
      status: l10n.hostEventsDraftStatus,
      chevron: true,
      density: CatchIndexRowSize.regular,
    );
  }
}
