import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One guest as a compact list row: the avatar, the name, how many nights
/// they have had with the organizer (or that this is their first, with the
/// New badge), and the row's one action or a chevron. It draws nothing of
/// its own.
class HostEventGuestRow extends StatelessWidget {
  const HostEventGuestRow({
    super.key,
    required this.name,
    this.photoUrl,
    this.format,
    this.insight,
    this.note,
    this.action,
    this.onTap,
  });

  final String name;
  final String? photoUrl;

  /// The event's format, which tints the New badge.
  final CatchFormat? format;

  /// The guest's row in the roster insight view, when it has one.
  final HostEventRosterInsight? insight;

  /// The caller's words before the history, for example when they asked.
  final String? note;
  final CatchIndexRowAction? action;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final insight = this.insight;
    final firstTime =
        insight?.signals.contains(HostRosterInsightSignal.firstTime) ?? false;
    final history = insight == null
        ? null
        : firstTime
        ? l10n.hostEventsGuestFirstTime
        : l10n.hostEventsGuestNights(
            count: insight.priorAttendedEventCount + 1,
          );
    final subtitle = [?note, ?history].join(' · ');
    return CatchIndexRow(
      title: name,
      subtitle: subtitle.isEmpty ? null : subtitle,
      leading: CatchAvatar(
        size: GeneratedCatchSizeTokens.avatarMd,
        name: name,
        imageUrl: photoUrl,
      ),
      badge: firstTime
          ? CatchIndexRowBadge(label: l10n.hostEventsGuestNew, format: format)
          : null,
      action: action,
      chevron: action == null && onTap != null,
      density: CatchIndexRowSize.compact,
      onTap: onTap,
    );
  }
}
