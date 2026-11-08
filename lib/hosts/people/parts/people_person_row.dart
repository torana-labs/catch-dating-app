import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One person in the People list: avatar, name, their nights and last
/// night, and a Regular, New or Drifting badge from the projection's
/// segments.
class PeoplePersonRow extends StatelessWidget {
  const PeoplePersonRow({
    super.key,
    required this.contact,
    required this.onTap,
    this.selected = false,
  });

  final HostAudienceContact contact;
  final VoidCallback? onTap;

  /// The person open in the detail pane beside the list.
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchIndexRow(
      title: contact.displayName,
      subtitle: peoplePersonFacts(
        l10n,
        nights: contact.attendedEventCount,
        lastNight: contact.lastAttendedAt,
      ),
      leading: CatchAvatar.system(
        size: CatchAvatarSize.md,
        name: contact.displayName,
      ),
      badge: peoplePersonBadge(l10n, contact.segments),
      density: CatchIndexRowSize.compact,
      selected: selected,
      onTap: onTap,
    );
  }
}

/// "6 nights · last on Tue 20 Oct", or no nights yet.
String peoplePersonFacts(
  AppLocalizations l10n, {
  required int nights,
  DateTime? lastNight,
}) {
  if (nights <= 0) return l10n.hostPeopleRowNoNights;
  if (lastNight == null) return l10n.hostPeopleRowNights(count: nights);
  return l10n.hostPeopleRowNightsLast(
    count: nights,
    date: AppTimeFormatters.weekdayDayMonth(lastNight),
  );
}

/// Drifting wins over Regular, and Regular over New.
CatchIndexRowBadge? peoplePersonBadge(
  AppLocalizations l10n,
  Set<HostAudienceSegment> segments,
) {
  if (segments.contains(HostAudienceSegment.lapsedRegular)) {
    return CatchIndexRowBadge(
      label: l10n.hostPeopleBadgeDrifting,
      tone: CatchBadgeTone.social,
    );
  }
  if (segments.contains(HostAudienceSegment.regular)) {
    return CatchIndexRowBadge(
      label: l10n.hostPeopleBadgeRegular,
      tone: CatchBadgeTone.success,
    );
  }
  if (segments.contains(HostAudienceSegment.newToOrganizer)) {
    return CatchIndexRowBadge(
      label: l10n.hostPeopleBadgeNew,
      tone: CatchBadgeTone.warning,
    );
  }
  return null;
}
