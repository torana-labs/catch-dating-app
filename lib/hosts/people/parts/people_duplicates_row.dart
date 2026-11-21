import 'package:catch_dating_app/hosts/people/duplicates/duplicates_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The People list's way into the duplicate review: how many pairs wait,
/// with the count as a badge while any do.
class PeopleDuplicatesRow extends StatelessWidget {
  const PeopleDuplicatesRow({
    super.key,
    required this.summary,
    required this.onTap,
  });

  final HostPeopleDuplicateSummary summary;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final count = summary.openCount;
    final countLabel = summary.atLeast
        ? l10n.hostPeopleCountAtLeast(count: '$count')
        : '$count';
    return CatchIndexRow(
      key: const ValueKey<String>('host-people-duplicates'),
      title: l10n.hostPeopleDuplicatesTitle,
      subtitle: count == 0
          ? l10n.hostPeopleDuplicatesEntryNone
          : summary.atLeast
          ? l10n.hostPeopleDuplicatesEntryMore(count: '$count')
          : l10n.hostPeopleDuplicatesEntryCount(count: count),
      icon: CatchIcons.people,
      badge: count == 0
          ? null
          : CatchIndexRowBadge(label: countLabel, tone: CatchBadgeTone.warning),
      density: CatchIndexRowSize.compact,
      chevron: true,
      onTap: onTap,
    );
  }
}
