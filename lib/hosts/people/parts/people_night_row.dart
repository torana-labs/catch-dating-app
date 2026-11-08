import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_revenue.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One of a person's nights with the organizer: the day, the event and
/// what happened (booked, came, cancelled or missed).
class PeopleNightRow extends StatelessWidget {
  const PeopleNightRow({super.key, required this.night});

  final HostAudienceEventFact night;

  @override
  Widget build(BuildContext context) {
    final start = night.eventStartAt;
    return CatchIndexRow(
      title: night.displayName,
      time: start == null
          ? null
          : '${AppTimeFormatters.shortWeekday(start)} ${start.day}',
      value: peopleNightOutcome(context.l10n, night),
      density: CatchIndexRowSize.compact,
      onTap: null,
    );
  }
}

/// What happened on the night, from the attendance record.
String peopleNightOutcome(AppLocalizations l10n, HostAudienceEventFact night) {
  if (night.checkedIn) return l10n.hostPeopleNightCame;
  final status = night.status.toLowerCase();
  if (status.contains('cancel')) return l10n.hostPeopleNightCancelled;
  if (status.contains('noshow') || status.contains('no_show')) {
    return l10n.hostPeopleNightMissed;
  }
  if (status.contains('attend')) return l10n.hostPeopleNightCame;
  return l10n.hostPeopleNightBooked;
}
